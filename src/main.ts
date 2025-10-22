import { Application, Router } from "oak";
import { loadConfig } from "./utils/config.ts";
import { logger } from "./utils/logger.ts";
import { initializeDatabase } from "./db/database.ts";
import { AnalysisRepository } from "./db/analysis-repository.ts";
import { ClaudeLLMProvider } from "./services/llm-service.ts";
import { AnalysisService } from "./services/analysis-service.ts";
import { SearchService } from "./services/search-service.ts";
import { RequestQueue } from "./middleware/request-queue.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { handleAnalyze } from "./routes/analyze.ts";
import { handleSearch } from "./routes/search.ts";

/**
 * Main application entry point
 */
async function main() {
  // Load configuration
  const config = loadConfig();
  logger.info("Configuration loaded", {
    port: config.port,
    maxConcurrent: config.maxConcurrentRequests,
    maxQueueSize: config.maxQueueSize,
  });

  // Initialize database
  const db = initializeDatabase(config.databasePath);
  const repository = new AnalysisRepository(db);

  // Initialize LLM provider
  const llmProvider = new ClaudeLLMProvider(
    config.anthropicApiKey,
    config.llmTimeoutMs,
  );

  // Initialize analysis service
  const analysisService = new AnalysisService(
    llmProvider,
    () => repository.generateId(),
  );

  // Initialize search service
  const searchService = new SearchService(repository);

  // Initialize request queue
  const queue = new RequestQueue(
    config.maxConcurrentRequests,
    config.maxQueueSize,
  );

  // Create Oak application
  const app = new Application();

  // Register error handler middleware (must be first)
  app.use(errorHandler);

  // Create router
  const router = new Router();

  // Register routes
  router.post(
    "/analyze",
    (ctx) => handleAnalyze(ctx, analysisService, repository, queue),
  );

  router.get(
    "/search",
    (ctx) => handleSearch(ctx, searchService),
  );

  // Register router
  app.use(router.routes());
  app.use(router.allowedMethods());

  // Start server
  logger.info("Starting HTTP server", { port: config.port });

  console.log(`\n🚀 Server running on http://localhost:${config.port}`);
  console.log(`📊 POST http://localhost:${config.port}/analyze`);
  console.log(`🔍 GET  http://localhost:${config.port}/search?topic=<term>`);
  console.log(`\n⚙️  Configuration:`);
  console.log(`   - Max concurrent requests: ${config.maxConcurrentRequests}`);
  console.log(`   - Max queue size: ${config.maxQueueSize}`);
  console.log(`   - LLM timeout: ${config.llmTimeoutMs}ms`);
  console.log(`   - Database: ${config.databasePath}`);
  console.log(`\nPress Ctrl+C to stop\n`);

  await app.listen({ port: config.port });
}

// Run application
if (import.meta.main) {
  main().catch((error) => {
    logger.error("Application failed to start", error);
    Deno.exit(1);
  });
}
