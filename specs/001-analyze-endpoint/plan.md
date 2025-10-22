# Implementation Plan: Analyze Endpoint

**Branch**: `001-analyze-endpoint` | **Date**: 2025-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-analyze-endpoint/spec.md`

## Summary

Implement a REST API endpoint (POST /analyze) that accepts unstructured text and returns comprehensive analysis including LLM-generated summary, extracted metadata (title, topics, sentiment), and custom keyword extraction (3 most frequent nouns). The endpoint must handle edge cases gracefully (empty input, LLM failures, oversized text), support concurrent request queuing, and persist all analyses to SQLite with unique identifiers for future retrieval.

## Technical Context

**Language/Version**: TypeScript with Deno 1.40+  
**Primary Dependencies**: 
- @anthropic-ai/sdk (Claude API client)
- Oak or native Deno HTTP (web framework)
- SQLite3 for Deno (database)
- compromise or natural (NLP library for noun extraction)

**Storage**: SQLite database with schema for analyses (id, text, summary, metadata JSON, created_at)  
**Testing**: Deno built-in test runner (`deno test`)  
**Target Platform**: Server (Deno runtime on macOS/Linux)  
**Project Type**: Single project (backend API only)  
**Performance Goals**: 
- <10s response time for texts up to 5000 words
- Support 10 concurrent requests (configurable)
- 100 request queue capacity (configurable)

**Constraints**:
- 50,000 character text limit
- 30 second LLM timeout
- 20 word minimum for LLM summary (below = return original)
- No authentication (public endpoint MVP)

**Scale/Scope**: Prototype/MVP for 90-120 minute development timebox

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file is not yet ratified. Using assignment requirements and best practices as governance framework.

### Required Checks

- ✅ **API-First Design**: POST /analyze endpoint with clear JSON contract
- ✅ **Robustness & Error Handling**: FR-006 through FR-021 specify comprehensive error handling for all failure modes
- ⚠️ **Test-Driven Development**: Tests mentioned as bonus in assignment, will implement TDD for critical paths
- ✅ **LLM Abstraction**: Will abstract LLM provider interface for future extensibility
- ✅ **Data Quality**: Custom keyword extraction (FR-005) separate from LLM; validation before storage (FR-002)
- ✅ **Edge Case Coverage**: Empty input, LLM failures, oversized text, short text, missing nouns all specified

### Potential Violations

None - design aligns with assignment requirements.

## Project Structure

### Documentation (this feature)

```text
specs/001-analyze-endpoint/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (technology decisions)
├── data-model.md        # Phase 1 output (entity schemas)
├── quickstart.md        # Phase 1 output (setup & usage guide)
└── contracts/           # Phase 1 output (OpenAPI spec)
    └── analyze-api.yaml
```

### Source Code (repository root)

```text
src/
├── main.ts                      # Application entry point, HTTP server setup
├── routes/
│   └── analyze.ts               # POST /analyze route handler
├── services/
│   ├── analysis-service.ts      # Orchestrates analysis workflow
│   ├── llm-service.ts           # LLM provider abstraction
│   └── keyword-service.ts       # Custom noun extraction logic
├── db/
│   ├── database.ts              # SQLite connection & setup
│   └── analysis-repository.ts  # Analysis CRUD operations
├── models/
│   ├── analysis-request.ts      # Request validation & types
│   ├── analysis-result.ts       # Response types
│   └── metadata.ts              # Metadata structure types
├── middleware/
│   ├── error-handler.ts         # Global error handling
│   ├── request-queue.ts         # Concurrency queue management
│   └── validator.ts             # Input validation middleware
└── utils/
    ├── logger.ts                # Structured logging
    └── config.ts                # Environment configuration

tests/
├── integration/
│   ├── analyze-endpoint.test.ts     # End-to-end POST /analyze tests
│   └── error-scenarios.test.ts      # Edge case & failure tests
├── unit/
│   ├── keyword-service.test.ts      # Noun extraction tests
│   ├── analysis-service.test.ts     # Business logic tests
│   └── validator.test.ts            # Input validation tests
└── fixtures/
    └── sample-texts.ts              # Test data (articles, reviews, edge cases)

data/                            # SQLite database (gitignored)
├── analyses.db
└── .gitkeep
```

**Structure Decision**: Single project structure chosen because this is a backend API only (no frontend). All code lives in `src/` with clear separation of concerns: routes (HTTP layer), services (business logic), db (persistence), models (types), middleware (cross-cutting concerns). Tests mirror source structure for easy navigation.

## Complexity Tracking

No constitution violations. Design follows straightforward layered architecture appropriate for MVP scope.
