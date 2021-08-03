import { Injectable } from '@angular/core';
import { BluetoothLE } from '@ionic-native/bluetooth-le/ngx';
import { ModalController, Platform } from '@ionic/angular';
import { Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import Comm from 'src/app/interfaces/comm';
import { UnexpectedState } from '../exceptions/unexpected-state';
import { BLEAdapter } from '../interfaces/ble-adapter';
import { displayAlert } from '../util/alert';
import { decode } from '../util/ble-encode-decode';
import { displayError } from '../util/error';
import { BLENativeAdapter } from './bluetooth-adapters/ble-native';
import { BLEWebAdapter } from './bluetooth-adapters/ble-web';
import { LoggerService } from './logger.service';

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

  private readonly historySubject$ = new Subject<
    HistoryEntry<unknown, unknown>
  >();

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly history$ = this.historySubject$.asObservable();

  private impl: BLEAdapter;
  private doesNotify: boolean;

  constructor(
    private readonly logger: LoggerService,
    private readonly modalController: ModalController,
    public bluetoothle: BluetoothLE,
    public plt: Platform
  ) {
    this.setupBLE();
  }

  async setupBLE() {
    const readySource = await this.plt.ready();
    this.logger.log('Platform ready from:', readySource);

    switch (readySource) {
      case 'dom': {
        return this.setupWebBLE();
      }
      default:
        return this.setupNativeBLE();
    }
  }

  async setupWebBLE() {
    this.impl = new BLEWebAdapter(this.logger);

    this.impl.onConnected(this.onConnect.bind(this));
    this.impl.onDisconnected(this.onDisconnected.bind(this));
  }

  async setupNativeBLE() {
    // await this.bluetoothle.enable();

    const ble = this.bluetoothle.initialize({
      request: true,
    });

    ble.subscribe((_ble) => {
      console.log(_ble);
      debugger
    });

    const { status = null } = await ble.pipe(take(1)).toPromise();

    if (status !== 'enabled') {
      displayError(new Error('Bluetooth could not be enabled successfully.'));
      return;
    }

    this.impl = new BLENativeAdapter(
      this.logger,
      this.bluetoothle,
      this.modalController
    );

    this.impl.onConnected(this.onConnect.bind(this));
    this.impl.onDisconnected(this.onDisconnected.bind(this));
  }

  get isReady() {
    return !!this.impl;
  }

  get connected(): boolean {
    try {
      return this.impl.connected;
    } catch (e) {
      return false;
    }
  }

  get receivesNotifications(): boolean {
    return this.doesNotify;
  }

  async getTargetCharcteristic() {
    const service = await this.impl.getService(BluetoothService.targetService);

    return service.getCharacteristic(BluetoothService.targetCharacteristic);
  }

  async send<R, P = unknown, M extends Comm.Meta = any>(
    options: SendOptions<P, M>
  ): Promise<Comm.Envelope<R, M>> {
    const to = await this.getTargetCharcteristic();

    const sentPayload = await this.impl.send({
      ...options,
      to,
    });

    this.pushHistory(sentPayload, true);

    if (options.expectResponse) {
      return this.readNextValue(options.spec.operation) as Promise<
        Comm.Envelope<R, M>
      >;
    }

    return [];
  }

  async pairNew() {
    return this.impl.pairNew(BluetoothService.targetService);
  }

  async tryReconnect() {
    this.logger.log('Reconnecting...');
    await this.impl.connect(BluetoothService.targetService);
  }

  async handleNotify(event: any) {
    const newValue = event.target?.value as DataView;

    const decodedValue = decode(newValue?.buffer);
    this.pushHistory(decodedValue, false);
  }

  private async onConnect() {
    this.logger.log('Bluetooth Device connected.');

    this.listenForNotifications();
  }

  private async listenForNotifications() {
    const char = await this.getTargetCharcteristic();

    if (!char) {
      throw new UnexpectedState();
    }

    char.startNotifications();
    char.onNotify(this.handleNotify.bind(this));

    this.doesNotify = true;
    this.logger.log('Listening on notifications...');
  }

  private async onDisconnected() {
    this.logger.log('Bluetooth Device disconnected');

    this.doesNotify = false;
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
