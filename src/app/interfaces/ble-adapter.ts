import { LoggerService } from '../services/logger.service';
import Comm from './comm';

export type RemoveListenerFunction = () => void;

export interface SendOptionsForAdapter<P, M extends Comm.Meta> {
  spec: Comm.Operation<P, M>;
  to: BLECharacteristicsAdapter;
  expectResponse: boolean;
}

export interface BLEAdapter {
  readonly connected: boolean;

  connect(targetService: string): Promise<void>;
  pairNew(targetService: string): Promise<void>;
  disconnect(): Promise<void>;

  onConnected(connectedFn: () => any): RemoveListenerFunction;
  onDisconnected(disconnectFn: () => any): RemoveListenerFunction;

  send<P = unknown, M extends Comm.Meta = any>(
    options: SendOptionsForAdapter<P, M>
  ): Promise<Comm.Envelope<P, M>>;

  getService(serviceUUID: string): Promise<BLEServiceAdapter>;
}

export interface BLEServiceAdapter {
  uuid: string;
  getCharacteristic(
    characteristicsUUID: string
  ): Promise<BLECharacteristicsAdapter>;
}

export interface BLECharacteristicsAdapter {
  uuid: string;
  lastValue: ArrayBuffer | undefined;

  readValue(): Promise<ArrayBuffer>;
  writeValue(v: Uint8Array): Promise<void>;

  startNotifications(): Promise<void>;
  stopNotifications(): Promise<void>;

  onNotify(notifyFn: (event: Event) => any);
}
