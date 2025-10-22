import { AnalysisRequest } from "../models/analysis-request.ts";
import { SearchQuery } from "../models/search-query.ts";
import { PayloadTooLargeError, ValidationError } from "./error-handler.ts";

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
      },
    );
  }
}

/**
 * Validate search query per FR-002, FR-008, FR-012
 */
export function validateSearchQuery(query: SearchQuery): void {
  // Validate topic parameter (FR-002, FR-012)
  if (!query.topic || typeof query.topic !== "string") {
    throw new ValidationError("Topic parameter is required");
  }

  // Check topic is not empty after trimming
  if (query.topic.trim().length === 0) {
    throw new ValidationError("Topic parameter cannot be empty");
  }

  // Check topic length does not exceed 100 characters (FR-012)
  if (query.topic.length > 100) {
    throw new PayloadTooLargeError(
      "Topic parameter must be 100 characters or less",
      {
        provided: query.topic.length,
        maximum: 100,
      },
    );
  }

  // Validate limit parameter if provided (FR-008)
  if (query.limit !== undefined) {
    const limitNum = parseInt(String(query.limit), 10);

    if (isNaN(limitNum) || limitNum < 1) {
      throw new ValidationError(
        "Limit parameter must be a positive integer",
        {
          provided: query.limit,
        },
      );
    }

    // Normalize to number type
    query.limit = limitNum;
  }
}
