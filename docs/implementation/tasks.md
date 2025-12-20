# Web App Refactor
[web.app.refactor.plan.md](./web.app.refactor.plan.md) for additional details

## Phase 1: Foundations
- [x] Define design tokens (colors, spacing, typography, radii, shadows, motion) - in app.css with Tailwind v4 @theme
- [x] Build layout primitives (AppShell, TopBar, NavRail, PageSection, StatCard, Drawer, PillFilters, EmptyState, DataList)
- [x] Wire command palette and keyboard shortcuts - CommandPalette component with Ctrl/Cmd+K shortcut

## Phase 2-8: Page Implementations
- [x] Implement redesigned Dashboard (continue writing CTA, queue summary, buffer/health, activity feed, quick filters)
- [x] Implement Workspace layout (structure rail, editor tabs: Draft/Outline/Beats/Analysis, context drawer tabs) - basic structure done
- [x] Implement Review queue and diff split view (filters as pills, gutter actions, comment drawer) - basic implementation exists
- [x] Implement Analytics dashboard visuals - basic implementation exists
- [x] Implement Serial dashboard - basic implementation exists
- [x] Implement Bible/Entities layout - existing implementation with EntityListPage/EntityCard
- [ ] Align Settings layout and finalize responsive/motion/accessibility polish across pages

## Phase 9: Testing & Hardening
- [ ] Update component tests for new primitives/layouts (vitest-browser-svelte) - some type issues to fix
- [x] Update Playwright selectors for new AppShell/TopBar/NavRail structure
- [ ] Fix remaining Playwright test failures for Workspace, Analytics, Serial, Review pages

### Playwright Test Status (after refactor)
Passing (98 tests):
- bible-management.spec.ts: 11/11 tests ✓
- navigation.spec.ts: 5/5 tests ✓
- project-management.spec.ts: 7/7 tests ✓
- entity-creation.spec.ts: 21/22 tests ✓
- workspace.spec.ts: 17/17 tests ✓
- analytics.spec.ts: partial passing
- serial.spec.ts: partial passing
- review.spec.ts: partial passing
- generation.spec.ts: partial passing

Flaky (1 test):
- serial.spec.ts: hook variety warnings test intermittently fails

Failing (16 tests):
- analytics.spec.ts: 7 failures (timing and server issues)
- serial.spec.ts: 1 failure (mystery board timing)
- review.spec.ts: 5 failures (content fill timing issues)
- generation.spec.ts: 2 failures (analysis panel, version saving timing)
- entity-creation.spec.ts: 1 failure (location list display timing)

### Test Fixes Completed
- Fixed `selectOption` helper to work with Bits UI Select components (uses getByRole('listbox') and getByRole('option'))
- Fixed workspace structure creation to use tree item "Add child" button instead of header button
- Updated workspace test beforeEach blocks to use auto-created root book (project title) as parent
- Fixed button name selectors to use "Save Changes" instead of ambiguous "Save"
- Fixed assertions to use toHaveText instead of toHaveValue for Bits UI Select components
- Added `clickAddChildOnTreeItem` helper for creating child structures via tree item hover
- Updated all setup helpers in analytics/serial/review/generation to use `clickAddChildOnTreeItem`
- Fixed Save button selector from `{ name: 'Save' }` to `{ name: 'Save', exact: true }` to avoid matching "Save Hook"
- Fixed beat placeholder from "Beat description..." to "Add a beat..."
- Fixed "Add Beat" button to "Add" button
- Fixed "Hook" heading to "Chapter Hook" heading
- Fixed hook type assertion from toHaveValue to toHaveText
- Added click-to-focus before textarea fill for content editor tests
- Added wait times for Svelte reactivity after content changes
- Fixed History button locator to use exact match to avoid tree item conflicts
- Fixed "Generation Options" dialog title to "Generate Content"
- Fixed empty state tests to account for auto-created book
- Fixed plot thread button selectors from "Create Plot Thread" to "New Thread|Create Thread"
- Fixed back-link navigation selector to use role link
- Fixed strict mode violations for structure filter tests
- Improved content editor fill timing with explicit Content header wait
- Fixed entity-creation.spec.ts back-link selectors to use `getByRole('link', { name: /back to bible/i })` instead of `a.back-link`
- Fixed timeline event list strict mode violation with `.first()` selector

