#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';

/**
 * Session Think MCP Server
 * 
 * Implements a persistent thinking workspace tool with structured session naming
 * and search capabilities. Based on Anthropic's research on the "think" tool 
 * approach for enhanced problem-solving in complex tool use situations.
 * 
 * Features:
 * - Structured session naming (category:name:subcategory)
 * - Session search capabilities
 * - Persistent storage across sessions
 * - Zero cognitive interference
 */

// Configuration via environment variables
const SESSION_DIR = process.env.SESSION_DIR || path.join(process.cwd(), '.session-think-sessions');
const SESSION_MAX_RETURN = parseInt(process.env.SESSION_MAX_RETURN) || 50;
const SESSION_NAME_PATTERN = process.env.SESSION_NAME_PATTERN || '^[a-zA-Z0-9_-]+(:[a-zA-Z0-9_-]+){2,}$';

// Ensure session directory exists
async function ensureSessionDir() {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create session directory:', error);
  }
}

// Validate session name format
function validateSessionName(sessionName) {
  const pattern = new RegExp(SESSION_NAME_PATTERN);
  if (!pattern.test(sessionName)) {
    throw new Error(`Invalid session name format. Expected format: category:name:subcategory (e.g., thesis:NVDA:ai_dominance)`);
  }
  return sessionName;
}

// Sanitize session name for filesystem
function sanitizeSessionName(sessionName) {
  // First collapse multiple underscores to single underscore (prevent injection)
  let sanitized = sessionName.replace(/_+/g, '_');
  // Replace colons with triple underscore (our separator)
  sanitized = sanitized.replace(/:/g, '___');
  // Remove any characters not allowed in filenames (Windows + Unix safe)
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  return sanitized;
}

// Desanitize filename back to session name
function desanitizeFilename(filename) {
  // Remove .json extension
  let name = filename.replace('.json', '');
  // Convert triple underscore back to colon
  return name.replace(/___/g, ':');
}

// Generate random session name (TEMP format)
function generateRandomSessionName() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `TEMP:${timestamp}:${random}`;
}

