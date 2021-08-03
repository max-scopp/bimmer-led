import {
  BLEAdapter,
  BLEServiceAdapter,
  RemoveListenerFunction,
  SendOptionsForAdapter,
} from 'src/app/interfaces/ble-adapter';
import Comm from 'src/app/interfaces/comm';
import { LoggerService } from '../logger.service';

export class BLENativeAdapter implements BLEAdapter {
  connected: boolean;

  constructor(private readonly logger: LoggerService) {}

  onConnected(connectedFn: () => any): RemoveListenerFunction {
    throw new Error('Method not implemented.');
  }
  onDisconnected(disconnectFn: () => any): RemoveListenerFunction {
    throw new Error('Method not implemented.');
  }

  async connect(targetService: string) {
    throw new Error('Method not implemented.');
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
