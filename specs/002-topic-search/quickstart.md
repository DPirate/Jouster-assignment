# Quickstart Guide: Topic Search Endpoint

**Feature**: 002-topic-search  
**Date**: 2025-10-23

## Overview

This guide shows how to use the GET /search endpoint to retrieve previously analyzed texts by topic. The endpoint performs case-insensitive substring matching on the topics array in metadata.

---

## Prerequisites

1. **Server Running**: Ensure the analysis server is running on port 8000
   ```bash
   cd /Users/aurea/Dev/Repos/Jouster-assignment
   deno task dev
   ```

2. **Existing Data**: Create some analyses first using POST /analyze
   ```bash
   # Example: Create analysis with topics
   curl -X POST http://localhost:8000/analyze \
     -H "Content-Type: application/json" \
     -d '{"text":"Artificial intelligence and machine learning are transforming healthcare through predictive analytics and personalized treatment."}'
   ```

---

## Basic Usage

### 1. Simple Topic Search

Search for analyses containing "technology" in their topics:

```bash
curl "http://localhost:8000/search?topic=technology"
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
      "keywords": ["AI", "transformation"]
    },
    "createdAt": "2025-10-23T15:30:00.000Z"
  }
]
```

### 2. Case-Insensitive Search

Search is case-insensitive - "TECH", "tech", "Tech" all match "Technology":

```bash
curl "http://localhost:8000/search?topic=TECH"
```

### 3. Substring Matching

Search for "tech" matches "Technology", "Fintech", "Biotech":

```bash
curl "http://localhost:8000/search?topic=tech"
```

This returns analyses with topics like:
- "Technology"
- "Fintech"
- "Biotech"
- "Technical Analysis"

---

## Advanced Usage

### 4. Limit Results

Get only the 5 most recent matching analyses:

```bash
curl "http://localhost:8000/search?topic=AI&limit=5"
```

### 5. URL Encoding

For topics with spaces or special characters, URL-encode the parameter:

```bash
# Search for "machine learning"
curl "http://localhost:8000/search?topic=machine%20learning"

# Or use curl's --data-urlencode
curl -G "http://localhost:8000/search" \
  --data-urlencode "topic=machine learning" \
  --data-urlencode "limit=10"
```

### 6. Pretty Print JSON

Use `jq` for formatted output:

```bash
curl "http://localhost:8000/search?topic=technology" | jq .
```

---

## Common Scenarios

### Scenario 1: Find All Analyses on a Topic

```bash
# Get all analyses about "finance"
curl "http://localhost:8000/search?topic=finance" | jq .
```

### Scenario 2: Get Recent Analyses on a Topic

```bash
# Get 10 most recent analyses about "AI"
curl "http://localhost:8000/search?topic=AI&limit=10" | jq .
```

### Scenario 3: Check If Topic Exists

```bash
# Search returns empty array [] if no matches
curl "http://localhost:8000/search?topic=nonexistent" | jq .
# Output: []
```

### Scenario 4: Browse Topics by Partial Name

```bash
# Find all analyses with topics containing "tech"
# (matches Technology, Fintech, Biotech, etc.)
curl "http://localhost:8000/search?topic=tech" | jq '.[] | .metadata.topics'
```

---

## Error Handling

### Missing Topic Parameter

```bash
curl "http://localhost:8000/search"
```

**Response** (400 Bad Request):
```json
{
  "error": "Topic parameter is required",
  "details": {
    "parameter": "topic",
    "received": null
  }
}
```

### Empty Topic Parameter

```bash
curl "http://localhost:8000/search?topic="
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

### Topic Too Long

```bash
# Topic > 100 characters
curl "http://localhost:8000/search?topic=$(python3 -c 'print("x" * 101)')"
```

**Response** (413 Payload Too Large):
```json
{
  "error": "Topic parameter must be 100 characters or less",
  "details": {
    "parameter": "topic",
    "length": 101,
    "maxLength": 100
  }
}
```

### Invalid Limit

```bash
curl "http://localhost:8000/search?topic=tech&limit=0"
```

**Response** (400 Bad Request):
```json
{
  "error": "Limit parameter must be a positive integer",
  "details": {
    "parameter": "limit",
    "received": "0"
  }
}
```

---

## Integration Examples

### Example 1: Analyze → Search Workflow

```bash
# Step 1: Create an analysis
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Blockchain technology is revolutionizing finance through decentralized systems and smart contracts."
  }' | jq .