// Load a session from disk
async function loadSession(sessionName) {
  try {
    const sanitized = sanitizeSessionName(sessionName);
    const sessionPath = path.join(SESSION_DIR, `${sanitized}.json`);
    const data = await fs.readFile(sessionPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty array if session doesn't exist yet
    return [];
  }
}

// Save a session to disk
async function saveSession(sessionName, thoughts) {
  try {
    const sanitized = sanitizeSessionName(sessionName);
    const sessionPath = path.join(SESSION_DIR, `${sanitized}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(thoughts, null, 2), 'utf8');
  } catch (error) {
    console.error(`Failed to save session ${sessionName}:`, error);
    throw error;
  }
}

// Get list of all session files
async function listSessionFiles() {
  try {
    await ensureSessionDir();
    const files = await fs.readdir(SESSION_DIR);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    console.error('Failed to list session files:', error);
    return [];
  }
}

// Build reasoning chain for "builds_on" relationships
function buildReasoningChain(thoughtId, thoughts) {
  const chain = [];
  const visited = new Set();
  let currentId = thoughtId;
  
  while (currentId && !visited.has(currentId) && chain.length < 20) {
    visited.add(currentId);
    const thought = thoughts.find(t => t.id === currentId);
    
    if (!thought) break;
    
    chain.unshift({
      id: thought.id,
      content_preview: thought.content.substring(0, 120) + (thought.content.length > 120 ? "..." : ""),
      mode: thought.mode,
      timestamp: thought.timestamp,
      relationship_type: thought.relationship_type
    });
    
    if (thought.relationship_type === 'builds_on' && thought.relates_to) {
      currentId = thought.relates_to;
    } else {
      break;
    }
  }
  
  const maxChainLength = 7;
  if (chain.length > maxChainLength) {
    const truncatedChain = chain.slice(-maxChainLength);
    truncatedChain[0] = {
      ...truncatedChain[0],
      truncated: true,
      note: `... (${chain.length - maxChainLength} earlier thoughts in chain)`
    };
    return { chain: truncatedChain, total_length: chain.length, truncated: true };
  }
  
  return { chain: chain, total_length: chain.length, truncated: false };
}

// Simple relevance scoring function
function calculateRelevanceScore(thought, queryLower) {
  let score = 0;
  const content = thought.content.toLowerCase();
  
  if (content.includes(queryLower)) score += 10;
  
  const queryWords = queryLower.split(/\s+/);
  queryWords.forEach(word => {
    if (content.includes(word)) score += 2;
  });
  
  if (thought.tags) {
    thought.tags.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower)) score += 5;
    });
  }
  
  if (thought.mode && thought.mode.toLowerCase().includes(queryLower)) score += 3;
  if (thought.relates_to || thought.relationship_type) score += 1;
  
  return score;
}

// Create MCP server instance
const server = new McpServer({
  name: "session-think-mcp",
  version: "1.3.0"
});

// ============================================
// Tool: think
// ============================================
server.registerTool(
  "think",
  {
    title: "Think Tool",
    description: `A persistent thinking workspace that preserves reasoning across sessions. 

IMPORTANT: Always provide a sessionName parameter with format: category:name:subcategory
Examples:
- thesis:NVDA:ai_dominance
- topic:research:quantum_computing  
- project:website:redesign

If no sessionName is provided, a temporary session will be generated (TEMP:timestamp:random).

The sessionName is used to store and retrieve your thoughts. Use consistent naming to maintain context across conversations.`,
    inputSchema: {
      reasoning: z.string().describe("Your thinking, reasoning, or analysis text"),
      sessionName: z.string().optional().describe("Session name in format: category:name:subcategory (e.g., thesis:NVDA:ai_dominance). IMPORTANT: Always provide this for persistent sessions."),
      mode: z.enum(["linear", "creative", "critical", "strategic", "empathetic"]).optional()
        .describe("Optional thinking mode to structure your reasoning"),
      tags: z.array(z.string()).optional().describe("Optional tags for categorizing thoughts"),
      relates_to: z.string().optional().describe("ID of thought this relates to"),
      relationship_type: z.enum(["builds_on", "supports", "contradicts", "refines", "synthesizes"]).optional().describe("Type of relationship to the referenced thought")
    }
  },
  async ({ reasoning, sessionName, mode, tags, relates_to, relationship_type }) => {
    try {
      await ensureSessionDir();
      
      // Determine session name
      let session = sessionName;
      let isNewSession = false;
      
      if (!session) {
        session = generateRandomSessionName();
        isNewSession = true;
      } else {
        validateSessionName(session);
        // Check if this is a new session
        const existingThoughts = await loadSession(session);
        isNewSession = existingThoughts.length === 0;
      }
      
      // Load existing thoughts for this session
      const thoughts = await loadSession(session);
      
      // Add new thought
      const thoughtId = `thought_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const thoughtObj = {
        id: thoughtId,
        content: reasoning,
        mode: mode || "linear",
        tags: tags || [],
        timestamp: new Date().toISOString(),
        relates_to: null,
        relationship_type: null,
        relationships_in: [],
        relationships_out: []
      };

      // Validate and add relationship tracking
      if (relates_to && relationship_type) {
        if (relates_to === thoughtId) {
          return { content: [{ type: "text", text: JSON.stringify({ error: "Cannot reference self" }) }] };
        }
        
        const referencedThought = thoughts.find(t => t.id === relates_to);
        if (!referencedThought) {
          return { content: [{ type: "text", text: JSON.stringify({ error: "Referenced thought not found", thought_id: relates_to }) }] };
        }
        
        if (new Date(referencedThought.timestamp) > new Date(thoughtObj.timestamp)) {
          return { content: [{ type: "text", text: JSON.stringify({ error: "Cannot reference future thoughts" }) }] };
        }
        
        referencedThought.relationships_in.push({ thought_id: thoughtId, relationship_type });
        thoughtObj.relationships_out.push({ thought_id: relates_to, relationship_type });
        thoughtObj.relates_to = relates_to;
        thoughtObj.relationship_type = relationship_type;
      }

      thoughts.push(thoughtObj);
      
      // Save updated session
      await saveSession(session, thoughts);
      
      // Add related thought context for AI
      let related_context = null;
      let reasoning_chain = null;
      
      if (relates_to && relationship_type) {
        const related_thought = thoughts.find(t => t.id === relates_to);
        if (related_thought) {
          related_context = {
            relationship: relationship_type,
            related_thought_id: relates_to,
            related_content: related_thought.content.substring(0, 200) + "...",
            related_mode: related_thought.mode
          };
          
          if (relationship_type === 'builds_on') {
            const chain = buildReasoningChain(relates_to, thoughts);
            
            const conflicts = thoughts.filter(t => 
              t.relationships_out.some(rel => 
                rel.thought_id === relates_to && rel.relationship_type === 'contradicts'
              )
            ).slice(0, 3);
            
            const supports = thoughts.filter(t => 
              t.relationships_out.some(rel => 
                rel.thought_id === relates_to && rel.relationship_type === 'supports'
              )
            ).slice(0, 3);
            
            related_context = {
              type: 'builds_on_enhanced',
              chain_preview: chain.chain.slice(0, 5).map(t => t.content_preview),
              conflicts: conflicts.map(t => t.content.substring(0, 80) + "..."),
              supports: supports.map(t => t.content.substring(0, 80) + "...")
            };
            reasoning_chain = chain;
          }
        }
      }
      
      // Generate the response JSON
      const responseJson = {
        thinking: reasoning,
        thoughtId: thoughtId,
        sessionName: session,
        mode: mode || "linear",
        tags: tags || [],
        timestamp: new Date().toISOString(),
        thoughtCount: thoughts.length,
        preserved: true,
        related_context: related_context,
        reasoning_chain: reasoning_chain,
        isNewSession: isNewSession
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(responseJson, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: error.message }, null, 2)
        }]
      };
    }
  }
);

