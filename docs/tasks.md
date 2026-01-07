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
- [x] Bible types (Character, Location, Faction, WorldRule, PlotThread, TimelineEvent)
- [x] Structure types (Book, Arc, Chapter, Scene via Structure hierarchy)
- [x] Content types (Content, ContentAnalysis)
- [x] Serial types (HookType, ChapterType, TensionCycle via analysis, ReleaseSchedule)
- [x] Unit tests for serial types (314 tests)

### 2.2 Serial Core
- [x] `bible/character.ts` — Character operations
- [x] `bible/location.ts` — Location operations
- [x] `bible/faction.ts` — Faction operations
- [x] `bible/world-rule.ts` — World rule operations
- [x] `bible/plot-thread.ts` — Plot thread operations
- [x] `bible/timeline.ts` — Timeline operations
- [x] `structure/tree.ts` — Structure hierarchy
- [x] `structure/beats.ts` — Beat management
- [x] `structure/hooks.ts` — Hook specification
- [x] `generation/pipeline.ts` — Generation orchestration
- [x] `generation/outline.ts` — Outline generation
- [x] `generation/beats.ts` — Beat expansion
- [x] `generation/draft.ts` — Draft generation
- [x] `analysis/tension.ts` — Tension scoring
- [x] `analysis/hooks.ts` — Hook analysis
- [x] `analysis/pacing.ts` — Pacing assessment
- [x] `analysis/continuity.ts` — Continuity checking
- [x] `review/workflow.ts` — Review status management (implemented as service.ts)
- [x] `review/locks.ts` — Lock point management
- [x] `review/cascade.ts` — Revision cascade (implemented in continuity/service.ts)
- [x] `release/buffer.ts` — Release buffer (implemented in release/release-planning.ts)
- [x] `release/schedule.ts` — Release schedule (implemented in release/release-planning.ts)
- [x] `analysis/cycles.ts` — Tension cycles (implemented in analysis/cycle-enforcement.ts)
- [x] `analysis/mysteries.ts` — Mystery tracking (implemented in analysis/mystery-tracking.ts)

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
- [x] `Concept` type (Term, Type, Algorithm, Pattern, Principle)
- [x] `ConceptDependency` type
- [x] `Snippet` type with metadata
- [x] `SnippetOperation` enum (introduce, replace, append, prepend, delete)
- [x] `FilePart` type for named code sections
- [x] `Checkpoint` type
- [x] `ExpectedOutput` type for fixtures
- [x] `TangledFile` type
- [x] Zod schemas for all types (89 unit tests)

### 3.2 TechBook Core
- [x] `concepts/registry.ts` — Concept CRUD (93 unit tests)
- [x] `concepts/dependencies.ts` — Dependency graph
- [x] `concepts/symbols.ts` — Symbol-to-concept linking
- [x] `snippets/repository.ts` — Snippet storage (28 unit tests)
- [x] `snippets/parts.ts` — Named part management (35 unit tests)
- [x] `snippets/operations.ts` — Operation application (25 unit tests)
- [x] `tangle/assembler.ts` — File assembly (30 unit tests)
- [x] `tangle/incremental.ts` — Change tracking (24 unit tests)
- [x] `tangle/output.ts` — File writing (21 unit tests)
- [x] `checkpoints/manager.ts` — Checkpoint CRUD (50 unit tests)
- [x] `checkpoints/snapshots.ts` — Snapshot creation (35 unit tests)
- [x] `checkpoints/immutability.ts` — Release locking (38 unit tests)
- [x] `validation/compile.ts` — Compilation runner (31 unit tests)
- [x] `validation/test.ts` — Test runner (38 unit tests)
- [x] `validation/output.ts` — Fixture comparison (58 unit tests)
- [x] `weave/renderer.ts` — Content rendering (27 unit tests)
- [x] `weave/syntax.ts` — Syntax highlighting (45 unit tests)
- [x] `weave/diffs.ts` — Diff marking (35 unit tests)
- [x] `weave/crossrefs.ts` — Cross-reference generation (29 unit tests)

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
- [ ] `docs/techbook/getting-started.md`
- [x] `docs/techbook/cli.md` (CLI reference placeholder)
- [x] `docs/techbook/mcp.md` (MCP reference placeholder)
- [ ] `docs/techbook/literate-programming.md`

