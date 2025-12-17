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

