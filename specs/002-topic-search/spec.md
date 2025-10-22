# Feature Specification: Topic Search Endpoint

**Feature Branch**: `002-topic-search`  
**Created**: 2025-10-23  
**Status**: Draft  
**Input**: User description: "for GET /search?topic=xyz endpoint"

## Clarifications

### Session 2025-10-23

- Q: Should the GET /search endpoint require authentication or be publicly accessible? → A: No authentication required - publicly accessible like POST /analyze endpoint
- Q: What type of partial matching should be used for topic search? → A: Substring match - "tech" matches "technology", "fintech", "biotech"
- Q: What JSON structure should be used for error responses? → A: Match POST /analyze format - `{"error": "message", "details": {...}}`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Analyses by Topic (Priority: P1)

Users need to retrieve previously analyzed texts that match a specific topic of interest. This allows them to find relevant content without re-analyzing or manually browsing through all stored analyses.

**Why this priority**: This is the core functionality of the search endpoint and delivers immediate value by making the analysis system searchable and useful for retrieval.

**Independent Test**: Submit several analyses with different topics via POST /analyze, then use GET /search?topic=technology to retrieve only analyses containing "technology" in their topics array. Verify results match the topic filter.

**Acceptance Scenarios**:

1. **Given** multiple analyses exist with topics ["technology", "AI"], ["finance", "banking"], and ["technology", "innovation"], **When** user searches for topic="technology", **Then** system returns the 2 analyses containing "technology" in their topics
2. **Given** no analyses match the search topic, **When** user searches for topic="nonexistent", **Then** system returns an empty array with 200 status
3. **Given** analyses exist in the database, **When** user searches without providing a topic parameter, **Then** system returns 400 Bad Request with clear error message

---

### User Story 2 - Case-Insensitive Topic Matching (Priority: P2)

Users should be able to find topics regardless of capitalization differences, making the search more forgiving and user-friendly.

**Why this priority**: Improves user experience by reducing friction when users don't know the exact capitalization of stored topics.

**Independent Test**: Store an analysis with topic "Technology", then search using topic="technology" (lowercase) and verify it returns the matching analysis.

**Acceptance Scenarios**:

1. **Given** an analysis exists with topic "Machine Learning", **When** user searches for topic="machine learning", **Then** system returns the analysis (case-insensitive match)
2. **Given** analyses with topics "AI", "ai", and "Ai", **When** user searches for topic="AI", **Then** system returns all three analyses

---

### User Story 3 - Return Results in Chronological Order (Priority: P2)

Search results should be ordered by creation time (newest first) to help users find the most recent relevant content.

**Why this priority**: Temporal ordering is often important for content relevance, and this leverages the existing created_at timestamp.

**Independent Test**: Create 3 analyses with the same topic at different times, search for that topic, and verify results are ordered with newest first.

**Acceptance Scenarios**:

1. **Given** 3 analyses with topic "finance" created at T1, T2, T3, **When** user searches for topic="finance", **Then** system returns them ordered [T3, T2, T1]

---

### User Story 4 - Limit Search Results (Priority: P3)

Users should be able to limit the number of results returned to improve response times and handle large result sets.

**Why this priority**: Nice-to-have for pagination and performance, but not critical for MVP functionality.

**Independent Test**: Create 20 analyses with the same topic, search with limit=5, and verify exactly 5 results are returned.

**Acceptance Scenarios**:

1. **Given** 20 analyses match a topic, **When** user searches with topic="tech" and limit=10, **Then** system returns exactly 10 results (newest first)
2. **Given** 5 analyses match a topic, **When** user searches with limit=10, **Then** system returns all 5 results (doesn't pad)
3. **Given** user provides limit=0 or negative limit, **When** searching, **Then** system returns 400 Bad Request with validation error

---

### Edge Cases

**Resolved Edge Cases** (covered by functional requirements):

1. **Empty topic parameter**: Handled by FR-002 - returns 400 Bad Request
2. **Topic parameter with special characters**: Handled by FR-011 - URL-decoded automatically by Oak framework, then searched as-is (special chars match literally)
3. **Topic parameter >100 characters**: Handled by FR-012 - returns 413 Payload Too Large

**Additional Edge Case Handling**:

4. **Malformed metadata** (topics not an array):
   - System behavior: Search query will not match malformed records (they lack topics_searchable column value)
   - Impact: Malformed records are silently excluded from results (no error thrown)
   - Rationale: Database schema ensures new records are valid; legacy data cleanup is out-of-scope for this feature
   
5. **Performance with large datasets**:
   - Addressed by SC-001: <1 second for 10K records
   - Research shows generated column + index achieves ~1ms query time
   - Beyond 50K records: May require caching/optimization (documented in research.md as future consideration)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept GET requests at /search endpoint without authentication (publicly accessible)
- **FR-002**: System MUST require a "topic" query parameter and return 400 Bad Request if missing or empty
- **FR-003**: System MUST perform case-insensitive substring matching on the topics array in metadata (e.g., "tech" matches "technology", "fintech", "biotech")
- **FR-004**: System MUST return an array of Analysis objects matching the search criteria
- **FR-005**: System MUST return results ordered by created_at timestamp in descending order (newest first)
- **FR-006**: System MUST return 200 OK with empty array [] when no analyses match the topic
- **FR-007**: System MUST support optional "limit" query parameter to restrict number of results (default: unlimited)
- **FR-008**: System MUST validate limit parameter is a positive integer, return 400 if invalid
- **FR-009**: System MUST apply limit after sorting to return the N most recent matches
- **FR-010**: System MUST handle database errors gracefully and return 500 Internal Server Error with appropriate message
- **FR-011**: System MUST URL-decode the topic parameter before searching
- **FR-012**: System MUST reject topic parameters longer than 100 characters with 400 Bad Request
- **FR-013**: System MUST log all search requests with topic, result count, and response time

### Key Entities *(include if feature involves data)*

- **Analysis**: Existing entity from POST /analyze endpoint containing id, text, summary, metadata (with topics array), and createdAt timestamp
- **SearchQuery**: Topic string and optional limit for filtering analyses (TypeScript interface in src/models/search-query.ts)
- **SearchResult**: Array of Analysis objects matching the search criteria (TypeScript type alias: `Analysis[]`)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can retrieve relevant analyses by topic in under 1 second for databases with up to 10,000 analyses
- **SC-002**: Search returns accurate results with 100% precision (no false positives) and 100% recall (finds all matches)
- **SC-003**: System handles 100 concurrent search requests without errors or timeouts
- **SC-004**: Search queries complete successfully 99.9% of the time (excluding user input errors)

## Assumptions *(optional)*

- The existing POST /analyze endpoint is functioning and populating the analyses table with topics in metadata
- Topics are stored as a JSON array in the metadata column (e.g., `["topic1", "topic2"]`)
- Substring matching is used (e.g., searching for "tech" matches "technology", "fintech", "biotech")
- Default result limit is unlimited unless specified (reasonable for MVP; can add default limit later if performance requires)
- Search is read-only and does not modify any data

## Dependencies *(optional)*

- Existing analyses database schema with topics in metadata.topics array
- Existing Analysis model and repository from feature 001-analyze-endpoint
- SQLite database must support JSON querying for the metadata column

## Out of Scope *(optional)*

- Full-text search across text or summary fields (only searching topics)
- Pagination with offset/cursor (only basic limit parameter)
- Combining multiple topic filters (e.g., topic1 AND topic2)
- Search history or saved searches
- Autocomplete or topic suggestions
- Fuzzy matching or spelling correction
- Performance optimization for very large datasets (>100K analyses)
