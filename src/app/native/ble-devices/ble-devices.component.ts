import { BluetoothService } from './../../services/bluetooth.service';
import { Component, Input, NgZone, OnInit } from '@angular/core';
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
import { LoggerService } from 'src/app/services/logger.service';

@Component({
  selector: 'app-ble-devices',
  templateUrl: './ble-devices.component.html',
  styleUrls: ['./ble-devices.component.scss'],
})
export class BleDevicesComponent implements OnInit {
  @Input()
  targetService: string;

  devices$: Observable<ScanStatus>;

  devices: any[];

  isInitializing = false;
  isScanning = false;
  toastCtrl: any;
  statusMessage: any;

  @Input()
  modal: any;

  constructor(
    private readonly logger: LoggerService,
    private readonly ble: BLE,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {
    this.scan();
  }
  dismissModal() {
    this.modal.dismiss();
  }

  async stopScan() {
    await this.ble.stopScan();
    this.isScanning = false;
  }

  scan() {
    this.logger.log('Scanning for Bluetooth LE Devices');

    this.devices = [];

    const scanning$ = this.ble.startScan([]);

    this.isScanning = true;

    scanning$.subscribe((device) => {
      this.ngZone.run(() => {
        this.devices.push(device);
      });
    }, displayError);
  }
}
