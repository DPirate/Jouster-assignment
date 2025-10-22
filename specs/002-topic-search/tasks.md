# Tasks: Topic Search Endpoint

**Feature**: Topic Search Endpoint  
**Input**: Design documents from `/specs/002-topic-search/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/search-api.yaml, research.md

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup & Database Migration

**Purpose**: Initialize database schema extension for search functionality

- [x] T001 Add topics_searchable generated column to analyses table in src/db/database.ts (ALTER TABLE with GENERATED ALWAYS AS LOWER(json_extract(metadata, '$.topics')) STORED)
- [x] T002 Create index on topics_searchable column in src/db/database.ts (CREATE INDEX idx_topics_searchable)

**Checkpoint**: ✅ Database ready for efficient topic searching

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and validation that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create SearchQuery interface in src/models/search-query.ts (topic: string, limit?: number)
- [x] T004 [P] Add validateSearchQuery function to src/middleware/validator.ts (validate topic non-empty, ≤100 chars, limit positive integer)
- [x] T005 [P] Add searchByTopic method to AnalysisRepository in src/db/analysis-repository.ts (query with topics_searchable LIKE, ORDER BY created_at DESC, optional LIMIT)

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Search Analyses by Topic (Priority: P1) 🎯 MVP

**Goal**: Core search functionality - retrieve analyses by topic with case-insensitive substring matching

**Independent Test**: Submit several analyses with different topics via POST /analyze, then use GET /search?topic=technology to retrieve only analyses containing "technology" in their topics array. Verify results match the topic filter.

###Implementation for User Story 1

- [x] T006 [P] [US1] Create SearchService class in src/services/search-service.ts (orchestrate validation and repository search)
- [x] T007 [US1] Create GET /search route handler in src/routes/search.ts (extract query params, validate, call service, return results)
- [x] T008 [US1] Register /search route in src/main.ts (add router.get("/search", handleSearch) with error handler)

**Checkpoint**: ✅ MVP complete - basic topic search working end-to-end

---

## Phase 4: User Story 2 - Case-Insensitive Topic Matching (Priority: P2)

**Goal**: Ensure search works regardless of capitalization differences

**Independent Test**: Store an analysis with topic "Technology", then search using topic="technology" (lowercase) and verify it returns the matching analysis.

### Implementation for User Story 2

- [x] T009 [US2] Verify existing case-insensitive matching in src/db/analysis-repository.ts searchByTopic method (confirm LOWER() applied to both search term and column - no new code required, already implemented in T005)
- [x] T010 [US2] Add case-insensitive test scenarios to quickstart.md manual test suite

**Checkpoint**: ✅ Case-insensitive matching verified

---

## Phase 5: User Story 3 - Return Results in Chronological Order (Priority: P2)

**Goal**: Results ordered by creation time (newest first)

**Independent Test**: Create 3 analyses with the same topic at different times, search for that topic, and verify results are ordered with newest first.

### Implementation for User Story 3

- [x] T011 [US3] Verify existing ORDER BY created_at DESC in src/db/analysis-repository.ts searchByTopic method (confirm chronological ordering - no new code required, already implemented in T005)
- [x] T012 [US3] Add chronological ordering test scenarios to quickstart.md manual test suite

**Checkpoint**: ✅ Chronological ordering verified

---

## Phase 6: User Story 4 - Limit Search Results (Priority: P3)

**Goal**: Support optional limit parameter to restrict result count

**Independent Test**: Create 20 analyses with the same topic, search with limit=5, and verify exactly 5 results are returned.

### Implementation for User Story 4

- [x] T013 [US4] Verify existing limit parameter handling in src/db/analysis-repository.ts searchByTopic method (confirm LIMIT applied after ORDER BY - no new code required, already implemented in T005)
- [x] T014 [US4] Verify existing limit validation in src/middleware/validator.ts validateSearchQuery (confirm positive integer validation, reject ≤0 - no new code required, already implemented in T004)
- [x] T015 [US4] Add limit parameter test scenarios to quickstart.md manual test suite

**Checkpoint**: ✅ Result limiting working correctly

---

## Phase 7: Error Handling & Edge Cases

**Purpose**: Ensure robust error handling for all edge cases

- [x] T016 [P] Verify missing topic parameter returns 400 in src/routes/search.ts (validation already implemented in T004)
- [x] T017 [P] Verify empty topic parameter returns 400 in src/middleware/validator.ts (validation already implemented in T004)
- [x] T018 [P] Verify topic >100 chars returns 413 in src/middleware/validator.ts (validation already implemented in T004)
- [x] T019 [P] Verify invalid limit (0, negative, non-numeric) returns 400 in src/middleware/validator.ts (validation already implemented in T004)
- [x] T020 [P] Verify database errors return 500 with appropriate error response in src/routes/search.ts (error handling already implemented in T005)
- [x] T021 Add error handling test scenarios to quickstart.md manual test suite

**Checkpoint**: ✅ All error cases handled gracefully

---

## Phase 8: Logging & Observability

**Purpose**: Add logging for search operations (per FR-013)

- [x] T022 Add search request logging in src/routes/search.ts (log topic, result count, response time using existing logger - implements FR-013)
- [x] T023 Add database query logging in src/db/analysis-repository.ts searchByTopic method (log query parameters and execution time - implements FR-013)

**Checkpoint**: ✅ Search operations observable

---

## Phase 9: Documentation & Polish

**Purpose**: Final documentation and validation

- [x] T024 [P] Update README.md with GET /search endpoint documentation (endpoint, parameters, examples)
- [x] T025 [P] Verify quickstart.md manual test suite is complete with all test scenarios
- [x] T026 Run deno check to verify no TypeScript errors
- [x] T027 Manual end-to-end testing using quickstart.md test suite

**Checkpoint**: ✅ Feature complete and documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (database migration)
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase - Can start after T005
- **User Story 2 (Phase 4)**: Depends on US1 (inherits case-insensitive implementation)
- **User Story 3 (Phase 5)**: Depends on US1 (inherits chronological ordering)
- **User Story 4 (Phase 6)**: Depends on US1 (extends with limit parameter)
- **Error Handling (Phase 7)**: Depends on US1 completion
- **Logging (Phase 8)**: Can start after US1 (applies to all stories)
- **Documentation (Phase 9)**: Depends on all user stories complete

### User Story Dependencies

**Critical Path**:
```
Setup (T001-T002)
  ↓
