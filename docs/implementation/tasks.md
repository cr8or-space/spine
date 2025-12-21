# Implementation Status

Checklist tracking implementation progress. See [plan.md](./plan.md) for detailed descriptions.

For architecture details, see [docs/architecture/](../architecture/).

## Completed Phases

### Phase 1: Foundation
- [x] Data models and types (packages/types)
- [x] Storage layer with SQLite (packages/core)
- [x] Bible management - all entity CRUD
- [x] LLM interface with streaming (packages/llm)
- [x] Web UI foundation with Svelte 5

### Phase 2: Generation
- [x] Context assembly with token budget
- [x] Structure management (tree, beats, hooks)
- [x] Generation pipeline (outline, beats, draft, review)
- [x] Basic analysis (tension, hooks, pacing, continuity)
- [x] Writing workspace UI

### Phase 3: Review
- [x] Version management with diff and rollback
- [x] Review workflow (queue, status, comments, locks)
- [x] Revision cascade with horizon config
- [x] Review UI with diff view

### Phase 4: Analytics
- [x] Tension curve data and visualization
- [x] Character tracking and heatmap
- [x] Plot thread tracking and Gantt
- [x] Analytics dashboard UI

### Phase 5: Serial Features
- [x] Hook management and pattern analysis
- [x] Cycle enforcement
- [x] Release planning with buffer tracking
- [x] Mystery tracking
- [x] Serial dashboard UI

### Phase 7: WebSocket API
- [x] Server package (@repo/server) with JSON-RPC 2.0
- [x] Client package (@repo/client) with auto-reconnect
- [x] CLI application (@repo/cli)
- [x] User documentation (docs/user/)

### Phase 8: MCP Server
- [x] MCP package (@repo/mcp) with 60+ tools
- [x] Integration with Spine server
- [x] User documentation (docs/user/mcp.md)

### Phase 9: Standalone Server
- [x] Server application (apps/server)
- [x] CLI options and configuration

## In Progress

### Web App Refactor
See [web.app.refactor.plan.md](./web.app.refactor.plan.md) for details.

- [x] Phase 1: Design tokens and layout primitives
- [x] Phase 2-8: Page implementations (basic structure)
- [ ] Align Settings layout and finalize responsive/motion/accessibility polish

### Testing
See [docs/architecture/testing.md](../architecture/testing.md) for details.

- [x] Update component tests for new primitives/layouts (111 tests passing)
- [x] Add $app mocks for vitest-browser tests
- [x] Configure Playwright to use temp database directory
- [ ] Fix remaining Playwright test failures (10 failing, mostly timing issues in review/analytics)
- [ ] Address flaky tests (4 tests pass on retry)

## Phase 6: Polish (Not Started)

### 6.1 Bible Extraction
- [x] Entity detection from content (LLM-powered extraction service)
- [x] New entity suggestions (stored with confidence, evidence)
- [x] Update suggestions (field-level updates for existing entities)
- [x] Aggressiveness config (conservative/moderate/aggressive)
- [x] Suggestion review - CLI + MCP (spine extract, spine_extraction_* tools)
- [ ] Suggestion review UI (web app - not implemented)

### 6.2 Export
- [ ] EPUB generation
- [ ] Royal Road format
- [ ] Plain text export
- [ ] Project backup/restore

### 6.3 Offline Support
- [ ] Service worker
- [ ] Local SQLite in browser
- [ ] Request queue
- [ ] Sync on reconnect
- [ ] Offline indicator

### 6.4 Performance Optimization
- [ ] Lazy loading
- [ ] Virtual scrolling for long lists
- [ ] Analysis caching
- [ ] Incremental indexing
- [ ] Background processing

### 6.5 Error Handling
- [x] LLM failure handling (circuit breaker, resilient client)
- [x] Operation recovery (journal persistence, recovery API)
- [x] Corruption detection (integrity checks, repair)
- [x] Backup and restore (SQLite VACUUM, verification)

## Phase 10: Web App Synchronization

The web app (apps/web) needs updates to work with the new API packages.

### 10.1 Client Integration
- [ ] Evaluate using @repo/client vs direct service calls
- [ ] Consider WebSocket support in web app for real-time updates
- [ ] Document decision on web app architecture

### 10.2 API Alignment
- [ ] Verify web app uses same API patterns as CLI/MCP
- [ ] Update any divergent API usage
- [ ] Add missing API features if needed

### 10.3 Feature Parity
- [ ] Compare CLI commands with web app features
- [ ] Identify any gaps in web app functionality
- [ ] Add missing features from CLI/MCP

## MCP Implementation Issues

Issues discovered during implementation testing with "The Accident" web serial proposal.

### Critical (Blocking)

- [x] **Structure tree not displaying hierarchy** - Fixed: `spine_structure_tree` now builds complete tree from all structures, showing all root-level books with their children.
- [x] **Structure parent relationships not stored/displayed** - Fixed: `spine_structure_get` now shows parent ID, order, and full children list with titles.
- [ ] **Duplicate root structure created** - Structure list shows "The Accident" as "book" type that was auto-created, separate from user-created books. This is by design - projects auto-create a root structure.

### Schema Mismatch

- [x] **Faction type enum mismatch (MCP vs Database)** - Fixed: MCP now uses correct enum values from `@repo/types`: `government`, `military`, `religious`, `criminal`, `corporate`, `secret-society`, `guild`, `family`, `informal`, `other`.
- [x] **Location type enum mismatch** - Fixed: MCP now uses correct enum values: `world`, `continent`, `country`, `region`, `city`, `district`, `building`, `room`, `natural`, `virtual`, `other`.
- [x] **Plot thread type/status enum mismatch** - Fixed: Type now uses `main-plot`, `subplot`, `mystery`, `romance`, `conflict`, `character-arc`, `worldbuilding`, `other`. Status now uses `planned`, `active`, `dormant`, `resolved`, `abandoned`.

### Display/UX

- [x] **Structure get missing key fields** - Fixed: Now shows summary (not synopsis), parent ID, order, target word count, notes, and full children list with titles and types.
- [x] **Bible character/location appearances showing 0** - Fixed: Web app now computes appearance counts from content analysis data instead of the empty `appearances` array on entities.
- [ ] **No entity type for group consciousness** - Characters like "The Collective" and "The Ancients" are civilizations but must be created as individual characters with `supporting` role.

## Future Considerations

- [ ] TUI workspace for CLI (optional)
- [ ] MCP resources for project state
- [ ] MCP prompts for guided workflows
- [ ] Streaming generation in MCP (pending MCP support)
