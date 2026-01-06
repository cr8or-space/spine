# Framework Extension Points

This document describes how domains extend the framework. Domains are specific authoring use cases (web serial, technical book, etc.) built on framework infrastructure.

## Overview

The framework provides four primary extension points:

1. **Entity types** - Register domain-specific entities
2. **Validators** - Implement domain-specific validation rules
3. **Server handlers** - Add domain-specific API endpoints
4. **Spine implementations** - Customize content structure

## Entity Types

Entities are things that exist in the project world. The framework provides the registry; domains define their types.

### Defining an Entity Type

```typescript
import { z } from 'zod';
import { BaseEntitySchema, type EntityType } from '@repo/framework/types';

// Define the entity schema
export const CharacterSchema = BaseEntitySchema.extend({
  type: z.literal('character'),
  name: z.string().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
  description: z.string().optional(),
  traits: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
});
export type Character = z.infer<typeof CharacterSchema>;

// Define the entity type metadata
export const CharacterType: EntityType<Character> = {
  name: 'character',
  schema: CharacterSchema,
  plural: 'characters',
  description: 'A character in the story',
  create: (partial) => ({
    id: generateId(),
    type: 'character',
    name: partial.name ?? 'Unnamed',
    role: partial.role ?? 'minor',
    description: partial.description,
    traits: partial.traits ?? [],
    goals: partial.goals ?? [],
  }),
};
```

### Registering Entity Types

```typescript
import { EntityRegistry } from '@repo/framework/core';
import { CharacterType, LocationType, FactionType } from './types';

export function registerSerialEntities(registry: EntityRegistry): void {
  registry.register(CharacterType);
  registry.register(LocationType);
  registry.register(FactionType);
  // ... more entity types
}
```

## Validators

Validators check constraints and produce validation results. The framework orchestrates execution; domains provide the rules.

### Defining a Validator

```typescript
import type { Validator, ValidationResult } from '@repo/framework/types';
import type { SerialContext } from './context';

export const ContinuityValidator: Validator<SerialContext> = {
  name: 'continuity',
  phase: 'computed', // structural, automated, or computed

  async validate(context: SerialContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check for continuity issues
    for (const content of context.contents) {
      const issues = await checkContinuity(content, context.bible);
      for (const issue of issues) {
        results.push({
          status: 'fail',
          message: issue.message,
          location: { nodeId: content.spineNode, order: 0 },
          fix: issue.suggestedFix,
        });
      }
    }

    return results;
  },
};
```

### Registering Validators

```typescript
import type { ValidatorRegistry } from '@repo/framework/types';
import {
  ContinuityValidator,
  TimelineValidator,
  PacingValidator,
  HookValidator,
} from './validators';

export function registerSerialValidators(
  registry: ValidatorRegistry<SerialContext>
): void {
  registry.register(ContinuityValidator);
  registry.register(TimelineValidator);
  registry.register(PacingValidator);
  registry.register(HookValidator);
}
```

### Validation Phases

Validators are organized into phases that run in order:

| Phase | Purpose | Examples |
|-------|---------|----------|
| `structural` | Fast, schema-based checks | Required fields, type validation |
| `automated` | Rule-based checks | Timeline consistency, reference resolution |
| `computed` | LLM-assisted checks | Continuity, style analysis, pacing |

The framework runs all validators in a phase before proceeding to the next. Within a phase, validators run in parallel.

## Server Handlers

Server handlers implement API endpoints. The framework provides the router, protocol, and generic handlers; domains add their specific methods.

### Framework vs Domain Handlers

The framework provides two categories of handlers:

1. **Generic Framework Handlers** - CRUD operations for entities, content, projects, and validation that work across all domains
2. **Domain Handlers** - Domain-specific operations registered by each domain

### Using Framework Base Services

Domains extend the framework's `BaseServices` with their own services:

