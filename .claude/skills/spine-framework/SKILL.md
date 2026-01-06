---
name: spine-framework
description: "Guide for working with the Spine Framework - a foundation for building domain-specific authoring tools. Covers the framework/domain boundary, extension points, package structure, and patterns for adding new domains."
---

# Spine Framework Development

## Overview

Spine is a framework for building domain-specific authoring tools where content must maintain internal consistency, track cross-references, evolve over time, and produce validated output.

The framework provides generic infrastructure. Domains (like `serial` for web serials or `techbook` for technical books) provide specific entity types, validators, and tools.

## Package Structure

```
packages/
├── framework/
│   ├── types/        # Generic interfaces (Spine, Entity, Content, Validator)
│   ├── core/         # Storage, entity registry, content, validation pipeline
│   ├── llm/          # OpenAI-compatible client, context assembly
│   ├── server/       # WebSocket server with domain handler registration
│   └── client/       # WebSocket client library
├── serial/           # Web serial domain
│   ├── types/        # Character, Location, Chapter, etc.
│   ├── core/         # Bible, generation, analysis, review
│   └── mcp/          # Serial-specific MCP tools
└── techbook/         # Technical book domain
    ├── types/        # Concept, Snippet, Checkpoint, etc.
    ├── core/         # Tangle, weave, validation
    └── mcp/          # TechBook-specific MCP tools

apps/
├── serial-server/    # Launches server with serial handlers
├── serial-cli/       # Serial CLI
├── techbook-server/  # Launches server with techbook handlers
└── techbook-cli/     # TechBook CLI
```

## Framework vs Domain: What Goes Where

### Framework (`packages/framework/`)

Generic concepts that apply to ANY structured authoring domain:

| Concept | Framework Provides |
|---------|-------------------|
| **Entity** | Base type, registry, lifecycle, relationships |
| **Content** | Storage, versioning, reference indexing |
| **Spine** | Linear/Tree implementations, checkpoints |
| **Validation** | Pipeline orchestration, result aggregation |
| **Storage** | SQLite schema, repository base, migrations |
| **Server** | WebSocket infrastructure, handler registration |

**Rule**: If you're writing code that mentions "Character", "Snippet", "Chapter", or any domain-specific term, it belongs in a domain package, not framework.

### Domain (`packages/{serial,techbook}/`)

Specific implementations for a particular use case:

| Domain | Provides |
|--------|----------|
| **Serial** | Characters, Locations, Factions, Chapters, Tension analysis, Hooks |
| **TechBook** | Concepts, Snippets, Checkpoints, Tangle/Weave, Compile validation |

**Rule**: Domains import from framework. Framework never imports from domains.

## Extension Points

### 1. Entity Types

Domains register entity types with the framework's entity registry:

```typescript
// packages/serial/core/bible/character.ts
import { EntityType, EntityRegistry } from '@repo/framework/core';
import { CharacterSchema, Character } from '@repo/serial/types';

export const characterEntityType: EntityType<Character> = {
  name: 'character',
  schema: CharacterSchema,
  validators: [characterNameValidator, characterVoiceValidator],
};

// Registration happens at domain initialization
registry.register(characterEntityType);
```

### 2. Validators

Domains provide validators; framework orchestrates execution:

```typescript
// packages/serial/core/analysis/continuity.ts
import { Validator, ValidationResult } from '@repo/framework/types';

export const continuityValidator: Validator = {
  name: 'continuity',
  phase: 'computed', // structural | automated | computed
  async validate(context): Promise<ValidationResult[]> {
    // Check for contradictions with established facts
    // Return results with location, message, severity
  }
};
```

### 3. Server Handlers

Domains register handlers for their operations:

```typescript
// packages/serial/core/handlers.ts
import { HandlerRegistry } from '@repo/framework/server';

export function registerSerialHandlers(registry: HandlerRegistry) {
  registry.register('serial.bible.character.create', handleCharacterCreate);
  registry.register('serial.bible.character.update', handleCharacterUpdate);
  registry.register('serial.structure.tree', handleStructureTree);
  // ...
}
```

### 4. Spine Implementation

Domains can use or extend base spine implementations:

```typescript
// Serial uses TreeSpine for Book → Arc → Chapter → Scene
import { TreeSpine } from '@repo/framework/core';
import { StructureNode } from '@repo/serial/types';

export type SerialSpine = TreeSpine<StructureNode>;

// TechBook uses LinearSpine with checkpoints
import { LinearSpine } from '@repo/framework/core';
import { ChapterNode } from '@repo/techbook/types';

export type TechBookSpine = LinearSpine<ChapterNode>;
```

## Import Conventions

