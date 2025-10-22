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
Search stored analyses by topic or keyword.

**Request:**
```bash
# Search by topic
curl "http://localhost:8000/search?topic=technology"

# Search by keyword
curl "http://localhost:8000/search?keyword=innovation"

# Search by both
curl "http://localhost:8000/search?topic=technology&keyword=innovation"
```

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "summary": "...",
      "metadata": {...},
      "createdAt": "..."
    }
  ],
  "count": 1
}
```

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

(To be filled during implementation)

## Trade-offs

(To be documented based on implementation decisions)

## Project Structure

```
├── src/
│   ├── main.ts                 # Application entry point
│   ├── routes/                 # API route handlers
│   ├── services/               # Business logic
│   ├── llm/                    # LLM provider abstractions
│   ├── db/                     # Database layer
│   └── types/                  # TypeScript type definitions
├── tests/                      # Test files
├── data/                       # SQLite database (gitignored)
├── deno.json                   # Deno configuration
└── README.md                   # This file
```

## License

MIT
