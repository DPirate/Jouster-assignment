import { Analysis } from "../models/analysis-result.ts";
import { SearchQuery } from "../models/search-query.ts";
import { AnalysisRepository } from "../db/analysis-repository.ts";
import { validateSearchQuery } from "../middleware/validator.ts";

/**
 * Service for searching analyses by topic
 */
export class SearchService {
  constructor(private repository: AnalysisRepository) {}

  /**
   * Search for analyses matching the given topic
   * @param query Search query with topic and optional limit
   * @returns Array of matching Analysis objects (newest first)
   */
  search(query: SearchQuery): Analysis[] {
    // Validate the search query
    validateSearchQuery(query);

    // Execute search via repository
    return this.repository.searchByTopic(query.topic, query.limit);
  }
}
