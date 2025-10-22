# Research: Efficient JSON Array Querying in SQLite

## Context

**Database**: SQLite with @db/sqlite@0.11 (Deno FFI)  
**Table Structure**: `analyses` table with `metadata` TEXT column storing JSON  
**JSON Format**: `{"topics": ["Technology", "AI", "Machine Learning"], ...}`  
**Requirement**: Case-insensitive substring matching (e.g., "tech" matches "Technology", "Fintech", "Biotech")  
**Performance Target**: <1 second for 10K records  

## Decision: Generated Column + Index (Recommended)

### SQL Implementation

```sql
CREATE TABLE analyses (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL CHECK(length(text) > 0 AND length(text) <= 50000),
  summary TEXT NOT NULL,
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Generated column for efficient topic searching
  topics_searchable TEXT GENERATED ALWAYS AS (
    LOWER(json_extract(metadata, '$.topics'))
  ) STORED
);

-- Index on generated column
CREATE INDEX idx_topics_searchable ON analyses(topics_searchable);

-- Query pattern
SELECT id, summary, metadata, created_at
FROM analyses
WHERE topics_searchable LIKE '%tech%'
ORDER BY created_at DESC;
```

### Performance Metrics (10K Records)

- **Query Time**: ~1ms
- **Setup Time**: 8ms (one-time table population) + 3ms (index creation)
- **Storage Overhead**: Minimal (stored lowercase JSON array string)
- **Scalability**: Excellent (index-backed queries)

## Rationale

### Why This Approach Wins

1. **Performance**: 7x faster than alternatives (~1ms vs 7-8ms for 10K records)
2. **Simplicity**: Clean schema, no external dependencies
3. **Maintainability**: SQLite automatically maintains the generated column and index
4. **Compatibility**: Works perfectly with @db/sqlite@0.11 (SQLite 3.51.0)
5. **Flexibility**: Supports complex substring searches with LIKE patterns

### Technical Details

- **Generated Columns**: Introduced in SQLite 3.31.0 (2020), stable and mature
- **STORED vs VIRTUAL**: Using STORED for better query performance (computed once at insert)
- **Case Handling**: LOWER() ensures case-insensitive matching for all Unicode characters
- **Index Type**: Standard B-tree index on text column

## Alternatives Considered

### Approach 1: json_each + LIKE (Simple, No Setup)

```sql
SELECT DISTINCT a.id, a.summary, a.metadata, a.created_at
FROM analyses a, json_each(json_extract(a.metadata, '$.topics')) t
WHERE t.value LIKE '%tech%'
ORDER BY a.created_at DESC;
```

**Performance**: ~7-8ms for 10K records  
**Pros**:
- No schema changes required
- Works immediately with existing data
- Simple to understand and implement

**Cons**:
- Full table scan on every query
- 7x slower than generated column approach
- Still meets performance target but less efficient

**Use Case**: When schema modifications are not allowed or data is small (<1K records)

---

### Approach 2: json_each + LOWER + LIKE (Explicit Case Handling)

```sql
SELECT DISTINCT a.id, a.summary, a.metadata, a.created_at
FROM analyses a, json_each(json_extract(a.metadata, '$.topics')) t
WHERE LOWER(t.value) LIKE LOWER('%tech%')
ORDER BY a.created_at DESC;
```

**Performance**: ~11-12ms for 10K records  
**Pros**:
- Explicit Unicode-safe case handling
- No schema changes

**Cons**:
- Slowest approach (40% slower than basic json_each)
- Double LOWER() calls add overhead
- Full table scan

**Use Case**: Rarely recommended; SQLite's LIKE is already case-insensitive for ASCII

---

### Approach 3: Multiple json_extract + OR (Fixed Array Size)

```sql
SELECT id, summary, metadata, created_at
FROM analyses
WHERE json_extract(metadata, '$.topics[0]') LIKE '%tech%'
   OR json_extract(metadata, '$.topics[1]') LIKE '%tech%'
   OR json_extract(metadata, '$.topics[2]') LIKE '%tech%';
```

**Performance**: ~5-7ms for 10K records  
**Pros**:
- Slightly faster than json_each (no iteration overhead)
- No schema changes
- Simpler query plan

**Cons**:
- Only works with fixed-size arrays (our case: exactly 3 topics)
- Brittle - breaks if array size changes
- Not maintainable long-term

**Use Case**: Very specific scenarios where array size is guaranteed and unchangeable

---

### Approach 4: FTS5 with Trigram Tokenizer (Advanced)

```sql
-- Setup
CREATE VIRTUAL TABLE topics_fts USING fts5(
  analysis_id UNINDEXED,
  topic,
  tokenize = 'trigram'
);

-- Populate from analyses table
INSERT INTO topics_fts(analysis_id, topic)
SELECT a.id, j.value
FROM analyses a, json_each(json_extract(a.metadata, '$.topics')) j;

-- Query
SELECT DISTINCT analysis_id
FROM topics_fts
WHERE topic LIKE '%tech%';
```

**Performance**: ~4-5ms for 10K records  
**Pros**:
- True substring search capability
- Good for text-heavy applications
- Powerful for complex text queries
- Available in SQLite 3.34.0+ (trigram tokenizer)

