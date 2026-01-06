# Implementation Plan

Phased implementation roadmap for Spine Framework extraction and domain implementations.

## Overview

The plan follows an extraction strategy: the existing web serial code becomes the first domain while framework abstractions are extracted. The technical book domain validates the extraction by building on the framework without modifying it.

```
Phase 1: Framework Extraction
Phase 2: Serial Domain (from existing code)
Phase 3: TechBook Domain (validates framework)
Phase 4: Polish & Documentation
```

## Phase 1: Framework Extraction

Extract domain-agnostic infrastructure from the existing codebase.

### 1.1 Package restructure

**Current** → **Target**:
- `packages/types` → `packages/framework/types` (generic) + `packages/serial/types` (domain)
- `packages/core` → `packages/framework/core` (generic) + `packages/serial/core` (domain)
- `packages/llm` → `packages/framework/llm` (unchanged, already generic)
- `packages/server` → `packages/framework/server` (with domain handler registration)
- `packages/client` → `packages/framework/client` (unchanged, already generic)
- `packages/mcp` → `packages/serial/mcp` (domain-specific)
- `packages/ui` → removed (no web frontend)
- `apps/web` → removed
- `apps/server` → `apps/serial-server` (domain launcher)
- `apps/cli` → `apps/serial-cli` (domain CLI)

### 1.2 Framework types

**Package**: `packages/framework/types`

Define generic interfaces that domains implement:

- `Spine<Node>` — Base spine interface (traversal, checkpoints, snapshots)
- `LinearSpine<Node>` — Ordered sequence implementation
- `TreeSpine<Node>` — Hierarchical structure implementation
- `Entity` — Base entity with id, lifecycle, relationships
- `EntityType` — Registration metadata for domain entity types
- `Content` — Base content wrapper (id, type, spine position, status, references)
- `Reference` — Link from content to entity
- `Constraint` — Rule definition
- `ValidationResult` — Pass/fail/warn with location and message
- `Validator` — Interface for constraint checkers

### 1.3 Framework core

**Package**: `packages/framework/core`

Extract domain-agnostic logic:

- `storage/` — SQLite schema (generic tables), repository base classes, migrations
- `entity/` — Entity registry, relationship graph, lifecycle tracking
- `content/` — Content storage, version tracking, reference indexing
- `validation/` — Pipeline orchestration, result aggregation, phase management
- `spine/` — Base spine implementations, checkpoint management

### 1.4 Framework server

**Package**: `packages/framework/server`

Generalize WebSocket server:

- Domain handler registration system
- Common operations (project CRUD, entity CRUD, content CRUD)
- Validation trigger endpoints
- Session management
- Authentication hooks (for future use)

### 1.5 Remove web frontend

- Delete `apps/web/`
- Delete `packages/ui/`
- Update turborepo configuration
- Remove web-specific dependencies

## Phase 2: Serial Domain

Refactor existing serial-specific code into a domain package.

### 2.1 Serial types

**Package**: `packages/serial/types`

Domain-specific type definitions:

- Bible entities: Character, Location, Faction, WorldRule, PlotThread, TimelineEvent
- Structure types: Book, Arc, Chapter, Scene with tension targets and hooks
- Content types: Prose with analysis scores
- Serial-specific: HookType, ChapterType, TensionCycle, ReleaseSchedule

### 2.2 Serial core

**Package**: `packages/serial/core`

Domain logic (extracted from current `packages/core`):

- `bible/` — Character, Location, Faction, WorldRule, PlotThread, Timeline CRUD
- `structure/` — Book → Arc → Chapter → Scene hierarchy, beat management
- `generation/` — Outline → Beats → Draft → Review pipeline
- `analysis/` — Tension scoring, hook analysis, pacing, continuity checking
- `review/` — Review workflow, lock points, revision cascade
- `serial/` — Release buffer, hook patterns, tension cycles, mystery tracking

### 2.3 Serial validators

Domain-specific constraint checkers:

- Continuity validator (no contradictions with established facts)
- Timeline validator (events in causal order)
- Pacing validator (tension within targets)
- Hook validator (every chapter ends with appropriate hook)
- Release validator (buffer maintained)

### 2.4 Serial server

**App**: `apps/serial-server`

Standalone server that:

- Initializes framework server
- Registers serial domain handlers
- Configures serial-specific routes
- Launches with serial-appropriate defaults

### 2.5 Serial CLI

**App**: `apps/serial-cli`

Command-line interface:

- `serial project` — Project management
- `serial bible` — Bible entity CRUD
- `serial structure` — Outline management
- `serial content` — Content operations
- `serial generate` — Generation pipeline
- `serial review` — Review workflow
- `serial analyze` — Run analysis
- `serial release` — Release planning
- `serial export` — Export to formats

### 2.6 Serial MCP

**Package**: `packages/serial/mcp`

MCP server exposing serial tools (existing tools, reorganized):

- Project tools
- Bible tools (character, location, faction, rule, thread, timeline)
- Structure tools
- Content tools
- Generation tools
- Review tools
- Analytics tools
- Serial-specific tools (buffer, schedule, hooks, cycles, mysteries)