// ============================================
// Tool: list_sessions
// ============================================
server.registerTool(
  "list_sessions",
  {
    title: "List Sessions",
    description: "List all available thinking sessions with metadata.",
    inputSchema: {
      limit: z.number().min(1).max(100).optional().default(50).describe("Maximum number of sessions to return"),
      offset: z.number().min(0).optional().default(0).describe("Pagination offset")
    }
  },
  async ({ limit = 50, offset = 0 }) => {
    try {
      await ensureSessionDir();
      const files = await listSessionFiles();
      
      const sessionInfo = await Promise.all(
        files.slice(offset, offset + limit).map(async file => {
          const sessionName = desanitizeFilename(file);
          const filePath = path.join(SESSION_DIR, file);
          const stats = await fs.stat(filePath);
          
          try {
            const thoughts = await loadSession(sessionName);
            return {
              sessionName,
              thoughtCount: thoughts.length,
              firstThought: thoughts[0]?.timestamp || null,
              lastThought: thoughts[thoughts.length - 1]?.timestamp || null,
              lastModified: stats.mtime.toISOString()
            };
          } catch (e) {
            return {
              sessionName,
              error: "Could not read session data",
              lastModified: stats.mtime.toISOString()
            };
          }
        })
      );
      
      const responseJson = {
        sessions: sessionInfo,
        count: sessionInfo.length,
        total: files.length,
        limit,
        offset,
        timestamp: new Date().toISOString()
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(responseJson, null, 2)
        }]
      };
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "Failed to list sessions",
            message: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// ============================================
// Tool: view_session
// ============================================
server.registerTool(
  "view_session",
  {
    title: "View Session",
    description: "View the contents of a thinking session. Returns the last N thoughts by default.",
    inputSchema: {
      sessionName: z.string().describe("Session name to view (format: category:name:subcategory)"),
      limit: z.number().min(1).max(200).optional().describe("Maximum number of thoughts to return (default: SESSION_MAX_RETURN env or 50)"),
      offset: z.number().min(0).optional().default(0).describe("Pagination offset")
    }
  },
  async ({ sessionName, limit, offset = 0 }) => {
    try {
      validateSessionName(sessionName);
      
      const thoughts = await loadSession(sessionName);
      const maxReturn = limit || SESSION_MAX_RETURN;
      
      // Return paginated thoughts (most recent first by default)
      const paginatedThoughts = thoughts.slice(offset, offset + maxReturn);
      
      const responseJson = {
        sessionName: sessionName,
        thoughts: paginatedThoughts,
        count: paginatedThoughts.length,
        totalThoughts: thoughts.length,
        limit: maxReturn,
        offset,
        hasMore: offset + maxReturn < thoughts.length,
        timestamp: new Date().toISOString()
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(responseJson, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Failed to view session ${sessionName}:`, error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "Failed to view session",
            message: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// ============================================
// Tool: delete_session
// ============================================
server.registerTool(
  "delete_session",
  {
    title: "Delete Session",
    description: "Delete a thinking session permanently.",
    inputSchema: {
      sessionName: z.string().describe("Session name to delete (format: category:name:subcategory)")
    }
  },
  async ({ sessionName }) => {
    try {
      validateSessionName(sessionName);
      
      const sanitized = sanitizeSessionName(sessionName);
      const sessionPath = path.join(SESSION_DIR, `${sanitized}.json`);
      await fs.unlink(sessionPath);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: `Session ${sessionName} deleted successfully`,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Failed to delete session ${sessionName}:`, error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "Failed to delete session",
            message: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// ============================================
// Tool: rename_session
// ============================================
server.registerTool(
  "rename_session",
  {
    title: "Rename Session",
    description: "Rename an existing session to a new name.",
    inputSchema: {
      oldSessionName: z.string().describe("Current session name (format: category:name:subcategory)"),
      newSessionName: z.string().describe("New session name (format: category:name:subcategory)")
    }
  },
  async ({ oldSessionName, newSessionName }) => {
    try {
      validateSessionName(oldSessionName);
      validateSessionName(newSessionName);
      
      // Load old session
      const thoughts = await loadSession(oldSessionName);
      
      if (thoughts.length === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Session not found",
              message: `Session ${oldSessionName} does not exist or is empty`
            }, null, 2)
          }]
        };
      }
      
      // Save to new name
      await saveSession(newSessionName, thoughts);
      
      // Delete old session
      const oldSanitized = sanitizeSessionName(oldSessionName);
      const oldPath = path.join(SESSION_DIR, `${oldSanitized}.json`);
      await fs.unlink(oldPath);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: `Session renamed from ${oldSessionName} to ${newSessionName}`,
            oldName: oldSessionName,
            newName: newSessionName,
            thoughtCount: thoughts.length,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error(`Failed to rename session:`, error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "Failed to rename session",
            message: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// ============================================
// Tool: search_in_session
// ============================================
server.registerTool(
  "search_in_session",
  {
    title: "Search in Session",
    description: "Search for thoughts within a specific session by keyword.",
    inputSchema: {
      sessionName: z.string().describe("Session name to search in (format: category:name:subcategory)"),
      query: z.string().describe("Search query (searches content, tags, and modes)"),
      limit: z.number().min(1).max(50).optional().default(10).describe("Maximum number of results to return"),
      offset: z.number().min(0).optional().default(0).describe("Pagination offset")
    }
  },
  async ({ sessionName, query, limit = 10, offset = 0 }) => {
    try {
      validateSessionName(sessionName);
      
      const thoughts = await loadSession(sessionName);
      
      if (thoughts.length === 0) {
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              error: "Session not found or empty",
              sessionName: sessionName 
            }, null, 2) 
          }] 
        };
      }
      
      const queryLower = query.toLowerCase();
      const searchResults = thoughts
        .filter(t => {
          const contentMatch = t.content.toLowerCase().includes(queryLower);
          const tagMatch = t.tags && t.tags.some(tag => tag.toLowerCase().includes(queryLower));
          const modeMatch = t.mode && t.mode.toLowerCase().includes(queryLower);
          return contentMatch || tagMatch || modeMatch;
        })
        .map(t => ({
          id: t.id,
          content_preview: t.content.substring(0, 150) + (t.content.length > 150 ? "..." : ""),
          mode: t.mode,
          tags: t.tags,
          timestamp: t.timestamp,
          relates_to: t.relates_to,
          relationship_type: t.relationship_type,
          relevance_score: calculateRelevanceScore(t, queryLower)
        }))
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(offset, offset + limit);
      
      const response = {
        sessionName: sessionName,
        query: query,
        results: searchResults,
        count: searchResults.length,
        offset,
        limit,
        timestamp: new Date().toISOString()
      };
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(response, null, 2) 
        }] 
      };
    } catch (error) {
      console.error('Failed to search in session:', error);
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            error: "Failed to search in session", 
            message: error.message 
          }, null, 2) 
        }] 
      };
    }
  }
);

