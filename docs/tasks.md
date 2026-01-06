# Implementation Status

Checklist tracking implementation progress. See [plan.md](./plan.md) for detailed descriptions.

## Phase 1: Framework Extraction

### 1.1 Package Restructure
- [x] Create `packages/framework/` directory structure
- [x] Move/split `packages/types` → framework + serial types
- [x] Move/split `packages/core` → framework + serial core
- [x] Move `packages/llm` → `packages/framework/llm`
- [x] Refactor `packages/server` for domain handler registration
- [x] Move `packages/client` → `packages/framework/client`
- [x] Update turborepo configuration
- [x] Update all import paths
- [x] Verify builds pass

### 1.2 Framework Types
- [x] `Spine<Node>` base interface
- [x] `LinearSpine<Node>` interface
- [x] `TreeSpine<Node>` interface
- [x] `MutableSpine<Node>` interface
- [x] `Entity` base type with lifecycle (`BaseEntity`, `EntityLifecycle`)
- [x] `EntityType` registration metadata
- [x] `EntityRegistry` interface
- [x] `Content` base wrapper type (`BaseContent`)
- [x] `Reference` type
- [x] `Constraint` definition type
- [x] `ConstraintExtractor` interface
- [x] `ValidationResult` type
- [x] `Validator` interface
- [x] `ValidatorRegistry` interface
- [x] Zod schemas for all types

### 1.3 Framework Core
- [x] `storage/schema.ts` — Generic SQLite tables
- [x] `storage/migrations.ts` — Migration system
- [x] `storage/repository.ts` — Base repository class
- [x] `storage/database.ts` — Database connection wrapper
- [x] `entity/registry.ts` — Entity type registration
- [x] `entity/repository.ts` — Entity CRUD operations
- [x] `entity/graph.ts` — Relationship graph
- [x] `entity/lifecycle.ts` — Lifecycle tracking
- [x] `content/repository.ts` — Content storage
- [x] `content/versions.ts` — Version tracking
- [x] `content/references.ts` — Reference extraction/indexing
- [x] `validation/pipeline.ts` — Orchestration
- [x] `validation/results.ts` — Result aggregation (includes phase management)
- [x] `spine/linear.ts` — Linear spine implementation
- [x] `spine/tree.ts` — Tree spine implementation
- [x] `spine/checkpoints.ts` — Checkpoint management

### 1.4 Framework Server
- [x] Domain handler registration system
- [x] Generic project operations
- [x] Generic entity operations
- [x] Generic content operations
- [x] Validation trigger endpoints
- [x] Session management refactor
- [x] Error handling standardization

### 1.5 Remove Web Frontend
- [x] Delete `apps/web/`
- [x] Delete `packages/ui/`
- [x] Remove web-related dependencies from root
- [x] Update turbo.json configuration
- [x] Update docs/architecture/packages.md

## Phase 2: Serial Domain

### 2.1 Serial Types
- [ ] Move bible types (Character, Location, Faction, WorldRule, PlotThread, TimelineEvent)
- [ ] Move structure types (Book, Arc, Chapter, Scene)
- [ ] Move content types (Prose, Analysis)
- [ ] Move serial types (HookType, ChapterType, TensionCycle, ReleaseSchedule)
- [ ] Update imports throughout serial packages

### 2.2 Serial Core
- [ ] `bible/character.ts` — Character operations
- [ ] `bible/location.ts` — Location operations
- [ ] `bible/faction.ts` — Faction operations
- [ ] `bible/world-rule.ts` — World rule operations
- [ ] `bible/plot-thread.ts` — Plot thread operations
- [ ] `bible/timeline.ts` — Timeline operations
- [ ] `structure/tree.ts` — Structure hierarchy
- [ ] `structure/beats.ts` — Beat management
- [ ] `structure/hooks.ts` — Hook specification
- [ ] `generation/pipeline.ts` — Generation orchestration
- [ ] `generation/outline.ts` — Outline generation
- [ ] `generation/beats.ts` — Beat expansion
- [ ] `generation/draft.ts` — Draft generation
- [ ] `analysis/tension.ts` — Tension scoring
- [ ] `analysis/hooks.ts` — Hook analysis
- [ ] `analysis/pacing.ts` — Pacing assessment
- [ ] `analysis/continuity.ts` — Continuity checking
- [ ] `review/workflow.ts` — Review status management
- [ ] `review/locks.ts` — Lock point management
- [ ] `review/cascade.ts` — Revision cascade
- [ ] `serial/buffer.ts` — Release buffer
- [ ] `serial/schedule.ts` — Release schedule
- [ ] `serial/cycles.ts` — Tension cycles
- [ ] `serial/mysteries.ts` — Mystery tracking