### Known Issues
- Project creation auto-creates a root book with the project title (affects empty state tests)
- Content editor fill timing can be flaky - need click-to-focus and wait for Svelte reactivity
- Some tests need longer stabilization waits after chapter creation
- Server timeouts can cause test flakiness in CI environments
- Parallel test execution (16 workers) causes database contention - tests pass individually but fail when run together

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
- [x] Review queue page
- [x] Diff view
- [x] Annotation interface
- [x] Action buttons
- [x] Bulk actions
- [x] Lock visualization
- [x] Status indicators

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
- [x] Dashboard page
- [x] Tension curve view
- [x] Character presence view
- [x] Plot thread timeline
- [x] Quality metrics
- [x] Filtering controls

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
- [x] Layer classification
- [x] Lifecycle tracking
- [x] Resolution detection
- [x] Unfulfilled warnings

### 5.5 Serial dashboard UI
- [x] Release calendar
- [x] Buffer status
- [x] Hook patterns
- [x] Cycle indicator
- [x] Mystery board

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

#### Phase 1: Foundation
- [x] Bible flow integration test (bible-management.spec.ts)
  - [x] Bible editor display with all tabs
  - [x] Tab switching and empty states
  - [x] Tab counts display
  - [x] Search functionality
  - [x] Navigation and active state
- [x] Project flow integration test (project-management.spec.ts)
  - [x] Project creation
  - [x] Project listing
  - [x] Project settings update
  - [x] Project deletion with confirmation
  - [x] Cancel project creation
- [x] Entity creation tests (entity-creation.spec.ts)
  - [x] Character creation and listing
  - [x] Location creation and listing
  - [x] Faction creation and listing
  - [x] World Rule creation and listing
  - [x] Plot Thread creation and listing
  - [x] Timeline Event creation and listing
  - [x] Tab count updates after entity creation
- [x] Navigation tests (navigation.spec.ts)
  - [x] Navigation between Bible and Settings
  - [x] Return to project list
  - [x] Active nav item highlighting
  - [x] Project context maintenance

#### Phase 2: Generation
- [x] Workspace integration tests
  - [x] Structure tree creation and navigation
  - [x] Book/Arc/Chapter/Scene hierarchy
  - [x] Outline editor functionality
  - [x] Beat sheet management
  - [x] Tension target configuration
  - [x] Chapter type selection
  - [x] Hook specification
- [x] Generation pipeline tests
  - [x] Content editor display
  - [x] Manual content editing and saving
  - [x] Draft history display
  - [x] Version tracking
  - [x] Content status badges
  - [ ] Outline generation flow (requires LLM)
  - [ ] Beat expansion flow (requires LLM)
  - [ ] Draft generation flow (requires LLM)
  - [ ] Self-review pass (requires LLM)
  - [ ] Generation history tracking (requires LLM)
  - [ ] Stage retry functionality (requires LLM)
- [x] Analysis panel tests
  - [x] Analysis panel display and toggle
  - [x] Tension score UI structure
  - [x] Hook strength UI structure
  - [x] Pacing assessment UI structure
  - [x] Continuity warnings UI structure
  - [ ] Actual analysis data display (requires LLM)

#### Phase 3: Review
- [x] Review queue tests
  - [x] Review queue page display
  - [x] Content status filtering
  - [x] Queue item navigation
- [x] Review workflow tests
  - [x] Side-by-side diff view
  - [x] Paragraph-level accept/reject/regenerate
  - [x] Review comments
  - [x] Status transitions (draft → in_review → approved → published)
  - [x] Lock point creation and visualization
  - [x] Bulk approval actions
- [x] Revision cascade tests
  - [x] Horizon configuration
  - [x] Impact analysis display
  - [x] Cascade preview
  - [x] Cascade execution

#### Phase 4: Analytics
- [x] Analytics dashboard tests
  - [x] Dashboard page display
  - [x] Tension curve visualization
  - [x] Planned vs actual tension divergence
  - [x] Character presence heatmap
  - [x] Plot thread Gantt timeline
  - [x] Quality metrics charts
  - [x] Chapter type distribution
  - [x] Structure filtering controls
- [x] Bug fixes
  - [x] Fix analytics page error when structureTree is accessed as array (getFullTree returns Structure, not Structure[])

#### Phase 5: Serial Features
- [x] Serial dashboard tests (serial.spec.ts)
  - [x] Dashboard page display
  - [x] Structure selector
  - [x] Empty state handling
  - [x] Structure filter changes
  - [x] Release calendar display
  - [x] Release schedule display
  - [x] Scheduled releases display
  - [x] Buffer status display
  - [x] Buffer health indicators
  - [x] Depletion projection
  - [x] Hook pattern visualization
  - [x] Hook pattern display
  - [x] Hook variety warnings
  - [x] Cycle indicator and phase detection
  - [x] Cycle enforcement display
  - [x] Cycle indicator visualization
  - [x] Mystery board display
  - [x] Mystery lifecycle tracking
  - [x] Mystery description display
  - [x] Navigation from nav menu
  - [x] Active nav state
  - [x] Structure filtering from URL
  - [x] Default structure selection

