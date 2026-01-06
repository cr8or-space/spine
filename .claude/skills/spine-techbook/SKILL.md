---
name: spine-techbook
description: "Guide for the Spine TechBook domain - literate programming for progressive-build technical books. Covers concepts, snippets, checkpoints, tangle/weave pipeline, and validation."
---

# Spine TechBook Domain

## Overview

The TechBook domain supports authoring progressive-build technical books where:
- **The book is the source** — Code is tangled (extracted) from prose
- **Checkpoints must work** — Tangled code compiles and tests pass
- **Pedagogical order matters** — Explain in reader order, tangle in compiler order
- **Evolution is explicit** — Snippets declare introduce/replace/append operations

## Core Concepts

### Literate Programming Model

```
Manuscript (Markdown) → Tangle → Source Files → Compile/Test → Validate
                      → Weave  → HTML/PDF/EPUB
```

- **Tangle**: Extract runnable code from prose
- **Weave**: Render manuscript into readable output
- **Checkpoint**: Named, validated state of the codebase

### The Book is the Source

```
✗ Repo + Book (two things to maintain, can drift)
✓ Book only (code is generated, never edited directly)
```

Generated code goes in `build/` and is .gitignored. If the code is wrong, fix the book.

## Package Structure

```
packages/techbook/
├── types/
│   └── src/
│       ├── index.ts
│       ├── concept.ts      # Term, Type, Algorithm, Pattern
│       ├── snippet.ts      # Code fragments with metadata
│       ├── checkpoint.ts   # Validated states
│       └── output.ts       # Expected fixtures
├── core/
│   └── src/
│       ├── concepts/       # Concept registry, dependencies
│       ├── snippets/       # Snippet CRUD, part management
│       ├── tangle/         # File assembly
│       ├── checkpoints/    # Checkpoint management
│       ├── validation/     # Compile, test, output comparison
│       ├── weave/          # Render pipeline
│       └── handlers/       # Server handler registration
└── mcp/
    └── src/
        └── tools/          # MCP tool definitions
```

## Concepts (Glossary)

Concepts define the terms, types, and patterns readers must understand.

### Concept Types

```typescript
const ConceptTypeSchema = z.enum(['term', 'type', 'algorithm', 'pattern', 'principle']);

const ConceptSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  type: ConceptTypeSchema,
  definition: z.string(),
  
  // Where introduced
  introducedAt: z.string().optional(), // Chapter ID
  
  // Dependencies (concepts that must be understood first)
  prerequisites: z.array(z.string()).default([]), // Concept IDs
  
  // Links to code
  relatedSymbols: z.array(z.string()).default([]), // Function/type names
  
  // Examples
  examples: z.array(z.string()).default([]),
});
```

### Concept Dependencies

The system validates that concepts are introduced before they're used:

```typescript
interface ConceptGraph {
  nodes: Concept[];
  edges: { from: string; to: string }[]; // from depends on to
  
  // Validation
  getCycle(): string[] | null;  // Circular dependency
  getIntroductionOrder(): string[]; // Valid topological order
  getViolations(chapterOrder: string[]): ConceptViolation[];
}
```

### Symbol Linking

Code symbols (function names, types) link to concept definitions:

```typescript
interface SymbolLink {
  symbol: string;         // e.g., "parseExpression"
  conceptId: string;      // Concept that explains it
  snippetId: string;      // Where symbol appears
}
```

The system warns if a symbol appears in code before its concept is introduced.

## Snippets

Snippets are code fragments embedded in prose.

### Snippet Schema

```typescript
const SnippetOperationSchema = z.enum([
  'introduce',  // First appearance
  'replace',    // Complete replacement
  'append',     // Add after
  'prepend',    // Add before
  'delete',     // Remove
]);

const SnippetSchema = BaseEntitySchema.extend({
  // Identity
  name: z.string().min(1),           // Human-readable name
  
  // Target
  file: z.string(),                   // e.g., "src/parser.ts"
  part: z.string().optional(),        // e.g., "parseExpression"
  
  // Operation
  operation: SnippetOperationSchema,
  
  // Content
  language: z.string(),               // e.g., "typescript"
  code: z.string(),
  
  // Position in book
  chapterId: z.string(),
  order: z.number().int().nonnegative(),
  
  // Explanation link
  explanation: z.string().optional(), // Prose ID that explains this
});
```

### Named Parts

Parts are named sections within files that can be targeted:

