/* eslint-disable prefer-arrow/prefer-arrow-functions */
import { ConnectionError } from 'src/app/exceptions/connection-error';
import { NotConnected } from 'src/app/exceptions/not-connected';
import { UnexpectedState } from 'src/app/exceptions/unexpected-state';
import {
  BLEAdapter,
  BLECharacteristicsAdapter,
  BLEServiceAdapter,
  SendOptionsForAdapter,
} from 'src/app/interfaces/ble-adapter';
import Comm from 'src/app/interfaces/comm';
import { encode } from 'src/app/util/ble-encode-decode';
import { runListeners } from 'src/app/util/run-listeners';
import { exponentialBackoff } from 'src/app/util/time';
import { BluetoothService } from '../bluetooth.service';
import { LoggerService } from '../logger.service';

export class BLEWebAdapter implements BLEAdapter {
  connected = false;

  // eslint-disable-next-line @typescript-eslint/ban-types
  listeners = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    connect: [] as Function[],
    // eslint-disable-next-line @typescript-eslint/ban-types
    disconnect: [] as Function[],
  };

  private device: null | BluetoothDevice = null;

  constructor(private readonly logger: LoggerService) {}

  onConnected(connectedFn: () => any) {
    this.listeners.connect.push(connectedFn);

    return () => {
      this.listeners.connect = this.listeners.connect.filter(
        (fn) => fn !== connectedFn
      );
    };
  }

  onDisconnected(disconnectFn: () => any) {
    this.listeners.disconnect.push(disconnectFn);

    return () => {
      this.listeners.disconnect = this.listeners.disconnect.filter(
        (fn) => fn !== disconnectFn
      );
    };
  }

  async connect(targetService: string) {
    const connect = async () => {
      const r = await this.device?.gatt?.connect();
      this.gattConnected();
      return r;
    };
    return new Promise<void>(async (resolve, reject) => {
      if (this.device) {
        connect();
        return;
      }

      try {
        this.logger.log('Requesting connection to BimmerLED Device...');
        const reqOpts = {
          acceptAllDevices: true,
          optionalServices: [targetService],
          // filters: [
          //   {
          //     services: [],
          //   },
          // ],
        };
        console.log({ reqOpts });
        this.device = await navigator.bluetooth.requestDevice(reqOpts);

        this.device.addEventListener(
          'gattserverdisconnected',
          this.gattDisconnected.bind(this)
        );

        exponentialBackoff(
          3,
          2,
          async () => {
            this.logger.log('Connecting to Bluetooth Device... ');
            await connect();
          },
          async () => {
            resolve(void 0);
          },
          () => {
            throw new ConnectionError('Failed to reconnect.');
          }
        );
      } catch (error) {
        this.logger.error('Argh! ' + error);
        reject(error);
      }
    });
  }

  async disconnect() {
    return this.device?.gatt?.disconnect();
  }

  async pairNew(targetService: string) {
    await this.disconnect();

    this.device = null;

    return this.connect(targetService);
  }

  async send<P = unknown, M extends Comm.Meta = any>(
    options: SendOptionsForAdapter<P, M>
  ): Promise<Comm.Envelope<P, M>> {
    const { spec, to: char } = options;

    if (!this.device?.gatt?.connected) {
      throw new NotConnected();
    }

    const payload: Comm.Envelope<P, M> = [
      spec.operation,
      new spec(),
      spec.meta,
    ];

    // NOTE: `writeValue` is deprecated
    // @see https://webbluetoothcg.github.io/web-bluetooth/#dom-bluetoothremotegattcharacteristic-writevalue
    await char?.writeValue(encode(payload));

    return payload;
  }

  async getService(serviceUUID: string): Promise<BLEServiceAdapter> {
    const service = await this.device?.gatt?.getPrimaryService(serviceUUID);

    if (!service) {
      throw new UnexpectedState();
    }

    return {
      uuid: service.uuid,
      async getCharacteristic(
        characteristicsUUID: string
      ): Promise<BLECharacteristicsAdapter> {
        const char = await service.getCharacteristic(characteristicsUUID);

        return {
          uuid: char.uuid,
          lastValue: char.value?.buffer,

          async readValue() {
            const v = await char.readValue();
            return v.buffer;
          },

          async writeValue(v: Uint8Array) {
            return char.writeValue(v);
          },

          async startNotifications() {
            await char.startNotifications();
          },

          async stopNotifications() {
            await char.stopNotifications();
          },

          onNotify(notifyFn: (event: Event) => any) {
            return char.addEventListener(
              'characteristicvaluechanged',
              notifyFn
            );
          },
        };
      },
    };
  }

  private gattDisconnected() {
    this.connected = false;
    runListeners(this.listeners.disconnect, Array.from(arguments));
  }

  private gattConnected() {
    this.connected = true;
    runListeners(this.listeners.connect, Array.from(arguments));
  }
}
