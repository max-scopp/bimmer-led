/* eslint-disable @typescript-eslint/no-namespace */
namespace Comm {
  export type Any =
    | string
    | number
    | boolean
    | Any[]
    | { [key: string]: Any }
    | unknown;

  export interface Operation<P, M = unknown> {
    meta?: M;
    operation: number | string;
    new (): P;
  }

  export interface PingResponse {
    pong: number;
  }
}

export default Comm;