// ============================================
// Tool: search_all_sessions
// ============================================
server.registerTool(
  "search_all_sessions",
  {
    title: "Search All Sessions",
    description: "Search for sessions containing thoughts matching a keyword. Returns session indicators, not full content.",
    inputSchema: {
      query: z.string().describe("Search query (searches content, tags, and modes across all sessions)"),
      limit: z.number().min(1).max(50).optional().default(20).describe("Maximum number of sessions to return"),
      offset: z.number().min(0).optional().default(0).describe("Pagination offset")
    }
  },
  async ({ query, limit = 20, offset = 0 }) => {
    try {
      await ensureSessionDir();
      const files = await listSessionFiles();
      
      const queryLower = query.toLowerCase();
      const matchingSessions = [];
      
      for (const file of files) {
        const sessionName = desanitizeFilename(file);
        const thoughts = await loadSession(sessionName);
        
        // Count matching thoughts
        const matchingThoughts = thoughts.filter(t => {
          const contentMatch = t.content.toLowerCase().includes(queryLower);
          const tagMatch = t.tags && t.tags.some(tag => tag.toLowerCase().includes(queryLower));
          const modeMatch = t.mode && t.mode.toLowerCase().includes(queryLower);
          return contentMatch || tagMatch || modeMatch;
        });
        
        if (matchingThoughts.length > 0) {
          const filePath = path.join(SESSION_DIR, file);
          const stats = await fs.stat(filePath);
          
          matchingSessions.push({
            sessionName: sessionName,
            matchingThoughts: matchingThoughts.length,
            totalThoughts: thoughts.length,
            lastModified: stats.mtime.toISOString(),
            relevanceScore: matchingThoughts.length
          });
        }
      }
      
      // Sort by relevance (number of matching thoughts)
      matchingSessions.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      const paginatedResults = matchingSessions.slice(offset, offset + limit);
      
      const response = {
        query: query,
        sessions: paginatedResults,
        count: paginatedResults.length,
        totalMatching: matchingSessions.length,
        offset,
        limit,
        timestamp: new Date().toISOString()
      };
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(response, null, 2) 
        }] 
      };
    } catch (error) {
      console.error('Failed to search all sessions:', error);
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            error: "Failed to search all sessions", 
            message: error.message 
          }, null, 2) 
        }] 
      };
    }
  }
);