### 2.3 Serial Validators
- [ ] Continuity validator
- [ ] Timeline validator
- [ ] Pacing validator
- [ ] Hook validator
- [ ] Release buffer validator

### 2.4 Serial Server
- [x] Create `apps/serial-server/`
- [x] Server initialization
- [ ] Register serial domain handlers
- [ ] Bible endpoints
- [ ] Structure endpoints
- [ ] Content endpoints
- [ ] Generation endpoints
- [ ] Review endpoints
- [ ] Analytics endpoints
- [ ] Serial-specific endpoints
- [ ] CLI options (port, data-dir, llm config)

### 2.5 Serial CLI
- [x] Create `apps/serial-cli/`
- [ ] `serial project list|create|load|delete`
- [ ] `serial bible character|location|faction|rule|thread|event` subcommands
- [ ] `serial structure tree|create|update|delete|reorder`
- [ ] `serial content get|save|history|rollback`
- [ ] `serial generate start|status|cancel`
- [ ] `serial review queue|approve|reject|publish|lock`
- [ ] `serial analyze tension|pacing|continuity`
- [ ] `serial release buffer|schedule|hooks|cycles`
- [ ] `serial export` to formats
- [ ] Help text and documentation

### 2.6 Serial MCP
- [x] Refactor `packages/mcp` → `packages/serial/mcp`
- [x] Update tool registrations
- [x] Verify all existing tools work
- [ ] Update MCP documentation

## Phase 3: TechBook Domain

### 3.1 TechBook Types
- [ ] `Concept` type (Term, Type, Algorithm, Pattern)
- [ ] `ConceptDependency` type
- [ ] `Snippet` type with metadata
- [ ] `SnippetOperation` enum (introduce, replace, append, prepend, delete)
- [ ] `FilePart` type for named code sections
- [ ] `Checkpoint` type
- [ ] `ExpectedOutput` type for fixtures
- [ ] `TangledFile` type
- [ ] Zod schemas for all types

### 3.2 TechBook Core
- [ ] `concepts/registry.ts` — Concept CRUD
- [ ] `concepts/dependencies.ts` — Dependency graph
- [ ] `concepts/symbols.ts` — Symbol-to-concept linking
- [ ] `snippets/repository.ts` — Snippet storage
- [ ] `snippets/parts.ts` — Named part management
- [ ] `snippets/operations.ts` — Operation application
- [ ] `tangle/assembler.ts` — File assembly
- [ ] `tangle/incremental.ts` — Change tracking
- [ ] `tangle/output.ts` — File writing
- [ ] `checkpoints/manager.ts` — Checkpoint CRUD
- [ ] `checkpoints/snapshots.ts` — Snapshot creation
- [ ] `checkpoints/immutability.ts` — Release locking
- [ ] `validation/compile.ts` — Compilation runner
- [ ] `validation/test.ts` — Test runner
- [ ] `validation/output.ts` — Fixture comparison
- [ ] `weave/renderer.ts` — Content rendering
- [ ] `weave/syntax.ts` — Syntax highlighting
- [ ] `weave/diffs.ts` — Diff marking
- [ ] `weave/crossrefs.ts` — Cross-reference generation

### 3.3 TechBook Validators
- [ ] Compile validator
- [ ] Test validator
- [ ] Output fixture validator
- [ ] Concept prerequisite validator
- [ ] Symbol explanation validator
- [ ] Coverage validator (all code explained)

### 3.4 TechBook Server
- [ ] Create `apps/techbook-server/`
- [ ] Server initialization
- [ ] Register techbook domain handlers
- [ ] Concept endpoints
- [ ] Snippet endpoints
- [ ] Checkpoint endpoints
- [ ] Tangle endpoints
- [ ] Validation endpoints
- [ ] Weave endpoints
- [ ] CLI options

