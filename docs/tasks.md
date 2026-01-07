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

### Duplicate Code (serial/core)

- [x] **Duplicate `formatContext()` function** — Nearly identical implementations in 3 files with slight variations:
  - `generation/outline.ts:128-175`
  - `generation/beats.ts:155-186`
  - `generation/draft.ts:173-219` (most detailed, includes voiceNotes/sensoryDetails)
  - **Fixed**: Extracted to `generation/formatting.ts` with configurable options and pre-configured helpers

- [x] **Duplicate `formatStructure()` function** — Nearly identical in 3 files:
  - `generation/outline.ts:180-199`
  - `generation/beats.ts:191-207`
  - `generation/draft.ts:224-243`
  - **Fixed**: Extracted to `generation/formatting.ts` with configurable options and pre-configured helpers

- [x] **Duplicate `countWords()` function** — Identical implementation in 4 files:
  - `generation/draft.ts:248-250`
  - `generation/pipeline.ts:678-680`
  - `analysis/service.ts:66-68`
  - `storage/repositories/content-repository.ts:163-165`
  - **Fixed**: Extracted to `utils/text.ts` with additional text utilities

- [x] **Duplicate beat parsing logic** — 4 separate implementations with inconsistent logic:
  - `generation/outline.ts:204-228` — `parseOutlineResponse()` creates basic Beat
  - `generation/beats.ts:212-299` — `parseBeatsResponse()` creates ExpandedBeat
  - `generation/pipeline.ts:174-194` — duplicates outline parsing
  - `generation/pipeline.ts:199-245` — duplicates beats parsing with variations
  - **Fixed**: Extracted to `generation/parsing.ts` with configurable options and pre-configured helpers (`parseSimpleOutline`, `parseDetailedBeats`, `parsePipelineOutline`, `parsePipelineBeats`)

- [x] **Duplicate bible service implementations** — `bible/bible-service.ts` has two factory functions with duplicated code:
  - `createBibleService()` (lines 108-292)
  - `createBibleServiceFromRepositories()` (lines 297-475)
  - `searchAll()` method duplicated exactly (60+ lines each)
  - **Fixed**: Extracted `buildBibleServiceMethods()` helper, factories now compose shared implementation

- [x] **Duplicate search pattern in repositories** — FTS5 search with identical escaping logic in:
  - `storage/repositories/character-repository.ts:242-244`
  - `storage/repositories/location-repository.ts:237-240`
  - `storage/repositories/content-repository.ts:352-355`
  - **Fixed**: Extracted `formatFts5PrefixQuery()` to `utils/text.ts`

- [ ] **Duplicate add-relation pattern** — Filter + update pattern repeated across entity repositories
  - **Fix**: Extract to base repository or mixin

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

### Inconsistency Issues (serial/core)

- [ ] **Inconsistent entity type field naming** — Some use `type`, others use `entityType`:
  - `storage/repositories/character-repository.ts:43` — uses `type: 'character'`
  - `storage/repositories/location-repository.ts:43` — uses `entityType: 'location'`
  - `storage/repositories/faction-repository.ts:22` — uses `entityType: 'faction'`
  - **Fix**: Standardize on one field name

- [ ] **Inconsistent null/undefined handling in repository updates** — Complex nested ternaries:
  - `storage/repositories/plot-thread-repository.ts:150-157`
  - `storage/repositories/content-repository.ts:263-270`
  - **Fix**: Create utility function for optional field updates

- [ ] **Unused `db` parameter inconsistency** — Some repositories use `_db` prefix, others don't:
  - `storage/repositories/character-repository.ts:108` — `db` unused
  - `storage/repositories/faction-repository.ts:52` — `_db` prefix
  - **Fix**: Standardize naming or remove unused params

- [ ] **Dual row conversion functions** — `rowToX()` and `rawRowToX()` in repositories:
  - `storage/repositories/character-repository.ts:40-57, 62-79`
  - `storage/repositories/location-repository.ts:62-79`
  - `storage/repositories/content-repository.ts:64-82`
  - **Fix**: Unify Drizzle and raw SQL result handling

