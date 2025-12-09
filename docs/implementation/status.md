# Implementation Status

Checklist tracking implementation progress. See [plan.md](./plan.md) for detailed descriptions.

## Phase 1: Foundation

### 1.1 Data models and types
- [x] Project, Bible, Structure, Content interfaces
- [x] Character, Location, Faction, WorldRule, PlotThread types
- [x] Timeline and event types
- [x] Analysis and review types
- [x] Zod schemas for runtime validation
- [x] Base entity interfaces (BaseEntity, BaseContent, Spine, Validator)

### 1.2 Storage layer
- [x] SQLite schema and migrations (libsql)
- [x] Bible entity repositories
- [x] Generic EntityRepository interface
- [x] File-based content storage
- [x] Project save/load
- [x] Auto-save implementation

### 1.3 Bible management
- [x] Character CRUD
- [x] Location CRUD
- [x] Faction CRUD
- [x] World rule CRUD
- [x] Plot thread CRUD
- [x] Timeline event CRUD
- [x] Relationship graph
- [x] Cross-reference tracking
- [x] Content status transitions

### 1.4 LLM interface
- [x] OpenAI-compatible client
- [x] Configuration management
- [x] Request/response types
- [x] Streaming support
- [x] Error handling
- [x] Token counting

### 1.5 Web UI foundation
- [x] SvelteKit app with Svelte 5 runes
- [x] Tailwind CSS v4 configuration
- [x] Bits UI components (Dialog, Tabs, Select)
- [x] Lucide icons
- [x] Generic components (EntityCard, EntityListPage, CreateEntityDialog)
- [x] Project list page
- [x] Project settings page
- [x] Bible editor with all tabs
- [x] Entity forms
- [x] Search and filter
- [x] Shell/Workspace separation

## Phase 2: Generation

### 2.1 Context assembly
- [x] Token budget allocation
- [x] Relevance scoring
- [x] Content summarization
- [x] Constraint extraction
- [x] Task-specific assembly

### 2.2 Structure management
- [x] Structure tree operations
- [x] Beat sheet management
- [x] Tension targets
- [x] Chapter types
- [x] Hook specification
- [x] Reordering

### 2.3 Generation pipeline
- [x] Pipeline stage definitions
- [x] Outline generation
- [x] Beat expansion
- [x] Draft generation
- [x] Self-review pass
- [x] Stage retry
- [x] Generation history

### 2.4 Basic analysis
- [x] Tension scoring
- [x] Hook strength scoring
- [x] Pacing assessment
- [x] Continuity checking
- [x] Analysis storage

### 2.5 Writing workspace UI
- [x] Outline editor
- [x] Writing workspace layout
- [x] Generation controls
- [x] Analysis panel
- [x] Continuity warnings
- [x] Draft history

## Phase 3: Review

### 3.1 Version management
- [x] Content version storage
- [x] Diff generation
- [x] Version metadata
- [x] Rollback support

### 3.2 Review workflow
- [x] Review queue
- [x] Status transitions
- [x] Paragraph-level actions
- [x] Review comments
- [x] Lock points
- [x] Published immutability

### 3.3 Revision cascade
- [x] Horizon configuration
- [x] Impact analysis
- [x] Lock point detection
- [x] Cascade execution
- [x] Cascade preview

### 3.4 Review UI
- [ ] Review queue page
- [ ] Diff view
- [ ] Annotation interface
- [ ] Action buttons
- [ ] Bulk actions
- [ ] Lock visualization
- [ ] Status indicators

## Phase 4: Analytics

### 4.1 Tension curve data
- [x] Planned tension extraction
- [x] Actual tension aggregation
- [x] Chapter data points
- [x] Divergence calculation

### 4.2 Character tracking
- [x] Appearance tracking
- [x] Presence intensity
- [x] Relationship evolution
- [x] Arc progress

### 4.3 Plot thread tracking
- [x] Thread status tracking
- [x] Thread timeline
- [x] Dangling detection
- [x] Promise/payoff matching

### 4.4 Visualization components
- [x] Tension curve chart
- [x] Character heatmap
- [x] Plot thread Gantt
- [x] Quality trend charts
- [x] Chapter type distribution
- [x] ValidationPanel component
- [x] ValidationBadge component

### 4.5 Analytics dashboard UI
- [ ] Dashboard page
- [ ] Tension curve view
- [ ] Character presence view
- [ ] Plot thread timeline
- [ ] Quality metrics
- [ ] Filtering controls

## Phase 5: Serial features

### 5.1 Hook management
- [x] Hook type classification
- [x] Pattern analysis
- [x] Strength trending
- [x] Variety warnings

### 5.2 Cycle enforcement
- [x] Cycle configuration
- [x] Position targets
- [x] Phase detection
- [x] Rebalancing suggestions

