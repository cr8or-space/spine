# MCP Server Implementation Plan

## Overview

Create an MCP (Model Context Protocol) server that exposes Spine functionality as tools for LLM interaction. The server acts as a bridge between LLMs (Claude, etc.) and the Spine WebSocket backend.

## Architecture

```
┌─────────────────────┐
│  Claude / LLM       │
└─────────┬───────────┘
          │  MCP Protocol (stdio)
          ▼
┌─────────────────────────────────────────┐
│           MCP Server (@repo/mcp)        │
├─────────────────────────────────────────┤
│  Tool Handlers                          │
│  - spine_project_* (project management) │
│  - spine_bible_* (entity management)    │
│  - spine_structure_* (outline)          │
│  - spine_content_* (prose)              │
│  - spine_generate_* (LLM generation)    │
│  - spine_review_* (review workflow)     │
│  - spine_analytics_* (analysis)         │
│  - spine_serial_* (web serial features) │
├─────────────────────────────────────────┤
│  @repo/client (WebSocket client)        │
└─────────────────────────────────────────┘
          │  WebSocket JSON-RPC
          ▼
┌─────────────────────────────────────────┐
│           Spine Server                  │
└─────────────────────────────────────────┘
```

## Package Structure

```
packages/mcp/
├── package.json
├── tsconfig.json
├── eslint.config.js
├── vitest.config.ts
├── src/
│   ├── index.ts              # Server entry point
│   ├── server.ts             # MCP server setup
│   ├── config.ts             # Configuration management
│   ├── context.ts            # Session context (current project)
│   ├── tools/
│   │   ├── index.ts          # Tool registry
│   │   ├── project.ts        # spine_project_* tools
│   │   ├── bible.ts          # spine_bible_* tools
│   │   ├── structure.ts      # spine_structure_* tools
│   │   ├── content.ts        # spine_content_* tools
│   │   ├── generation.ts     # spine_generate_* tools
│   │   ├── review.ts         # spine_review_* tools
│   │   ├── analytics.ts      # spine_analytics_* tools
│   │   └── serial.ts         # spine_serial_* tools
│   └── utils/
│       ├── formatting.ts     # Output formatting helpers
│       └── errors.ts         # Error handling
└── tests/
    └── tools.test.ts         # Tool unit tests
```

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@repo/client": "workspace:*",
    "@repo/types": "workspace:*",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

## Tool Design

### Naming Convention

All tools use `spine_` prefix with domain grouping:
- `spine_project_list`, `spine_project_create`, `spine_project_load`
- `spine_bible_get`, `spine_bible_character_create`
- `spine_structure_tree`, `spine_structure_create`
- `spine_content_get`, `spine_content_save`
- `spine_generate_start`, `spine_generate_status`
- `spine_review_queue`, `spine_review_approve`
- `spine_analytics_tension`, `spine_analytics_quality`
- `spine_serial_buffer`, `spine_serial_schedule`

### Tool Categories

#### Session Management

| Tool | Description | Annotations |
|------|-------------|-------------|
| `spine_project_list` | List all projects | readOnly |
| `spine_project_create` | Create a new project | destructive: false |
| `spine_project_load` | Load project into session | readOnly |
| `spine_project_delete` | Delete a project | destructive: true |
| `spine_session_status` | Show current session state | readOnly |

#### Bible/Entity Tools

| Tool | Description |
|------|-------------|
| `spine_bible_get` | Get full story bible |
| `spine_bible_character_list` | List all characters |
| `spine_bible_character_create` | Create a character |
| `spine_bible_character_update` | Update a character |
| `spine_bible_character_delete` | Delete a character |
| `spine_bible_location_list` | List locations |
| `spine_bible_location_create` | Create a location |
| `spine_bible_faction_list` | List factions |
| `spine_bible_faction_create` | Create a faction |
| `spine_bible_thread_list` | List plot threads |
| `spine_bible_thread_create` | Create a plot thread |
| `spine_bible_rule_list` | List world rules |
| `spine_bible_rule_create` | Create a world rule |
| `spine_bible_timeline` | List timeline events |
| `spine_bible_event_create` | Create a timeline event |

#### Structure Tools

| Tool | Description |
|------|-------------|
| `spine_structure_tree` | Get hierarchical structure tree |
| `spine_structure_list` | Get flat structure list |
| `spine_structure_get` | Get a single structure node |
| `spine_structure_create` | Create a structure node |
| `spine_structure_update` | Update structure properties |
| `spine_structure_delete` | Delete a structure and children |
| `spine_structure_reorder` | Move structure to new position |
| `spine_structure_add_beat` | Add a beat to a chapter |
| `spine_structure_set_hook` | Set the chapter hook |

