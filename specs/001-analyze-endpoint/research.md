# Research: Analyze Endpoint

**Feature**: Analyze Endpoint  
**Date**: 2025-10-22  
**Phase**: 0 - Technology Research & Decision Documentation

## Overview

This document captures technology choices, rationale, and alternatives considered for implementing the analyze endpoint feature.

## Technology Decisions

### 1. Runtime: Deno 1.40+

**Decision**: Use Deno as the TypeScript runtime

**Rationale**:
- Native TypeScript support without compilation step
- Built-in testing framework (`deno test`)
- Modern permissions model and security
- Standard library includes HTTP server primitives
- Assignment specifies TypeScript + Deno in README

**Alternatives Considered**:
- **Node.js + TypeScript**: More mature ecosystem but requires build tooling (tsc, ts-node)
- **Bun**: Faster but less stable, smaller package ecosystem

**Selected**: Deno for assignment compliance and rapid prototyping

---

### 2. Web Framework: Oak or Native Deno HTTP

**Decision**: Use Oak framework (Deno's Express-like middleware framework)

**Rationale**:
- Middleware pattern familiar to web developers
- Built-in JSON body parsing
- Easy error handling middleware
- Route organization and composition
- Mature and well-documented

**Alternatives Considered**:
- **Native Deno HTTP**: More lightweight but requires manual body parsing, error handling
- **Fresh**: Full-stack framework, overkill for API-only project
- **Hono**: Fast but less documentation for Deno

**Selected**: Oak for rapid development with good abstractions

---

### 3. LLM Provider: Anthropic Claude API

**Decision**: Use Anthropic Claude API via @anthropic-ai/sdk

**Rationale**:
- Assignment specifies Claude as initial LLM provider
- Official SDK provides TypeScript types
- Streaming and non-streaming support
- Good error handling and timeout support

**Alternatives Considered**:
- **OpenAI GPT**: Not specified in assignment
- **Local models**: Too complex for MVP timebox

**Selected**: Anthropic Claude per assignment requirements

**Abstraction Strategy**:
Create `LLMProvider` interface to enable future multi-provider support:
```typescript
interface LLMProvider {
  generateSummary(text: string): Promise<string>;
  extractMetadata(text: string): Promise<Metadata>;
}
```

---

### 4. Database: SQLite

**Decision**: Use SQLite with Deno SQLite3 module

**Rationale**:
- Assignment specifies SQLite
- Zero-configuration, file-based database
- Perfect for prototype/MVP scope
- SQL provides strong schema and query capabilities
- No separate database server needed

**Alternatives Considered**:
- **PostgreSQL**: Requires separate server, overkill for prototype
- **JSON file storage**: No query capabilities, concurrency issues

**Selected**: SQLite per assignment requirements

**Library Choice**: `x/sqlite@v3.8` (Deno's recommended SQLite module)

---

### 5. NLP Library for Keyword Extraction

**Decision**: Use `compromise` or implement custom tokenizer

**Rationale**:
- Need to identify nouns (part-of-speech tagging)
- Count word frequency
- Filter stopwords
- Assignment requires custom extraction (not via LLM)

**Alternatives Considered**:
- **natural**: Comprehensive NLP toolkit but heavier, Node-focused
- **compromise**: Lightweight, fast, good POS tagging
- **wink-nlp**: Good but less documented
- **Custom regex tokenizer**: Simple but less accurate POS tagging

**Selected**: Start with `compromise` for POS tagging accuracy, fallback to custom if Deno compatibility issues

**Implementation Approach**:
1. Tokenize text
2. POS tag to identify nouns
3. Filter stopwords
4. Count frequencies
5. Return top 3

---

### 6. Request Queue/Concurrency Management

**Decision**: Implement custom queue with semaphore pattern

**Rationale**:
- Need to limit concurrent LLM requests (default: 10)
- Queue overflow requests (default: 100 max queue)
- Return 503 when queue full
- Configurable via environment variables

**Alternatives Considered**:
- **p-queue** (npm): Promise queue library, but adds dependency
- **Native async-pool patterns**: Simpler, no dependency

**Selected**: Custom implementation using Promise-based semaphore for transparency and control

**Implementation**:
```typescript
class RequestQueue {
  private concurrentCount = 0;
  private queue: Array<() => Promise<void>> = [];
  
  async process<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if at concurrent limit
    // Add to queue if needed
    // Throw 503 if queue full
  }
}
```

---

### 7. Testing Strategy

**Decision**: Deno built-in test runner with integration-focused tests

**Rationale**:
- Assignment lists tests as bonus but emphasizes working code
- Deno test runner is zero-config
- Focus on critical paths: endpoint behavior, error handling, edge cases
- Unit test custom keyword extraction (testable without external dependencies)

**Test Priorities** (given timebox constraints):
1. **Integration tests**: POST /analyze with various inputs
2. **Error scenario tests**: Empty input, LLM timeout, oversized text
3. **Unit tests**: Keyword extraction logic
4. **Mock LLM for fast tests**: Avoid real API calls in test suite

**Alternatives Considered**:
- **Full TDD red-green-refactor**: Ideal but time-intensive for 90min timebox
- **No tests**: Risky, assignment mentions robustness

**Selected**: Integration + unit tests for critical paths

---

### 8. Configuration Management

**Decision**: Environment variables with defaults

**Rationale**:
- Standard for server applications
- Easy to override in different environments
- Deno has built-in `Deno.env.get()`

**Required Variables**:
```
ANTHROPIC_API_KEY=<required>
PORT=8000
MAX_CONCURRENT_REQUESTS=10
MAX_QUEUE_SIZE=100
LLM_TIMEOUT_MS=30000
DATABASE_PATH=./data/analyses.db
LOG_LEVEL=info
```

---

### 9. Error Handling Strategy

**Decision**: Centralized error handling middleware with error classes

**Rationale**:
- Consistent error responses across all endpoints
- Proper HTTP status codes (400, 413, 500, 503, 504)
- Structured error logging

**Error Classes**:
```typescript
class ValidationError extends Error { status = 400; }
class PayloadTooLargeError extends Error { status = 413; }
class ServiceUnavailableError extends Error { status = 503; }
class GatewayTimeoutError extends Error { status = 504; }
```

**Middleware Pattern**:
```typescript
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.response.status = err.status || 500;
    ctx.response.body = { error: err.message, ... };
    logger.error(err);
  }
});
```

---

### 10. Logging

**Decision**: Structured JSON logging to stdout/stderr

**Rationale**:
- Assignment requires logging errors with details
- JSON format enables log aggregation tools
- stdout for info, stderr for errors (standard practice)

**Log Fields**:
- timestamp
- level (info, error)
- requestId (UUID per request)
- message
- error details (stack, type)
- metadata (endpoint, duration)

**Library**: Custom lightweight logger (avoid dependency for simple use case)

---

## Development Workflow

**Phase 0** (Complete): Technology research and decisions documented here

**Phase 1** (Next):
1. Generate data-model.md (database schema, TypeScript types)
2. Generate API contract (OpenAPI spec)
3. Generate quickstart.md (setup instructions)

**Phase 2** (via /speckit.tasks):
1. Generate tasks.md with implementation task breakdown
2. Implement features following task list

---

## Risk Mitigation

### Risk: Deno package ecosystem gaps
**Mitigation**: Selected well-supported packages; custom implementation as fallback

### Risk: LLM API rate limits
**Mitigation**: Request queue limits concurrent calls to 10 (configurable)

### Risk: Timebox constraints (90-120 min)
**Mitigation**: Focus on core functionality first (POST /analyze, basic error handling, persistence); bonus features (tests, Docker) only if time permits

### Risk: NLP library compatibility with Deno
**Mitigation**: Start with compromise; if issues, fall back to simple regex tokenizer + stopword list

---

## Open Questions Resolved

All clarifications resolved in spec.md clarification session:
- ✅ Max text length: 50,000 characters
- ✅ Short text handling: Return original if <20 words
- ✅ LLM timeout: 30 seconds
- ✅ Keyword fallback: Return 0-3 nouns (whatever available)
- ✅ Authentication: None (public endpoint)
- ✅ Concurrency: Queue-based, 10 concurrent, 100 queue max

No remaining unknowns blocking implementation.
