/**
 * Search query parameters for topic-based search
 */
export interface SearchQuery {
  /** Search term to match against topics (case-insensitive substring matching) */
  topic: string;

  /** Optional limit on number of results to return */
  limit?: number;
}
