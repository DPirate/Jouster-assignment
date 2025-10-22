import { Database } from "sqlite";
import { logger } from "../utils/logger.ts";

/**
 * Initialize SQLite database with schema
 */
export function initializeDatabase(path: string): Database {
  logger.info("Initializing database", { path });

  const db = new Database(path);

  // Create analyses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL CHECK(length(text) > 0 AND length(text) <= 50000),
      summary TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create index for chronological queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_created_at ON analyses(created_at DESC);
  `);

  logger.info("Database initialized successfully");

  return db;
}
