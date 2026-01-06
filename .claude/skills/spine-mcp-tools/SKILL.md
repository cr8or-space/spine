---
name: spine-mcp-tools
description: "Guide for creating MCP (Model Context Protocol) tools for Spine domains. Covers tool naming, parameter patterns, session context, error handling, and testing."
---

# Spine MCP Tool Development

## Overview

Each Spine domain exposes its functionality as MCP tools. MCP enables AI assistants like Claude to interact with Spine projects programmatically.

## Architecture

```
Claude Desktop / MCP Client
        ↓
   MCP Protocol (stdio)
        ↓
   Domain MCP Server (packages/{domain}/mcp)
        ↓
   WebSocket Client
        ↓
   Spine Server (domain handlers)
        ↓
   Domain Core Logic
```

The MCP server is a thin layer that translates MCP tool calls into WebSocket RPC calls.

## Package Structure

```
packages/{domain}/mcp/
├── package.json
└── src/
    ├── index.ts           # Entry point, server setup
    ├── config.ts          # Configuration loading
    ├── client.ts          # WebSocket client wrapper
    └── tools/
        ├── index.ts       # Tool registration
        ├── project.ts     # Project tools
        ├── bible.ts       # Bible tools (serial)
        ├── concept.ts     # Concept tools (techbook)
        └── ...
```

## Tool Naming Convention

```
spine_{domain_resource}_{action}
```

**Pattern breakdown**:
- `spine_` — Prefix for all Spine tools
- `{domain_resource}` — Domain and resource, snake_case
- `{action}` — What it does

**Examples**:
```
spine_project_list
spine_project_create
spine_project_load

spine_bible_character_create    # serial domain
spine_bible_character_list
spine_bible_location_create

spine_concept_create            # techbook domain
spine_concept_deps
spine_snippet_create
spine_checkpoint_validate
```

**Actions**:
- `list` — Get all resources
- `get` — Get single resource
- `create` — Create new resource
- `update` — Update resource
- `delete` — Delete resource (requires confirm)
- `tree` — Get hierarchical view
- `start` / `stop` / `status` — For processes

## Tool Definition

### Basic Structure

```typescript
// packages/serial/mcp/src/tools/bible.ts
import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SpineClient } from '../client.js';

export function createBibleTools(client: SpineClient): Tool[] {
  return [
    {
      name: 'spine_bible_character_create',
      description: 'Create a new character in the story bible',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Project ID (uses current project if not specified)',
          },
          name: {
            type: 'string',
            description: 'Character name',
          },
          role: {
            type: 'string',
            enum: ['protagonist', 'antagonist', 'supporting', 'minor'],
            description: 'Character role in the story',
          },
          traits: {
            type: 'array',
            items: { type: 'string' },
            description: 'Character personality traits',
          },
          description: {
            type: 'string',
            description: 'Character description',
          },
        },
        required: ['name', 'role'],
      },
    },
    // ... more tools
  ];
}
```

### Tool Handler

```typescript
// packages/serial/mcp/src/tools/handlers.ts
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SpineClient } from '../client.js';
import { SessionState } from '../session.js';

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  client: SpineClient,
  session: SessionState
): Promise<CallToolResult> {
  switch (name) {
    case 'spine_bible_character_create':
      return handleCharacterCreate(args, client, session);
    
    case 'spine_bible_character_list':
      return handleCharacterList(args, client, session);
    
    // ... more handlers
    
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

async function handleCharacterCreate(
  args: Record<string, unknown>,
  client: SpineClient,
  session: SessionState
): Promise<CallToolResult> {
  // Get project ID from args or session
  const projectId = (args.projectId as string) ?? session.currentProjectId;
  if (!projectId) {
    return {
      content: [{ type: 'text', text: 'No project loaded. Use spine_project_load first.' }],
      isError: true,
    };
  }
  
  try {
    const result = await client.call('serial.bible.character.create', {
      projectId,
      name: args.name,
      role: args.role,
      traits: args.traits ?? [],
      description: args.description ?? '',
    });
    
    return {
      content: [{
        type: 'text',
        text: formatCharacterResult(result),
      }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
}
```

## Session Context

MCP tools maintain session state to avoid requiring IDs on every call.

### Session State

