import "jsr:@std/dotenv/load";

/**
 * Application configuration loaded from environment variables
 */
export interface Config {
  anthropicApiKey: string;
  port: number;
  maxConcurrentRequests: number;
  maxQueueSize: number;
  llmTimeoutMs: number;
  databasePath: string;
  logLevel: string;
}

/**
 * Load configuration from environment variables with defaults
 */
export function loadConfig(): Config {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required. " +
        "Please set it in .env file or environment.",
    );
  }

  return {
    anthropicApiKey,
    port: parseInt(Deno.env.get("PORT") || "8000", 10),
    maxConcurrentRequests: parseInt(
      Deno.env.get("MAX_CONCURRENT_REQUESTS") || "10",
      10,
    ),
    maxQueueSize: parseInt(Deno.env.get("MAX_QUEUE_SIZE") || "100", 10),
    llmTimeoutMs: parseInt(Deno.env.get("LLM_TIMEOUT_MS") || "30000", 10),
    databasePath: Deno.env.get("DATABASE_PATH") || "./data/analyses.db",
    logLevel: Deno.env.get("LOG_LEVEL") || "info",
  };
}
