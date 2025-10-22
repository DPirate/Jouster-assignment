# LLM Knowledge Extractor

A TypeScript/Deno application that uses Claude AI to analyze unstructured text, generate summaries, and extract structured metadata.

## Features

- **Text Analysis**: Process unstructured text with Claude AI
- **Structured Extraction**: Extract title, topics, sentiment, and keywords
- **Custom Keyword Extraction**: Frequency-based noun extraction (non-LLM)
- **REST API**: Simple endpoints for analysis and search
- **Persistent Storage**: SQLite database for storing analyses

## Prerequisites

- [Deno](https://deno.land/) v1.40 or higher
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd Jouster-assignment
```

2. Copy the environment template and add your API key:
```bash
cp .env.example .env
```

3. Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

## Running the Application

### Development Mode (with auto-reload):
```bash
deno task dev
```

### Production Mode:
```bash
deno task start
```

The server will start on `http://localhost:8000` (or the PORT specified in `.env`).

## API Endpoints

### POST /analyze
Analyze a text and store the result.

**Request:**
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your text to analyze here..."
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "text": "...",
  "summary": "1-2 sentence summary",
  "metadata": {
    "title": "Extracted Title",
    "topics": ["topic1", "topic2", "topic3"],
    "sentiment": "positive",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "createdAt": "2025-10-22T..."
}
```

### GET /search
Search stored analyses by topic with case-insensitive substring matching.

**Parameters:**
- `topic` (required): Search term to match against topics array (case-insensitive)
- `limit` (optional): Maximum number of results to return (positive integer)

**Request Examples:**
```bash
# Search by topic
curl "http://localhost:8000/search?topic=technology"

# Search with limit
curl "http://localhost:8000/search?topic=technology&limit=5"

# Case-insensitive search (matches "Technology", "TECHNOLOGY", "technology")
curl "http://localhost:8000/search?topic=tech"
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "Original text content...",
    "summary": "1-2 sentence summary of the text",
    "metadata": {
      "title": "Extracted Title",
      "topics": ["technology", "innovation"],
      "sentiment": "positive",
      "keywords": ["keyword1", "keyword2"]
    },
    "createdAt": "2025-10-23T10:30:00.000Z"
  }
]
```

**Notes:**
- Returns analyses ordered by creation time (newest first)
- Empty array `[]` returned when no matches found
- Substring matching: searching "tech" matches "technology", "fintech", etc.

## Testing

Run tests:
```bash
deno task test
```

Type check:
```bash
deno task check
```

## Design Choices

**1. TypeScript with Deno Runtime**
- Native TypeScript support without build step
- Built-in test runner and standard library
- Modern permissions model for security
- Quick prototyping suitable for 90-120 minute timebox

**2. Layered Architecture**
- **Routes**: HTTP handlers (Oak framework)
- **Services**: Business logic (LLM, keyword extraction, analysis orchestration)
- **Database**: SQLite with repository pattern
- **Middleware**: Error handling, validation, request queuing

**3. LLM Provider Abstraction**
- Interface-based design enables future multi-provider support
- Currently implements Claude via @anthropic-ai/sdk
- Clean separation between business logic and LLM specifics

**4. Custom Keyword Extraction**
- Basic noun identification using heuristics (proper nouns, common endings)
- Stopword filtering and frequency counting
- Returns 0-3 keywords based on availability (graceful degradation)
- Note: Production system would use proper NLP library (compromise, natural)

**5. Request Queue with Semaphore Pattern**
- Limits concurrent LLM requests (default: 10) to avoid rate limits
- Queue overflow handling (default: 100 max queued)
- Returns 503 when at capacity for clear client feedback

## Trade-offs

**Time vs Features (90-120 minute timebox)**
- ✅ Implemented: Core analysis, error handling, persistence, concurrency
- ⚠️ Simplified: Keyword extraction uses heuristics instead of proper POS tagging
- ⏭️ Deferred: Tests (bonus), GET /search endpoint, batch processing, Docker

**Simplicity vs Robustness**
- Simple noun detection (heuristics) rather than full NLP pipeline
- Basic error handling covers main failure modes (LLM timeout, API failure, validation)
- SQLite for simplicity (suitable for prototype; production might need PostgreSQL)

**Performance vs Accuracy**
- Parallel LLM calls (summary + metadata) for speed
- Short text optimization (<20 words) skips LLM for instant response
- Queue limits prevent server overload at cost of rejected requests

**Dependencies vs Control**
- Used Oak framework for routing (faster than building from scratch)
- Basic keyword extraction (no NLP library) for Deno compatibility
- Minimal dependencies keep prototype simple and maintainable

## Project Structure

```
├── src/
│   ├── main.ts                      # Application entry point
│   ├── routes/
│   │   └── analyze.ts               # POST /analyze handler
│   ├── services/
│   │   ├── analysis-service.ts      # Analysis orchestration
│   │   ├── llm-service.ts           # LLM provider (Claude)
│   │   └── keyword-service.ts       # Custom keyword extraction
│   ├── db/
│   │   ├── database.ts              # SQLite initialization
│   │   └── analysis-repository.ts   # CRUD operations
│   ├── models/
│   │   ├── analysis-request.ts      # Request types
│   │   ├── analysis-result.ts       # Response types
│   │   ├── metadata.ts              # Metadata types
│   │   └── error-response.ts        # Error types
│   ├── middleware/
│   │   ├── error-handler.ts         # Global error handling
│   │   ├── validator.ts             # Request validation
│   │   └── request-queue.ts         # Concurrency control
│   └── utils/
│       ├── config.ts                # Configuration loader
│       └── logger.ts                # Structured logging
├── tests/                           # Test files (deferred)
├── data/                            # SQLite database (gitignored)
├── specs/                           # Feature specifications
├── deno.json                        # Deno configuration
└── README.md                        # This file
```

## License

MIT