### 4.5 Testing
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

### Type Safety Issues

- [ ] **JSON fields parsed without Zod validation** — Repositories use `JSON.parse(row.someJson) as SomeType` throughout, risking runtime crashes if data is malformed. Affected files:
  - `storage/repositories/character-repository.ts` (arc field)
  - `storage/repositories/content-repository.ts` (analysis field)
  - `storage/repositories/location-repository.ts` (features)
  - `storage/repositories/plot-thread-repository.ts` (introducedAt, resolvedAt)
  - `storage/repositories/project-repository.ts` (stats, settings, metadata)
  - `storage/repositories/structure-repository.ts` (hook field)
  - `storage/repositories/timeline-repository.ts` (end position)
  - `extraction/repository.ts` (suggestedData, fieldUpdates, evidence)
  - `error-handling/operation-journal.ts` (state fields)
  - `error-handling/backup.ts` (record fields)
  - `analysis/repository.ts` (analysis data)
  - `bible/cross-reference-repository.ts` (entity refs)
  - **Fix**: Use Zod `.safeParse()` on JSON fields and handle parse failures gracefully

### Missing Test Coverage

- [ ] `extraction/service.ts` — No unit tests for entity extraction service
- [ ] `extraction/repository.ts` — No unit tests for suggestion persistence
- [ ] `extraction/prompts.ts` — No unit tests for extraction prompt building
- [ ] `error-handling/service.ts` — No unit tests for error handling coordinator
- [ ] `error-handling/backup.ts` — No unit tests for backup creation/verification
- [ ] `error-handling/integrity.ts` — No unit tests for integrity checking
- [ ] `error-handling/operation-journal.ts` — No unit tests for operation journaling
- [ ] `bible/cross-reference-repository.ts` — No unit tests for cross-reference queries
- [ ] `bible/relationship-graph.ts` — No unit tests for relationship graph operations

### Error Handling Issues (serial/core)

- [ ] **Empty catch blocks with silent failures** — Errors swallowed without logging:
  - `generation/pipeline.ts:275-283` — `parseSelfReviewResponse()` returns default on any error
  - `generation/draft.ts:460-461` — `runSelfReview()` returns default on any error
  - **Fix**: Add error logging before returning defaults

- [ ] **Unhandled Promise.all rejection** — `analysis/service.ts:281` runs 4 analysis promises; if any fails, entire analysis fails with no partial results
  - **Fix**: Use `Promise.allSettled()` and return partial results

- [ ] **Token tracking not implemented** — Hardcoded to 0 in multiple places:
  - `generation/draft.ts:386`
  - `generation/pipeline.ts:401, 412, 423, 434, 444`
  - **Fix**: Extract token counts from LLM response object

### Validation Issues (serial/core)

- [ ] **Missing boundary validation in outline parsing** — `generation/outline.ts:204-228`:
  - No maximum description length check
  - No maximum number of beats check
  - No validation that beats are ordered
  - **Fix**: Add Zod schema or manual validation

- [ ] **Missing validation in draft continuation** — `generation/draft.ts:572-663`:
  - No validation partial draft ends at logical break
  - No check for content duplication
  - No verification beats haven't been completed
  - **Fix**: Add pre-generation validation

### Schema Issues (serial/types)

- [x] **Spine lifecycle field naming inconsistency** — Documented as intentional design:
  - `character.ts`, `location.ts`, `faction.ts`, `world-rule.ts` — use `introducedAt`/`retiredAt` (simple entities)
  - `plot-thread.ts`, `timeline.ts` — use `spineIntroducedAt`/`spineRetiredAt` (entities with both content-based and spine-based tracking)
  - PlotThread/Timeline have BOTH `introducedAt`/`resolvedAt` (content-based) AND `spineIntroducedAt`/`spineRetiredAt` (spine-based)

