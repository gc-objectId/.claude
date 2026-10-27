import { Runtype, Static } from "runtypes";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { isFormData, isObject } from "./predicates";
import { APIError, APIUnknownError } from "../errors/APIError";
import { Either, Left, Right } from "purify-ts";
import { TenantID } from "../types/identifiers";
import { deriveTenantId } from "./tenant";
import * as Sentry from "@sentry/react";

import { logger } from "./logger";

export function reportHttpError(
  status: number,
  method: string | undefined,
  tenantId: string | null | undefined,
) {
  // 406 is an intentional business rejection (e.g. blood bag scan, infusion-only med) —
  // the frontend handles it gracefully, no need to pollute Sentry with expected outcomes.
  if (status === 406) {
    return;
  }
  Sentry.captureException(
    new Error(`HTTP ${status}: ${method?.toUpperCase()}`),
    {
      tags: {
        http_status: String(status),
        tenant: tenantId ?? "unknown",
      },
      level: status >= 500 ? "error" : "warning",
    },
  );
}

export async function $request(
  config: AxiosRequestConfig,
): Promise<Either<APIError, any>>;

export async function $request<TSuccess extends Runtype<any>>(
  config: AxiosRequestConfig,
  successType?: TSuccess,
): Promise<Either<APIError, Static<TSuccess>>>;

export async function $request<
  TSuccess extends Runtype<any>,
  TError extends Runtype<any>,
>(
  config: AxiosRequestConfig,
  successType?: TSuccess,
  errorType?: TError,
): Promise<Either<APIError | Static<TError>, Static<TSuccess>>>;

export async function $request<
  TSuccess extends Runtype<any>,
  TError extends Runtype<any>,
>(
  config: AxiosRequestConfig,
  successType?: TSuccess,
  errorType?: TError,
): Promise<Either<APIError | Static<TError>, Static<TSuccess>>> {
  if (config.data && isObject(config.data) && !isFormData(config.data)) {
    config.data = JSON.stringify(config.data);
  }

  const tenantId = deriveTenantId() as TenantID;

  const { data, status, statusText, headers } = await axios.request<
    any,
    AxiosResponse<Static<TSuccess>>
  >({
    ...config,
    headers: {
      "X-Tenant-Id": tenantId,
      ...(config.headers || {}),
    },
    validateStatus: () => true, // don't throw on error
  });

  if (status >= 400) {
    console.error(
      "API returned an error",
      status,
      config.method?.toUpperCase(),
    );
    logger.debug("API error body", data);
    reportHttpError(status, config.method, tenantId);
    if (errorType?.guard(data)) {
      return Left(data);
    }
    return Left(new APIUnknownError(status, statusText, headers, data));
  }

  if (successType && data) {
    const res = successType.validate(data);

    if (!res.success) {
      console.error(
        `validation failed for response to request '${config.url}' (are the typescript types for ${successType} correct?)`,
        res.code,
        res.message,
        res.details,
      );
      // todo: until we are more sure about the types, just ignore validation results for now
      // return Left(new APIValidationError(res, config, data));
    }
  }

  return Right(data);
}
