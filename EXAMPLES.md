# Session Think MCP Examples

This document provides examples of how to use the session-think-mcp tools.

## Session Naming Convention

All sessions use structured names: `category:name:subcategory`

**Examples**:
- `thesis:NVDA:ai_dominance`
- `topic:research:quantum_computing`
- `project:website:redesign`
- `analysis:competitor:openai`

## Basic Usage

### Starting a New Session

```json
{
  "reasoning": "NVIDIA's AI dominance stems from their CUDA ecosystem, which creates significant switching costs for enterprises. Their data center revenue has grown 300%+ YoY.",
  "sessionName": "thesis:NVDA:ai_dominance",
  "mode": "linear",
  "tags": ["investment", "semiconductor", "AI"]
}
```

Response:

```json
{
  "thinking": "NVIDIA's AI dominance stems from their CUDA ecosystem...",
  "thoughtId": "thought_1740387654321_abc123",
  "sessionName": "thesis:NVDA:ai_dominance",
  "mode": "linear",
  "tags": ["investment", "semiconductor", "AI"],
  "timestamp": "2026-02-24T12:00:00.000Z",
  "thoughtCount": 1,
  "preserved": true,
  "isNewSession": true
}
```

### Continuing a Session

```json
{
  "reasoning": "However, AMD's MI300X offers competitive performance at lower cost. Enterprise customers may consider switching for inference workloads.",
  "sessionName": "thesis:NVDA:ai_dominance",
  "mode": "critical",
  "tags": ["competition", "risk"]
}
```

Response:

```json
{
  "thinking": "However, AMD's MI300X offers competitive performance...",
  "thoughtId": "thought_1740387712345_def456",
  "sessionName": "thesis:NVDA:ai_dominance",
  "mode": "critical",
  "tags": ["competition", "risk"],
  "timestamp": "2026-02-24T12:05:00.000Z",
  "thoughtCount": 2,
  "preserved": true,
  "isNewSession": false
}
```

## Using Relationships

### Building on Previous Thoughts

```json
{
  "reasoning": "The AMD threat is mitigated by NVIDIA's software moat. CUDA has 15+ years of optimization and developer adoption.",
  "sessionName": "thesis:NVDA:ai_dominance",
  "mode": "critical",
  "relates_to": "thought_1740387712345_def456",
  "relationship_type": "builds_on"
}
```

### Contradicting a Thought

```json
{
  "reasoning": "Actually, AMD's ROCm platform is rapidly improving and Google has publicly committed to supporting it.",
  "sessionName": "thesis:NVDA:ai_dominance",
  "mode": "critical",
  "relates_to": "thought_1740387712345_def456",
  "relationship_type": "contradicts"
}
```

## Session Management

### Listing Sessions

```json
{
  "limit": 10,
  "offset": 0
}
```

Response:

```json
{
  "sessions": [
    {
      "sessionName": "thesis:NVDA:ai_dominance",
      "thoughtCount": 5,
      "firstThought": "2026-02-24T12:00:00.000Z",
      "lastThought": "2026-02-24T12:30:00.000Z",
      "lastModified": "2026-02-24T12:30:00.000Z"
    },
    {
      "sessionName": "topic:research:quantum_computing",
      "thoughtCount": 12,
      "firstThought": "2026-02-20T09:00:00.000Z",
      "lastThought": "2026-02-23T14:00:00.000Z",
      "lastModified": "2026-02-23T14:00:00.000Z"
    }
  ],
  "count": 2,
  "total": 2,
  "limit": 10,
  "offset": 0,
  "timestamp": "2026-02-24T13:00:00.000Z"
}
```

### Viewing a Session

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "limit": 50,
  "offset": 0
}
```

Response:

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "thoughts": [
    {
      "id": "thought_1740387654321_abc123",
      "content": "NVIDIA's AI dominance stems from their CUDA ecosystem...",
      "mode": "linear",
      "tags": ["investment", "semiconductor", "AI"],
      "timestamp": "2026-02-24T12:00:00.000Z"
    }
  ],
  "count": 1,
  "totalThoughts": 5,
  "limit": 50,
  "offset": 0,
  "hasMore": false,
  "timestamp": "2026-02-24T13:00:00.000Z"
}
```

### Getting Session Info

```json
{
  "sessionName": "thesis:NVDA:ai_dominance"
}
```

