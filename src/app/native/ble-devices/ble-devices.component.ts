import { BluetoothService } from './../../services/bluetooth.service';
import { Component, Input, OnInit } from '@angular/core';
import { BLE } from '@ionic-native/ble/ngx';
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

  constructor(private readonly ble: BLE) { }

  async ngOnInit() {
    this.scan();
  }

  async scan() {
    try {
      await this.stopScan();
    } catch (e) { }

    this.isInitializing = true;

    try {

      const scanList = this.ble.startScan([]);

      scanList.subscribe(c => {
        this.possibleDevices?.push(c);
        debugger
        const connected = this.ble.connect(c.id);
        connected.subscribe(conn => {
          console.log(conn);
          debugger
        })
      });

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
