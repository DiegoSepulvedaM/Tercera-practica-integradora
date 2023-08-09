declare module "length-stream" {
  import { Transform } from "stream";

  class LengthStream extends Transform {
    constructor(callback?: (length: number) => void);
  }

  export = LengthStream;
}
