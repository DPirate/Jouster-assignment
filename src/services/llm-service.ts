import Anthropic from "@anthropic-ai/sdk";
import { Metadata } from "../models/metadata.ts";
import {
  ServiceUnavailableError,
  GatewayTimeoutError,
} from "../middleware/error-handler.ts";
import { logger } from "../utils/logger.ts";

/**
 * LLM Provider interface for abstraction
 */
export interface LLMProvider {
  generateSummary(text: string): Promise<string>;
  extractMetadata(text: string): Promise<Metadata>;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Claude LLM Provider implementation
 */
export class ClaudeLLMProvider implements LLMProvider {
  private client: Anthropic;
  private timeoutMs: number;

  constructor(apiKey: string, timeoutMs = 30000) {
    this.client = new Anthropic({ apiKey });
    this.timeoutMs = timeoutMs;
  }

  /**
   * Generate summary with short text optimization (FR-003)
   * If text < 20 words, return original as summary
   */
  async generateSummary(text: string): Promise<string> {
    const wordCount = countWords(text);

    // Short text optimization: return original if < 20 words
    if (wordCount < 20) {
      logger.info("Short text detected, returning original as summary", {
        wordCount,
      });
      return text;
    }

    try {
      const response = await this.callClaude(
        `Provide a 1-2 sentence summary of the following text:\n\n${text}`
      );

      return response.trim();
    } catch (error) {
      logger.error("Failed to generate summary", error as Error);
      throw error;
    }
  }

  /**
   * Extract metadata (title, topics, sentiment)
   */
  async extractMetadata(text: string): Promise<Metadata> {
    try {
      const prompt = `Analyze the following text and extract:
1. Title (if any, otherwise null)
2. Exactly 3 key topics
3. Sentiment (positive, neutral, or negative)

Return only a JSON object with this exact structure:
{
  "title": "string or null",
  "topics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive or neutral or negative"
}

Text to analyze:
${text}`;

      const response = await this.callClaude(prompt);

      // Parse JSON response
      const metadata = JSON.parse(response);

      // Validate structure
      if (
        !metadata.topics ||
        !Array.isArray(metadata.topics) ||
        metadata.topics.length !== 3
      ) {
        throw new Error("Invalid metadata structure: topics must be array of 3");
      }

      if (!["positive", "neutral", "negative"].includes(metadata.sentiment)) {
        throw new Error("Invalid sentiment value");
      }

      return {
        title: metadata.title || null,
        topics: metadata.topics,
        sentiment: metadata.sentiment,
        keywords: [], // Filled by keyword service
      };
    } catch (error) {
      logger.error("Failed to extract metadata", error as Error);
      if (error instanceof SyntaxError) {
        throw new Error("Failed to process LLM response");
      }
      throw error;
    }
  }

  /**
   * Call Claude API with timeout and error handling
   */
  private async callClaude(prompt: string): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new GatewayTimeoutError("Analysis request timed out, please try again"));
      }, this.timeoutMs);
    });

    try {
      const messagePromise = this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const message = await Promise.race([messagePromise, timeoutPromise]);

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      return content.text;
    } catch (error) {
      // Handle timeout
      if (error instanceof GatewayTimeoutError) {
        throw error;
      }

      // Handle API errors
      const err = error as Error;
      if (err.message?.includes("authentication") || err.message?.includes("API key")) {
        throw new ServiceUnavailableError("LLM service authentication failed");
      }

      if (err.message?.includes("rate limit") || err.message?.includes("overloaded")) {
        throw new ServiceUnavailableError(
          "LLM service temporarily unavailable, please try again later"
        );
      }

      // Generic service error
      throw new ServiceUnavailableError(
        "LLM service temporarily unavailable, please try again later"
      );
    }
  }
}