#### Content Tools

| Tool | Description |
|------|-------------|
| `spine_content_get` | Get content for a structure |
| `spine_content_save` | Save content text |
| `spine_content_history` | Get version history |
| `spine_content_rollback` | Rollback to previous version |

#### Generation Tools

| Tool | Description |
|------|-------------|
| `spine_generate_start` | Start content generation |
| `spine_generate_status` | Check generation status |
| `spine_generate_cancel` | Cancel running generation |

Note: Streaming generation progress is not directly supported in MCP tools. The `spine_generate_status` tool should be polled for updates, or generation should complete synchronously for simple cases.

#### Review Tools

| Tool | Description |
|------|-------------|
| `spine_review_queue` | Get review queue |
| `spine_review_get` | Get content for review |
| `spine_review_approve` | Approve content |
| `spine_review_reject` | Reject content |
| `spine_review_publish` | Publish approved content |
| `spine_review_lock` | Create a lock point |
| `spine_review_unlock` | Remove a lock point |
| `spine_review_comment` | Add a review comment |
| `spine_review_cascade_preview` | Preview revision cascade |
| `spine_review_cascade_execute` | Execute revision cascade |

#### Analytics Tools

| Tool | Description |
|------|-------------|
| `spine_analytics_tension` | Get tension curve data |
| `spine_analytics_characters` | Get character presence data |
| `spine_analytics_threads` | Get plot thread timeline |
| `spine_analytics_quality` | Get quality metrics |

#### Serial Tools

| Tool | Description |
|------|-------------|
| `spine_serial_buffer` | Get release buffer status |
| `spine_serial_schedule` | Get release schedule |
| `spine_serial_hooks` | Analyze hook patterns |
| `spine_serial_cycle` | Get tension cycle status |
| `spine_serial_mysteries` | Get mystery tracking board |

## Tool Implementation Pattern

```typescript
import { z } from 'zod';
import type { FullClient } from '@repo/client';
import type { ToolRegistry } from './index';

export function registerProjectTools(registry: ToolRegistry, client: FullClient) {
  registry.register({
    name: 'spine_project_list',
    description: 'List all Spine writing projects',
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
      id: z.string(),
      title: z.string(),
      format: z.string(),
      createdAt: z.string(),
      updatedAt: z.string()
    })),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    handler: async () => {
      const projects = await client.project.list();
      return projects.map(p => ({
        id: p.id,
        title: p.title,
        format: p.format,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
    }
  });

  registry.register({
    name: 'spine_project_create',
    description: 'Create a new Spine writing project',
    inputSchema: z.object({
      title: z.string().describe('Project title'),
      format: z.enum(['web-serial', 'novel', 'short-story'])
        .optional()
        .default('web-serial')
        .describe('Project format type')
    }),
    outputSchema: z.object({
      id: z.string(),
      title: z.string(),
      message: z.string()
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    handler: async ({ title, format }) => {
      const project = await client.project.create(title, format);
      return {
        id: project.id,
        title: project.title,
        message: `Created project "${project.title}" (${project.id})`
      };
    }
  });

  // ... more project tools
}
```

## Session Context

The MCP server maintains session context to avoid requiring projectId on every call:

```typescript
interface SessionContext {
  currentProjectId: string | null;
  currentStructureId: string | null;
}

// Load project sets context
spine_project_load({ id: "proj-123" })
// -> Sets currentProjectId = "proj-123"

// Subsequent calls use context
spine_bible_get({})
// -> Uses currentProjectId from context
```

Tools that modify context:
- `spine_project_load` - Sets `currentProjectId`
- `spine_structure_select` - Sets `currentStructureId`
- `spine_session_status` - Returns current context

Tools can still accept explicit IDs to override context:
```typescript
spine_bible_get({ projectId: "other-project" })
```

## Configuration

Server configuration via environment or config file:

```typescript
interface McpConfig {
  // WebSocket server URL
  serverUrl: string;  // default: 'ws://localhost:8080'

  // Connection settings
  autoReconnect: boolean;  // default: true
  reconnectDelay: number;  // default: 1000
  requestTimeout: number;  // default: 30000
}
```

Configuration sources (priority order):
1. Environment variables: `SPINE_SERVER_URL`, etc.
2. Config file: `~/.config/spine/mcp.json`
3. Defaults

## Error Handling

Map Spine API errors to MCP tool errors:

