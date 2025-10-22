import { AnalysisRequest } from "../models/analysis-request.ts";
import { ValidationError, PayloadTooLargeError } from "./error-handler.ts";

/**
 * Validate analysis request per FR-002
 */
export function validateAnalysisRequest(req: AnalysisRequest): void {
  // Check text field exists
  if (!req.text) {
    throw new ValidationError("Text input is required and cannot be empty");
  }

  // Check text is non-null
  if (req.text === null) {
    throw new ValidationError("Text input is required and cannot be empty");
  }

  // Check text is non-empty after trimming
  const trimmed = req.text.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Text input is required and cannot be empty");
  }

  // Check text length does not exceed 50,000 characters
  if (trimmed.length > 50000) {
    throw new PayloadTooLargeError(
      "Text exceeds maximum length of 50,000 characters",
      {
        provided: trimmed.length,
        maximum: 50000,
      }
    );
  }
}
