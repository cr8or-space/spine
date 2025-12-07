# Coding Style Guide

This document defines the coding standards and conventions for the StoryGen project.

## Language & Runtime

- **TypeScript 5.x** with strict mode enabled
- **Node.js 20+** as the runtime target
- **ES2022** module syntax (`import`/`export`)

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Naming Conventions

### Files

- Use **kebab-case** for file names: `story-bible.ts`, `context-assembler.ts`
- Use `.ts` extension for source files, `.test.ts` for tests
- Index files export public API: `index.ts`

### Variables & Functions

- **camelCase** for variables and functions: `processSegment`, `tokenCount`
- **PascalCase** for types, interfaces, and classes: `StorySegment`, `RewriteTask`
- **UPPER_SNAKE_CASE** for constants: `MAX_TOKEN_BUDGET`, `DEFAULT_SEGMENT_SIZE`

### Interfaces & Types

- Prefix interfaces with descriptive names, not `I`: `StoryBible` not `IStoryBible`
- Use type aliases for unions and complex types
- Export types from a central `types/` directory

```typescript
// Good
interface StorySegment {
  id: string;
  content: string;
}

type TaskType = 'rewrite' | 'extend' | 'check';

// Avoid
interface IStorySegment { ... }
```

## Code Organization

### File Structure

```typescript
// 1. Imports (external, then internal, alphabetized within groups)
import { z } from 'zod';

import { StorySegment } from '../types';
import { countTokens } from '../utils/tokens';

// 2. Constants
const MAX_RETRIES = 3;

// 3. Types/Interfaces (if not in types/)
interface LocalConfig { ... }

// 4. Main exports
export function processSegment(...) { ... }

// 5. Helper functions (private)
function validateInput(...) { ... }
```

### Function Design

- Keep functions focused and small (< 50 lines preferred)
- Use early returns to reduce nesting
- Prefer pure functions where possible
- Document complex logic with inline comments

```typescript
// Good: Early returns, clear intent
export function getSegmentById(
  segments: StorySegment[],
  id: string
): StorySegment | undefined {
  if (!id) {
    return undefined;
  }

  return segments.find((s) => s.id === id);
}

// Avoid: Deep nesting
export function getSegmentById(segments: StorySegment[], id: string) {
  if (id) {
    for (const segment of segments) {
      if (segment.id === id) {
        return segment;
      }
    }
  }
  return undefined;
}
```

## Error Handling

### Use Typed Errors

```typescript
export class SegmentNotFoundError extends Error {
  constructor(public readonly segmentId: string) {
    super(`Segment not found: ${segmentId}`);
    this.name = 'SegmentNotFoundError';
  }
}

export class TokenBudgetExceededError extends Error {
  constructor(
    public readonly required: number,
    public readonly available: number
  ) {
    super(`Token budget exceeded: ${required} required, ${available} available`);
    this.name = 'TokenBudgetExceededError';
  }
}
```

### Error Handling Patterns

```typescript
// Use Result types for expected failures
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Throw for unexpected failures
function loadProject(path: string): Project {
  if (!existsSync(path)) {
    throw new ProjectNotFoundError(path);
  }
  // ...
}

// Use try/catch at boundaries
async function handleCommand(): Promise<void> {
  try {
    await executeRewrite(options);
  } catch (error) {
    if (error instanceof UserFacingError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error; // Re-throw unexpected errors
  }
}
```

## Async/Await

- Always use `async`/`await` over raw Promises
- Handle errors with try/catch, not `.catch()`
- Use `Promise.all()` for parallel operations when appropriate

```typescript
// Good
async function processSegments(segments: StorySegment[]): Promise<void> {
  for (const segment of segments) {
    await processSegment(segment);
  }
}

// Good: Parallel when independent
async function generateSummaries(segments: StorySegment[]): Promise<string[]> {
  return Promise.all(segments.map((s) => generateSummary(s)));
}

// Avoid
function processSegments(segments: StorySegment[]): Promise<void> {
  return segments.reduce(
    (promise, segment) => promise.then(() => processSegment(segment)),
    Promise.resolve()
  );
}
```

## Validation with Zod

Use Zod schemas for runtime validation of external data:

```typescript
import { z } from 'zod';

export const StorySegmentSchema = z.object({
  id: z.string().min(1),
  content: z.string(),
  version: z.number().int().positive(),
  summary: z.string().optional(),
});

export type StorySegment = z.infer<typeof StorySegmentSchema>;

// Validate at boundaries
export function loadSegment(data: unknown): StorySegment {
  return StorySegmentSchema.parse(data);
}
```

## Comments & Documentation

### JSDoc for Public APIs

```typescript
/**
 * Assembles context for a rewrite task within the token budget.
 *
 * @param task - The rewrite task configuration
 * @param bible - Current story bible
 * @param segments - All story segments
 * @param budget - Maximum token count for context
 * @returns Assembled context ready for LLM prompt
 * @throws {TokenBudgetExceededError} If minimum context exceeds budget
 */
export function assembleContext(
  task: RewriteTask,
  bible: StoryBible,
  segments: StorySegment[],
  budget: number
): AssembledContext {
  // ...
}
```

### Inline Comments

- Explain **why**, not **what**
- Document non-obvious business logic
- Mark TODOs with context: `// TODO(username): reason`

```typescript
// Good: Explains why
// We use a 10% buffer because tiktoken counts may differ from API counts
const effectiveBudget = budget * 0.9;

// Avoid: States the obvious
// Multiply budget by 0.9
const effectiveBudget = budget * 0.9;
```

## Testing

### Test File Organization

- Co-locate tests: `segmenter.ts` → `segmenter.test.ts`
- Use descriptive test names
- Follow Arrange-Act-Assert pattern

```typescript
import { describe, it, expect } from 'vitest';

import { segmentStory } from './segmenter';

describe('segmentStory', () => {
  it('splits content at chapter boundaries', () => {
    // Arrange
    const content = '# Chapter 1\nContent\n# Chapter 2\nMore content';

    // Act
    const segments = segmentStory(content);

    // Assert
    expect(segments).toHaveLength(2);
    expect(segments[0].content).toContain('Chapter 1');
  });

  it('handles empty input', () => {
    const segments = segmentStory('');
    expect(segments).toHaveLength(0);
  });
});
```

### Test Coverage

- Aim for high coverage on core logic (`core/`, `search/`)
- Focus on edge cases and error paths
- Mock external dependencies (LLM API, file system)

## Formatting

- Use **Prettier** for consistent formatting
- 2-space indentation
- Single quotes for strings
- Trailing commas in multiline structures
- 100 character line width

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100
}
```

## Imports

- Use absolute imports from `src/` root when possible
- Group imports: external → internal → relative
- Alphabetize within groups

```typescript
// External
import { Command } from 'commander';
import { z } from 'zod';

// Internal (from src/)
import { StoryBible } from '@/types';
import { countTokens } from '@/utils/tokens';

// Relative (same module)
import { parseChapter } from './parser';
```

## Git Conventions

- Commit messages: imperative mood, 50 char subject line
- Format: `type: subject` where type is `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

```
feat: add segment caching for improved performance
fix: handle empty chapters in segmenter
refactor: extract token counting to utility module
docs: update API documentation for context assembler
test: add edge case tests for bible updates
chore: update dependencies
```