#### Test Infrastructure
- [x] Test stability improvements
  - [x] Explicit dialog transition waits
  - [x] Selector specificity improvements
  - [x] Serial test execution to avoid database conflicts
  - [x] Retry logic for Select components
  - [x] Fixed navigation dialog visibility tests (waitForDialogTransition helper)
  - [x] Fixed project management dialog transitions
  - [x] Fixed settings page SQL foreign key error (use updateSettings/updateMetadata)
  - [x] Fixed review test dialog timeout issues in setupReviewProject
  - [x] Fixed Select component timeout issues (removed unnecessary selectOption calls)
  - [ ] Fix workspace empty state test (serial mode state persistence)

## Phase 7: WebSocket API (CLI Support)

See [websocket.api.md](./websocket.api.md) for detailed API specification.

### 7.1 Server Package (@repo/server) - Phase 1
- [x] Package configuration (package.json, tsconfig.json, eslint.config.js)
- [x] Protocol types (JSON-RPC 2.0 message schemas)
- [x] Request schemas (project, bible, structure, content, subscription)
- [x] Response schemas (success, error, notification)
- [x] WebSocket server infrastructure (server.ts)
- [x] Connection state management (connection.ts)
- [x] Request router with validation (router.ts)
- [x] Subscription manager for real-time updates (subscriptions.ts)
- [x] Service context initialization (services.ts)
- [x] Domain handlers: project, bible, structure, content, subscription
- [x] Main entry point and exports (index.ts)
- [x] Unit tests for server components (65 tests passing)

### 7.2 Server Package - Phase 2 (Handler Implementation)
- [x] Generation handlers with streaming support (generation.ts)
- [x] Review handlers for workflow management (review.ts)
- [x] Analytics handlers for tension/character/plot tracking (analytics.ts)
- [x] Serial handlers for release planning (serial.ts)
- [x] Updated services.ts with generation, review, analysis services
- [x] Request schemas for generation, review, analytics, serial operations
- [x] Unit tests for new handlers (78 tests passing)

### 7.3 Server Package - Cascade Integration ✓
- [x] Full revision cascade service integration (cascade.ts handlers)
- [x] Cascade-specific API methods (getHorizonConfig, setHorizonConfig, analyzeImpact, isProtected, createProtection)
- [x] Updated review handlers to use full cascade service (previewCascade, executeCascade with options)
- [x] Request schemas with cascade execution options (entityFilter, forcePastLocks, dryRun)
- [x] Integration tests with real database (cascade.integration.test.ts)
- [x] Unit tests for cascade handlers (92 tests passing total)

### 7.4 Client Package (@repo/client) - Phase 4
- [x] Package configuration (package.json, tsconfig.json, eslint.config.js, vitest.config.ts)
- [x] Protocol types (types.ts - error codes, subscription channels, client config)
- [x] WebSocket client wrapper with auto-reconnect (client.ts)
- [x] Request/response correlation with timeouts
- [x] Subscription management for real-time updates
- [x] Typed API methods for all domains:
  - [x] project.ts - list, create, load, delete, updateSettings, updateMetadata
  - [x] bible.ts - get, character/location/faction/worldRule/plotThread/timelineEvent CRUD
  - [x] structure.ts - getTree, getAll, get, create, update, delete, reorder, addBeat, removeBeat, setHook
  - [x] content.ts - get, save, getHistory, rollback
  - [x] generation.ts - start, cancel, status, retry
  - [x] review.ts - queue, getItem, submitAction, bulkApprove, lock points, comments, status transitions, cascade
  - [x] analytics.ts - tensionCurve, characterPresence, plotThreads, quality
  - [x] serial.ts - bufferStatus, releaseSchedule, hookPatterns, cycleStatus, mysteryBoard
- [x] Main index.ts with createFullClient convenience function
- [x] Unit tests for all components (116 tests passing)

### 7.5 CLI Application (@repo/cli) ✓
- [x] CLI package setup (package.json, tsconfig.json, eslint.config.js, vitest.config.ts)
- [x] Configuration management (~/.config/spine/cli.json)
- [x] WebSocket client integration (@repo/client)
- [x] Core commands:
  - [x] `project` - list, create, show, select, delete
  - [x] `bible` - show, characters, locations, threads, add-character
  - [x] `structure` - tree, list, create, show
  - [x] `content` - view, edit, history, rollback
  - [x] `generate` - start, status, cancel (with streaming)
  - [x] `review` - queue, show, transition, approve, bulk-approve, locks
  - [x] `config` - show, set, get, reset, path
