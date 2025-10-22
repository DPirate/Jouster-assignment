import { Database } from "sqlite";
import { Analysis } from "../models/analysis-result.ts";
import { Metadata } from "../models/metadata.ts";
import { logger } from "../utils/logger.ts";

/**
 * Repository for Analysis CRUD operations
 */
export class AnalysisRepository {
  constructor(private db: Database) {}

  /**
   * Generate a unique UUID v4 identifier
   */
  generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Save an analysis to the database
   */
  save(analysis: Analysis): void {
    try {
      const metadataJson = JSON.stringify(analysis.metadata);

      this.db
        .prepare(
          `INSERT INTO analyses (id, text, summary, metadata, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          analysis.id,
          analysis.text,
          analysis.summary,
          metadataJson,
          analysis.createdAt,
        );

      logger.info("Analysis saved", { id: analysis.id });
    } catch (error) {
      logger.error("Failed to save analysis", error as Error, {
        id: analysis.id,
      });
      throw new Error("Failed to store analysis");
    }
  }

  /**
   * Find an analysis by ID
   */
  findById(id: string): Analysis | null {
    try {
      const row = this.db
        .prepare(
          `SELECT id, text, summary, metadata, created_at
         FROM analyses
         WHERE id = ?`,
        )
        .get(id) as [string, string, string, string, string] | undefined;

      if (!row) {
        return null;
      }

      const [rowId, text, summary, metadataJson, createdAt] = row;
      const metadata: Metadata = JSON.parse(metadataJson);

      return {
        id: rowId,
        text,
        summary,
        metadata,
        createdAt,
      };
    } catch (error) {
      logger.error("Failed to find analysis", error as Error, { id });
      return null;
    }
  }
}
