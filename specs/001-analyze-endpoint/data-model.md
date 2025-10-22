# Data Model: Analyze Endpoint

**Feature**: Analyze Endpoint  
**Date**: 2025-10-22  
**Phase**: 1 - Data Model Design

## Overview

This document defines the data structures, database schema, and TypeScript types for the analyze endpoint feature.

## Entities

### 1. Analysis (Persisted Entity)

**Description**: Represents a single text analysis operation with all extracted information

**TypeScript Type**:
```typescript
interface Analysis {
  id: string;              // UUID v4
  text: string;            // Original input text (up to 50,000 chars)
  summary: string;         // 1-2 sentence summary
  metadata: Metadata;      // Structured extraction results
  createdAt: string;       // ISO 8601 timestamp
}
```

**SQLite Schema**:
```sql
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL CHECK(length(text) > 0 AND length(text) <= 50000),
  summary TEXT NOT NULL,
  metadata TEXT NOT NULL,  -- JSON string
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_created_at ON analyses(created_at DESC);
```

**Validation Rules**:
- `id`: Must be valid UUID v4 format
- `text`: 1-50,000 characters, non-empty
- `summary`: Non-empty string
- `metadata`: Valid JSON conforming to Metadata schema
- `created_at`: ISO 8601 format with timezone

**Relationships**: None (single table design for simplicity)

---

### 2. Metadata (Nested Structure)

**Description**: Structured data extracted from analyzed text

**TypeScript Type**:
```typescript
interface Metadata {
  title: string | null;          // Extracted title or null
  topics: string[];              // Array of exactly 3 topic strings
  sentiment: Sentiment;          // Enum: "positive" | "neutral" | "negative"
  keywords: string[];            // Array of 0-3 most frequent nouns
}

type Sentiment = "positive" | "neutral" | "negative";
```

**Storage**: Serialized as JSON string in `analyses.metadata` column

**Validation Rules**:
- `title`: String or null, if present must be non-empty
- `topics`: Array with exactly 3 elements, each non-empty string
- `sentiment`: Must be one of: "positive", "neutral", "negative"
- `keywords`: Array with 0-3 elements, each non-empty string

**Example JSON**:
```json
{
  "title": "The Future of Artificial Intelligence",
  "topics": ["technology", "machine learning", "innovation"],
  "sentiment": "positive",
  "keywords": ["intelligence", "systems", "data"]
}
```

---

### 3. AnalysisRequest (Request DTO)

**Description**: Incoming HTTP request structure

**TypeScript Type**:
```typescript
interface AnalysisRequest {
  text: string;  // Required, 1-50,000 characters
}
```

**Validation Rules**:
- `text` field must be present
- `text` must be non-null
- `text` must be non-empty (after trimming)
- `text` must not exceed 50,000 characters

**HTTP Representation**:
```json
POST /analyze
Content-Type: application/json

{
  "text": "Your text to analyze here..."
}
```

---

### 4. AnalysisResponse (Response DTO)

**Description**: HTTP response structure for successful analysis

**TypeScript Type**:
```typescript
interface AnalysisResponse {
  id: string;
  text: string;
  summary: string;
  metadata: Metadata;
  createdAt: string;
}
```

**HTTP Representation**:
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Original input text...",
  "summary": "A concise 1-2 sentence summary of the text.",
  "metadata": {
    "title": "Extracted Title",
    "topics": ["topic1", "topic2", "topic3"],
    "sentiment": "positive",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "createdAt": "2025-10-22T14:30:00.000Z"
}
```

---

### 5. ErrorResponse (Error DTO)

**Description**: HTTP response structure for errors

**TypeScript Type**:
```typescript
interface ErrorResponse {
  error: string;                    // User-friendly error message
  details?: Record<string, unknown>; // Optional additional context
}
```

**HTTP Representations**:

**400 Bad Request** (Empty input):
```json
{
  "error": "Text input is required and cannot be empty"
}
```

**413 Payload Too Large** (Oversized text):
```json
{
  "error": "Text exceeds maximum length of 50,000 characters",
  "details": {
    "provided": 60000,
    "maximum": 50000
  }
}
```

**503 Service Unavailable** (LLM failure):
```json
{
  "error": "LLM service temporarily unavailable, please try again later"
}
```

**503 Service Unavailable** (Queue full):
```json
{
  "error": "Server at capacity, please try again later",
  "details": {
    "queueSize": 100,
    "concurrent": 10
  }
}
```

**504 Gateway Timeout** (LLM timeout):
```json
{
  "error": "Analysis request timed out, please try again"
}
```

**500 Internal Server Error** (Unexpected failure):
```json
{
  "error": "Failed to process text analysis",
  "details": {
    "requestId": "req-123456"
  }
}
```

---

## State Transitions

Analysis entities have no state machine (immutable once created).

**Lifecycle**:
1. **Request received** → Validate → Queue if needed
2. **Processing starts** → Generate ID → Extract summary & metadata
3. **Processing complete** → Persist to database → Return response
4. **Error occurs** → Return appropriate error response (no persistence)

---

## Data Flow

```
User Request
    ↓