- [x] **Duplicate enum definitions in analysis.ts** — Extracted to shared schemas:
  - Created `shared.ts` with canonical definitions
  - `RelationshipTypeSchema`, `CharacterArcTypeSchema`, `CharacterRoleSchema` now in `shared.ts`
  - `PlotThreadScopeSchema`, `PlotThreadStatusSchema`, `PromisePayoffSchema`, `PromiseStatusSchema` now in `shared.ts`
  - `analysis.ts` now references shared schemas
  - Hook types intentionally differ: structure uses `HookTypeSchema` (required), analysis uses `AnalysisHookTypeSchema` (includes 'none')

- [ ] **analysis.ts is overloaded** — 800+ lines, could be split into focused modules. Not critical since types are well-organized with section comments.

- [x] **Missing ContentLocationSchema** — Extracted to `shared.ts`:
  - `ContentLocationSchema` with `contentId`, `chapterNumber`, `position` fields
  - Used in `mystery.ts`, `plot-thread.ts` via extends for additional fields

- [x] **Missing schema validations** — Added `.min(1)` validations:
  - `character.ts`: description, trait description, relationship description
  - `plot-thread.ts`: thread description, promise description, touch description
  - `mystery.ts`: clue description
  - `analysis.ts`: continuity issue description
  - Note: Empty arrays intentionally allowed (new entities start empty)
  - Note: Temperature/tension targets already have bounds (0-100)

- [ ] **Inconsistent status enums** — Intentional by design, each entity has domain-appropriate statuses:
  - Characters: active, deceased, absent, unknown
  - Locations: accessible, destroyed, hidden, restricted, unknown
  - Factions: active, disbanded, underground, emerging, unknown
  - PlotThreads: planned, active, dormant, resolved, abandoned
  - Different entities have different lifecycle semantics

### MCP Tool Issues (serial/mcp)

- [ ] **requireProjectId throws generic Error, not McpToolError** — `context.ts:38-45, 50-57`
  - Bypasses `handleToolCall` error mapping
  - **Fix**: Throw McpToolError or handle in wrapper

- [ ] **Inconsistent error messages for missing session context**:
  - `content.ts:34-42` — Long message with tool suggestions
  - `content.ts:133-141` — Shortened message (inconsistent)
  - **Fix**: Standardize error message format

- [ ] **Missing parameter validation in MCP tools**:
  - `structure.ts:351` — `newOrder` no min/max
  - `generation.ts:28-29` — `temperature` should be 0-2, `maxTokens` unbounded
  - `structure.ts:216` — `tensionTarget` should be 0-100
  - `bible.ts:145, 272`, `structure.ts:212`, `project.ts:57` — name/title fields no `.min(1)`
  - `review.ts:185` — `contentIds` array no `.min(1)`
  - `content.ts:221-223` — `outputDir` no path validation/security
  - **Fix**: Add Zod refinements for all constraints

- [ ] **Session mutation inconsistency** — Some tools auto-select, others don't:
  - `project.ts:69` — Auto-loads after creation
  - `structure.ts:229` — Auto-selects after creation
  - `structure.ts:331` — Auto-selects after get (side effect)
  - **Fix**: Document or standardize behavior

### Code Quality Issues

- [ ] Console logging in production code — `console.error` in `extraction/service.ts:131`, `console.warn` in `analysis/service.ts:41,48`. Consider proper logging abstraction or removal.
- [ ] Empty model string in extraction service — `extraction/service.ts:189` passes `model: ''` with comment. Use `client.getConfig().defaultModel` explicitly.

### Implementation Simplifications (techbook/core)

- [ ] **Simple content hash** — `snippets/operations.ts:32-42` uses a basic djb2-style hash that could have collisions. Replace with a proper hash function (crypto.subtle or similar) if collision detection becomes important.

- [ ] **Naive line diff algorithm** — `snippets/operations.ts:276-304` uses line-by-line comparison rather than a proper diff algorithm (Myers, patience, etc.). Works for basic cases but won't produce optimal diffs for reordered or moved lines.

- [ ] **Simple part assembly** — `snippets/parts.ts:321-333` uses basic concatenation of parts. A more sophisticated approach would use markers or insertion points in the source content to control where parts are inserted.

## Future Considerations

- Additional domains (API docs, interactive fiction, TTRPG)
- Web frontend (future, not in scope)
- Real-time collaboration (explicitly out of scope)
- Multi-language techbook support