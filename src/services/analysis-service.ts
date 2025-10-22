import { Analysis } from "../models/analysis-result.ts";
import { LLMProvider } from "./llm-service.ts";
import { extractKeywords } from "./keyword-service.ts";
import { logger } from "../utils/logger.ts";

/**
 * Analysis service orchestrates LLM and keyword extraction
 */
export class AnalysisService {
  constructor(
    private llmProvider: LLMProvider,
    private generateId: () => string
  ) {}

  /**
   * Analyze text: generate summary, extract metadata, extract keywords
   */
  async analyze(text: string): Promise<Analysis> {
    const startTime = Date.now();
    logger.info("Starting analysis", { textLength: text.length });

    try {
      // Run LLM operations and keyword extraction in parallel
      const [summary, metadata] = await Promise.all([
        this.llmProvider.generateSummary(text),
        this.llmProvider.extractMetadata(text),
      ]);

      // Extract keywords (custom, non-LLM)
      const keywords = extractKeywords(text);

      // Combine results
      const completeMetadata = {
        ...metadata,
        keywords,
      };

      const analysis: Analysis = {
        id: this.generateId(),
        text,
        summary,
        metadata: completeMetadata,
        createdAt: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      logger.info("Analysis completed", {
        id: analysis.id,
        duration: `${duration}ms`,
      });

      return analysis;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Analysis failed", error as Error, {
        duration: `${duration}ms`,
      });
      throw error;
    }
  }
}