```typescript
import {
  createBaseServices,
  extendServices,
  type BaseServices,
} from '@repo/framework/server';

interface MyDomainServices extends BaseServices {
  bible(projectId: string): BibleService;
  structure(projectId: string): StructureService;
}

export function createServices(config: ServiceConfig): MyDomainServices {
  const base = createBaseServices({
    dataDir: config.dataDir,
    llm: config.llm,
  });

  return extendServices(base, {
    bible: (projectId) => createBibleService(base.db, projectId),
    structure: (projectId) => createStructureService(base.db, projectId),
  });
}
```

### Defining a Handler

```typescript
import { z } from 'zod';
import type { Router } from '@repo/framework/server';
import { ApiError } from '@repo/framework/server';
import type { Services } from './services';

// Define parameter schema
const CharacterCreateParams = z.object({
  projectId: z.string(),
  data: z.object({
    name: z.string(),
    role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
    description: z.string().optional(),
  }),
});

export function registerCharacterHandlers(
  router: Router,
  services: Services
): void {
  router.register(
    'bible.character.create',
    async (params) => {
      const validated = CharacterCreateParams.parse(params);
      const character = await services.bible(validated.projectId)
        .createCharacter(validated.data);
      return character;
    },
    CharacterCreateParams
  );

  // ... more handlers
}
```

### Handler Registration Pattern

Domain server launchers combine framework handlers with domain-specific ones:

```typescript
import {
  createServer,
  createBaseServices,
  createSessionManager,
  registerFrameworkHandlers,
} from '@repo/framework/server';
import { registerSerialHandlers } from './handlers';
import { createSerialServices } from './services';
import { serialValidationService } from './validation';

export async function startSerialServer(options: ServerOptions) {
  const services = createSerialServices(options);
  const sessionManager = createSessionManager();
  const server = createServer({ port: options.port });

  // Register framework generic handlers (entities, content, validation)
  registerFrameworkHandlers(server.router, services, server.subscriptions, sessionManager, {
    projectService: services.project,
    validationService: serialValidationService,
  });

  // Register domain-specific handlers
  registerSerialHandlers(server.router, services);

  await server.start();
}
```

### Generic Framework Handlers

The framework provides these generic handlers out of the box:

| Namespace | Methods | Description |
|-----------|---------|-------------|
| `entity.*` | list, get, create, update, delete | Entity CRUD operations |
| `content.*` | list, get, create, update, delete | Content CRUD operations |
| `project.*` | list, get, create, update, delete, load | Project management |
| `validation.*` | run, results, summary, clear, phases | Validation operations |

Domains can use these as-is or override specific methods with domain-specific implementations.

### Session Management

Handlers can use session context for connection-scoped state:

```typescript
import { createSessionContext } from '@repo/framework/server';

router.register('structure.get', async (params, context) => {
  const session = createSessionContext(sessionManager, context.connection.id);

  // Use explicit param or fall back to session
  const projectId = params.projectId ?? session.requireProject();

  return services.structure(projectId).get(params.id);
});
```

### Error Handling

Use `ApiError` for consistent error responses:

```typescript
import { ApiError } from '@repo/framework/server';

router.register('entity.get', async (params) => {
  const entity = await services.entity.get(params.id);
  if (!entity) {
    throw ApiError.entityNotFound('Character', params.id);
  }
  return entity;
});
```

Available error factory methods:
- `ApiError.projectNotFound(id)` - Project not found
- `ApiError.entityNotFound(type, id)` - Entity not found
- `ApiError.validationError(message, data?)` - Validation failed
- `ApiError.generationError(message, data?)` - Generation failed
- `ApiError.reviewError(message, data?)` - Review operation failed
- `ApiError.contentLocked(structureId)` - Content is locked
- `ApiError.databaseError(message)` - Database operation failed
- `ApiError.llmError(message)` - LLM operation failed
- `ApiError.subscriptionError(message)` - Subscription failed

## Spine Implementations

Domains can use framework spine implementations or create custom ones for specialized structures.

### Using Framework Spines

The framework provides base implementations:

