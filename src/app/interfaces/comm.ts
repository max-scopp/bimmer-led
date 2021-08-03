/* eslint-disable @typescript-eslint/no-namespace */
namespace Comm {
  export type Any =
    | string
    | number
    | boolean
    | Any[]
    | { [key: string]: Any }
    | unknown;

  export class Meta {
    [key: string]: any;

    static of(meta: any) {
      return Object.assign(new Meta(), meta);
    }

    isMessage() {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      return !!this['__MSG__'];
    }

    isException() {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      return !!this['__EX__'];
    }
  }

  export interface Operation<P, M extends Meta> {
    meta?: M;
    operation: number;
    new (): P;
  }

  export type Envelope<P, M = undefined> = [number, P, M | undefined];

  export enum KnownOperation {
    ping = 0,
    getAbout = 1,
    getState = 2,
    configureStrips = 3,
    configureBluetooth = 4,
    setBrightness = 5,
    getEffects = 6,
    setEffect = 7,
    configureEffect = 8,
  }

  export interface PingResponse {
    pong: number;
  }

  export interface EffectsResponse {
    e: string[];
  }

  export interface StateResponse {
    /**
     * brightness
     */
    b: number;

    /**
     * active effect
     */
    e: string;

    /**
     * effect configuration
     */
    ec: { [key: string]: any };
  }
}

export default Comm;