# Step 2: Search for it by topic
curl "http://localhost:8000/search?topic=blockchain" | jq .
```

### Example 2: Find Related Content

```bash
# Analyze a text about AI
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Deep learning models are achieving human-level performance in image recognition tasks."}' | jq .

# Find all related AI content
curl "http://localhost:8000/search?topic=AI&limit=20" | jq .
```

### Example 3: Topic Discovery

```bash
# Search for broad terms to discover related topics
curl "http://localhost:8000/search?topic=tech" | \
  jq '.[] | .metadata.topics | unique' | \
  jq -s 'add | unique'
```

---

## Performance Tips

### 1. Use Limit for Large Result Sets

If you expect many results, use `limit` to improve response time:

```bash
# Get first 10 results instead of all
curl "http://localhost:8000/search?topic=technology&limit=10"
```

### 2. Be Specific with Topics

More specific searches return faster:
- ✅ Good: `topic=artificial%20intelligence`
- ⚠️ Slower: `topic=a` (matches too many)

### 3. Concurrent Searches

The endpoint supports up to 100 concurrent requests:

```bash
# Run multiple searches in parallel
for topic in AI blockchain fintech healthcare; do
  curl "http://localhost:8000/search?topic=$topic" &
done
wait
```

---

## Testing

### Manual Test Suite

Run these commands to verify the endpoint:

```bash
# 1. Search with results
curl "http://localhost:8000/search?topic=technology" | jq 'length'
# Should return: number > 0

# 2. Search with no results
curl "http://localhost:8000/search?topic=nonexistent" | jq 'length'
# Should return: 0

# 3. Case-insensitive matching
curl "http://localhost:8000/search?topic=TECH" | jq 'length'
curl "http://localhost:8000/search?topic=tech" | jq 'length'
# Both should return same count

# 4. Limit parameter
curl "http://localhost:8000/search?topic=technology&limit=1" | jq 'length'
# Should return: 1

# 5. Chronological ordering
curl "http://localhost:8000/search?topic=technology" | \
  jq '[.[] | .createdAt] | reverse == [.[] | .createdAt]'
# Should return: false (newest first, so reversed != original)

# 6. Error: Missing topic
curl "http://localhost:8000/search" | jq '.error'
# Should return: "Topic parameter is required"

# 7. Error: Empty topic
curl "http://localhost:8000/search?topic=" | jq '.error'
# Should return: "Topic parameter cannot be empty"

# 8. Error: Invalid limit
curl "http://localhost:8000/search?topic=tech&limit=0" | jq '.error'
# Should return: "Limit parameter must be a positive integer"
```

---

## Troubleshooting

### Issue: No Results Returned

**Symptom**: Empty array `[]` returned

**Causes**:
1. No analyses match the topic
2. Case mismatch (should auto-handle, but verify)
3. Typo in topic name

**Solution**:
```bash
# List all unique topics in database
curl "http://localhost:8000/search?topic=a" | \
  jq '[.[] | .metadata.topics[]] | unique'
```

### Issue: 400 Bad Request

**Symptom**: Error response instead of results

**Causes**:
1. Missing `topic` parameter
2. Empty `topic` parameter
3. Invalid `limit` parameter (non-numeric, zero, negative)

**Solution**: Check URL encoding and parameter values

### Issue: Slow Response

**Symptom**: Search takes >1 second

**Causes**:
1. Database not indexed (run migration)
2. Very large result set without limit
3. Overly broad search term

**Solution**:
```bash
# Add limit to reduce data transfer
curl "http://localhost:8000/search?topic=a&limit=100"

# Check if index exists
sqlite3 data/analyses.db "PRAGMA index_list('analyses');"
# Should show: idx_topics_searchable
```

---

## Next Steps

1. **Explore API**: Try different topic searches to discover content
2. **Integrate**: Use the endpoint in your application
3. **Monitor**: Check logs for performance metrics
4. **Optimize**: Add caching layer if needed for frequently searched topics

---

## API Reference

For complete API specification, see [contracts/search-api.yaml](./contracts/search-api.yaml)

For implementation details, see [plan.md](./plan.md) and [data-model.md](./data-model.md)
