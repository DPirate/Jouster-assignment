import { Metadata } from "./metadata.ts";

/**
 * Complete analysis result stored in database
 */
export interface Analysis {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Original input text */
  text: string;

  /** 1-2 sentence summary */
  summary: string;

  /** Structured metadata */
  metadata: Metadata;

  /** ISO 8601 timestamp */
  createdAt: string;
}

/**
 * HTTP response structure (same as Analysis)
 */
export type AnalysisResponse = Analysis;