```typescript
// packages/{domain}/mcp/src/session.ts
export interface SessionState {
  currentProjectId?: string;
  currentStructureId?: string;  // serial
  currentCheckpointId?: string; // techbook
}

export class Session {
  private state: SessionState = {};
  
  get currentProjectId(): string | undefined {
    return this.state.currentProjectId;
  }
  
  setProject(id: string): void {
    this.state.currentProjectId = id;
    // Clear dependent state
    this.state.currentStructureId = undefined;
    this.state.currentCheckpointId = undefined;
  }
  
  setStructure(id: string): void {
    this.state.currentStructureId = id;
  }
  
  clear(): void {
    this.state = {};
  }
}
```

### Using Session in Tools

```typescript
// Tool definitions include optional session-filled params
{
  name: 'spine_content_get',
  inputSchema: {
    properties: {
      structureId: {
        type: 'string',
        description: 'Structure ID (uses current structure if not specified)',
      },
    },
    required: [], // structureId can come from session
  },
}

// Handler uses session fallback
async function handleContentGet(args, client, session) {
  const structureId = args.structureId ?? session.currentStructureId;
  if (!structureId) {
    return error('No structure selected. Use spine_structure_select first.');
  }
  // ...
}
```

### Session-Setting Tools

```typescript
// spine_project_load sets session
async function handleProjectLoad(args, client, session) {
  const result = await client.call('project.load', { projectId: args.projectId });
  session.setProject(args.projectId);
  return success(`Loaded project: ${result.name}`);
}

// spine_structure_select sets session
async function handleStructureSelect(args, client, session) {
  const result = await client.call('serial.structure.get', { id: args.structureId });
  session.setStructure(args.structureId);
  return success(`Selected: ${result.title}`);
}
```

## Response Formatting

### Success Responses

```typescript
function formatCharacterResult(character: Character): string {
  return [
    `Created character: ${character.name}`,
    `ID: ${character.id}`,
    `Role: ${character.role}`,
    character.traits.length ? `Traits: ${character.traits.join(', ')}` : '',
  ].filter(Boolean).join('\n');
}

function formatListResult(items: any[], formatItem: (item: any) => string): string {
  if (items.length === 0) {
    return 'No items found.';
  }
  return items.map(formatItem).join('\n\n');
}

function formatTreeResult(tree: StructureNode, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const lines = [`${prefix}${tree.type}: ${tree.title} (${tree.id})`];
  for (const child of tree.children ?? []) {
    lines.push(formatTreeResult(child, indent + 1));
  }
  return lines.join('\n');
}
```

### Error Responses

```typescript
function error(message: string, details?: Record<string, unknown>): CallToolResult {
  let text = `Error: ${message}`;
  if (details) {
    text += '\n' + JSON.stringify(details, null, 2);
  }
  return {
    content: [{ type: 'text', text }],
    isError: true,
  };
}

// Common error patterns
function noProjectError(): CallToolResult {
  return error('No project loaded. Use spine_project_load first.');
}

function notFoundError(type: string, id: string): CallToolResult {
  return error(`${type} not found: ${id}`);
}

function confirmationRequired(action: string): CallToolResult {
  return error(
    `${action} requires confirmation. Set confirm: true to proceed.`,
    { requiresConfirmation: true }
  );
}
```

## Deletion Patterns

Destructive operations require explicit confirmation:

```typescript
{
  name: 'spine_project_delete',
  description: 'Delete a project (requires confirmation)',
  inputSchema: {
    properties: {
      projectId: { type: 'string' },
      confirm: {
        type: 'boolean',
        description: 'Set to true to confirm deletion',
      },
    },
    required: ['projectId'],
  },
}

async function handleProjectDelete(args, client, session) {
  if (!args.confirm) {
    return confirmationRequired('Project deletion');
  }
  
  await client.call('project.delete', { projectId: args.projectId });
  
  // Clear session if deleting current project
  if (session.currentProjectId === args.projectId) {
    session.clear();
  }
  
  return success(`Deleted project: ${args.projectId}`);
}
```

## Server Setup

### Entry Point

