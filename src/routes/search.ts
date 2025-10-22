import { Context } from "oak";
import { SearchService } from "../services/search-service.ts";
import { SearchQuery } from "../models/search-query.ts";
import { logger } from "../utils/logger.ts";

/**
 * Handle GET /search requests
 * Returns analyses matching the search topic
 */
export async function handleSearch(
  ctx: Context,
  searchService: SearchService,
): Promise<void> {
  const startTime = Date.now();

  // Extract query parameters
  const topic = ctx.request.url.searchParams.get("topic") || "";
  const limitParam = ctx.request.url.searchParams.get("limit");

  // Build search query
  const query: SearchQuery = {
    topic,
    limit: limitParam ? parseInt(limitParam, 10) : undefined,
  };

  // Execute search (validation happens in service)
  const results = searchService.search(query);

  // Calculate response time
  const responseTime = Date.now() - startTime;

  // Log search request (FR-013)
  logger.info("Search request completed", {
    topic: query.topic,
    limit: query.limit,
    resultCount: results.length,
    responseTimeMs: responseTime,
  });

  // Return results
  ctx.response.status = 200;
  ctx.response.body = results;
}