```typescript
// In the book:
// <<< file=src/parser.ts part=parseExpression operation=introduce >>>
function parseExpression(): Expr {
  // initial implementation
}
// <<<>>>

// Later in the book:
// <<< file=src/parser.ts part=parseExpression operation=replace >>>
function parseExpression(): Expr {
  // improved implementation with precedence
}
// <<<>>>
```

Parts can nest:
- `parseExpression` contains `parseExpression.setup` and `parseExpression.core`
- Replacing a parent replaces children
- Appending to a part adds within it

### Snippet Operations

| Operation | Effect | Use Case |
|-----------|--------|----------|
| `introduce` | Creates new part | First time showing code |
| `replace` | Overwrites entire part | Refactoring, improvements |
| `append` | Adds after existing | Growing a function |
| `prepend` | Adds before existing | Adding imports, setup |
| `delete` | Removes part | Removing temporary code |

## Checkpoints

Checkpoints are named, validated states of the codebase.

### Checkpoint Schema

```typescript
const CheckpointSchema = BaseEntitySchema.extend({
  name: z.string().min(1),            // e.g., "chapter-03-complete"
  chapterId: z.string(),              // After which chapter
  
  // State
  status: z.enum(['pending', 'validated', 'failed', 'released']),
  validatedAt: z.date().optional(),
  
  // Validation results
  compileResult: ValidationResultSchema.optional(),
  testResult: ValidationResultSchema.optional(),
  outputResults: z.array(OutputComparisonSchema).optional(),
  
  // Notes
  description: z.string().default(''),
});
```

### Checkpoint Lifecycle

```
pending → validated → released
    ↓
  failed → (fix book) → pending
```

**Key rule**: Once a checkpoint is `released`, its behavior is frozen. Future chapters cannot break earlier checkpoints.

### Checkpoint Validation

```typescript
interface CheckpointValidation {
  checkpoint: Checkpoint;
  
  // Step 1: Tangle
  tangleResult: {
    success: boolean;
    files: string[];
    errors?: string[];
  };
  
  // Step 2: Compile
  compileResult: {
    success: boolean;
    output: string;
    errors?: CompileError[];
  };
  
  // Step 3: Test
  testResult: {
    success: boolean;
    passed: number;
    failed: number;
    errors?: TestError[];
  };
  
  // Step 4: Output comparison
  outputResults: {
    fixture: string;
    matches: boolean;
    diff?: string;
  }[];
}
```

## Tangling

Tangling assembles source files from snippets.

### Tangle Process

```typescript
interface TangleContext {
  checkpoint: Checkpoint;
  snippets: Snippet[];  // All snippets up to this checkpoint
}

interface TangledFile {
  path: string;
  content: string;
  parts: PartInfo[];    // Which parts exist and their ranges
}

function tangle(context: TangleContext): TangledFile[] {
  // 1. Group snippets by file
  // 2. Apply operations in order
  // 3. Resolve part references
  // 4. Generate final content
}
```

### Part Assembly

For a file with parts:

```typescript
// Snippets in order:
// 1. introduce file=main.ts          → Creates file
// 2. introduce file=main.ts part=A   → Creates part A
// 3. introduce file=main.ts part=B   → Creates part B
// 4. append file=main.ts part=A      → Adds to part A
// 5. replace file=main.ts part=B     → Replaces part B

// Final assembly:
// [part A content + appended content]
// [replaced part B content]
```

### Incremental Tangling

Only regenerate files affected by changed snippets:

```typescript
interface TangleCache {
  getAffectedFiles(changedSnippets: string[]): string[];
  invalidate(files: string[]): void;
}
```

## Validation

### Compile Validation

```typescript
interface CompileValidator {
  language: string;
  command: string;        // e.g., "tsc --noEmit"
  workingDir: string;     // Relative to build/
  
  validate(files: TangledFile[]): Promise<ValidationResult>;
}
```

### Test Validation

```typescript
interface TestValidator {
  framework: string;      // e.g., "vitest", "pytest"
  command: string;        // e.g., "npm test"
  
  validate(checkpoint: Checkpoint): Promise<TestResult>;
}
```

### Output Fixtures

For expected outputs (images, REPL sessions, benchmarks):

```typescript
const ExpectedOutputSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'image', 'json', 'custom']),
  checkpointId: z.string(),
  
  // Expected value
  fixturePath: z.string(),  // Path to expected output file
  
  // How to generate actual
  command: z.string(),      // Command to run
  outputPath: z.string(),   // Where output appears
  
  // Comparison
  comparator: z.enum(['exact', 'image-diff', 'json-deep', 'custom']),
  tolerance: z.number().optional(), // For image diff
});
```

## Weaving