```typescript
// packages/serial/mcp/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { SpineClient } from './client.js';
import { Session } from './session.js';
import { createAllTools, handleToolCall } from './tools/index.js';

async function main() {
  const config = loadConfig();
  const client = new SpineClient(config.serverUrl);
  const session = new Session();
  
  await client.connect();
  
  const server = new Server(
    { name: 'spine-serial', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  
  // Register tools
  const tools = createAllTools(client);
  server.setRequestHandler('tools/list', async () => ({ tools }));
  
  // Handle tool calls
  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args ?? {}, client, session);
  });
  
  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### Configuration

```typescript
// packages/serial/mcp/src/config.ts
import fs from 'fs';
import path from 'path';

export interface MCPConfig {
  serverUrl: string;
  autoReconnect: boolean;
  reconnectDelay: number;
  requestTimeout: number;
}

export function loadConfig(): MCPConfig {
  const defaults: MCPConfig = {
    serverUrl: 'ws://localhost:8080',
    autoReconnect: true,
    reconnectDelay: 1000,
    requestTimeout: 30000,
  };
  
  // Environment variables override
  if (process.env.SPINE_SERVER_URL) {
    defaults.serverUrl = process.env.SPINE_SERVER_URL;
  }
  
  // Config file override
  const configPath = path.join(
    process.env.HOME ?? '',
    '.config/spine/mcp.json'
  );
  if (fs.existsSync(configPath)) {
    const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    Object.assign(defaults, fileConfig);
  }
  
  return defaults;
}
```

## Testing Tools

### Unit Tests

```typescript
// packages/serial/mcp/src/tools/__tests__/bible.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleCharacterCreate } from '../bible.js';
import { createMockClient, createMockSession } from '../../testing.js';

describe('spine_bible_character_create', () => {
  let client: ReturnType<typeof createMockClient>;
  let session: ReturnType<typeof createMockSession>;
  
  beforeEach(() => {
    client = createMockClient();
    session = createMockSession({ currentProjectId: 'test-project' });
  });
  
  it('creates a character', async () => {
    client.call.mockResolvedValue({
      id: 'char-123',
      name: 'Elena',
      role: 'protagonist',
    });
    
    const result = await handleCharacterCreate(
      { name: 'Elena', role: 'protagonist' },
      client,
      session
    );
    
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Elena');
    expect(client.call).toHaveBeenCalledWith('serial.bible.character.create', {
      projectId: 'test-project',
      name: 'Elena',
      role: 'protagonist',
      traits: [],
      description: '',
    });
  });
  
  it('requires project to be loaded', async () => {
    session.currentProjectId = undefined;
    
    const result = await handleCharacterCreate(
      { name: 'Elena', role: 'protagonist' },
      client,
      session
    );
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No project loaded');
  });
});
```

### Integration Tests

```typescript
// packages/serial/mcp/src/__tests__/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';

describe('MCP Server Integration', () => {
  let serverProcess: ReturnType<typeof spawn>;
  
  beforeAll(async () => {
    // Start test server
    serverProcess = spawn('node', ['dist/index.js'], {
      env: { ...process.env, SPINE_SERVER_URL: 'ws://localhost:8081' },
    });
    await waitForServer();
  });
  
  afterAll(() => {
    serverProcess.kill();
  });
  
  it('lists tools', async () => {
    const response = await sendMCPRequest('tools/list', {});
    expect(response.tools).toContainEqual(
      expect.objectContaining({ name: 'spine_project_list' })
    );
  });
});
```

## Claude Desktop Configuration

```json
{
  "mcpServers": {
    "spine-serial": {
      "command": "node",
      "args": ["/path/to/spine/packages/serial/mcp/dist/index.js"],
      "env": {
        "SPINE_SERVER_URL": "ws://localhost:8080"
      }
    },
    "spine-techbook": {
      "command": "node",
      "args": ["/path/to/spine/packages/techbook/mcp/dist/index.js"],
      "env": {
        "SPINE_SERVER_URL": "ws://localhost:8081"
      }
    }
  }
}
```

## Checklist for New Tools

1. [ ] Choose name following `spine_{resource}_{action}` pattern
2. [ ] Define input schema with descriptions
3. [ ] Mark required vs optional parameters
4. [ ] Handle session context (projectId, structureId, etc.)
5. [ ] Format success response clearly
6. [ ] Return proper error responses
7. [ ] Add confirmation for destructive operations
8. [ ] Register tool in createAllTools
9. [ ] Add handler to handleToolCall switch
10. [ ] Write unit tests
11. [ ] Document in domain's MCP reference