### 3.5 TechBook CLI
- [ ] Create `apps/techbook-cli/`
- [ ] `techbook project list|create|load|delete`
- [ ] `techbook concept list|create|update|delete|deps`
- [ ] `techbook snippet list|create|update|delete|show`
- [ ] `techbook checkpoint list|create|release|snapshot`
- [ ] `techbook tangle [checkpoint]` — Generate files
- [ ] `techbook validate [checkpoint]` — Run validation
- [ ] `techbook weave html|pdf|epub` — Render output
- [ ] `techbook export` — Export project
- [ ] Help text and documentation

### 3.6 TechBook MCP
- [ ] Create `packages/techbook/mcp`
- [ ] Project tools
- [ ] Concept tools
- [ ] Snippet tools
- [ ] Checkpoint tools
- [ ] Tangle tools
- [ ] Validation tools
- [ ] Weave tools

## Phase 4: Polish & Documentation

### 4.1 Error Handling
- [ ] Verify circuit breaker in framework
- [ ] Operation journaling
- [ ] Recovery API
- [ ] Corruption detection
- [ ] Repair utilities
- [ ] Backup/restore commands

### 4.2 Performance
- [ ] Incremental validation implementation
- [ ] Lazy loading for large projects
- [ ] Background processing queue
- [ ] Caching layer
- [ ] Performance benchmarks

### 4.3 Framework Documentation
- [x] `docs/framework/architecture.md`
- [x] `docs/framework/extension-points.md`
- [ ] `docs/framework/domain-starter.md`
- [ ] `docs/framework/api-reference.md`
- [ ] `docs/framework/storage.md`
- [ ] `docs/framework/validation.md`
- [ ] `docs/framework/llm-integration.md` (Levels 1-2 usage guide)

### 4.4 Domain Documentation
- [ ] `docs/serial/getting-started.md`
- [x] `docs/serial/cli.md` (CLI reference)
- [x] `docs/serial/mcp.md` (MCP reference)
- [x] `docs/serial/api.md` (WebSocket API reference)
- [ ] `docs/serial/migration.md` (from current web app)
- [ ] `docs/techbook/getting-started.md`
- [x] `docs/techbook/cli.md` (CLI reference placeholder)
- [x] `docs/techbook/mcp.md` (MCP reference placeholder)
- [ ] `docs/techbook/literate-programming.md`

### 4.5 Testing
- [ ] Framework unit test suite
- [ ] Serial domain unit tests
- [ ] TechBook domain unit tests
- [ ] CLI integration tests (serial)
- [ ] CLI integration tests (techbook)
- [ ] Server integration tests
- [ ] Cross-domain validation tests
- [ ] CI pipeline updates

## Migration Notes

### From Current Codebase

The existing implementation has completed:
- Foundation (types, storage, bible, LLM, web UI)
- Generation pipeline
- Review workflow with version management
- Analytics (tension, characters, threads)
- Serial features (hooks, cycles, release planning, mysteries)
- WebSocket API and CLI
- MCP server with 60+ tools

This work will be preserved and reorganized:
- Web UI code → deleted
- Core logic → split between framework and serial domain
- Types → split between framework and serial domain
- Server → refactored for domain registration
- CLI → becomes serial-cli
- MCP → becomes serial-mcp

### Breaking Changes

1. Package imports change (e.g., `@repo/core` → `@repo/framework/core` or `@repo/serial/core`)
2. Server requires domain registration
3. CLI commands may be reorganized
4. MCP tool names may be prefixed with domain

### Data Migration

- Existing SQLite databases remain compatible (serial domain uses same schema)
- No data migration required for serial projects
- TechBook projects use new schema

## Known Issues

Carried forward from existing implementation:

- [ ] Duplicate root structure created (by design — projects auto-create root)
- [ ] No entity type for group consciousness (Characters like "The Collective" must use `supporting` role)

## Future Considerations

- Additional domains (API docs, interactive fiction, TTRPG)
- Web frontend (future, not in scope)
- Real-time collaboration (explicitly out of scope)
- Multi-language techbook support