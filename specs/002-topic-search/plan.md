# Implementation Plan: Topic Search Endpoint

**Branch**: `002-topic-search` | **Date**: 2025-10-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-topic-search/spec.md`

## Summary

Add GET /search endpoint to retrieve previously analyzed texts by filtering on topics stored in metadata. Users can search with case-insensitive substring matching (e.g., "tech" matches "technology", "fintech") and optionally limit results. Results return in chronological order (newest first). This complements the existing POST /analyze endpoint by making the analysis system searchable and discoverable.

## Technical Context

**Language/Version**: TypeScript with Deno 1.40+  
**Primary Dependencies**: Oak (web framework), @db/sqlite@0.11 (database), @std/dotenv (config)  
**Storage**: SQLite with JSON column for metadata.topics array  
**Testing**: Deno test framework (tests deferred as bonus per project timebox)  
**Target Platform**: Deno runtime on macOS/Linux servers  
**Project Type**: Single backend API service  
**Performance Goals**: <1 second response for 10K records, 100 concurrent requests  
**Constraints**: 99.9% success rate, no authentication (publicly accessible), substring matching on topics  
**Scale/Scope**: MVP for 10K analyses, single endpoint addition to existing API  
**URL Handling**: Oak framework automatically URL-decodes query parameters (FR-011 handled by framework, no explicit implementation needed)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - Constitution file contains only template placeholders, no enforced principles.

**Notes**: 
- No specific architectural constraints defined in constitution
- Following existing codebase patterns (Oak routes, repository pattern, middleware)
- Maintaining consistency with feature 001-analyze-endpoint structure

## Project Structure

### Documentation (this feature)

```text
specs/002-topic-search/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── analysis-request.ts      # [existing]
│   ├── analysis-result.ts       # [existing]
│   ├── metadata.ts              # [existing]
│   ├── error-response.ts        # [existing]
│   └── search-query.ts          # [NEW] SearchQuery type
├── services/
│   ├── analysis-service.ts      # [existing]
│   ├── keyword-service.ts       # [existing]
│   ├── llm-service.ts           # [existing]
│   └── search-service.ts        # [NEW] Search logic
├── db/
│   ├── database.ts              # [existing]
│   └── analysis-repository.ts   # [EXTEND] Add searchByTopic method
├── routes/
│   ├── analyze.ts               # [existing]
│   └── search.ts                # [NEW] GET /search handler
├── middleware/
│   ├── error-handler.ts         # [existing - reuse]
│   ├── request-queue.ts         # [existing - reuse]
│   └── validator.ts             # [EXTEND] Add search query validation
├── utils/
│   ├── config.ts                # [existing]
│   └── logger.ts                # [existing]
└── main.ts                      # [EXTEND] Register /search route

tests/
└── [deferred as bonus per assignment timebox]
```

**Structure Decision**: Single project structure maintained. New feature adds one route handler (`routes/search.ts`), one service (`services/search-service.ts`), one model (`models/search-query.ts`), and extends existing repository with `searchByTopic` method. Reuses all existing middleware, error handling, and database infrastructure.

## Complexity Tracking

> **No violations** - Feature follows existing patterns and adds minimal complexity.

---

## Phase 0: Research & Technical Decisions

### Research Tasks

1. **SQLite JSON Querying for Substring Matching**
   - **Question**: How to efficiently query JSON arrays in SQLite for case-insensitive substring matches?
   - **Context**: Need to search `metadata` JSON column where topics is an array like `["Technology", "AI"]`

2. **Query Performance Optimization**
   - **Question**: What indexing strategy ensures <1s response for 10K records with JSON array queries?
   - **Context**: Success criteria SC-001 requires sub-1-second performance at 10K scale

3. **Validation Pattern for Query Parameters**
   - **Question**: Best practices for validating URL query parameters (topic, limit) in Oak framework?
   - **Context**: Need consistent validation with existing POST /analyze endpoint

### Research Output Format

Each research task will produce a decision with:
- **Decision**: What approach was chosen
- **Rationale**: Why this approach (performance, maintainability, consistency)
- **Alternatives Considered**: What else was evaluated
- **Implementation Notes**: Key technical details for Phase 1

---

## Phase 1: Design Artifacts (To Be Generated)

### 1. Data Model (`data-model.md`)

Will document:
- **SearchQuery**: Input parameters (topic: string, limit?: number)
- **SearchResult**: Array of Analysis entities
- **Analysis Entity**: Existing structure (reuse from feature 001)
- **Validation Rules**: topic length ≤100 chars, limit ≥1, etc.

### 2. API Contract (`contracts/search-api.yaml`)

Will define:
- OpenAPI 3.0 specification for GET /search
- Query parameters: topic (required), limit (optional)
- Response schemas: 200 (array), 400 (validation error), 500 (server error)
- Error response format matching POST /analyze

### 3. Quickstart Guide (`quickstart.md`)

Will include:
- How to test the search endpoint
- Example curl commands
- Sample requests/responses
- Integration with existing POST /analyze workflow

---

## Next Steps

After `/speckit.plan` completes Phase 0 and Phase 1:
1. Run `/speckit.tasks` to generate task breakdown
2. Run `/speckit.implement` to execute implementation
3. Manual testing with curl/integration tests
4. Commit and merge to main branch