## Phase 3: TechBook Domain

Build technical book domain on the framework, validating the extraction.

### 3.1 TechBook types

**Package**: `packages/techbook/types`

Domain-specific type definitions:

- Concepts: Term, Type, Algorithm, Pattern (glossary entries)
- Snippets: Code fragment with file, part, operation metadata
- Checkpoints: Named validated states
- Operations: Introduce, Replace, Append, Prepend, Delete
- Outputs: ExpectedOutput for validation fixtures

### 3.2 TechBook core

**Package**: `packages/techbook/core`

Domain logic:

- `concepts/` — Concept registry, dependency graph, symbol linking
- `snippets/` — Snippet management, part tracking, operation application
- `tangle/` — File assembly from snippets, incremental tangling
- `checkpoints/` — Checkpoint declaration, snapshot management
- `validation/` — Build orchestration (tangle → compile → test → compare)
- `weave/` — Render pipeline (syntax highlighting, diff marking, cross-refs)

### 3.3 TechBook validators

Domain-specific constraint checkers:

- Compile validator (tangled code compiles)
- Test validator (tests pass at checkpoint)
- Output validator (actual matches expected fixtures)
- Concept validator (prerequisites before dependents)
- Symbol validator (code symbols explained before use)
- Coverage validator (all code has explanation)

### 3.4 TechBook server

**App**: `apps/techbook-server`

Standalone server that:

- Initializes framework server
- Registers techbook domain handlers
- Configures techbook-specific routes

### 3.5 TechBook CLI

**App**: `apps/techbook-cli`

Command-line interface:

- `techbook project` — Project management
- `techbook concept` — Glossary/concept CRUD
- `techbook snippet` — Snippet management
- `techbook checkpoint` — Checkpoint operations
- `techbook tangle` — Generate source files
- `techbook validate` — Run validation pipeline
- `techbook weave` — Render output formats
- `techbook export` — Export to PDF, HTML, EPUB

### 3.6 TechBook MCP

**Package**: `packages/techbook/mcp`

MCP server exposing techbook tools:

- Project tools
- Concept tools
- Snippet tools
- Checkpoint tools
- Tangle tools
- Validation tools
- Weave tools

## Phase 4: Polish & Documentation

Production readiness and documentation.

### 4.1 Error handling

- Circuit breaker for LLM calls (already exists, verify framework placement)
- Operation recovery and journaling
- Corruption detection and repair
- Backup and restore utilities

### 4.2 Performance

- Incremental validation (only check what changed)
- Lazy loading for large projects
- Background processing for expensive operations
- Caching strategies

### 4.3 Framework documentation

- Architecture overview
- Extension point reference
- Domain starter guide
- API documentation (server endpoints)

### 4.4 Domain documentation

- Serial user guide (CLI, MCP)
- TechBook user guide (CLI, MCP)
- Migration guide (from current web-based serial)

### 4.5 Testing

- Framework unit tests
- Domain unit tests
- Integration tests (CLI → Server → Core)
- Cross-domain validation (ensure framework is truly generic)

## Package Structure (Final)

```
packages/
├── framework/
│   ├── types/        # Generic interfaces and base types
│   ├── core/         # Storage, entity, content, validation, spine
│   ├── llm/          # OpenAI-compatible client, context assembly
│   ├── server/       # WebSocket server infrastructure
│   └── client/       # WebSocket client library
├── serial/
│   ├── types/        # Bible, structure, content types
│   ├── core/         # Bible, generation, analysis, review, release
│   └── mcp/          # Serial MCP server
└── techbook/
    ├── types/        # Concept, snippet, checkpoint types
    ├── core/         # Tangle, weave, validation
    └── mcp/          # TechBook MCP server

apps/
├── serial-server/    # Serial domain server launcher
├── serial-cli/       # Serial CLI
├── techbook-server/  # TechBook domain server launcher
└── techbook-cli/     # TechBook CLI

docs/
├── framework/        # Framework documentation
├── serial/           # Serial domain documentation
└── techbook/         # TechBook domain documentation
```

## Dependencies

```
Phase 1 (Framework) ──► Phase 2 (Serial) ──► Phase 4 (Polish)
         │                                        ▲
         └──────────► Phase 3 (TechBook) ─────────┘

Phases 2 and 3 can proceed in parallel after Phase 1 completes.
```

## Tech Stack

### Framework
- **TypeScript** strict mode
- **Zod** for runtime validation
- **libsql** (SQLite) for structured data
- File system for content
- **Vitest** for testing

### Server
- **WebSocket** with JSON-RPC 2.0
- Domain handler registration

### CLI
- **Commander.js** or similar for argument parsing
- Table formatting for output
- Interactive prompts where appropriate

### MCP
- MCP SDK for protocol compliance
- Domain-specific tool registration

## Related Documents

- [Framework Goals](./goals.md)
- [Implementation Status](./tasks.md)
- [Serial Rationale](./serial/rationale.md) — to be created
- [TechBook Rationale](./techbook/rationale.md) — to be created