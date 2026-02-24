# Session Think MCP

A JavaScript native MCP server implementing a session-based "think" tool with structured session naming and search capabilities.

Based on [Anthropic's research](https://www.anthropic.com/engineering/claude-think-tool) on enhancing Claude's complex problem-solving abilities through dedicated thinking workspaces.

npm: https://www.npmjs.com/package/session-think-mcp  
git: https://github.com/differentstuff/session-think-mcp

## Overview

This MCP server provides a persistent thinking workspace that preserves reasoning text without modification, creating dedicated space for structured thinking during complex tasks. The tool follows the zero-interference principle - it simply preserves and structures your reasoning without any cognitive overhead.

## Features

- **Structured Session Naming**: Semantic names like `thesis:NVDA:ai_dominance` for easy reference
- **Session Search**: Search within sessions or across all sessions by keyword
- **Persistent Storage**: Thoughts preserved across sessions in local files
- **Pagination**: Efficient retrieval with configurable limits
- **Thinking Modes**: Optional support for different thinking strategies
- **Relationship Tracking**: Link thoughts with relationships (builds_on, supports, contradicts, etc.)
- **Native MCP Protocol**: Built with `@modelcontextprotocol/sdk` for optimal performance
- **Minimal Dependencies**: Only the MCP SDK and Zod for validation

## Quick Start

### Option 1: NPX (Recommended)

No installation required. Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "session-think": {
      "command": "npx",
      "args": ["-y", "session-think-mcp@latest"]
    }
  }
}
```

### Option 2: Global Installation

```bash
npm install -g session-think-mcp
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "session-think": {
      "command": "session-think-mcp"
    }
  }
}
```

## Configuration

### Claude Desktop Configuration File

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

### Environment Variables

Configure behavior via environment variables:

```json
{
  "mcpServers": {
    "session-think": {
      "command": "npx",
      "args": ["-y", "session-think-mcp@latest"],
      "env": {
        "SESSION_DIR": "/path/to/sessions",
        "SESSION_MAX_RETURN": "50",
        "SESSION_NAME_PATTERN": "^[a-zA-Z0-9_-]+(:[a-zA-Z0-9_-]+){2,}$"
      }
    }
  }
}
```

| Variable | Description | Default |
|----------|-------------|---------|
| `SESSION_DIR` | Storage location for session files | `./.session-think-sessions` |
| `SESSION_MAX_RETURN` | Maximum thoughts returned by default | `50` |
| `SESSION_NAME_PATTERN` | Regex pattern for session name validation | `^[a-zA-Z0-9_-]+(:[a-zA-Z0-9_-]+){2,}$` |

## Session Naming Convention

Sessions use structured names for easy reference and organization:

**Format**: `category:name:subcategory`

**Examples**:
- `thesis:NVDA:ai_dominance` - Investment thesis about NVIDIA's AI position
- `topic:research:quantum_computing` - Research topic on quantum computing
- `project:website:redesign` - Project notes for website redesign
- `analysis:competitor:openai` - Competitor analysis of OpenAI

**Rules**:
- At least 3 parts separated by colons
- Each part: alphanumeric, underscores, or hyphens
- If no name provided, generates `TEMP:timestamp:random`

## Available Tools

### think

Add a thought to a session.

```json
{
  "reasoning": "Your thinking text here...",
  "sessionName": "thesis:NVDA:ai_dominance",
  "mode": "critical",
  "tags": ["analysis", "investment"]
}
```

**Parameters**:
- `reasoning` (required): Your thinking text
- `sessionName` (optional): Session name in format `category:name:subcategory`
- `mode` (optional): Thinking mode - `linear`, `creative`, `critical`, `strategic`, `empathetic`
- `tags` (optional): Array of tags for categorization
- `relates_to` (optional): ID of related thought
- `relationship_type` (optional): `builds_on`, `supports`, `contradicts`, `refines`, `synthesizes`

### list_sessions

List all available sessions with metadata.

```json
{
  "limit": 50,
  "offset": 0
}
```

### view_session

View contents of a specific session.

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "limit": 50,
  "offset": 0
}
```

### search_in_session

Search for thoughts within a specific session.

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "query": "market share",
  "limit": 10,
  "offset": 0
}
```

### search_all_sessions

Search across all sessions for matching content.

```json
{
  "query": "artificial intelligence",
  "limit": 20,
  "offset": 0
}
```

### get_session_info

Get metadata about a session without loading thoughts.

```json
{
  "sessionName": "thesis:NVDA:ai_dominance"
}
```

### rename_session

Rename an existing session.

```json
{
  "oldSessionName": "TEMP:1740387654321:abc123",
  "newSessionName": "thesis:NVDA:ai_dominance"
}
```

### delete_session

Delete a session permanently.

```json
{
  "sessionName": "thesis:NVDA:ai_dominance"
}
```

### cleanup_sessions

Remove old sessions based on age.

```json
{
  "maxAgeDays": 90
}
```

### find_thought_relationships

Search for related thoughts within a session.

```json
{
  "sessionName": "thesis:NVDA:ai_dominance",
  "query": "competition",
  "relationship_types": ["builds_on", "contradicts"],
  "limit": 10
}
```

## Session Storage

Sessions are stored locally as JSON files:

- **Default location**: `./.session-think-sessions` (current directory)
- **Override**: Set `SESSION_DIR` environment variable
- **Format**: One JSON file per session
- **Filename**: Session name with colons replaced by `___` (e.g., `thesis___NVDA___ai_dominance.json`)

## Usage Examples

### Starting a New Session

```
Claude, please use the think tool to analyze NVIDIA's AI market position.
Use session name: thesis:NVDA:ai_dominance
```

### Continuing a Session

```
Claude, continue my thinking in session thesis:NVDA:ai_dominance about competitive threats.
```

### Searching for Sessions

```
Claude, search all my sessions for anything related to "artificial intelligence".
```

### Viewing a Session

```
Claude, show me the last 20 thoughts from session thesis:NVDA:ai_dominance.
```

## Architecture

- **Server**: Native JavaScript MCP server using official SDK
- **Storage**: File-based persistent session storage (JSON)
- **Transport**: StdioServerTransport for maximum compatibility
- **Validation**: Zod schemas for input validation
- **Output**: Structured JSON with preserved reasoning and session context

## Development

```bash
# Clone repository
git clone https://github.com/differentstuff/session-think-mcp.git
cd session-think-mcp

# Install dependencies
npm install

# Start development server
npm start

# Run verification
npm run verify
```

## Testing

Test the server locally:

```bash
# Run with stdio transport
node index.js

# Test with MCP Inspector
npx @modelcontextprotocol/inspector session-think-mcp
```

## Performance

- **Startup time**: < 100ms
- **Memory usage**: < 20MB
- **Response time**: < 10ms for typical operations
- **Zero processing overhead**: Direct text preservation

## Research Background

This implementation is based on Anthropic's engineering research demonstrating that a "think" tool creates dedicated space for structured thinking, resulting in:

- **54% improvement** in customer service simulations
- **Better policy adherence** in complex scenarios
- **Enhanced multi-step problem solving** capabilities
- **More consistent decision making** across tasks

## License

MIT License - see LICENSE file for details.

## Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Anthropic Think Tool Research](https://www.anthropic.com/engineering/claude-think-tool)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop](https://claude.ai/desktop)

---

**Note**: This tool requires Node.js 18+ and is optimized for use with Claude Desktop and the Model Context Protocol ecosystem.