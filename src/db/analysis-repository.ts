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

  /**
   * Search analyses by topic with case-insensitive substring matching
   * @param topic Search term to match against topics array (case-insensitive)
   * @param limit Optional maximum number of results to return
   * @returns Array of Analysis objects ordered by created_at DESC (newest first)
   */
  searchByTopic(topic: string, limit?: number): Analysis[] {
    const startTime = Date.now();
    try {
      // Lowercase the search term for case-insensitive matching
      const pattern = `%${topic.toLowerCase()}%`;

      // Build query with optional LIMIT
      const sql = limit
        ? `SELECT id, text, summary, metadata, created_at
           FROM analyses
           WHERE topics_searchable LIKE ?
           ORDER BY created_at DESC
           LIMIT ?`
        : `SELECT id, text, summary, metadata, created_at
           FROM analyses
           WHERE topics_searchable LIKE ?
           ORDER BY created_at DESC`;

      // Execute query
      const stmt = this.db.prepare(sql);
      const rows = limit ? stmt.all(pattern, limit) : stmt.all(pattern);

      // Map rows to Analysis objects
      // Note: .all() returns array of objects {columnName: value}
      const results = (rows as Array<{
        id: string;
        text: string;
        summary: string;
        metadata: string;
        created_at: string;
      }>).map((row) => {
        const metadata: Metadata = JSON.parse(row.metadata);
        return {
          id: row.id,
          text: row.text,
          summary: row.summary,
          metadata,
          createdAt: row.created_at,
        };
      });

      // Log successful query execution (FR-013)
      const executionTime = Date.now() - startTime;
      logger.info("Topic search query executed", {
        topic,
        limit,
        resultCount: results.length,
        executionTimeMs: executionTime,
      });

      return results;
    } catch (error) {
      logger.error("Failed to search analyses by topic", error as Error, {
        topic,
        limit,
      });
      throw new Error("Failed to execute search query");
    }
  }
}