Weaving renders the manuscript into readable output.

### Output Formats

```typescript
type OutputFormat = 'html' | 'pdf' | 'epub';

interface WeaveOptions {
  format: OutputFormat;
  syntaxTheme: string;
  showDiffs: boolean;      // Highlight changes from previous
  showLineNumbers: boolean;
  includeIndex: boolean;
  includeTOC: boolean;
}
```

### Code Presentation

```typescript
interface CodeBlock {
  snippetId: string;
  language: string;
  code: string;
  
  // Annotations
  highlights: LineRange[];      // Important lines
  additions: LineRange[];       // New since last checkpoint
  deletions: LineRange[];       // Removed (shown struck)
  
  // Context
  file: string;
  part: string | null;
  operation: SnippetOperation;
}
```

### Cross-References

Generated automatically:
- "Defined in Chapter 3"
- "Modified in Chapter 7"
- "See also: [Concept Name]"
- Index entries for concepts and symbols

## CLI Commands

```bash
# Project management
techbook project list
techbook project create "Crafting Interpreters" --language typescript
techbook project load <id>

# Concepts
techbook concept list
techbook concept create --name "Token" --type type --definition "..."
techbook concept deps <id>              # Show dependencies
techbook concept graph                  # Visualize dependency graph

# Snippets
techbook snippet list
techbook snippet create --file src/lexer.ts --part scan --operation introduce
techbook snippet show <id>              # Display with context
techbook snippet history <file> <part>  # Evolution of a part

# Checkpoints
techbook checkpoint list
techbook checkpoint create --name "chapter-03" --after <chapter-id>
techbook checkpoint validate <id>       # Run full validation
techbook checkpoint release <id>        # Mark as immutable

# Tangle
techbook tangle                         # Tangle current checkpoint
techbook tangle --checkpoint <id>       # Tangle specific checkpoint
techbook tangle --watch                 # Rebuild on changes

# Validate
techbook validate                       # Compile + test + outputs
techbook validate --compile-only
techbook validate --checkpoint <id>

# Weave
techbook weave html --output build/html
techbook weave pdf --output book.pdf
techbook weave epub --output book.epub

# Export
techbook export --format zip            # Full project backup
```

## MCP Tools

**Concept tools**: `spine_concept_create`, `spine_concept_list`, `spine_concept_deps`

**Snippet tools**: `spine_snippet_create`, `spine_snippet_list`, `spine_snippet_show`

**Checkpoint tools**: `spine_checkpoint_create`, `spine_checkpoint_validate`, `spine_checkpoint_release`

**Tangle tools**: `spine_tangle_run`, `spine_tangle_status`

**Validation tools**: `spine_validate_compile`, `spine_validate_test`, `spine_validate_outputs`

**Weave tools**: `spine_weave_html`, `spine_weave_pdf`

## Key Principles

### Pedagogical Order is Sacred

The reader's learning sequence matters more than the compiler's expectations. The tool adapts to the author's explanation order.

```markdown
<!-- Explain the concept first -->
A **token** represents a single unit of syntax...

<!-- Then show the code -->
<<< file=src/types.ts part=Token operation=introduce >>>
interface Token {
  type: TokenType;
  lexeme: string;
  line: number;
}
<<<>>>
```

### Checkpoints are Contracts

Once released, a checkpoint's behavior is frozen. Future chapters can extend but not contradict.

### Fail Fast and Loud

Broken checkpoints halt the build immediately. Silent failures that readers discover are unacceptable.

### Show the Evolution

Technical books aren't just about the final code—they're about the journey:

```markdown
<!-- Chapter 3: Initial implementation -->
<<< file=src/parser.ts part=precedence operation=introduce >>>
// Simple left-to-right parsing
<<<>>>

<!-- Chapter 7: Add precedence -->
<<< file=src/parser.ts part=precedence operation=replace >>>
// Pratt parser with precedence table
<<<>>>
```

The weaver shows diffs, highlights additions, and makes evolution visible.

### Verify, Don't Trust

LLM assistance for drafting prose is useful. LLM judgment about whether code works is not. Validation is automated and deterministic. Compilers don't hallucinate.

## Validation Phases

```
Structural → Automated → Computed
```

1. **Structural** (fast, no external tools)
   - Concept prerequisites satisfied
   - Symbols explained before use
   - No circular dependencies

2. **Automated** (external tools)
   - Code compiles
   - Tests pass
   - Outputs match fixtures

3. **Computed** (LLM, expensive)
   - Explanation clarity
   - Coverage assessment
   - Prose quality