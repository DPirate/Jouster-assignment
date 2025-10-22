import { Context } from "oak";
import { AnalysisRequest } from "../models/analysis-request.ts";
import { AnalysisResponse } from "../models/analysis-result.ts";
import { validateAnalysisRequest } from "../middleware/validator.ts";
import { AnalysisService } from "../services/analysis-service.ts";
import { AnalysisRepository } from "../db/analysis-repository.ts";
import { RequestQueue } from "../middleware/request-queue.ts";
import { logger } from "../utils/logger.ts";

/**
 * POST /analyze route handler
 * Validates, queues, analyzes, persists, and returns response
 */
export async function handleAnalyze(
  ctx: Context,
  analysisService: AnalysisService,
  repository: AnalysisRepository,
  queue: RequestQueue
): Promise<void> {
  // Parse request body
  const body = await ctx.request.body().value as AnalysisRequest;

  // Validate request (T015)
  validateAnalysisRequest(body);

  // Queue and process request (T038)
  const analysis = await queue.process(async () => {
    logger.info("Processing analysis request", {
      textLength: body.text.length,
    });

    // Analyze text (T037)
    const result = await analysisService.analyze(body.text);

    // Persist to database (T022)
    repository.save(result);

    return result;
  });

  // Return response
  const response: AnalysisResponse = analysis;
  ctx.response.status = 200;
  ctx.response.body = response;
  ctx.response.type = "application/json";

  logger.info("Analysis request completed", { id: analysis.id });
}