Foundational (T003-T005) ← BLOCKING GATE
  ↓
US1: Core Search (T006-T008) ← MVP Complete
  ↓
├─ US2: Case-Insensitive (T009-T010) ─┐
├─ US3: Chronological (T011-T012) ────┤
└─ US4: Result Limiting (T013-T015) ──┤
                                       ↓
            Error Handling (T016-T021)
                     ↓
            Logging (T022-T023)
                     ↓
            Documentation (T024-T027)
```

**US1 is independently testable**: After T008, can validate basic search functionality
**US2, US3, US4 are verification tasks**: Mostly validate existing implementation works correctly

### Within Each User Story

**User Story 1** (Core Search):
- T006 (service) can be parallel to T007 (route)
- T008 (registration) after T007 (route handler)

**User Story 2** (Case-Insensitive):
- T009, T010 can run in parallel (different concerns)

**User Story 3** (Chronological):
- T011, T012 can run in parallel

**User Story 4** (Result Limiting):
- T013, T014 can run in parallel (repository vs validation)
- T015 after T013-T014

### Parallel Opportunities

**Foundational Phase** (after T002 complete):
```bash
# All three can run in parallel:
T003 (SearchQuery model) + T004 (validation) + T005 (repository)
```

**User Story 1**:
```bash
# Can run in parallel:
T006 (service) + T007 (route handler)
```

**Error Handling Phase**:
```bash
# All can run in parallel:
T016 + T017 + T018 + T019 + T020
```

**Documentation Phase**:
```bash
# Can run in parallel:
T024 (README) + T025 (quickstart verification)
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005) ← **CRITICAL BLOCKING GATE**
3. Implement US1: Core Search (T006-T008) → **MVP COMPLETE**
4. Test & verify core functionality works
5. Deploy/demo MVP

