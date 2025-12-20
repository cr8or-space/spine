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
- [x] MCP package (@repo/mcp) with 45+ tools
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

- [ ] Update component tests for new primitives/layouts
- [ ] Fix remaining Playwright test failures (16 failing)
- [ ] Fix workspace empty state test

## Phase 6: Polish (Not Started)

### 6.1 Bible Extraction
- [ ] Entity detection from content
- [ ] New entity suggestions
- [ ] Update suggestions
- [ ] Aggressiveness config
- [ ] Suggestion review UI

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
- [ ] LLM failure handling
- [ ] Operation recovery
- [ ] Corruption detection
- [ ] Backup and restore

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

## Known Integration Issues

Server handler registration gaps (affects MCP integration tests):
- `bible.get` and `bible.*.list` validation with projectId
- `structure.addBeat` response missing description field

## Future Considerations

- [ ] TUI workspace for CLI (optional)
- [ ] MCP resources for project state
- [ ] MCP prompts for guided workflows
- [ ] Streaming generation in MCP (pending MCP support)
