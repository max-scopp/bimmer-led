import { BluetoothLE } from '@ionic-native/bluetooth-le/ngx';
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
  connected: boolean;

  device: any;

  constructor(
    private readonly logger: LoggerService,
    private readonly ble: BluetoothLE,
    private readonly modalController: ModalController
  ) {}

  onConnected(connectedFn: () => any): RemoveListenerFunction {
    throw new Error('Method not implemented.');
  }

  onDisconnected(disconnectFn: () => any): RemoveListenerFunction {
    throw new Error('Method not implemented.');
  }

  async connect(targetService: string) {
    const modal = await this.modalController.create({
      component: BleDevicesComponent,
      componentProps: {
        targetService,
      },
    });

    await modal.present();
  }

  async disconnect() {
    throw new Error('Method not implemented.');
  }

  async pairNew() {
    throw new Error('Method not implemented.');
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
