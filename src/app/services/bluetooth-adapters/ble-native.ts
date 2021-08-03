import { BLE } from '@ionic-native/ble/ngx';
import { BluetoothLE, DeviceInfo } from '@ionic-native/bluetooth-le/ngx';
import { ActionSheetController, ModalController } from '@ionic/angular';
import {
  BLEAdapter,
  BLEServiceAdapter,
  RemoveListenerFunction,
  SendOptionsForAdapter,
} from 'src/app/interfaces/ble-adapter';
import Comm from 'src/app/interfaces/comm';
import { BleDevicesComponent } from 'src/app/native/ble-devices/ble-devices.component';
import { LoggerService } from '../logger.service';

export class BLENativeAdapter implements BLEAdapter {
  connected = false;

  // eslint-disable-next-line @typescript-eslint/ban-types
  listeners = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    connect: [] as Function[],
    // eslint-disable-next-line @typescript-eslint/ban-types
    disconnect: [] as Function[],
  };

  device: DeviceInfo | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly bluetoothLe: BluetoothLE,
    private readonly ble: BLE,
    private readonly modalController: ModalController
  ) {}

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
    const modal = await this.modalController.create({
      swipeToClose: true,
      component: BleDevicesComponent,
      componentProps: {
        targetService,
      },
    });

    await modal.present();
  }

  async disconnect() {
    if (this.device?.address) {
      this.bluetoothLe.disconnect({
        address: this.device.address,
      });
    }
  }

  async pairNew(targetService: string) {
    await this.disconnect();

    this.device = null;

    return this.connect(targetService);
  }

  send<R, P = unknown, M extends Comm.Meta = any>(
    options: SendOptionsForAdapter<P, M>
  ): Promise<Comm.Envelope<R, M> | []> {
    throw new Error('Method not implemented.');
  }

  async getService(serviceUUID: string): Promise<BLEServiceAdapter> {
    throw new Error('Method not implemented.');
  }
}