// ============================================
// Tool: get_session_info
// ============================================
server.registerTool(
  "get_session_info",
  {
    title: "Get Session Info",
    description: "Get metadata about a specific session without loading all thoughts.",
    inputSchema: {
      sessionName: z.string().describe("Session name (format: category:name:subcategory)")
    }
  },
  async ({ sessionName }) => {
    try {
      validateSessionName(sessionName);
      
      const thoughts = await loadSession(sessionName);
      const sanitized = sanitizeSessionName(sessionName);
      const sessionPath = path.join(SESSION_DIR, `${sanitized}.json`);
      
      let stats;
      try {
        stats = await fs.stat(sessionPath);
      } catch (e) {
        stats = null;
      }
      
      const response = {
        sessionName: sessionName,
        exists: thoughts.length > 0 || stats !== null,
        thoughtCount: thoughts.length,
        firstThought: thoughts[0]?.timestamp || null,
        lastThought: thoughts[thoughts.length - 1]?.timestamp || null,
        created: stats?.birthtime?.toISOString() || null,
        lastModified: stats?.mtime?.toISOString() || null,
        modes: [...new Set(thoughts.map(t => t.mode))],
        tags: [...new Set(thoughts.flatMap(t => t.tags || []))],
        timestamp: new Date().toISOString()
      };
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(response, null, 2) 
        }] 
      };
    } catch (error) {
      console.error('Failed to get session info:', error);
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            error: "Failed to get session info", 
            message: error.message 
          }, null, 2) 
        }] 
      };
    }
  }
);

