/**
 * Custom error class for validation errors (400)
 */
export class ValidationError extends Error {
  status = 400;

  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Custom error class for payload too large (413)
 */
export class PayloadTooLargeError extends Error {
  status = 413;

  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Custom error class for service unavailable (503)
 */
export class ServiceUnavailableError extends Error {
  status = 503;

  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

/**
 * Custom error class for gateway timeout (504)
 */
export class GatewayTimeoutError extends Error {
  status = 504;

  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "GatewayTimeoutError";
  }
}

/**
 * Type guard for custom errors with status
 */
export function hasStatus(
  error: unknown
): error is Error & { status: number; details?: Record<string, unknown> } {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof (error as { status?: number }).status === "number"
  );
}