Response:

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "exists": true,
  "thoughtCount": 5,
  "firstThought": "2026-02-24T12:00:00.000Z",
  "lastThought": "2026-02-24T12:30:00.000Z",
  "created": "2026-02-24T12:00:00.000Z",
  "lastModified": "2026-02-24T12:30:00.000Z",
  "modes": ["linear", "critical"],
  "tags": ["investment", "semiconductor", "AI", "competition", "risk"],
  "timestamp": "2026-02-24T13:00:00.000Z"
}
```

## Search Operations

### Searching Within a Session

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "query": "AMD",
  "limit": 10
}
```

Response:

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "query": "AMD",
  "results": [
    {
      "id": "thought_1740387712345_def456",
      "content_preview": "However, AMD's MI300X offers competitive performance at lower cost...",
      "mode": "critical",
      "tags": ["competition", "risk"],
      "timestamp": "2026-02-24T12:05:00.000Z",
      "relevance_score": 12
    }
  ],
  "count": 1,
  "offset": 0,
  "limit": 10,
  "timestamp": "2026-02-24T13:00:00.000Z"
}
```

### Searching All Sessions

```json
{
  "query": "artificial intelligence",
  "limit": 20
}
```

Response:

```json
{
  "query": "artificial intelligence",
  "sessions": [
    {
      "sessionName": "thesis:NVDA:ai_dominance",
      "matchingThoughts": 3,
      "totalThoughts": 5,
      "lastModified": "2026-02-24T12:30:00.000Z",
      "relevanceScore": 3
    },
    {
      "sessionName": "topic:research:quantum_computing",
      "matchingThoughts": 1,
      "totalThoughts": 12,
      "lastModified": "2026-02-23T14:00:00.000Z",
      "relevanceScore": 1
    }
  ],
  "count": 2,
  "totalMatching": 2,
  "offset": 0,
  "limit": 20,
  "timestamp": "2026-02-24T13:00:00.000Z"
}
```

## Session Operations

### Renaming a Session

```json
{
  "oldSessionName": "TEMP:1740387654321:abc123",
  "newSessionName": "thesis:NVDA:ai_dominance"
}
```

Response:

```json
{
  "status": "success",
  "message": "Session renamed from TEMP:1740387654321:abc123 to thesis:NVDA:ai_dominance",
  "oldName": "TEMP:1740387654321:abc123",
  "newName": "thesis:NVDA:ai_dominance",
  "thoughtCount": 5,
  "timestamp": "2026-02-24T13:00:00.000Z"
}
```

### Deleting a Session

```json
{
  "sessionName": "thesis:NVDA:ai_dominance"
}
```

Response:

```json
{
  "status": "success",
  "message": "Session thesis:NVDA:ai_dominance deleted successfully",
  "timestamp": "2026-02-24T13:00:00.000Z"
}
```

### Cleaning Up Old Sessions

```json
{
  "maxAgeDays": 90
}
```

Response:

```json
{
  "status": "success",
  "deletedCount": 3,
  "maxAgeDays": 90,
  "message": "Deleted 3 sessions older than 90 days",
  "timestamp": "2026-02-24T13:00:00.000Z"
}
```

## Finding Thought Relationships

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "query": "competition",
  "relationship_types": ["builds_on", "contradicts"],
  "limit": 10
}
```

Response:

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "query": "competition",
  "results": [
    {
      "id": "thought_1740387712345_def456",
      "content_preview": "However, AMD's MI300X offers competitive performance...",
      "mode": "critical",
      "tags": ["competition", "risk"],
      "timestamp": "2026-02-24T12:05:00.000Z",
      "relates_to": null,
      "relationship_type": null,
      "relevance_score": 15
    }
  ],
  "count": 1,
  "timestamp": "2026-02-24T13:00:00.000Z"
}
```

## Temporary Sessions

When no session name is provided, a temporary session is created:

```json
{
  "reasoning": "Quick thought about the market..."
}
```

Response:

```json
{
  "thinking": "Quick thought about the market...",
  "thoughtId": "thought_1740388000000_xyz789",
  "sessionName": "TEMP:1740388000000:xyz789",
  "mode": "linear",
  "tags": [],
  "timestamp": "2026-02-24T13:00:00.000Z",
  "thoughtCount": 1,
  "preserved": true,
  "isNewSession": true
}
```

You can later rename it:

```json
{
  "oldSessionName": "TEMP:1740388000000:xyz789",
  "newSessionName": "analysis:market:daily_notes"
}
```

## Pagination Example

For large sessions, use pagination:

```json
{
  "sessionName": "topic:research:quantum_computing",
  "limit": 20,
  "offset": 0
}
```

Then get the next page:

```json
{
  "sessionName": "topic:research:quantum_computing",
  "limit": 20,
  "offset": 20
}
```

The `hasMore` field indicates if additional pages exist.