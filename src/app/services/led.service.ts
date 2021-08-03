import { Injectable } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { AlertController, ToastController } from '@ionic/angular';
import { filter, map } from 'rxjs/operators';
import Comm from '../interfaces/comm';
import { BluetoothService, HistoryEntry } from './bluetooth.service';

@Injectable({
  providedIn: 'root',
})
export class LedService {
  constructor(
    private readonly bluetooth: BluetoothService,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController
  ) {
    this.setupMessageListener();
  }

  setupMessageListener() {
    this.bluetooth.history$
      .pipe(
        filter((n) => Boolean(!n.sent && n.valid)),
        filter((n) => Comm.Meta.of(n.value[2]).isMessage())
      )
      .subscribe((envelope: HistoryEntry<string, Comm.Meta>) => {
        this.handleControllerUserMessage(
          // eslint-disable-next-line @typescript-eslint/dot-notation
          envelope.value[1]['o'],
          Comm.Meta.of(envelope.value[2])
        );
      });
  }

  async handleControllerUserMessage(message: string, meta: Comm.Meta) {
    const toast = await (meta.isException()
      ? this.toastController.create({
          header: 'Controller exception',
          color: 'danger',
          message,
          keyboardClose: true,
          duration: 2e3,
          buttons: ['OK'],
          position: 'top',
        })
      : this.toastController.create({
          header: message,
        }));

    toast.present();
  }

  async ping() {
    let success = false;
    const prompt = await this.alertController.create({
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
      const response = await this.bluetooth.send<Comm.PingResponse>({
        expectResponse: true,
        spec: class Ping extends Number {
          static operation = Comm.KnownOperation.ping;

          valueOf() {
            return Date.now();
          }
        },
      });

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

  async getState() {
    return this.bluetooth.send<Comm.StateResponse>({
      expectResponse: true,
      spec: class GetState {
        static operation = Comm.KnownOperation.getState;
      },
    });
  }

  async getEffects() {
    return this.bluetooth.send<Comm.EffectsResponse>({
      expectResponse: true,
      spec: class GetEffects {
        static operation = Comm.KnownOperation.getEffects;
      },
    });
  }

  async setEffect(effectName: string) {
    return this.bluetooth.send({
      expectResponse: false,
      spec: class SetEffect extends String {
        static operation = Comm.KnownOperation.setEffect;
        toString() {
          return effectName;
        }
      },
    });
  }

  async configureEffect(changes: { [key: string]: any }) {
    return this.bluetooth.send({
      expectResponse: false,
      spec: class ConfigureEffect {
        static operation = Comm.KnownOperation.configureEffect;

        constructor() {
          Object.assign(this, changes);
        }
      },
    });
  }

  async brightness(newBrightness: number, smooth: boolean = false) {
    return this.bluetooth.send({
      expectResponse: false,
      spec: class SetBrightness extends Number {
        static operation = Comm.KnownOperation.setBrightness;
        static meta = Comm.Meta.of({
          smooth,
        });

        valueOf() {
          return newBrightness;
        }
      },
    });
  }
}
