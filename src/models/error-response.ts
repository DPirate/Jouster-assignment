/**
 * HTTP error response structure
 */
export interface ErrorResponse {
  /** User-friendly error message */
  error: string;

  /** Optional additional context */
  details?: Record<string, unknown>;
}
