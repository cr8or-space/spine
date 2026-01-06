# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Spine is a framework for building domain-specific authoring tools where content must maintain internal consistency, track cross-references, evolve over time, and produce validated output.

**Current domains:**
- **Serial** — Web serial fiction with story bibles, continuity tracking, and release management
- **TechBook** — Progressive-build technical books with literate programming (tangle/weave)

Single-author, local-first, CLI + MCP interface. No web frontend.

## Architecture

**Monorepo Structure** (Turborepo + pnpm workspaces):

### Framework Packages
- `packages/framework/types` — Generic interfaces (Spine, Entity, Content, Validator)
- `packages/framework/core` — Storage, entity registry, validation pipeline, spine implementations
- `packages/framework/llm` — OpenAI-compatible client, token counting, context assembly
- `packages/framework/server` — WebSocket server with domain handler registration
- `packages/framework/client` — WebSocket client library

### Serial Domain
- `packages/serial/types` — Bible entities, structure types, content types
- `packages/serial/core` — Bible, generation, analysis, review, release logic
- `packages/serial/mcp` — MCP server with serial-specific tools

### TechBook Domain
- `packages/techbook/types` — Concept, snippet, checkpoint types
- `packages/techbook/core` — Tangle, weave, validation logic
- `packages/techbook/mcp` — MCP server with techbook-specific tools

### Applications
- `apps/serial-server` — Standalone server for serial domain
- `apps/serial-cli` — CLI for serial domain
- `apps/techbook-server` — Standalone server for techbook domain
- `apps/techbook-cli` — CLI for techbook domain

### Shared Config
- `packages/eslint-config` — Shared ESLint configuration
- `packages/typescript-config` — Shared TypeScript configuration

## Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm format           # Format with Prettier
pnpm check-types      # TypeScript type checking

# Serial domain
cd apps/serial-server && pnpm dev     # Start serial server (port 8080)
cd apps/serial-cli && pnpm dev -- project list  # Run CLI commands

# TechBook domain
cd apps/techbook-server && pnpm dev   # Start techbook server (port 8081)
cd apps/techbook-cli && pnpm dev -- project list  # Run CLI commands

# Package testing
cd packages/framework/core && pnpm test
cd packages/serial/core && pnpm test
cd packages/techbook/core && pnpm test
```

## Framework vs Domain

**Framework code** (`packages/framework/*`):
- Generic interfaces and base implementations
- Never imports from domain packages
- Provides extension points for domains

**Domain code** (`packages/serial/*`, `packages/techbook/*`):
- Implements framework interfaces
- Contains domain-specific logic
- Registers handlers with framework server

**Rule:** If code mentions domain-specific types (Character, Snippet, etc.), it belongs in a domain package.

## Key Concepts

### Framework
- **Spine** — Structural backbone (linear, tree, DAG) with checkpoints
- **Entity** — Thing with identity, lifecycle, relationships
- **Content** — Authored material with versions and references
- **Validator** — Constraint checker (structural, automated, computed phases)

### Serial Domain
- **Story Bible** — Characters, locations, factions, world rules, plot threads, timeline
- **Structure** — Book → Arc → Chapter → Scene with tension targets
- **Generation** — Outline → Beats → Draft → Review pipeline
- **Published content is immutable**

### TechBook Domain
- **Concept** — Glossary entry (term, type, algorithm, pattern)
- **Snippet** — Code fragment with file, part, operation metadata
- **Checkpoint** — Named validated state of tangled code
- **Tangle** — Extract runnable code from prose
- **Weave** — Render manuscript to HTML/PDF/EPUB

## Code Style

- TypeScript strict mode, Zod for runtime validation
- kebab-case files, camelCase functions, PascalCase types, UPPER_SNAKE_CASE constants
- Vitest for unit tests
- Co-locate tests: `foo.ts` → `foo.test.ts`
- Imports: external → internal → relative, alphabetized within groups

## Extension Points

Domains extend the framework through:
1. **Entity types** — Register with EntityRegistry
2. **Validators** — Implement Validator interface, register with ValidatorRegistry
3. **Server handlers** — Register with HandlerRegistry
4. **Spine implementations** — Extend LinearSpine or TreeSpine

## Documentation

### Framework
- `docs/goals.md` — Framework objectives and principles
- `docs/plan.md` — Implementation roadmap
- `docs/tasks.md` — Implementation status
- `docs/framework/architecture.md` — Package structure
- `docs/framework/extension-points.md` — How to extend

### Serial Domain
- `docs/serial/cli.md` — CLI usage guide
- `docs/serial/mcp.md` — MCP tools reference
- `docs/serial/api.md` — WebSocket API reference

### TechBook Domain
- `docs/techbook/cli.md` — CLI usage guide
- `docs/techbook/mcp.md` — MCP tools reference

## Skills

Read the appropriate skill before implementing:
- `spine-framework` — Framework/domain boundaries, extension points
- `spine-serial` — Serial domain entities and workflows
- `spine-techbook` — TechBook domain entities and workflows
- `spine-server-handlers` — Adding WebSocket API endpoints
- `spine-mcp-tools` — Creating MCP tools

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/framework/core && pnpm test
cd packages/serial/core && pnpm test

# Run with verbose output
pnpm test -- --reporter=verbose
```

## Common Tasks

### Adding a server handler
1. Define params/result schemas in domain types
2. Implement handler in domain core
3. Register in domain's `registerHandlers()` function
4. Add CLI command
5. Add MCP tool

### Adding a validator
1. Implement Validator interface
2. Choose phase: structural (fast), automated (external tools), computed (LLM)
3. Register with domain's validator list
4. Add tests

### Extracting to framework
1. Verify code works in one domain
2. Verify second domain would benefit
3. Design generic interface
4. Move to framework with no domain imports
5. Update domain to use framework