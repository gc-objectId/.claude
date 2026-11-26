import { Failure } from "runtypes";
import {
  AxiosRequestConfig,
  AxiosResponseHeaders,
  RawAxiosResponseHeaders,
} from "axios";

export type APIError = APIUnknownError | APIValidationError;

export class APIUnknownError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public headers: RawAxiosResponseHeaders | AxiosResponseHeaders,
    public data: any,
  ) {
    super(`APIUnknownError(${status}: ${statusText})`);
  }
}

export class APIValidationError extends Error {
  constructor(
    public failure: Failure,
    public config: AxiosRequestConfig,
    public rawResponseData: any,
  ) {
    super(
      `APIValidationError(source: ${config.url} code: ${failure.code}, message: ${failure.message}, details: ${failure.details})`,
    );
  }
}
