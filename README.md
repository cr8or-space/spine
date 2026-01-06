# Spine

A framework for building domain-specific authoring tools where content must maintain internal consistency, track cross-references, evolve over time, and produce validated output.

## Domains

### Serial — Web Serial Fiction

Produce publication-quality web serials at scale with LLM assistance.

- **Story Bible** — Track characters, locations, factions, world rules, plot threads, timeline
- **Continuity Checking** — Prevent contradictions from reaching publication
- **Pacing Visualization** — Plan tension curves and compare planned vs. actual
- **Generation Pipeline** — Outline → Beats → Draft → Review → Revision
- **Serialization Tools** — Hook tracking, tension cycles, release buffer management

### TechBook — Progressive-Build Technical Books

Produce technical books where working code is tangled from prose.

- **Literate Programming** — The book is the source; code is extracted
- **Checkpoint Validation** — Tangled code compiles and tests pass at every checkpoint
- **Pedagogical Ordering** — Explain in reader order, tangle in compiler order
- **Concept Tracking** — Prerequisites enforced, glossary synchronized
- **Multi-Format Output** — Weave to HTML, PDF, EPUB

## Quick Start

```bash
# Install dependencies
pnpm install

# Start serial domain server
cd apps/serial-server && pnpm dev

# In another terminal, use the CLI
cd apps/serial-cli && pnpm dev -- project list
```

## Commands

```bash
pnpm install      # Install dependencies
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm format       # Format with Prettier
pnpm check-types  # TypeScript type checking
pnpm test         # Run all tests
```

## Project Structure

```
packages/
├── framework/
│   ├── types/        # Generic interfaces (Spine, Entity, Content, Validator)
│   ├── core/         # Storage, entity registry, validation pipeline
│   ├── llm/          # OpenAI-compatible client, context assembly
│   ├── server/       # WebSocket server infrastructure
│   └── client/       # WebSocket client library
├── serial/
│   ├── types/        # Bible, structure, content types
│   ├── core/         # Bible, generation, analysis, review
│   └── mcp/          # Serial MCP server
└── techbook/
    ├── types/        # Concept, snippet, checkpoint types
    ├── core/         # Tangle, weave, validation
    └── mcp/          # TechBook MCP server

apps/
├── serial-server/    # Serial domain server
├── serial-cli/       # Serial CLI
├── techbook-server/  # TechBook domain server
└── techbook-cli/     # TechBook CLI

docs/
├── goals.md          # Framework objectives
├── plan.md           # Implementation roadmap
├── tasks.md          # Implementation status
├── framework/        # Framework documentation
├── serial/           # Serial domain documentation
└── techbook/         # TechBook domain documentation
```

## Architecture

Spine separates **framework** (generic infrastructure) from **domains** (specific use cases).

**Framework provides:**
- Entity registry with lifecycle and relationships
- Content storage with versioning
- Validation pipeline (structural → automated → computed)
- WebSocket server with handler registration
- Spine abstractions (linear, tree, checkpoints)

**Domains provide:**
- Specific entity types (Characters, Snippets, etc.)
- Domain-specific validators
- Server handlers for domain operations
- CLI commands and MCP tools

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Validation**: Zod for runtime schemas
- **Storage**: SQLite for indexes, file system for content
- **Server**: WebSocket with JSON-RPC 2.0
- **Build**: Turborepo + pnpm workspaces
- **Testing**: Vitest
- **LLM**: OpenAI-compatible API (supports local models)

## Documentation

### Framework
- [Goals](docs/goals.md) — Objectives and principles
- [Implementation Plan](docs/plan.md) — Phased roadmap
- [Implementation Status](docs/tasks.md) — Progress checklist

### Serial Domain
- [CLI Guide](docs/serial/cli.md) — Command reference
- [MCP Guide](docs/serial/mcp.md) — Tool reference

### TechBook Domain
- [CLI Guide](docs/techbook/cli.md) — Command reference
- [MCP Guide](docs/techbook/mcp.md) — Tool reference

## Principles

- **Extract, don't speculate** — Framework emerges from working domain code
- **Composition over inheritance** — Domains compose framework pieces
- **Explicit extension points** — All plugin points are documented and typed
- **Domain logic stays in domains** — Framework knows entities, not Characters
- **Validation is not optional** — Every domain must have validators
- **Server is the interface** — CLI and MCP are clients to the WebSocket server