```typescript
import { SpineApiError } from '@repo/client';

async function handleToolCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof SpineApiError) {
      throw new McpToolError({
        code: mapErrorCode(error.code),
        message: error.message,
        data: error.data
      });
    }
    throw error;
  }
}

function mapErrorCode(spineCode: number): string {
  switch (spineCode) {
    case -32000: return 'PROJECT_NOT_FOUND';
    case -32001: return 'ENTITY_NOT_FOUND';
    case -32002: return 'VALIDATION_ERROR';
    case -32005: return 'CONTENT_LOCKED';
    // ... etc
  }
}
```

## Output Formatting

Format tool outputs for LLM consumption:

```typescript
// Structure tree as readable outline
function formatStructureTree(structure: Structure, depth = 0): string {
  const indent = '  '.repeat(depth);
  const icon = getTypeIcon(structure.type);
  let output = `${indent}${icon} ${structure.title}`;

  if (structure.tensionTarget) {
    output += ` [tension: ${structure.tensionTarget}]`;
  }

  if (structure.children) {
    for (const child of structure.children) {
      output += '\n' + formatStructureTree(child, depth + 1);
    }
  }

  return output;
}

// Character as readable summary
function formatCharacter(char: Character): string {
  return `
**${char.name}** (${char.role})

${char.description || 'No description'}

**Traits:** ${char.traits?.join(', ') || 'None'}
**Goals:** ${char.goals?.join(', ') || 'None'}
**Arc:** ${char.arcSummary || 'Not defined'}
`.trim();
}
```

## Implementation Phases

### Phase 1: Foundation

1. Package setup (package.json, tsconfig, eslint)
2. MCP server initialization with SDK
3. Configuration management
4. WebSocket client integration
5. Session context management
6. Basic error handling

### Phase 2: Core Tools

1. Project tools (list, create, load, delete)
2. Bible tools (get, character CRUD)
3. Structure tools (tree, create, update)
4. Content tools (get, save, history)
5. Session status tool

### Phase 3: Advanced Tools

1. Generation tools (start, status, cancel)
2. Review tools (queue, approve, publish)
3. Remaining bible entity tools (location, faction, etc.)
4. Structure beats and hooks

### Phase 4: Analytics & Serial

1. Analytics tools (tension, characters, threads, quality)
2. Serial tools (buffer, schedule, hooks, mysteries)
3. Cascade preview/execute tools

### Phase 5: Polish

1. Output formatting improvements
2. Tool documentation/descriptions
3. Error message refinement
4. Unit tests for all tools
5. Integration testing with Claude

## Testing Strategy

### Unit Tests

Test each tool handler in isolation with mocked client:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerProjectTools } from './project';

describe('spine_project_list', () => {
  it('returns formatted project list', async () => {
    const mockClient = {
      project: {
        list: vi.fn().mockResolvedValue([
          { id: '1', title: 'Test', format: 'web-serial', createdAt: '...', updatedAt: '...' }
        ])
      }
    };

    const registry = new ToolRegistry();
    registerProjectTools(registry, mockClient as any);

    const result = await registry.call('spine_project_list', {});

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test');
  });
});
```

### Integration Tests

Test with real Spine server:

```typescript
describe('MCP Server Integration', () => {
  let server: McpServer;
  let spineServer: SpineServer;

  beforeAll(async () => {
    spineServer = await startSpineServer();
    server = await createMcpServer({ serverUrl: spineServer.url });
  });

  it('creates and loads a project', async () => {
    const createResult = await server.callTool('spine_project_create', {
      title: 'Integration Test'
    });

    expect(createResult.id).toBeDefined();

    const loadResult = await server.callTool('spine_project_load', {
      id: createResult.id
    });

    expect(loadResult.title).toBe('Integration Test');
  });
});
```

## Evaluation Questions

Test scenarios for verifying MCP server functionality:

1. "List all my Spine projects and show their formats"
2. "Create a new web serial project called 'The Dragon's Quest'"
3. "Add a protagonist character named Elena who is a dragon rider"
4. "Show me the story bible for the current project"
5. "Create an outline with 3 chapters for the first arc"
6. "What's the tension curve looking like for this book?"
7. "Add a revelation hook to chapter 3"
8. "Show me the release buffer status"
9. "What plot threads are currently active?"
10. "Get the review queue and approve all draft chapters"

## Future Considerations

### Resources

MCP resources could expose:
- Current project state as a resource
- Story bible as structured data
- Structure tree as navigable resource

### Prompts

MCP prompts could provide:
- "Help me create a character" guided flow
- "Analyze my pacing" with context gathering
- "Plan the next chapter" with story context

### Multi-Project Support

Future: Allow multiple projects to be loaded simultaneously with explicit project selection per tool call.

### Streaming Generation

Future: If MCP adds streaming support, expose generation progress as streaming output rather than polling.