- [x] Interactive prompts (@inquirer/prompts)
- [x] Output formatting (cli-table3, chalk, ora)
- [x] Streaming generation output with progress indicators
- [x] Unit tests (24 tests passing)
- [x] User documentation (docs/user/cli.md)
- [ ] TUI workspace (optional, future)

### 7.6 CLI Extended Commands (Web Serial Support) ✓
- [x] `analytics` command:
  - [x] `tension` - display tension curve data
  - [x] `characters` - display character presence heatmap
  - [x] `threads` - display plot thread timeline
  - [x] `quality` - display quality metrics
- [x] `serial` command:
  - [x] `buffer` - display buffer status and health
  - [x] `schedule` - display release schedule and deadlines
  - [x] `hooks` - display hook patterns and variety warnings
  - [x] `cycle` - display tension cycle status
  - [x] `mysteries` - display mystery board with clue tracking
- [x] Extended `bible` commands:
  - [x] `add-location` - create location entity
  - [x] `add-thread` - create plot thread entity
  - [x] `factions` - list faction entities
  - [x] `add-faction` - create faction entity
  - [x] `rules` - list world rule entities
  - [x] `add-rule` - create world rule entity
  - [x] `timeline` - list timeline events
  - [x] `add-event` - create timeline event
- [x] Extended `structure` commands:
  - [x] `update` - update structure properties (tension, synopsis, title, chapter type)
  - [x] `--depth` option for tree command
  - [x] `--parent` filter for list command
- [x] Documentation sync with implemented features (cli.md updated)

## Phase 8: MCP Server

See [mcp.plan.md](./mcp.plan.md) for detailed implementation plan.

### 8.1 MCP Package Foundation ✓
- [x] Package configuration (package.json, tsconfig.json, eslint.config.js, vitest.config.ts)
- [x] MCP server initialization with SDK (@modelcontextprotocol/sdk)
- [x] Configuration management (environment, config file)
- [x] WebSocket client integration (@repo/client)
- [x] Session context management (currentProjectId, currentStructureId)
- [x] Error handling and mapping

### 8.2 Core Tools ✓
- [x] Project tools (spine_project_list, spine_project_create, spine_project_load, spine_project_delete, spine_session_status, spine_project_settings)
- [x] Bible tools (spine_bible_get, spine_bible_character_*, spine_bible_location_*, spine_bible_faction_*, spine_bible_thread_*, spine_bible_rule_*, spine_bible_timeline, spine_bible_event_*)
- [x] Structure tools (spine_structure_tree, spine_structure_list, spine_structure_get, spine_structure_create, spine_structure_update, spine_structure_delete, spine_structure_select, spine_structure_reorder)
- [x] Content tools (spine_content_get, spine_content_save, spine_content_history, spine_content_rollback)

### 8.3 Advanced Tools ✓
- [x] Generation tools (spine_generate_start, spine_generate_status, spine_generate_cancel, spine_generate_retry)
- [x] Review tools (spine_review_queue, spine_review_get, spine_review_approve, spine_review_publish, spine_review_reject, spine_review_bulk_approve, spine_review_lock, spine_review_unlock, spine_review_locks, spine_review_comment)
- [x] Structure beats and hooks (spine_structure_add_beat, spine_structure_remove_beat, spine_structure_set_hook, spine_structure_clear_hook)
- [x] Cascade tools (spine_review_cascade_preview, spine_review_cascade_execute)

### 8.4 Analytics & Serial Tools ✓
- [x] Analytics tools (spine_analytics_tension, spine_analytics_characters, spine_analytics_threads, spine_analytics_quality)
- [x] Serial tools (spine_serial_buffer, spine_serial_schedule, spine_serial_hooks, spine_serial_cycle, spine_serial_mysteries)

### 8.5 Polish & Testing
- [x] Output formatting for LLM consumption
- [x] Tool documentation and descriptions (in code)
- [x] Unit tests for core modules (38 tests passing)
- [ ] Integration tests with Spine server
- [ ] User documentation (docs/user/mcp.md)

## Documentation

### User Documentation
- [x] CLI usage guide (docs/user/cli.md)
- [x] WebSocket API reference (docs/user/api.md)
- [ ] MCP server usage guide (docs/user/mcp.md)