### Schema Issues (serial/types)

- [ ] **Entity type discriminator inconsistency** — Mixed field names:
  - `character.ts:92`, `world-rule.ts:46` — use `type` field
  - `location.ts:56`, `faction.ts:68`, `plot-thread.ts:72`, `timeline.ts:59,119` — use `entityType` field
  - **Fix**: Standardize on `entityType` across all entities

- [ ] **Spine lifecycle field naming inconsistency**:
  - `character.ts`, `location.ts`, `faction.ts`, `world-rule.ts` — use `introducedAt`/`retiredAt`
  - `plot-thread.ts`, `timeline.ts` — use `spineIntroducedAt`/`spineRetiredAt`
  - **Fix**: Standardize naming or document distinction

- [ ] **Duplicate enum definitions in analysis.ts** — Same enums defined inline multiple times:
  - HookType: `structure.ts:23`, `analysis.ts:160-168`, `analysis.ts:644-653`
  - PlotThreadType: `plot-thread.ts:43-52`, `analysis.ts:534-543`
  - CharacterArcType: `character.ts:42-50`, `analysis.ts:371-379`
  - RelationshipType: `character.ts:20-29`, `analysis.ts:300-309`, `analysis.ts:328-337`
  - PresenceType: `character.ts:71-78`, `analysis.ts:89-94`, `analysis.ts:267`
  - **Fix**: Reference existing schemas instead of duplicating

- [ ] **analysis.ts is overloaded** — 841 lines, should be split into:
  - `content-analysis.ts` — ContentAnalysisSchema, ContinuityIssueSchema
  - `character-tracking.ts` — CharacterTrackingData* schemas
  - `plot-thread-tracking.ts` — PlotThreadTrackingData* schemas
  - `tension-curve.ts` — TensionCurveData* schemas
  - `hook-management.ts` — HookManagement* schemas
  - `cycle-enforcement.ts` — CycleEnforcement* schemas

- [ ] **Missing ContentLocationSchema** — Same inline object pattern repeated:
  - `mystery.ts:71-75`
  - `plot-thread.ts:102-107`
  - `plot-thread.ts:109-114`
  - **Fix**: Extract to reusable schema

- [ ] **Missing schema validations**:
  - Empty arrays without `.min(1)` where content required
  - String fields without `.min()` length (rule text, excerpts, names)
  - Numeric fields without bounds (temperature, tension targets)
  - No temporal ordering validation (introducedAt before resolvedAt)

- [ ] **Inconsistent status enums** — Each entity has completely different statuses with no common pattern:
  - `character.ts:112` — active, deceased, absent, unknown
  - `location.ts:79` — accessible, destroyed, hidden, restricted, unknown
  - `faction.ts:93` — active, disbanded, underground, emerging, unknown
  - `plot-thread.ts:84` — planned, active, dormant, resolved, abandoned

### MCP Tool Issues (serial/mcp)

- [x] **Duplicate "list empty" response pattern** — 11+ instances of identical empty state handling:
  - `bible.ts:115-123, 242-250, 323-331, 403-411, 485-493`
  - `project.ts:24-32`
  - `serial.ts:232-240`
  - `review.ts:31-41`
  - `analytics.ts:30-38, 85-93`
  - `extraction.ts:94-102`
  - **Fixed**: Created `utils/response.ts` with `textResponse()`, `emptyListResponse()`, and `listResponse()` helpers

- [x] **Duplicate projectId resolution pattern** — 30+ instances of `projectId || requireProjectId(session)`:
  - `bible.ts` (14+ times)
  - `structure.ts` (10+ times)
  - `review.ts` (10+ times)
  - **Fixed**: Created `resolveProjectId()` and `resolveStructureId()` wrapper functions in `context.ts`

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