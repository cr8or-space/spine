---
name: spine-server-handlers
description: "Guide for adding WebSocket API endpoints to Spine. Covers JSON-RPC 2.0 patterns, domain handler registration, request/response types, error handling, and session context."
---

# Spine Server Handler Development

## Overview

Spine uses a WebSocket server with JSON-RPC 2.0 protocol. The framework provides server infrastructure; domains register handlers for their operations.

## Architecture

```
Client (CLI/MCP) → WebSocket → Server → Handler Registry → Domain Handler → Core Logic
```

- **Framework** (`packages/framework/server`): WebSocket infrastructure, handler registry, session management
- **Domain** (`packages/{serial,techbook}/core`): Handler implementations registered at startup

## JSON-RPC 2.0 Protocol

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "serial.bible.character.create",
  "params": {
    "projectId": "proj-123",
    "name": "Elena",
    "role": "protagonist"
  }
}
```

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "id": "char-456",
    "name": "Elena",
    "role": "protagonist",
    "createdAt": "2025-01-06T00:00:00Z"
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32602,
    "message": "Invalid params: name is required",
    "data": {
      "field": "name",
      "reason": "required"
    }
  }
}
```

## Method Naming Convention

```
{domain}.{resource}.{subresource?}.{action}
```

**Examples**:
- `serial.bible.character.create`
- `serial.bible.character.update`
- `serial.structure.tree`
- `serial.generate.start`
- `techbook.concept.create`
- `techbook.tangle.run`

**Actions**:
- `list` - Get all resources
- `get` - Get single resource by ID
- `create` - Create new resource
- `update` - Update existing resource
- `delete` - Delete resource
- `tree` - Get hierarchical structure
- `start` / `stop` / `status` - For processes

## Defining Handlers

### Handler Type

```typescript
// packages/framework/server/types.ts
import { z } from 'zod';

export type Handler<TParams, TResult> = {
  params: z.ZodType<TParams>;
  result: z.ZodType<TResult>;
  handler: (params: TParams, context: HandlerContext) => Promise<TResult>;
};

export type HandlerContext = {
  session: SessionState;
  services: ServiceContainer;
};

export type SessionState = {
  currentProjectId?: string;
  currentStructureId?: string;
  // Domain can extend with additional state
};
```

### Implementing a Handler

```typescript
// packages/serial/core/handlers/bible/character.ts
import { z } from 'zod';
import { Handler, HandlerContext } from '@repo/framework/server';
import { CharacterSchema, CreateCharacterSchema } from '@repo/serial/types';

// Define schemas for params and result
const CreateCharacterParamsSchema = CreateCharacterSchema.extend({
  projectId: z.string().uuid().optional(), // Optional if session has currentProjectId
});

const CreateCharacterResultSchema = CharacterSchema;

// Implement handler
export const createCharacterHandler: Handler<
  z.infer<typeof CreateCharacterParamsSchema>,
  z.infer<typeof CreateCharacterResultSchema>
> = {
  params: CreateCharacterParamsSchema,
  result: CreateCharacterResultSchema,
  
  async handler(params, context) {
    // Get project ID from params or session
    const projectId = params.projectId ?? context.session.currentProjectId;
    if (!projectId) {
      throw new RpcError(-32602, 'No project loaded', { field: 'projectId' });
    }
    
    // Call core logic
    const character = await context.services.bible.createCharacter(projectId, {
      name: params.name,
      role: params.role,
      traits: params.traits ?? [],
    });
    
    return character;
  },
};
```

### Registering Handlers

```typescript
// packages/serial/core/handlers/index.ts
import { HandlerRegistry } from '@repo/framework/server';
import { createCharacterHandler, updateCharacterHandler } from './bible/character.js';
import { getStructureTreeHandler } from './structure/tree.js';

export function registerSerialHandlers(registry: HandlerRegistry) {
  // Bible handlers
  registry.register('serial.bible.character.create', createCharacterHandler);
  registry.register('serial.bible.character.update', updateCharacterHandler);
  registry.register('serial.bible.character.get', getCharacterHandler);
  registry.register('serial.bible.character.list', listCharactersHandler);
  registry.register('serial.bible.character.delete', deleteCharacterHandler);
  
  // Structure handlers
  registry.register('serial.structure.tree', getStructureTreeHandler);
  registry.register('serial.structure.create', createStructureHandler);
  
  // Generation handlers
  registry.register('serial.generate.start', startGenerationHandler);
  registry.register('serial.generate.status', getGenerationStatusHandler);
  
  // ... more handlers
}
```

### Server Initialization

```typescript
// apps/serial-server/src/index.ts
import { createServer } from '@repo/framework/server';
import { registerSerialHandlers } from '@repo/serial/core';

const server = createServer({
  port: 8080,
  dataDir: './data',
});

// Register domain handlers
registerSerialHandlers(server.handlers);

// Start server
await server.listen();
console.log('Serial server listening on ws://localhost:8080');
```

## Error Handling

### RPC Error Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid request | Missing required fields |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Validation failed |
| -32603 | Internal error | Unexpected server error |
| -32000 to -32099 | Server error | Application-specific errors |

### Application Error Codes