### Incremental Delivery

Each phase represents a deployable increment:

1. **After US1 (T008)**: Core search functionality working (MVP!)
2. **After US2 (T010)**: Case-insensitive matching verified
3. **After US3 (T012)**: Chronological ordering verified
4. **After US4 (T015)**: Result limiting working
5. **After Error Handling (T021)**: Production-ready error handling
6. **After Logging (T023)**: Observable and debuggable
7. **After Documentation (T027)**: Fully documented and maintainable

### Parallel Team Strategy

With 2 developers:

1. Both complete Setup + Foundational together (T001-T005)
2. Once Foundational done (after T005):
   - **Developer A**: US1 implementation (T006-T008)
   - **Developer B**: Error handling prep (review edge cases)
3. After US1 complete:
   - **Developer A**: US2 + US3 verification (T009-T012)
   - **Developer B**: US4 + Error handling (T013-T021)
4. Both work on Logging + Documentation together (T022-T027)

---

## Task Count Summary

- **Phase 1 (Setup)**: 2 tasks
- **Phase 2 (Foundational)**: 3 tasks
- **Phase 3 (US1 - Core Search)**: 3 tasks ← MVP
- **Phase 4 (US2 - Case-Insensitive)**: 2 tasks
- **Phase 5 (US3 - Chronological)**: 2 tasks
- **Phase 6 (US4 - Result Limiting)**: 3 tasks
- **Phase 7 (Error Handling)**: 6 tasks
- **Phase 8 (Logging)**: 2 tasks
- **Phase 9 (Documentation)**: 4 tasks

**Total**: 27 tasks

**Parallelizable**: 12 tasks marked [P]

**MVP Scope**: T001-T008 (8 tasks = 30% of total)

---

## Notes

- [P] tasks can run in parallel (different files, no dependencies)
- [Story] label indicates which user story the task belongs to
- All user stories (US1-US4) are Priority P1-P3 from spec.md
- Each user story has an independent test criteria
- Foundational phase (T003-T005) BLOCKS all user story work
- MVP is complete after T008 (User Story 1 implemented)
- Tests are deferred as bonus per assignment timebox
- Commit after each task or logical group
- Stop at any checkpoint to validate independently

---

## Feature Comparison with Feature 001

| Aspect | Feature 001 (POST /analyze) | Feature 002 (GET /search) |
|--------|---------------------------|---------------------------|
| **Scope** | 56 tasks | 27 tasks (48% smaller) |
| **Complexity** | New system from scratch | Extends existing system |
| **New Files** | 16 files | 3 files (model, service, route) |
| **Modified Files** | 0 | 3 files (repository, validator, main) |
| **MVP Tasks** | 45 tasks | 8 tasks (82% smaller) |
| **Dependencies** | External LLM API | Internal database only |
| **Risk** | High (new infrastructure) | Low (leverages existing) |

---

## Implementation Summary

**Key Design Decisions**:
- Minimal new code: 3 new files, 3 file extensions
- Maximum reuse: All middleware, models (Analysis), error handling
- Database-first: Generated column strategy for performance
- No breaking changes: Purely additive feature

**Testing Strategy**:
- Manual testing via quickstart.md (comprehensive test suite provided)
- Automated tests deferred as bonus per project timebox
- Each user story has independent test criteria for validation

**Success Metrics** (from spec.md):
- SC-001: <1 second for 10K records (research shows <1ms achievable)
- SC-002: 100% precision/recall (substring matching guarantees)
- SC-003: 100 concurrent requests (reuse existing RequestQueue)
- SC-004: 99.9% success rate (comprehensive error handling)
