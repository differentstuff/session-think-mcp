#!/usr/bin/env node
/**
 * Minimal stdio handshake test for session-think-mcp.
 * Spawns `node index.js`, speaks MCP over stdio, prints responses.
 * Usage: node test-handshake.mjs
 */
import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '';
const pending = new Map();
let nextId = 1;

child.stdout.on('data', (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch {
      console.log('NON-JSON STDOUT:', line.slice(0, 200));
    }
  }
});
child.stderr.on('data', (d) => process.stderr.write('[server-stderr] ' + d));

function request(method, params, timeoutMs = 10000) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), timeoutMs);
    pending.set(id, (msg) => {
      clearTimeout(t);
      resolve(msg);
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

const results = {};
try {
  const init = await request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'handshake-test', version: '1.0.0' }
  });
  results.initialize = init.result?.serverInfo ?? init.error ?? 'NO RESULT';
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const list = await request('tools/list', {});
  results.tools_list = list.result
    ? { count: list.result.tools.length, names: list.result.tools.map(t => t.name) }
    : list.error ?? 'NO RESULT';

  const call = await request('tools/call', {
    name: 'think',
    arguments: { reasoning: 'handshake test thought', sessionName: 'test:handshake:bump' }
  });
  results.think_call = call.result
    ? { isError: call.result.isError ?? false, preview: JSON.stringify(call.result.content).slice(0, 300) }
    : call.error ?? 'NO RESULT';

  const del = await request('tools/call', {
    name: 'delete_session',
    arguments: { sessionName: 'test:handshake:bump' }
  });
  results.delete_call = del.result ? 'ok' : del.error ?? 'NO RESULT';

  console.log('PASS');
} catch (e) {
  results.fatal = e.message;
  console.log('FAIL');
}
console.log(JSON.stringify(results, null, 2));
child.kill();
process.exit(0);
