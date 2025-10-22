import { Database } from "sqlite";
import { logger } from "../utils/logger.ts";

/**
 * Initialize SQLite database with schema
 */
export function initializeDatabase(path: string): Database {
  logger.info("Initializing database", { path });

  const db = new Database(path);

  // Check if analyses table exists and has topics_searchable column
  const tableInfo = db.prepare(
    "SELECT name FROM pragma_table_info('analyses') WHERE name='topics_searchable'",
  ).get() as [string] | undefined;

  const hasTopicsSearchable = tableInfo !== undefined;

  if (!hasTopicsSearchable) {
    // Table needs migration - check if table exists at all
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='analyses'",
    ).get() as [string] | undefined;

    if (tableExists) {
      // Migrate existing table: backup, drop, recreate with new column
      logger.info("Migrating analyses table to add topics_searchable column");

      db.exec(`
        CREATE TABLE analyses_new (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL CHECK(length(text) > 0 AND length(text) <= 50000),
          summary TEXT NOT NULL,
          metadata TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          topics_searchable TEXT GENERATED ALWAYS AS (LOWER(json_extract(metadata, '$.topics'))) STORED
        );
      `);

      // Copy existing data
      db.exec(`
        INSERT INTO analyses_new (id, text, summary, metadata, created_at)
        SELECT id, text, summary, metadata, created_at FROM analyses;
      `);

      // Drop old table and rename new one
      db.exec(`DROP TABLE analyses;`);
      db.exec(`ALTER TABLE analyses_new RENAME TO analyses;`);

      logger.info("Migration completed successfully");
    } else {
      // Fresh installation - create table with generated column
      db.exec(`
        CREATE TABLE analyses (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL CHECK(length(text) > 0 AND length(text) <= 50000),
          summary TEXT NOT NULL,
          metadata TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          topics_searchable TEXT GENERATED ALWAYS AS (LOWER(json_extract(metadata, '$.topics'))) STORED
        );
      `);
      logger.info("Created analyses table with topics_searchable column");
    }
  } else {
    logger.debug("analyses table already has topics_searchable column");
  }

  // Create index for chronological queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_created_at ON analyses(created_at DESC);
  `);

  // Create index on topics_searchable for fast substring searches (Feature 002)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_topics_searchable ON analyses(topics_searchable);
  `);

  logger.info("Database initialized successfully");

  return db;
}