[Validation Middleware]
    ↓ (valid)
[Request Queue] ← (wait if at capacity)
    ↓
[Analysis Service]
    ├→ [LLM Service] → Summary + Metadata (title, topics, sentiment)
    └→ [Keyword Service] → Keywords (3 most frequent nouns)
    ↓
[Combine Results]
    ↓
[Analysis Repository] → SQLite INSERT
    ↓
[Response] → HTTP 200 with Analysis
```

---

## Indexing Strategy

**Primary Index**: `id` (PRIMARY KEY, automatic B-tree index)

**Secondary Index**: `created_at DESC` for future search/filtering by recency

**Rationale**: Currently only need-by-ID lookups, but created_at index supports future GET /search endpoint for chronological queries.

---

## Data Retention

**Policy**: No automatic deletion (prototype scope)

**Future Considerations**:
- Add TTL/expiration for old analyses
- Implement soft deletes
- Add cleanup job for analyses older than N days

---

## Capacity Planning

**Assumptions**:
- Average text size: ~5,000 characters (5KB)
- Average summary: ~200 characters (200 bytes)
- Average metadata: ~500 bytes (JSON)
- Total per analysis: ~5.7KB

**Estimates**:
- 10,000 analyses: ~57MB
- 100,000 analyses: ~570MB
- 1,000,000 analyses: ~5.7GB

SQLite handles this scale efficiently for prototype purposes.

---

## Type Definitions File Structure

```typescript
// src/models/analysis-request.ts
export interface AnalysisRequest {
  text: string;
}

// src/models/analysis-result.ts
export interface Analysis {
  id: string;
  text: string;
  summary: string;
  metadata: Metadata;
  createdAt: string;
}

export type AnalysisResponse = Analysis;

// src/models/metadata.ts
export interface Metadata {
  title: string | null;
  topics: string[];
  sentiment: Sentiment;
  keywords: string[];
}

export type Sentiment = "positive" | "neutral" | "negative";

// src/models/error-response.ts
export interface ErrorResponse {
  error: string;
  details?: Record<string, unknown>;
}
```

---

## Validation Implementation

```typescript
// src/middleware/validator.ts
export function validateAnalysisRequest(req: AnalysisRequest): void {
  if (!req.text) {
    throw new ValidationError("Text input is required and cannot be empty");
  }
  
  const trimmed = req.text.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Text input is required and cannot be empty");
  }
  
  if (trimmed.length > 50000) {
    throw new PayloadTooLargeError(
      "Text exceeds maximum length of 50,000 characters",
      { provided: trimmed.length, maximum: 50000 }
    );
  }
}
```

---

## Database Initialization

```typescript
// src/db/database.ts
export function initializeDatabase(path: string): DB {
  const db = new DB(path);
  
  db.execute(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL CHECK(length(text) > 0 AND length(text) <= 50000),
      summary TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  
  db.execute(`
    CREATE INDEX IF NOT EXISTS idx_created_at ON analyses(created_at DESC);
  `);
  
  return db;
}
```

---

## Summary

- **Single table design** (analyses) for simplicity
- **Metadata stored as JSON** for flexibility
- **UUID primary keys** for uniqueness guarantee
- **TypeScript types** provide compile-time safety
- **Validation at multiple layers**: middleware, database constraints
- **Future-proof indexing** for search endpoint expansion
