/**
 * Incoming HTTP request structure for text analysis
 */
export interface AnalysisRequest {
  /** Text to analyze (required, 1-50,000 characters) */
  text: string;
}
