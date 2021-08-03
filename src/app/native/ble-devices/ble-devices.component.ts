import { Component, Input, OnInit } from '@angular/core';
import {
  BluetoothCallbackType,
  BluetoothLE,
  BluetoothMatchMode,
  BluetoothMatchNum,
  BluetoothScanMode,
  DeviceInfo,
  ScanStatus,
} from '@ionic-native/bluetooth-le/ngx';
import { Observable } from 'rxjs';
import { filter, tap } from 'rxjs/operators';
import { displayError } from 'src/app/util/error';

@Component({
  selector: 'app-ble-devices',
  templateUrl: './ble-devices.component.html',
  styleUrls: ['./ble-devices.component.scss'],
})
export class BleDevicesComponent implements OnInit {
  @Input()
  targetService: string;

  devices$: Observable<ScanStatus>;

  possibleDevices: DeviceInfo[] | null = null;

  isInitializing = false;
  isScanning = false;

  constructor(private readonly ble: BluetoothLE) {}

  async ngOnInit() {
    this.isScanning = (await this.ble.isScanning())?.isScanning;
    this.scan();
  }

  async scan() {
    try {
      await this.stopScan();
    } catch (e) {}

    this.isInitializing = true;

    try {
      const connected = (await this.ble.retrieveConnected()) as any as any[];

      const appConnected = this.ble.connect(connected[0]);
      appConnected.subscribe((c) => {
        debugger;
      });

      const devices = await Promise.all(
        connected.map((d) => this.ble.discover({ address: d.address }))
      );

      debugger;

      // this.devices$ = this.ble.startScan({});

      // this.isInitializing = false;

      // await this.ble.isScanning;
      // this.devices$.subscribe((d) => {
      //   switch (d.status) {
      //     case 'scanStarted': {
      //       this.possibleDevices = [];
      //       this.possibleDevices.push(...devices);
      //       return;
      //     }
      //     case 'scanResult':
      //       return this.possibleDevices?.push(d);
      //     case 'scanStopped':
      //       this.possibleDevices = null;
      //       this.isScanning = false;
      //       return;
      //   }
      // });
    } catch (e) {
      displayError(e);
    } finally {
      this.isInitializing = false;
    }
  }

  async stopScan() {
    await this.ble.stopScan();
  }
}