```typescript
// Framework imports - generic infrastructure
import { Entity, Content, Validator } from '@repo/framework/types';
import { EntityRegistry, ContentRepository } from '@repo/framework/core';
import { createServer, HandlerRegistry } from '@repo/framework/server';
import { LLMClient } from '@repo/framework/llm';

// Domain imports - specific to serial
import { Character, Chapter, HookType } from '@repo/serial/types';
import { BibleService, GenerationPipeline } from '@repo/serial/core';

// Domain imports - specific to techbook
import { Concept, Snippet, Checkpoint } from '@repo/techbook/types';
import { Tangler, Weaver } from '@repo/techbook/core';
```

## Adding a New Domain

1. **Create package structure**:
   ```
   packages/newdomain/
   ├── types/
   │   ├── package.json
   │   └── src/
   │       ├── index.ts
   │       └── entities.ts
   ├── core/
   │   ├── package.json
   │   └── src/
   │       ├── index.ts
   │       └── handlers.ts
   └── mcp/
       ├── package.json
       └── src/
           └── index.ts
   ```

2. **Define entity types** in `types/`:
   ```typescript
   import { z } from 'zod';
   import { BaseEntitySchema } from '@repo/framework/types';
   
   export const MyEntitySchema = BaseEntitySchema.extend({
     // domain-specific fields
   });
   export type MyEntity = z.infer<typeof MyEntitySchema>;
   ```

3. **Implement validators** in `core/`:
   ```typescript
   import { Validator } from '@repo/framework/types';
   
   export const myValidator: Validator = {
     name: 'my-domain-check',
     phase: 'structural',
     validate: async (ctx) => { /* ... */ }
   };
   ```

4. **Register handlers** in `core/handlers.ts`:
   ```typescript
   export function registerHandlers(registry: HandlerRegistry) {
     registry.register('newdomain.entity.create', handleCreate);
     // ...
   }
   ```

5. **Create server app** in `apps/newdomain-server/`:
   ```typescript
   import { createServer } from '@repo/framework/server';
   import { registerHandlers } from '@repo/newdomain/core';
   
   const server = createServer();
   registerHandlers(server.handlers);
   server.listen(8080);
   ```

6. **Create CLI** in `apps/newdomain-cli/`

7. **Create MCP** in `packages/newdomain/mcp/`

## Key Principles

### Framework Never Knows Domain Details

```typescript
// ❌ WRONG - framework code referencing domain type
// packages/framework/core/storage.ts
import { Character } from '@repo/serial/types'; // NO!

// ✅ CORRECT - framework uses generic Entity
// packages/framework/core/storage.ts
import { Entity } from '@repo/framework/types';
```

### Domains Compose, Don't Inherit

```typescript
// ❌ WRONG - deep inheritance
class SerialValidator extends FrameworkValidator { }

// ✅ CORRECT - implement interface, compose utilities
const continuityValidator: Validator = {
  name: 'continuity',
  validate: (ctx) => validateWithLLM(ctx, continuityPrompt)
};
```

### All Operations Go Through Server

```typescript
// ❌ WRONG - CLI directly calling core
import { createCharacter } from '@repo/serial/core';
await createCharacter(data);

// ✅ CORRECT - CLI calls server via client
import { SpineClient } from '@repo/framework/client';
const client = new SpineClient('ws://localhost:8080');
await client.call('serial.bible.character.create', data);
```

### Validation is Required

Every domain must provide validators. A domain with no constraints isn't using Spine correctly.

```typescript
// Domain initialization must register validators
export function initializeSerialDomain(registry: ValidatorRegistry) {
  registry.register(continuityValidator);
  registry.register(timelineValidator);
  registry.register(pacingValidator);
  // At least one validator required
}
```

## Common Tasks

### Adding a New Entity Type to a Domain

1. Define schema in `packages/{domain}/types/`
2. Create repository in `packages/{domain}/core/`
3. Add server handlers
4. Add CLI commands
5. Add MCP tools

### Adding a New Validator

1. Implement `Validator` interface
2. Choose phase: `structural` (fast), `automated` (external tools), `computed` (LLM)
3. Register with domain's validator list
4. Add tests

### Modifying Framework Infrastructure

1. Check if change is truly generic (would ALL domains benefit?)
2. If domain-specific, add extension point instead
3. Update all domains if interface changes
4. Run cross-domain tests

## Testing

```bash
# Framework tests
cd packages/framework/core && pnpm test

# Domain tests
cd packages/serial/core && pnpm test
cd packages/techbook/core && pnpm test

# Integration tests (CLI → Server → Core)
cd apps/serial-cli && pnpm test:integration
```