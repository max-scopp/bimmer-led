import { Injectable, ɵAPP_ID_RANDOM_PROVIDER } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { exponentialBackoff } from '../util/time';
import { LoggerService } from './logger.service';
import Comm from 'src/app/interfaces/comm';
import { Observable, Subject } from 'rxjs';
import { randomId } from '../util/id';
import { NoDeviceConnected } from '../exceptions/no-device';
import { filter, map, mapTo, take } from 'rxjs/operators';

export interface HistoryEntry {
  value: Comm.Any;
  at: string;
  valid?: boolean;

  /**
   * if this is true, the client send the package, not the controller.
   */
  sent?: true;
}

@Injectable({
  providedIn: 'root',
})
export class BluetoothService {
  static targetService = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  static targetCharacteristic = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

  device: null | BluetoothDevice = null;

  private readonly historySubject$ = new Subject<HistoryEntry>();

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly history$ = this.historySubject$.asObservable();

  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();
  private hasNotificationListener = false;

  constructor(private readonly logger: LoggerService) {}

  get connected(): boolean {
    return this.device?.gatt?.connected || false;
  }

  get receivesNotifications(): boolean {
    return this.hasNotificationListener;
  }

  async getService() {
    return this.device?.gatt?.getPrimaryService(BluetoothService.targetService);
  }

  async getCharacteristic() {
    const service = await this.getService();

    return service?.getCharacteristic(BluetoothService.targetCharacteristic);
  }

  async send<R = unknown, P = unknown>(
    payloadSpec: Comm.Operation<P>,
    expectResponse = false
  ): Promise<R | void> {
    const char = await this.getCharacteristic();
    let r;

    const payload: any[] = [payloadSpec.operation, new payloadSpec()];

    if (payloadSpec.meta) {
      payload.push(payloadSpec.meta);
    }

    if (!expectResponse) {
      // NOTE: `writeValue` is deprecated
      // @see https://webbluetoothcg.github.io/web-bluetooth/#dom-bluetoothremotegattcharacteristic-writevalue
      await char?.writeValueWithoutResponse(this.encode(payload));
    } else {
      await char?.writeValueWithResponse(this.encode(payload));

      r = await this.readNextValue();
    }

    this.pushHistory(payload, true);

    return r;
  }

  encode(v: any) {
    return this.encoder.encode(JSON.stringify(v));
  }

  decode(buff: BufferSource) {
    const strDecoded = this.decoder.decode(buff);
    try {
      return JSON.parse(strDecoded);
    } catch (e) {
      return strDecoded;
    }
  }

  async pairNew() {
    try {
      this.logger.log('Requesting connection to BimmerLED Device...');
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [BluetoothService.targetService],
        // filters: [
        //   {
        //     services: [BluetoothService.targetService],
        //   },
        // ],
      });

      this.device.addEventListener(
        'gattserverdisconnected',
        this.onDisconnected.bind(this)
      );

      this.tryReconnect();
    } catch (error) {
      this.logger.log('Argh! ' + error);
    }
  }

  async tryReconnect() {
    if (!this.device) {
      throw new NoDeviceConnected();
    }

    exponentialBackoff(
      3,
      2,
      async () => {
        this.logger.log('Connecting to Bluetooth Device... ');
        await this.device?.gatt?.connect();
      },
      async () => {
        this.logger.log('Bluetooth Device connected.');
        const char = await this.getCharacteristic();

        try {
          char?.startNotifications();

          char?.addEventListener(
            'characteristicvaluechanged',
            this.handleNotify.bind(this)
          );
          this.hasNotificationListener = true;
          this.logger.log('Listening on notifications...');
        } catch (e) {
          this.logger.warn('Unable to listen on notifications', e);
        }
      },
      () => {
        this.logger.log('Failed to reconnect.');
      }
    );
  }

  async handleNotify(event: any) {
    const newValue = event.target?.value as DataView;
    console.log({ newValue });
    const decodedValue = this.decode(newValue?.buffer);
    this.pushHistory(decodedValue, false);
  }

  private onDisconnected() {
    this.logger.log('Bluetooth Device disconnected');

    this.hasNotificationListener = false;
    this.tryReconnect();
  }

  private pushHistory<V extends Comm.Any>(value: V, sentFromMe: boolean) {
    this.logger.debug(`${sentFromMe ? '>' : '<'} ${JSON.stringify(value)}`);

    this.historySubject$.next({
      valid: typeof value === 'object',
      at: new Date().toJSON(),
      sent: sentFromMe ? true : undefined,
      value,
    });
  }

  private async readValue() {
    const char = await this.getCharacteristic();
    const newValue = await char?.readValue();

    if (newValue?.buffer) {
      const decodedValue = this.decode(newValue?.buffer);
      this.pushHistory(decodedValue, false);
      return decodedValue;
    } else {
      this.logger.warn(
        'Received notification, however the new value could not be read.'
      );
    }

    return null;
  }

  private async readNextValue() {
    return this.history$
      .pipe(
        filter((n) => !n.sent),
        take(1),
        map((n) => n.value)
      )
      .toPromise() as Promise<any>;
  }
}