Define domain-specific codes in the -32000 range:

```typescript
// packages/serial/core/errors.ts
export const SerialErrorCodes = {
  PROJECT_NOT_FOUND: -32001,
  ENTITY_NOT_FOUND: -32002,
  CONTENT_LOCKED: -32003,
  GENERATION_IN_PROGRESS: -32004,
  CONTINUITY_VIOLATION: -32005,
} as const;
```

### Throwing Errors

```typescript
import { RpcError } from '@repo/framework/server';
import { SerialErrorCodes } from '../errors.js';

async handler(params, context) {
  const character = await context.services.bible.getCharacter(params.id);
  
  if (!character) {
    throw new RpcError(
      SerialErrorCodes.ENTITY_NOT_FOUND,
      `Character not found: ${params.id}`,
      { entityType: 'character', entityId: params.id }
    );
  }
  
  // Validation errors use -32602
  if (!params.name?.trim()) {
    throw new RpcError(-32602, 'Name cannot be empty', { field: 'name' });
  }
  
  return character;
}
```

## Session Context

### Using Session State

The session persists across requests for the same WebSocket connection:

```typescript
async handler(params, context) {
  // Prefer explicit param, fall back to session
  const projectId = params.projectId ?? context.session.currentProjectId;
  const structureId = params.structureId ?? context.session.currentStructureId;
  
  if (!projectId) {
    throw new RpcError(-32602, 'No project loaded. Use project.load first.');
  }
  
  // ...
}
```

### Updating Session State

```typescript
// Handler for project.load
export const loadProjectHandler: Handler<...> = {
  async handler(params, context) {
    const project = await context.services.project.load(params.projectId);
    
    // Update session state
    context.session.currentProjectId = project.id;
    context.session.currentStructureId = undefined; // Clear structure selection
    
    return project;
  }
};
```

## Common Handler Patterns

### List with Filtering

```typescript
const ListCharactersParamsSchema = z.object({
  projectId: z.string().uuid().optional(),
  role: z.enum(['protagonist', 'antagonist', 'supporting']).optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export const listCharactersHandler: Handler<...> = {
  params: ListCharactersParamsSchema,
  async handler(params, context) {
    const projectId = params.projectId ?? context.session.currentProjectId;
    if (!projectId) throw new RpcError(-32602, 'No project loaded');
    
    return context.services.bible.listCharacters(projectId, {
      role: params.role,
      limit: params.limit,
      offset: params.offset,
    });
  }
};
```

### Delete with Confirmation

```typescript
const DeleteCharacterParamsSchema = z.object({
  id: z.string().uuid(),
  confirm: z.boolean().default(false),
});

export const deleteCharacterHandler: Handler<...> = {
  params: DeleteCharacterParamsSchema,
  async handler(params, context) {
    if (!params.confirm) {
      throw new RpcError(
        -32602,
        'Deletion requires confirmation. Set confirm: true to proceed.',
        { requiresConfirmation: true }
      );
    }
    
    await context.services.bible.deleteCharacter(params.id);
    return { deleted: true, id: params.id };
  }
};
```

### Long-Running Operations

```typescript
// Start operation - returns immediately with operation ID
export const startGenerationHandler: Handler<...> = {
  async handler(params, context) {
    const operationId = await context.services.generation.start(params);
    return { operationId, status: 'started' };
  }
};

// Check status
export const getGenerationStatusHandler: Handler<...> = {
  async handler(params, context) {
    return context.services.generation.getStatus(params.operationId);
  }
};

// Cancel operation
export const cancelGenerationHandler: Handler<...> = {
  async handler(params, context) {
    await context.services.generation.cancel(params.operationId);
    return { cancelled: true };
  }
};
```

## Testing Handlers

```typescript
// packages/serial/core/handlers/__tests__/character.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterHandler } from '../bible/character.js';
import { createMockContext } from '@repo/framework/server/testing';

describe('createCharacterHandler', () => {
  let context: ReturnType<typeof createMockContext>;
  
  beforeEach(() => {
    context = createMockContext({
      session: { currentProjectId: 'test-project' },
    });
  });
  
  it('creates a character', async () => {
    const result = await createCharacterHandler.handler(
      { name: 'Elena', role: 'protagonist' },
      context
    );
    
    expect(result.name).toBe('Elena');
    expect(result.role).toBe('protagonist');
    expect(result.id).toBeDefined();
  });
  
  it('throws when no project loaded', async () => {
    context.session.currentProjectId = undefined;
    
    await expect(
      createCharacterHandler.handler({ name: 'Elena', role: 'protagonist' }, context)
    ).rejects.toThrow('No project loaded');
  });
  
  it('validates params', async () => {
    const result = createCharacterHandler.params.safeParse({ role: 'protagonist' });
    expect(result.success).toBe(false);
  });
});
```

## Checklist for New Handlers

1. [ ] Define params schema with Zod
2. [ ] Define result schema with Zod
3. [ ] Implement handler function
4. [ ] Handle session context (projectId, structureId)
5. [ ] Throw appropriate RpcError on failures
6. [ ] Register handler with correct method name
7. [ ] Add tests
8. [ ] Document in API reference