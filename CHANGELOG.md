# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-02-24

### Breaking Changes

- **Repository renamed**: `minimal-think-mcp` is now `session-think-mcp`
- **Default session feature removed**: Sessions are now standalone and must be explicitly referenced by name
- **Storage location changed**: Default is now `./.session-think-sessions` (current directory) instead of `~/.minimal-think-sessions`
- **Session naming**: Structured names required in format `category:name:subcategory` (e.g., `thesis:NVDA:ai_dominance`)

### Added

- **Structured session naming**: Sessions use semantic names like `thesis:NVDA:ai_dominance` or `topic:research:quantum_computing`
- **`rename_session` tool**: Rename existing sessions to new structured names
- **`search_in_session` tool**: Search for thoughts within a specific session by keyword
- **`search_all_sessions` tool**: Search across all sessions for matching content
- **`get_session_info` tool**: Get metadata about a session without loading all thoughts
- **Pagination support**: All list and search tools support `limit` and `offset` parameters
- **Environment variable configuration**:
  - `SESSION_DIR`: Override storage location
  - `SESSION_MAX_RETURN`: Maximum thoughts returned by default (default: 50)
  - `SESSION_NAME_PATTERN`: Custom regex pattern for session name validation

### Changed

- **Session storage**: Now uses current directory by default (`./.session-think-sessions`)
- **Filename sanitization**: Colons replaced with triple underscores (`___`) for filesystem safety
- **Tool descriptions**: Enhanced with clear guidance on session naming conventions
- **Temporary sessions**: Generated as `TEMP:timestamp:random` when no name provided

### Removed

- **Default session system**: No more `useDefaultSession`, `setAsDefault` parameters
- **`set_default_session` tool**: Removed as sessions are now standalone
- **Home directory storage**: No longer uses `~/.minimal-think-sessions`

### Migration Guide

If you have existing sessions in `~/.minimal-think-sessions`:

1. Move them manually to your desired location or set `SESSION_DIR` environment variable
2. Rename session files to use the new naming convention if desired
3. Use `rename_session` tool to assign structured names to existing sessions

## [1.2.4] - Previous Release

- Default session support
- Cross-chat session continuity
- Thinking modes (linear, creative, critical, strategic, empathetic)
- Relationship tracking between thoughts
- Session cleanup utility