# Implementation Plan

Detailed implementation roadmap for Spine, organized into phases with concrete deliverables.

## Phase 1: Foundation (Complete)

Core infrastructure, data models, and minimal UI.

### 1.1 Data models and types

**Package**: `packages/types`

- Project, Bible, Structure, Content interfaces
- Character, Location, Faction, WorldRule, PlotThread types
- Timeline and event types
- Analysis and review types
- Zod schemas for runtime validation
- Base entity interfaces (BaseEntity, BaseContent, Spine, Validator)

### 1.2 Storage layer

**Package**: `packages/core/storage`

- SQLite database schema and migrations (libsql)
- Repository pattern for bible entities
- Generic EntityRepository interface
- File-based content storage (markdown)
- Project save/load operations
- Auto-save implementation

### 1.3 Bible management

**Package**: `packages/core/bible`

- Character, Location, Faction, WorldRule, PlotThread, Timeline CRUD
- Relationship graph operations
- Cross-reference tracking
- Content status transitions

### 1.4 LLM interface

**Package**: `packages/llm`

- OpenAI-compatible client
- Configuration management
- Streaming support
- Token counting utilities
- Context assembly with relevance scoring

### 1.5 Web UI foundation

**App**: `apps/web`

- SvelteKit application with Svelte 5 runes
- Tailwind CSS v4 with CSS-first configuration
- Bits UI for accessible components (Dialog, Tabs, Select)
- Lucide icons
- Generic components: EntityCard, EntityListPage, CreateEntityDialog
- Project list and settings pages
- Bible editor with all tabs

## Phase 2: Generation (Complete)

Content generation pipeline with context assembly.

### 2.1 Context assembly

**Package**: `packages/llm/context`

- Token budget allocation
- Relevance scoring for bible entities
- Content summarization
- Constraint extraction
- Task-specific assembly

### 2.2 Structure management

**Package**: `packages/core/structure`

- Structure tree operations (Book → Arc → Chapter → Scene)
- Beat sheet management
- Tension targets
- Chapter types
- Hook specification

### 2.3 Generation pipeline

**Package**: `packages/core/generation`

- Pipeline stage definitions
- Outline generation
- Beat expansion
- Draft generation
- Self-review pass
- Generation history tracking

### 2.4 Basic analysis

**Package**: `packages/core/analysis`

- Tension scoring
- Hook strength scoring
- Pacing assessment
- Continuity checking
- Analysis storage

### 2.5 Writing workspace UI

**App**: `apps/web`

- Outline editor
- Writing workspace layout
- Generation controls
- Analysis panel
- Continuity warnings
- Draft history

## Phase 3: Review (In Progress)

Version tracking, diff generation, and review workflows.

### 3.1 Version management (Complete)

- Content version storage
- Diff generation
- Version metadata
- Rollback support

### 3.2 Review workflow (Complete)

- Review queue management
- Status transitions
- Paragraph-level actions
- Review comments
- Lock points
- Published immutability

### 3.3 Revision cascade (Complete)

- Horizon configuration
- Impact analysis
- Lock point detection
- Cascade execution and preview

### 3.4 Review UI (Pending)

- Review queue page
- Side-by-side diff view
- Inline annotation interface
- Action buttons
- Bulk approval actions
- Lock point visualization
- Status indicators

## Phase 4: Analytics (Complete)

Visualization and tracking dashboards.

### 4.1 Tension curve data (Complete)

- Planned tension extraction
- Actual tension aggregation
- Chapter data points
- Divergence calculation

### 4.2 Character tracking (Complete)

- Appearance tracking per chapter
- Presence intensity levels
- Relationship evolution
- Arc progress indicators

### 4.3 Plot thread tracking (Complete)

- Thread status tracking
- Thread timeline
- Dangling detection
- Promise/payoff matching

### 4.4 Visualization components (Complete)

- Tension curve chart
- Character presence heatmap
- Plot thread Gantt chart
- Quality trend charts
- Chapter type distribution

### 4.5 Analytics dashboard UI (Complete)

- Analytics dashboard page
- Tension curve view with divergence tracking
- Character presence heatmap
- Plot thread Gantt timeline
- Quality metrics chart (tension, pacing, hook strength)
- Chapter type distribution (pie/bar chart)
- Structure filtering controls

## Phase 5: Serial features (Partial)

Web serial specific tooling.

### 5.1 Hook management (Complete)

- Hook type classification
- Pattern analysis
- Strength trending
- Variety warnings

### 5.2 Cycle enforcement (Complete)

- Cycle configuration
- Position targets
- Phase detection
- Rebalancing suggestions

### 5.3 Release planning (Complete)

- Schedule configuration
- Buffer calculation
- Depletion projection
- Deadline tracking

### 5.4 Mystery tracking (Pending)

- Layer classification
- Lifecycle tracking
- Resolution detection
- Unfulfilled warnings

### 5.5 Serial dashboard UI (Pending)

- Release calendar
- Buffer status display
- Hook patterns
- Cycle indicator
- Mystery board

## Phase 6: Polish (Pending)

Quality of life and production readiness.

### 6.1 Bible extraction

- Entity detection in content
- New entity suggestions
- Update suggestions
- Aggressiveness config
- Suggestion review workflow

### 6.2 Export

- EPUB generation
- Royal Road format
- Plain text export
- Project backup

### 6.3 Offline support

- Service worker for static assets
- Local SQLite via sql.js
- Request queue
- Sync on reconnection
- Offline indicator

### 6.4 Performance optimization

- Lazy loading
- Virtual scrolling
- Analysis caching
- Incremental indexing
- Background processing

### 6.5 Error handling

- LLM failure handling
- Operation recovery
- Corruption detection
- Backup and restore

## Tech Stack

### Frontend
- **SvelteKit 2** with **Svelte 5** runes
- **Tailwind CSS v4** (CSS-first configuration via @theme)
- **Bits UI** for accessible headless components
- **Lucide Svelte** for icons
- **vitest-browser-svelte** with Playwright for component tests
- **Playwright** for integration tests

### Backend/Core
- **TypeScript** strict mode
- **Zod** for runtime validation
- **libsql** (SQLite) for structured data
- File system for prose content

### Tooling
- **Turborepo** + pnpm workspaces
- **ESLint** + **Prettier** (with Tailwind plugin)
- **Vitest** for unit tests

## Dependencies

```
Phase 1 ─┬─► Phase 2 ─┬─► Phase 3 ───► Phase 4 ───► Phase 5 ───► Phase 6
         │            │
         └────────────┴─► (UI can progress in parallel)
```

## Related documents

- [Project Goals](../goals.md)
- [Design Rationale](../rationale.md)
- [Project Proposal](../proposal/project-proposal.md)
- [Implementation Status](./tasks.md)
