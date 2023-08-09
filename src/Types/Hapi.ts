import {
  Lifecycle,
  HandlerDecorations,
  Request,
  ResponseToolkit,
} from "@hapi/hapi";

export interface HapiHandler extends Lifecycle.Method, HandlerDecorations {
  (request: Request, h: ResponseToolkit): Lifecycle.ReturnValue;
}
