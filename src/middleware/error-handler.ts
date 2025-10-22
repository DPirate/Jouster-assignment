/**
 * Custom error class for validation errors (400)
 */
export class ValidationError extends Error {
  status = 400;

  constructor(
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Custom error class for payload too large (413)
 */
export class PayloadTooLargeError extends Error {
  status = 413;

  constructor(
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Custom error class for service unavailable (503)
 */
export class ServiceUnavailableError extends Error {
  status = 503;

  constructor(
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

/**
 * Custom error class for gateway timeout (504)
 */
export class GatewayTimeoutError extends Error {
  status = 504;

  constructor(
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GatewayTimeoutError";
  }
}

/**
 * Type guard for custom errors with status
 */
export function hasStatus(
  error: unknown,
): error is Error & { status: number; details?: Record<string, unknown> } {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof (error as { status?: number }).status === "number"
  );
}

/**
 * Oak middleware for global error handling
 * Catches errors, maps to HTTP status codes, returns ErrorResponse JSON
 */
import { Context } from "oak";
import { ErrorResponse } from "../models/error-response.ts";
import { logger } from "../utils/logger.ts";

export async function errorHandler(
  ctx: Context,
  next: () => Promise<unknown>,
): Promise<void> {
  try {
    await next();
  } catch (error) {
    const err = error as Error;

    // Default to 500 Internal Server Error
    let status = 500;
    let message = "Internal server error";
    let details: Record<string, unknown> | undefined;

    // Check if custom error with status
    if (hasStatus(err)) {
      status = err.status;
      message = err.message;
      details = err.details;
    } else {
      // Log unexpected errors
      message = "Failed to process request";
      details = { error: err.message };
    }

    // Log error
    logger.error(`Request failed: ${message}`, err, {
      status,
      path: ctx.request.url.pathname,
      method: ctx.request.method,
    });

    // Return ErrorResponse
    const response: ErrorResponse = {
      error: message,
      ...(details && { details }),
    };

    ctx.response.status = status;
    ctx.response.body = response;
    ctx.response.type = "application/json";
  }
}
