# spine-extract

Extract generic code from domain to framework package.

## Task

$ARGUMENTS

## Extraction Philosophy

From goals.md: "Extract, don't speculate. Build a real domain tool first. Extract the framework from working code. Abstractions discovered in practice are better than abstractions designed in theory."

## Extraction Checklist

### 1. Identify Extraction Candidate
- [ ] What code is being extracted?
- [ ] Is it currently working in the domain?
- [ ] Would BOTH domains (serial and techbook) benefit?
- [ ] Is it truly generic or does it have domain assumptions?

### 2. Analyze Dependencies

**What the code imports:**
- [ ] External packages (keep)
- [ ] Framework packages (keep)  
- [ ] Domain packages (must remove or abstract)

**What imports the code:**
- [ ] Framework code (should already work)
- [ ] Domain code (will need import updates)

### 3. Design Generic Interface
- [ ] What's the minimal interface?
- [ ] What type parameters are needed?
- [ ] What extension points are needed?
- [ ] How will domains customize behavior?

### 4. Extract to Framework
- [ ] Create new file in framework package
- [ ] Define generic interface
- [ ] Implement generic behavior
- [ ] Export from package

### 5. Update Domain to Use Framework
- [ ] Import from framework instead of local
- [ ] Implement domain-specific parts
- [ ] Register with framework (if needed)
- [ ] Remove duplicated code

### 6. Verify Second Domain
- [ ] Would techbook use this the same way?
- [ ] Are there hidden serial assumptions?
- [ ] Is the interface flexible enough?

### 7. Test & Document
- [ ] Framework tests for generic behavior
- [ ] Domain tests still pass
- [ ] Update architecture docs
- [ ] Update extension-points docs

## Context Files

@docs/goals.md
@docs/plan.md
@docs/tasks.md
@docs/framework/architecture.md
@docs/framework/extension-points.md

## Extraction Patterns

### Pattern 1: Interface + Registry

Domain code has concrete implementation:
```typescript
// packages/serial/core/validators/continuity.ts
export function checkContinuity(chapter: Chapter): ContinuityResult {
  // serial-specific logic
}
```

Extract interface to framework:
```typescript
// packages/framework/types/validation.ts
export interface Validator<T> {
  name: string;
  phase: 'structural' | 'automated' | 'computed';
  validate(item: T, context: ValidationContext): Promise<ValidationResult>;
}

// packages/framework/core/validation/registry.ts
export class ValidatorRegistry {
  register(validator: Validator<unknown>): void;
  getValidators(phase: string): Validator<unknown>[];
}
```

Domain implements interface:
```typescript
// packages/serial/core/validators/continuity.ts
import { Validator } from '@repo/framework/types';
import { Chapter } from '@repo/serial/types';

export const continuityValidator: Validator<Chapter> = {
  name: 'continuity',
  phase: 'computed',
  async validate(chapter, context) {
    // serial-specific logic
  }
};
```

### Pattern 2: Base Class + Extension

Domain code has complex implementation:
```typescript
// packages/serial/core/storage/content.ts
export class ContentRepository {
  save(content: SerialContent): void;
  get(id: string): SerialContent;
  // lots of implementation
}
```

Extract base to framework:
```typescript
// packages/framework/core/storage/content.ts
export abstract class BaseContentRepository<T extends Content> {
  protected db: Database;
  
  save(content: T): void {
    // generic implementation
  }
  
  get(id: string): T {
    // generic implementation
  }
  
  // Hook for domain customization
  protected abstract serialize(content: T): Record<string, unknown>;
  protected abstract deserialize(row: Record<string, unknown>): T;
}
```

Domain extends base:
```typescript
// packages/serial/core/storage/content.ts
import { BaseContentRepository } from '@repo/framework/core';
import { SerialContent } from '@repo/serial/types';

export class SerialContentRepository extends BaseContentRepository<SerialContent> {
  protected serialize(content: SerialContent) {
    // serial-specific serialization
  }
  
  protected deserialize(row) {
    // serial-specific deserialization
  }
}
```

### Pattern 3: Composition

Domain code mixes generic and specific:
```typescript
// packages/serial/core/generation/context.ts
export function assembleContext(chapter: Chapter) {
  const tokens = countTokens(chapter.content); // generic
  const characters = getRelevantCharacters(chapter); // serial-specific
  // ...
}
```

Split into framework utility + domain composition:
```typescript
// packages/framework/llm/tokens.ts
export function countTokens(text: string): number {
  // generic implementation
}

// packages/serial/core/generation/context.ts
import { countTokens } from '@repo/framework/llm';

export function assembleContext(chapter: Chapter) {
  const tokens = countTokens(chapter.content);
  const characters = getRelevantCharacters(chapter); // stays here
  // ...
}
```

## Anti-Patterns to Avoid

### ❌ Premature Abstraction
```typescript
// Don't create framework code that only serial uses
// Wait until techbook needs it too
```

### ❌ Leaky Abstraction
```typescript
// Don't let serial types leak into framework
import { Chapter } from '@repo/serial/types'; // NO!
```

### ❌ Over-Generalization
```typescript
// Don't make everything configurable
// Start minimal, extend when needed
```

### ❌ Type Erasure
```typescript
// Don't lose type safety
function process(item: unknown) { } // Too generic
function process<T extends Entity>(item: T) { } // Better
```

## Output Format

```
## Extraction: [Name]

### Current Location
- Package: [e.g., @repo/serial/core]
- File: [path]
- Lines: [count]

### Extraction Justification
- [ ] Works in serial domain
- [ ] Would benefit techbook domain
- [ ] Truly generic (no domain assumptions)

### Dependency Analysis

**Imports (what this code uses):**
| Import | Type | Action |
|--------|------|--------|
| zod | External | Keep |
| @repo/framework/types | Framework | Keep |
| @repo/serial/types | Domain | Abstract |

**Importers (what uses this code):**
| File | Package | Update Required |
|------|---------|-----------------|
| [path] | [package] | [what changes] |

### Generic Interface Design

```typescript
// Proposed interface
```

### Framework Implementation

```typescript
// What goes in framework
```

### Domain Implementation

```typescript
// What stays in / moves to domain
```

### Extraction Steps

1. [ ] Create framework file
2. [ ] Define interface
3. [ ] Implement generic parts
4. [ ] Update serial to use framework
5. [ ] Remove duplicated code
6. [ ] Verify techbook compatibility
7. [ ] Add tests
8. [ ] Update docs

### Verification

- [ ] Serial tests pass
- [ ] Framework tests added
- [ ] Types compile
- [ ] No serial imports in framework

### Documentation Updates
- [ ] framework/architecture.md
- [ ] framework/extension-points.md

### Tasks for tasks.md
- [ ] [Follow-up work]
```