### 5.3 Release planning
- [x] Schedule configuration
- [x] Buffer calculation
- [x] Depletion projection
- [x] Deadline tracking

### 5.4 Mystery tracking
- [ ] Layer classification
- [ ] Lifecycle tracking
- [ ] Resolution detection
- [ ] Unfulfilled warnings

### 5.5 Serial dashboard UI
- [ ] Release calendar
- [ ] Buffer status
- [ ] Hook patterns
- [ ] Cycle indicator
- [ ] Mystery board

## Phase 6: Polish

### 6.1 Bible extraction
- [ ] Entity detection
- [ ] New entity suggestions
- [ ] Update suggestions
- [ ] Aggressiveness config
- [ ] Suggestion review

### 6.2 Export
- [ ] EPUB generation
- [ ] Royal Road format
- [ ] Plain text export
- [ ] Project backup

### 6.3 Offline support
- [ ] Service worker
- [ ] Local SQLite
- [ ] Request queue
- [ ] Sync on reconnect
- [ ] Offline indicator

### 6.4 Performance optimization
- [ ] Lazy loading
- [ ] Virtual scrolling
- [ ] Analysis caching
- [ ] Incremental indexing
- [ ] Background processing

### 6.5 Error handling
- [ ] LLM failure handling
- [ ] Operation recovery
- [ ] Corruption detection
- [ ] Backup and restore

## Testing Infrastructure

### Component tests (vitest-browser-svelte)
- [x] Button.test.ts
- [x] Card.test.ts
- [x] Dialog.test.ts
- [x] TextField.test.ts
- [x] Tabs.test.ts
- [x] EntityCard.test.ts
- [x] EntityListPage.test.ts
- [x] CreateEntityDialog.test.ts

### Integration tests (Playwright)
- [x] Bible flow integration test
- [x] Project flow integration test

## Tech Stack Upgrades

### Drizzle ORM Migration (Complete)
Migration from raw SQL to Drizzle ORM for type-safe queries.

#### Completed
- [x] Drizzle ORM dependency installed (`drizzle-orm`)
- [x] libsql dependency (better-sqlite3-compatible API with ESM support)
- [x] Drizzle schema definitions created (`drizzle-schema.ts`)
- [x] Database connection exports DrizzleDB instance (BetterSQLite3Database type)
- [x] Character repository migrated to Drizzle
- [x] Location repository migrated to Drizzle
- [x] Faction repository migrated to Drizzle
- [x] World rule repository migrated to Drizzle
- [x] Plot thread repository migrated to Drizzle
- [x] Timeline event repository migrated to Drizzle
- [x] Timeline span repository migrated to Drizzle
- [x] Structure repository migrated to Drizzle
- [x] Content repository migrated to Drizzle (with FTS5 search via raw SQL)
- [x] Project repository migrated to Drizzle
- [x] Lock point repository migrated to Drizzle
- [x] Cross-reference repository migrated to Drizzle
- [x] project-service updated to pass drizzle instance
- [x] bible-service updated to pass drizzle instance
- [x] Test files updated to create drizzle instances

Note: All repositories now accept `(db, drizzleDb)` as parameters instead of just `(db)`.
The `db` parameter (libsql Database) is used for:
- FTS5 search operations (Drizzle doesn't support virtual tables)
- Transaction wrappers using db.transaction()

The `drizzleDb` parameter (BetterSQLite3Database type) is used for:
- Type-safe CRUD operations via drizzle-orm/better-sqlite3 driver
- The libsql package provides a better-sqlite3-compatible API

### Web App Integration
- [x] `hooks.server.ts` updated to pass both `db` and `drizzle` to `createProjectService()`
- [x] `app.d.ts` updated to include `drizzle: DrizzleDB` in `App.Locals`
- [x] `hooks.server.ts` updated to set `event.locals.drizzle`
- [x] All Bible routes updated to pass `locals.drizzle` to `createBibleService()`
- [x] Workspace routes updated to pass `locals.drizzle` to repository factories
- [x] ESLint config updated to ignore `playwright-report/*` and `test-results/*`

### Turborepo Configuration
- [x] Added `test` task to `turbo.json` for running tests across packages

### libsql Migration (Complete)
Removed `better-sqlite3` dependency and fixed Playwright integration tests.

- [x] Removed `better-sqlite3` dependency from `packages/core/package.json`
- [x] Updated code comments to reference libsql instead of better-sqlite3
- [x] Fixed Playwright integration test selectors (added `.nav-item`, `.project-link`, `.project-title`, `.back-link`, `.action-btn`, `.logo` classes to UI components)
- [x] All 23 Playwright integration tests now pass
- [x] All 933 tests pass (669 core, 143 llm, 111 web unit, types)