// ============================================
// Tool: cleanup_sessions
// ============================================
server.registerTool(
  "cleanup_sessions",
  {
    title: "Cleanup Old Sessions",
    description: "Manually clean up old thinking sessions based on age.",
    inputSchema: {
      maxAgeDays: z.number().min(1).default(90).describe("Maximum age in days before sessions are deleted")
    }
  },
  async ({ maxAgeDays }) => {
    try {
      await ensureSessionDir();
      const files = await listSessionFiles();
      const now = new Date();
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(SESSION_DIR, file);
        const stats = await fs.stat(filePath);
        const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24);
        
        if (fileAge > maxAgeDays) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            deletedCount: deletedCount,
            maxAgeDays: maxAgeDays,
            message: `Deleted ${deletedCount} sessions older than ${maxAgeDays} days`,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error('Failed to clean up sessions:', error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "Failed to clean up sessions",
            message: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// ============================================
// Tool: find_thought_relationships
// ============================================
server.registerTool(
  "find_thought_relationships",
  {
    title: "Find Thought Relationships",
    description: "Search for thoughts that could be related to current reasoning within a session.",
    inputSchema: {
      sessionName: z.string().describe("Session name to search in (format: category:name:subcategory)"),
      query: z.string().describe("Search query to find related thoughts"),
      relationship_types: z.array(z.enum(["builds_on", "supports", "contradicts", "refines", "synthesizes"])).optional().describe("Filter by specific relationship types"),
      exclude_thought_id: z.string().optional().describe("Exclude a specific thought ID from results"),
      limit: z.number().min(1).max(20).default(10).describe("Maximum number of results to return")
    }
  },
  async ({ sessionName, query, relationship_types, exclude_thought_id, limit = 10 }) => {
    try {
      validateSessionName(sessionName);
      
      const thoughts = await loadSession(sessionName);
      
      if (thoughts.length === 0) {
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              error: "Session not found or empty",
              sessionName: sessionName 
            }, null, 2) 
          }] 
        };
      }
      
      const queryLower = query.toLowerCase();
      const searchResults = thoughts
        .filter(t => {
          if (exclude_thought_id && t.id === exclude_thought_id) return false;
          
          if (relationship_types && relationship_types.length > 0) {
            if (!t.relationship_type || !relationship_types.includes(t.relationship_type)) return false;
          }
          
          const contentMatch = t.content.toLowerCase().includes(queryLower);
          const tagMatch = t.tags && t.tags.some(tag => tag.toLowerCase().includes(queryLower));
          const modeMatch = t.mode && t.mode.toLowerCase().includes(queryLower);
          
          return contentMatch || tagMatch || modeMatch;
        })
        .map(t => ({
          id: t.id,
          content_preview: t.content.substring(0, 150) + (t.content.length > 150 ? "..." : ""),
          mode: t.mode,
          tags: t.tags,
          timestamp: t.timestamp,
          relates_to: t.relates_to,
          relationship_type: t.relationship_type,
          relevance_score: calculateRelevanceScore(t, queryLower)
        }))
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, limit);
      
      const response = {
        sessionName: sessionName,
        query: query,
        results: searchResults,
        count: searchResults.length,
        timestamp: new Date().toISOString()
      };
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(response, null, 2) 
        }] 
      };
    } catch (error) {
      console.error('Failed to find thought relationships:', error);
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            error: "Failed to find relationships", 
            message: error.message 
          }, null, 2) 
        }] 
      };
    }
  }
);

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize and start server
async function main() {
  try {
    await ensureSessionDir();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Session Think MCP Server started successfully');
    console.error(`Session storage: ${SESSION_DIR}`);
    console.error(`Max return: ${SESSION_MAX_RETURN}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});