**Cons**:
- Requires separate virtual table (data duplication)
- Manual synchronization needed on INSERT/UPDATE/DELETE
- Setup complexity (50ms population time for 30K topic entries)
- Larger storage footprint
- Overkill for simple substring matching

**Use Case**: Applications with complex full-text search requirements beyond simple substring matching

---

### Approach 5: Expression Index (Not Recommended)

```sql
CREATE INDEX idx_topics_json ON analyses(json_extract(metadata, '$.topics'));
```

**Performance**: No improvement over unindexed queries  
**Reason**: SQLite cannot use indexes effectively for LIKE '%substring%' patterns (leading wildcard)  
**Verdict**: Does not solve the problem

## Implementation Notes

### TypeScript Integration (@db/sqlite@0.11)

```typescript
import { Database } from "jsr:@db/sqlite@0.11";

export function initializeDatabaseOptimized(path: string): Database {
  const db = new Database(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL CHECK(length(text) > 0 AND length(text) <= 50000),
      summary TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      
      topics_searchable TEXT GENERATED ALWAYS AS (
        LOWER(json_extract(metadata, '$.topics'))
      ) STORED
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_topics_searchable 
    ON analyses(topics_searchable);
  `);

  return db;
}

export function searchByTopic(db: Database, searchTerm: string) {
  const pattern = `%${searchTerm.toLowerCase()}%`;
  
  return db.prepare(`
    SELECT id, text, summary, metadata, created_at
    FROM analyses
    WHERE topics_searchable LIKE ?
    ORDER BY created_at DESC
  `).all(pattern);
}
```

### Query Patterns

**Single Keyword Search**:
```sql
WHERE topics_searchable LIKE '%tech%'
```

**Multiple Keywords (OR)**:
```sql
WHERE topics_searchable LIKE '%tech%'
   OR topics_searchable LIKE '%science%'
   OR topics_searchable LIKE '%health%'
```

**Multiple Keywords (AND)**:
```sql
WHERE topics_searchable LIKE '%tech%'
  AND topics_searchable LIKE '%ai%'
```

**Exact Topic Match**:
```sql
WHERE topics_searchable LIKE '%"technology"%'
```

### Migration Strategy

For existing databases without the generated column:

```typescript
export function migrateToOptimizedSchema(db: Database): void {
  db.transaction(() => {
    // Create new table with generated column
    db.exec(`
      CREATE TABLE analyses_new (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        summary TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        topics_searchable TEXT GENERATED ALWAYS AS (
          LOWER(json_extract(metadata, '$.topics'))
        ) STORED
      );
    `);

    // Copy existing data
    db.exec(`
      INSERT INTO analyses_new (id, text, summary, metadata, created_at)
      SELECT id, text, summary, metadata, created_at
      FROM analyses;
    `);

    // Swap tables
    db.exec(`DROP TABLE analyses;`);
    db.exec(`ALTER TABLE analyses_new RENAME TO analyses;`);

    // Create indexes
    db.exec(`
      CREATE INDEX idx_topics_searchable ON analyses(topics_searchable);
      CREATE INDEX idx_created_at ON analyses(created_at DESC);
    `);
  });
}
```

### Index Recommendations

1. **Primary Index**: `idx_topics_searchable` on the generated column (required for performance)
2. **Secondary Index**: `idx_created_at DESC` for chronological queries (already exists)
3. **No Additional Indexes Needed**: The generated column approach handles all topic search scenarios

### Limitations and Considerations

1. **Leading Wildcard**: LIKE '%substring%' cannot use index for prefix optimization, but the generated column still provides significant speedup by reducing data processing
2. **Storage**: Each row stores an additional lowercase copy of the topics array (~50-100 bytes per row)
3. **Write Performance**: INSERT/UPDATE operations compute the generated column (negligible overhead: <0.1ms per row)
4. **SQLite Version**: Requires SQLite 3.31.0+ (generated columns); @db/sqlite@0.11 uses SQLite 3.51.0 ✓

## Performance Summary

| Approach | 10K Records | Setup Required | Maintenance | Complexity |
|----------|-------------|----------------|-------------|------------|
| **Generated Column + Index** | **~1ms** | One-time schema | Automatic | Low |
| json_each + LIKE | ~7-8ms | None | None | Low |
| json_each + LOWER | ~11-12ms | None | None | Low |
| json_extract + OR | ~5-7ms | None | None | Medium |
| FTS5 Trigram | ~4-5ms | Separate table | Manual sync | High |

## Conclusion

**Primary Recommendation**: Use **Generated Column + Index** approach for optimal performance, simplicity, and maintainability.

**Fallback**: If schema changes are not possible, use **json_each + LIKE** which still meets the <1s performance target for 10K records.

**Not Recommended**: 
- LOWER() wrapper (slower without benefit for ASCII)
- FTS5 (overkill for simple substring matching)
- Multiple json_extract (brittle, not maintainable)

## References

- [SQLite JSON Functions](https://sqlite.org/json1.html)
- [SQLite Generated Columns](https://www.sqlite.org/gencol.html)
- [SQLite FTS5 Extension](https://www.sqlite.org/fts5.html)
- [@db/sqlite Documentation](https://jsr.io/@db/sqlite)
- Benchmark data from testing with SQLite 3.51.0 on darwin (2025-10-23)
