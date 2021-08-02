import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import Comm from '../interfaces/comm';
import { BluetoothService } from './bluetooth.service';

@Injectable({
  providedIn: 'root',
})
export class LedService {
  constructor(
    private readonly bluetooth: BluetoothService,
    private readonly alert: AlertController
  ) {}

  async ping() {
    let success = false;
    const prompt = await this.alert.create({
      header: 'Pinging...',
      subHeader: 'This may take a minute or two.',
      backdropDismiss: false,
    });

    prompt.present();

    try {
      if (!this.bluetooth.device?.gatt?.connected) {
        await this.bluetooth.tryReconnect();
      }
      const start = Date.now();
      const response = await this.bluetooth.send<Comm.PingResponse>(
        class Ping extends Array {
          static operation = 0;
          0 = Date.now();
        },
        true
      );

      const tookMs = Date.now() - start;
      console.log({ response });
      success = true;

      prompt.header = 'Success';
      prompt.subHeader = 'Device pinged successfully';
      prompt.message =
        '<p>' +
        [
          'The BimmerLED controller was able to successfully respond with an unique response.',
          `The procedure took ${tookMs}ms`,
        ].join('</p><p>') +
        '</p>';
      prompt.buttons = ['Nice!'];
    } catch (e) {
    } finally {
      if (!success) {
        prompt.header = 'Unable to ping';
        prompt.subHeader = undefined;
        prompt.message =
          '<p>' +
          [
            'The target device was not found or could not establish a connection. ',
            'Ensure the BimmerLED controller is powered on.',
            'Then, try to pair the device again.',
          ].join('</p><p>') +
          '</p>';
        prompt.buttons = ['Got it'];
      }
    }
  }
}
