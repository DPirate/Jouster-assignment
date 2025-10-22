# Quickstart: Analyze Endpoint

**Feature**: Analyze Endpoint  
**Last Updated**: 2025-10-22

## Prerequisites

- [Deno](https://deno.land/) v1.40 or higher
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## Setup

### 1. Environment Configuration

Create a `.env` file in the project root:

```bash
# Required
ANTHROPIC_API_KEY=your_api_key_here

# Optional (with defaults)
PORT=8000
MAX_CONCURRENT_REQUESTS=10
MAX_QUEUE_SIZE=100
LLM_TIMEOUT_MS=30000
DATABASE_PATH=./data/analyses.db
LOG_LEVEL=info
```

### 2. Initialize Database

The database will be created automatically on first run. Ensure the `data/` directory exists:

```bash
mkdir -p data
```

### 3. Install Dependencies

Deno handles dependencies automatically on first run. No separate install step needed.

## Running the Server

### Development Mode

```bash
deno task dev
```

This starts the server with auto-reload on file changes.

### Production Mode

```bash
deno task start
```

The server will start on `http://localhost:8000` (or the PORT specified in `.env`).

## Testing the API

### Basic Analysis Request

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Artificial intelligence is transforming how we interact with technology. Machine learning algorithms can now understand natural language, recognize images, and make predictions with remarkable accuracy."
  }'
```

**Expected Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Artificial intelligence is transforming...",
  "summary": "AI and machine learning are revolutionizing technology...",
  "metadata": {
    "title": "AI Technology Transformation",
    "topics": ["artificial intelligence", "machine learning", "technology"],
    "sentiment": "positive",
    "keywords": ["intelligence", "technology", "algorithms"]
  },
  "createdAt": "2025-10-22T14:30:00.000Z"
}
```

### Short Text (< 20 words)

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world example"}'
```

**Expected**: Summary returns the original text as-is (no LLM processing).

### Error Cases

**Empty Input** (400 Bad Request):
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": ""}'
```

**Text Too Large** (413 Payload Too Large):
```bash
# Text exceeding 50,000 characters
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "..."}'  # 50,001+ characters
```

**Malformed JSON** (400 Bad Request):
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{invalid json'
```

## Running Tests

### All Tests

```bash
deno task test
```

### Specific Test File

```bash
deno test tests/integration/analyze-endpoint.test.ts
```

### Type Checking

```bash
deno task check
```

## Project Structure

```
src/
├── main.ts                      # Entry point
├── routes/
│   └── analyze.ts               # POST /analyze handler
├── services/
│   ├── analysis-service.ts      # Analysis orchestration
│   ├── llm-service.ts           # LLM provider abstraction
│   └── keyword-service.ts       # Noun extraction
├── db/
│   ├── database.ts              # SQLite setup
│   └── analysis-repository.ts   # CRUD operations
├── models/                      # TypeScript types
├── middleware/                  # Request processing
└── utils/                       # Config & logging

tests/
├── integration/                 # End-to-end tests
├── unit/                        # Unit tests
└── fixtures/                    # Test data

data/
└── analyses.db                  # SQLite database (created on first run)
```

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key for Claude access |
| `PORT` | 8000 | HTTP server port |
| `MAX_CONCURRENT_REQUESTS` | 10 | Max parallel LLM requests |
| `MAX_QUEUE_SIZE` | 100 | Max queued requests before 503 |
| `LLM_TIMEOUT_MS` | 30000 | LLM request timeout (30 seconds) |
| `DATABASE_PATH` | ./data/analyses.db | SQLite database file path |
| `LOG_LEVEL` | info | Logging level (info, error, debug) |

## API Limits

- **Max text length**: 50,000 characters
- **LLM timeout**: 30 seconds
- **Concurrent requests**: 10 (configurable)
- **Queue capacity**: 100 (configurable)
- **Min words for LLM summary**: 20 (below returns original)

## Troubleshooting

### Server won't start

**Issue**: `ANTHROPIC_API_KEY not set`  
**Solution**: Ensure `.env` file exists with valid API key

**Issue**: `Permission denied: ./data/analyses.db`  
**Solution**: Ensure `data/` directory is writable: `chmod 755 data`

### 503 Service Unavailable

**Issue**: "Server at capacity"  
**Solution**: Too many concurrent requests. Wait and retry, or increase `MAX_CONCURRENT_REQUESTS`

**Issue**: "LLM service temporarily unavailable"  
**Solution**: Check Anthropic API status, verify API key is valid

### 504 Gateway Timeout

**Issue**: "Analysis request timed out"  
**Solution**: Text may be too long or LLM service slow. Try shorter text or increase `LLM_TIMEOUT_MS`

### Tests failing

**Issue**: Integration tests fail with API errors  
**Solution**: Ensure `.env` has valid `ANTHROPIC_API_KEY` or mock LLM service in tests

## Development Workflow

### 1. Make Changes

Edit files in `src/`

### 2. Run Dev Server

```bash
deno task dev
```

Server auto-reloads on file changes.

### 3. Test Manually

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Test text here"}'
```

### 4. Run Automated Tests

```bash
deno task test
```

### 5. Type Check

```bash
deno task check
```

### 6. Commit

```bash
git add .
git commit -m "feat: implement analyze endpoint"
```

## Next Steps

- Implement GET /search endpoint for retrieving past analyses
- Add batch processing (multiple texts at once)
- Include confidence scores in metadata
- Containerize with Docker
- Add rate limiting per IP
- Implement authentication

## API Documentation

Full OpenAPI specification available at:
`specs/001-analyze-endpoint/contracts/analyze-api.yaml`

View with Swagger UI:
```bash
# Install swagger-ui-watcher
npx swagger-ui-watcher specs/001-analyze-endpoint/contracts/analyze-api.yaml
```

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review API contract: `contracts/analyze-api.yaml`
3. Review data model: `data-model.md`
4. Check implementation plan: `plan.md`
