# Data Model: Topic Search Endpoint

**Feature**: 002-topic-search  
**Date**: 2025-10-23  
**Status**: Complete

## Overview

This document defines the data structures, entities, and validation rules for the GET /search endpoint. The feature primarily reuses existing entities from feature 001-analyze-endpoint and introduces minimal new types for search-specific concerns.

---

## Entities

### SearchQuery (NEW)

**Purpose**: Represents the input parameters for a search request

**TypeScript Definition**:
```typescript
export interface SearchQuery {
  topic: string;      // Required search term
  limit?: number;     // Optional result limit
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | Yes | Search term to match against topics array (case-insensitive substring match) |
| `limit` | number | No | Maximum number of results to return (default: unlimited) |

**Validation Rules**:
- `topic`:
  - MUST NOT be null or undefined
  - MUST NOT be empty string after trimming
  - MUST be ≤ 100 characters
  - Type: string
- `limit`:
  - If provided, MUST be a positive integer (≥ 1)
  - If invalid, return 400 Bad Request
  - Type: number

**Examples**:
```typescript
// Valid queries
{ topic: "technology" }
{ topic: "AI", limit: 10 }
{ topic: "tech" }  // matches "Technology", "Fintech", etc.

// Invalid queries
{ topic: "" }                    // Empty topic → 400
{ topic: "x".repeat(101) }       // Too long → 413
{ topic: "tech", limit: 0 }      // Invalid limit → 400
{ topic: "tech", limit: "abc" }  // Non-numeric limit → 400
```

---

### SearchResult (NEW)

**Purpose**: Represents the output of a search operation

**TypeScript Definition**:
```typescript
export type SearchResult = Analysis[];
```

**Structure**: Array of `Analysis` entities (defined below)

**Characteristics**:
- Empty array `[]` when no matches found (200 OK status)
- Results ordered by `createdAt` DESC (newest first)
- Limited to `limit` parameter if provided
- Always returns complete `Analysis` objects (not partial)

---

### Analysis (EXISTING - Reused)

**Purpose**: Represents a previously analyzed text with LLM-generated metadata

**Source**: Defined in feature 001-analyze-endpoint

**TypeScript Definition**:
```typescript
export interface Analysis {
  id: string;
  text: string;
  summary: string;
  metadata: Metadata;
  createdAt: string;
}
```

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID v4 identifier |
| `text` | string | Original input text |
| `summary` | string | LLM-generated summary |
| `metadata` | Metadata | LLM-generated metadata including topics array |
| `createdAt` | string | ISO 8601 timestamp |

**Usage in Search**: Returned as-is from database, no transformations

---

### Metadata (EXISTING - Reused)

**Purpose**: Structured metadata extracted by LLM

**Source**: Defined in feature 001-analyze-endpoint

**TypeScript Definition**:
```typescript
export interface Metadata {
  title: string | null;
  topics: string[];              // ← Search target field
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[];
}
```

**Search-Relevant Fields**:
- `topics`: String array searched by GET /search endpoint
  - Example: `["Technology", "Artificial Intelligence", "Innovation"]`
  - Case-insensitive substring matching applied to each topic
  - Any topic in array matching the search term qualifies the Analysis

---

## Database Schema

### analyses Table (EXISTING + EXTENSION)

**Existing Schema** (from feature 001):
```sql
CREATE TABLE analyses (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL CHECK(length(text) > 0 AND length(text) <= 50000),
  summary TEXT NOT NULL,
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_created_at ON analyses(created_at DESC);
```

**Extension for Feature 002** (NEW):
```sql
-- Add generated column for efficient searching
ALTER TABLE analyses ADD COLUMN topics_searchable TEXT 
  GENERATED ALWAYS AS (LOWER(json_extract(metadata, '$.topics'))) STORED;

-- Add index on generated column
CREATE INDEX idx_topics_searchable ON analyses(topics_searchable);
```

**Migration Notes**:
- Generated column automatically computes for existing rows
- No data backfill required
- Index creation may take a few seconds for large tables
- Storage overhead: ~50-100 bytes per row

---

## Data Flow

### Search Request Flow

```
1. HTTP GET /search?topic=tech&limit=5
   ↓
2. Oak router extracts query params
   ↓
3. Validator middleware: validateSearchQuery()
   - Validates topic (non-empty, ≤100 chars)
   - Validates limit (positive integer if provided)
   ↓
4. SearchService.search(topic, limit)
   ↓
5. AnalysisRepository.searchByTopic(topic, limit)
   - Executes SQL query with generated column
   - WHERE topics_searchable LIKE '%tech%'
   - ORDER BY created_at DESC
   - LIMIT 5
   ↓
6. Map database rows to Analysis[] objects
   ↓
7. Return 200 OK with SearchResult (Analysis[])
```

### Error Flow

```
1. Invalid input (missing topic, limit=0, etc.)
   ↓
2. Validator throws ValidationError/PayloadTooLargeError
   ↓
3. Error handler middleware catches exception
   ↓
4. Returns 400/413 with ErrorResponse JSON
```

---

## Validation Rules Summary

### Input Validation

| Rule | Field | Validation | Error Code | Error Message |
|------|-------|------------|------------|---------------|
| VR-001 | topic | Must be present | 400 | "Topic parameter is required" |
| VR-002 | topic | Must not be empty (after trim) | 400 | "Topic parameter cannot be empty" |
| VR-003 | topic | Length ≤ 100 characters | 413 | "Topic parameter must be 100 characters or less" |
| VR-004 | limit | Must be positive integer if provided | 400 | "Limit parameter must be a positive integer" |
| VR-005 | limit | Omitted = unlimited (no default value applied) | N/A | N/A |

### Output Constraints

| Rule | Field | Constraint |
|------|-------|------------|
| OR-001 | SearchResult | Always an array (never null) |
| OR-002 | SearchResult | Empty array `[]` when no matches |
| OR-003 | SearchResult | Maximum length = `limit` parameter |
| OR-004 | SearchResult | Sorted by `createdAt` DESC |
| OR-005 | Analysis objects | Complete objects (all fields present) |

---

## Relationships

### Entity Relationships

```
SearchQuery
    ↓ (input to)
SearchService.search()
    ↓ (queries)
AnalysisRepository
    ↓ (returns)
SearchResult (Analysis[])
    ↓ (each contains)
Analysis
    ↓ (includes)
Metadata (with topics[])
```

### Data Dependencies

- **SearchQuery → Analysis**: One-to-many (one query can match multiple analyses)
- **Analysis → Metadata**: One-to-one (each analysis has exactly one metadata object)
- **Metadata → topics**: One-to-many (metadata contains array of topic strings)

---

## Examples

### Example 1: Successful Search with Results

**Request**:
```
GET /search?topic=technology
```

**Query Execution**:
```sql
SELECT id, text, summary, metadata, created_at
FROM analyses
WHERE topics_searchable LIKE '%technology%'
ORDER BY created_at DESC;
```

**Response** (200 OK):
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "text": "Artificial intelligence is transforming...",
    "summary": "AI is revolutionizing industries...",
    "metadata": {
      "title": null,
      "topics": ["Technology", "Artificial Intelligence"],
      "sentiment": "positive",
      "keywords": ["AI", "transformation", "innovation"]
    },
    "createdAt": "2025-10-23T15:30:00.000Z"
  },
  {
    "id": "987e6543-e21b-98c7-d654-321456789abc",
    "text": "Fintech companies are leveraging technology...",
    "summary": "Financial technology sector growth...",
    "metadata": {
      "title": "Fintech Revolution",
      "topics": ["Finance", "Technology", "Innovation"],
      "sentiment": "positive",
      "keywords": ["fintech", "technology", "banking"]
    },
    "createdAt": "2025-10-23T14:20:00.000Z"
  }
]
```

### Example 2: Search with Limit

**Request**:
```
GET /search?topic=AI&limit=1
```

**Response** (200 OK):
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "text": "Artificial intelligence is transforming...",
    "summary": "AI is revolutionizing industries...",
    "metadata": {
      "title": null,
      "topics": ["Technology", "Artificial Intelligence"],
      "sentiment": "positive",
      "keywords": ["AI", "transformation", "innovation"]
    },
    "createdAt": "2025-10-23T15:30:00.000Z"
  }
]
```

### Example 3: No Results

**Request**:
```
GET /search?topic=nonexistent
```

**Response** (200 OK):
```json
[]
```

### Example 4: Validation Error

**Request**:
```
GET /search?topic=&limit=5
```

**Response** (400 Bad Request):
```json
{
  "error": "Topic parameter cannot be empty",
  "details": {
    "parameter": "topic",
    "received": ""
  }
}
```

### Example 5: Case-Insensitive Matching

**Request**:
```
GET /search?topic=TECH
```

**Behavior**: Matches "Technology", "tech", "Fintech", "biotech" (any case variation, substring match)

---

## Performance Considerations

### Query Performance

- **Index Usage**: `idx_topics_searchable` for WHERE clause, `idx_created_at` for ORDER BY
- **Expected Latency**: <1ms for filtering + <0.5ms for sorting = <2ms total (10K records)
- **Concurrency**: Read-only queries, no locking, supports 100+ concurrent requests

### Storage Overhead

- **Generated Column**: ~50-100 bytes per row
- **Index Size**: ~5-10KB per 1000 rows
- **Total Overhead**: <1MB for 10K rows

### Scalability

- **Current Approach**: Scales efficiently to ~50K records
- **Beyond 50K**: May require query result caching or pagination enhancements

---

## Future Enhancements (Out of Scope)

These data model extensions are NOT part of this feature but documented for future consideration:

1. **Pagination**: Add `offset` parameter for cursor-based pagination
2. **Multiple Topics**: Support filtering by multiple topics (AND/OR logic)
3. **Date Filtering**: Add `fromDate`/`toDate` parameters
4. **Sentiment Filtering**: Add `sentiment` parameter
5. **Full-Text Search**: Extend to search across `text` and `summary` fields

---

## Summary

| Entity | Purpose | Status |
|--------|---------|--------|
| SearchQuery | Input parameters | NEW |
| SearchResult | Output array | NEW (type alias) |
| Analysis | Search result item | EXISTING (reused) |
| Metadata | Contains topics array | EXISTING (reused) |
| topics_searchable | Database search column | NEW (generated column) |

**Key Design Decisions**:
- Minimal new types (SearchQuery only)
- Maximum reuse of existing entities
- Database schema extension via generated column (non-breaking)
- Consistent validation patterns with feature 001
