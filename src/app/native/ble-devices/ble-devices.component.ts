import { Component, Input, OnInit } from '@angular/core';
import {
  BluetoothLE,
  DeviceInfo,
  ScanStatus,
} from '@ionic-native/bluetooth-le/ngx';
import { Observable } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

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

  ngOnInit() {
    this.scan();
  }

  async scan() {
    this.isInitializing = true;

    try {
      this.devices$ = this.ble.startScan({
        isConnectable: true,
        services: [this.targetService],
      });

      const connected = await this.ble.retrieveConnected({
        services: [this.targetService],
      });

      this.isInitializing = false;

      this.devices$.subscribe((d) => {
        switch (d.status) {
          case 'scanStarted': {
            this.possibleDevices = [];
            this.isScanning = true;

            if (connected.devices) {
              this.possibleDevices.push(...connected.devices);
            }
            return;
          }
          case 'scanResult':
            return this.possibleDevices?.push(d);
          case 'scanStopped':
            this.possibleDevices = null;
            this.isScanning = false;
        }
      });
    } finally {
      this.isInitializing = false;
    }
  }

  async stopScan() {
    await this.ble.stopScan();
  }
}
