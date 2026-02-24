#!/usr/bin/env node

/**
 * Simple file-based verification script for session-think-mcp
 * This validates files, package.json structure, and basic content
 * without running the server or requiring dependencies
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get directory of current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing session-think-mcp files...\n');

// Test 1: Check all required files exist
console.log('1. Testing file structure...');

const requiredFiles = [
  'index.js',
  'package.json', 
  'README.md',
  'LICENSE',
  '.gitignore',
  'EXAMPLES.md',
  'CHANGELOG.md'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = join(__dirname, file);
  if (existsSync(filePath)) {
    console.log(`[OK] ${file} exists`);
  } else {
    console.log(`[FAIL] ${file} missing`);
    allFilesExist = false;
  }
}

// Test 2: Validate package.json
console.log('\n2. Testing package.json...');

try {
  const packageJsonPath = join(__dirname, 'package.json');
  const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);
  
  // Check required fields
  const requiredFields = ['name', 'version', 'bin', 'dependencies', 'description'];
  for (const field of requiredFields) {
    if (packageJson[field]) {
      console.log(`[OK] Field "${field}" exists`);
    } else {
      console.log(`[FAIL] Field "${field}" missing`);
    }
  }
  
  // Check version
  if (packageJson.version === '1.3.0') {
    console.log('[OK] Version is 1.3.0');
  } else {
    console.log(`[FAIL] Version should be 1.3.0, found ${packageJson.version}`);
  }
  
  // Check name
  if (packageJson.name === 'session-think-mcp') {
    console.log('[OK] Package name is session-think-mcp');
  } else {
    console.log(`[FAIL] Package name should be session-think-mcp, found ${packageJson.name}`);
  }
  
  // Check binary
  if (packageJson.bin && packageJson.bin['session-think-mcp'] === 'index.js') {
    console.log('[OK] Binary entry point is correct');
  } else {
    console.log('[FAIL] Binary entry point is incorrect');
  }
  
  // Check dependencies
  const requiredDeps = ['@modelcontextprotocol/sdk', 'zod'];
  for (const dep of requiredDeps) {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`[OK] Dependency "${dep}" configured`);
    } else {
      console.log(`[FAIL] Dependency "${dep}" missing`);
    }
  }
} catch (error) {
  console.log(`[FAIL] Failed to parse package.json: ${error.message}`);
}

// Test 3: Basic content checks
console.log('\n3. Testing file content...');

try {
  // Check index.js
  const indexPath = join(__dirname, 'index.js');
  const indexContent = readFileSync(indexPath, 'utf8');
  
  const codeFeatures = [
    'sessionName',
    'validateSessionName',
    'sanitizeSessionName',
    'SESSION_DIR',
    'SESSION_MAX_RETURN',
    'registerTool',
    'think',
    'list_sessions',
    'view_session',
    'delete_session',
    'rename_session',
    'search_in_session',
    'search_all_sessions',
    'get_session_info',
    'cleanup_sessions',
    'find_thought_relationships'
  ];
  
  for (const feature of codeFeatures) {
    if (indexContent.includes(feature)) {
      console.log(`[OK] Code feature "${feature}" found`);
    } else {
      console.log(`[FAIL] Code feature "${feature}" missing`);
    }
  }
  
  // Check that old features are removed
  const removedFeatures = [
    'useDefaultSession',
    'setAsDefault',
    'getDefaultSession',
    'setDefaultSession',
    'set_default_session'
  ];
  
  for (const feature of removedFeatures) {
    if (!indexContent.includes(feature)) {
      console.log(`[OK] Removed feature "${feature}" not found (as expected)`);
    } else {
      console.log(`[FAIL] Removed feature "${feature}" still exists`);
    }
  }
  
  // Check README.md
  const readmePath = join(__dirname, 'README.md');
  const readmeContent = readFileSync(readmePath, 'utf8');
  
  const docTopics = [
    'session naming',
    'SESSION_DIR',
    'SESSION_MAX_RETURN',
    'search_in_session',
    'search_all_sessions',
    'rename_session'
  ];
  
  for (const topic of docTopics) {
    if (readmeContent.toLowerCase().includes(topic.toLowerCase())) {
      console.log(`[OK] Documentation for "${topic}" exists`);
    } else {
      console.log(`[FAIL] Documentation for "${topic}" missing`);
    }
  }
  
  // Check CHANGELOG.md
  const changelogPath = join(__dirname, 'CHANGELOG.md');
  const changelogContent = readFileSync(changelogPath, 'utf8');
  
  if (changelogContent.includes('1.3.0')) {
    console.log('[OK] CHANGELOG.md contains version 1.3.0');
  } else {
    console.log('[FAIL] CHANGELOG.md missing version 1.3.0');
  }
  
  if (changelogContent.includes('Breaking Changes')) {
    console.log('[OK] CHANGELOG.md documents breaking changes');
  } else {
    console.log('[FAIL] CHANGELOG.md missing breaking changes section');
  }
} catch (error) {
  console.log(`[FAIL] Content check failed: ${error.message}`);
}

// Installation and usage instructions
console.log('\nNext steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Test the server: node index.js');
console.log('3. Publish to npm: npm publish');
console.log('4. Configure in Claude Desktop:');
console.log('   {"command": "npx", "args": ["-y", "session-think-mcp@latest"]}');

console.log('\nVerification complete!');