```typescript
import { TreeSpineImpl, LinearSpineImpl } from '@repo/framework/core';

// Tree spine for Book -> Arc -> Chapter -> Scene
const structureSpine = new TreeSpineImpl<Structure>(structures, {
  getId: (node) => node.id,
  getParentId: (node) => node.parentId,
  getOrder: (node) => node.order,
});

// Linear spine for sequential chapters
const chapterSpine = new LinearSpineImpl<Chapter>(chapters, {
  getId: (node) => node.id,
  getOrder: (node) => node.order,
});
```

### Custom Spine Implementation

For specialized needs, implement the spine interface directly:

```typescript
import type { Spine } from '@repo/framework/types';

export class CheckpointSpine<Node> implements Spine<Node> {
  private nodes: Node[];
  private checkpoints: Map<string, number>;

  constructor(nodes: Node[], checkpointFn: (node: Node) => boolean) {
    this.nodes = nodes;
    this.checkpoints = new Map();
    // Index checkpoints
    nodes.forEach((node, index) => {
      if (checkpointFn(node)) {
        this.checkpoints.set(this.getId(node), index);
      }
    });
  }

  // Implement Spine interface methods...

  // Add checkpoint-specific methods
  getCheckpoint(name: string): Node | null { ... }
  nodesBeforeCheckpoint(name: string): Node[] { ... }
}
```

## Constraint Extractors

Domains define how to extract constraints from their entity types.

### Defining an Extractor

```typescript
import type { ConstraintExtractor, Constraint } from '@repo/framework/types';
import type { Character } from './types';

export const CharacterConstraintExtractor: ConstraintExtractor<Character> = {
  entityType: 'character',

  extract(character: Character): Omit<Constraint, 'id'>[] {
    const constraints: Omit<Constraint, 'id'>[] = [];

    // Extract facts from description
    if (character.description) {
      constraints.push({
        type: 'fact',
        sourceEntityId: character.id,
        sourceEntityType: 'character',
        statement: `${character.name}: ${character.description}`,
        priority: 60,
        severity: 'warning',
        active: true,
      });
    }

    // Extract traits as style constraints
    for (const trait of character.traits) {
      constraints.push({
        type: 'style',
        sourceEntityId: character.id,
        sourceEntityType: 'character',
        statement: `${character.name} displays the trait: ${trait}`,
        priority: 40,
        severity: 'info',
        active: true,
      });
    }

    return constraints;
  },
};
```

## Best Practices

### Extension Guidelines

1. **Types belong in domain packages** - Framework types are generic; domain-specific types go in `packages/{domain}/types`

2. **Validators should be focused** - One validator per concern. Combine in the registry, not in the validator.

3. **Handlers validate params early** - Use Zod schemas for request validation before processing.

4. **Spine implementations are immutable** - Create new instances for structural changes.

5. **Extractors should be deterministic** - Same entity input should produce same constraint output.

### Common Patterns

**Entity lifecycle tracking:**
```typescript
// Track when entity was introduced
entity.introducedAt = { nodeId: currentChapter.id, order: 0 };

// Track when entity was retired (e.g., character death)
entity.retiredAt = { nodeId: deathChapter.id, order: 0 };
```

**Validation context assembly:**
```typescript
// Gather context for validators
const context: SerialContext = {
  project: await services.project.get(projectId),
  bible: await services.bible.get(projectId),
  structures: await services.structure.getAll(projectId),
  contents: await services.content.getAll(projectId),
};
```

**Handler error handling:**
```typescript
router.register('entity.get', params, result, async (params) => {
  const entity = await services.entity.get(params.id);
  if (!entity) {
    throw new JsonRpcError(-32001, 'Entity not found', { id: params.id });
  }
  return entity;
});
```

## See Also

- [Architecture](./architecture.md) - Package structure and core abstractions
- [Server Handlers Skill](/SKILLS.md#spine-server-handlers) - Detailed handler implementation guide
- [MCP Tools Skill](/SKILLS.md#spine-mcp-tools) - Creating MCP tools for domains
