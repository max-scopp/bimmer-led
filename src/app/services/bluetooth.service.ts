import { Injectable, ɵAPP_ID_RANDOM_PROVIDER } from '@angular/core';
import { AlertController, PopoverController } from '@ionic/angular';
import { exponentialBackoff } from '../util/time';
import { LoggerService } from './logger.service';
import Comm from 'src/app/interfaces/comm';
import { Observable, Subject } from 'rxjs';
import { randomId } from '../util/id';
import { NoDeviceConnected } from '../exceptions/no-device';
import { filter, map, mapTo, take } from 'rxjs/operators';
import { NotConnected } from '../exceptions/not-connected';
import { Meta } from '@angular/platform-browser';

export interface SendOptions<P, M extends Comm.Meta> {
  spec: Comm.Operation<P, M>;
  expectResponse: boolean;
}

export interface HistoryEntry<P, M> {
  value: Comm.Envelope<P, M>;
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

  private readonly historySubject$ = new Subject<
    HistoryEntry<unknown, unknown>
  >();

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

  async send<R, P = unknown, M extends Comm.Meta = any>(
    options: SendOptions<P, M>
  ): Promise<Comm.Envelope<R, M> | []> {
    const { spec: payloadSpec, expectResponse } = options;

    if (!this.device?.gatt?.connected) {
      throw new NotConnected();
    }

    const start = performance.now();
    const char = await this.getCharacteristic();
    let r;

    const payload: Comm.Envelope<P, M> = [
      payloadSpec.operation,
      new payloadSpec(),
      payloadSpec.meta,
    ];

    // not sure why we should differentiate between these, but the spec
    // say it can "improve" the protocol communication.
    // whatever that means, we just follow the spec here.
    // NOTE: `writeValue` is deprecated
    // @see https://webbluetoothcg.github.io/web-bluetooth/#dom-bluetoothremotegattcharacteristic-writevalue
    if (!expectResponse) {
      await char?.writeValueWithoutResponse(this.encode(payload));
    } else {
      await char?.writeValueWithResponse(this.encode(payload));
    }

    this.pushHistory(payload, true);

    if (expectResponse) {
      r = await this.readNextValue(payloadSpec.operation);
    }

    const tookUs = Math.trunc(performance.now() - start);
    this.logger.log(`operation ${payloadSpec.operation} took ${tookUs}ms`);

    return r || [];
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

    const decodedValue = this.decode(newValue?.buffer);
    this.pushHistory(decodedValue, false);
  }

  private onDisconnected() {
    this.logger.log('Bluetooth Device disconnected');

    this.hasNotificationListener = false;
    this.tryReconnect();
  }

  private pushHistory<P, M, V extends Comm.Envelope<P, M>>(
    value: V,
    sentFromMe: boolean
  ) {
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

  private async readNextValue(targetOperationId: number) {
    return this.history$
      .pipe(
        filter((n) => !n.sent),
        filter((n) => (n.value as Array<Comm.Any>)[0] === targetOperationId),
        take(1),
        map((n) => n.value)
      )
      .toPromise();
  }
}
