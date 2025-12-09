# Implementation Plan

Detailed implementation roadmap for Spine, organized into phases with concrete deliverables.

## Phase 1: Foundation

Establish core infrastructure, data models, and minimal UI.

### 1.1 Data models and types

Create the shared type definitions that all packages will use.

**Package**: `packages/types`

**Deliverables**:
- Project, Bible, Structure, Content interfaces
- Character, Location, Faction, WorldRule, PlotThread types
- Timeline and event types
- Analysis and review types
- Zod schemas for runtime validation

### 1.2 Storage layer

Implement persistence with SQLite for structured data and file system for content.

**Package**: `packages/core/storage`

**Deliverables**:
- SQLite database schema and migrations
- Repository pattern for bible entities
- File-based content storage (markdown)
- Project save/load operations
- Auto-save with configurable interval (separate branch support)

### 1.3 Bible management

Core CRUD operations for story bible entities.

**Package**: `packages/core/bible`

**Deliverables**:
- Character management (create, read, update, delete, search)
- Location management
- Faction management
- World rule management
- Plot thread management
- Timeline event management
- Relationship graph operations
- Cross-reference tracking (which content mentions which entities)

### 1.4 LLM interface

OpenAI-compatible API client with provider abstraction.

**Package**: `packages/llm`

**Deliverables**:
- OpenAI-compatible client (works with local servers)
- Configuration: endpoint URL, API key, model selection
- Request/response types
- Streaming support
- Error handling and retry logic
- Token counting utilities

### 1.5 Minimal web UI

Basic project management and bible editing interface.

**App**: `apps/web`

**Deliverables**:
- Project list page (create, open, delete projects)
- Project settings page
- Bible editor with tabs (Characters, Locations, Factions, World, Plot, Timeline)
- Entity create/edit forms
- Search and filter within bible
- Basic navigation and layout

## Phase 2: Generation

Content generation pipeline with context assembly.

### 2.1 Context assembly

Build prompts with relevant bible context within token budgets.

**Package**: `packages/llm/context`

**Deliverables**:
- Token budget allocation strategy
- Relevance scoring for bible entities
- Recent content summarization
- Constraint extraction from bible
- Context assembly for different task types (outline, draft, analysis)

### 2.2 Structure management

Hierarchical outline and beat sheet handling.

**Package**: `packages/core/structure`

**Deliverables**:
- Structure tree operations (Book → Arc → Chapter → Scene)
- Beat sheet management within structures
- Tension target assignment
- Chapter type assignment
- Hook specification
- Reordering and reorganization

### 2.3 Generation pipeline

Orchestrate the outline → draft → review cycle.

**Package**: `packages/core/generation`

**Deliverables**:
- Pipeline stage definitions
- Outline generation from high-level description
- Beat expansion from outline
- Draft generation from beats
- Self-review pass (LLM critiques own output)
- Stage retry and regeneration
- Generation history tracking

### 2.4 Basic analysis

Initial quality analysis using LLM judgment.

**Package**: `packages/core/analysis`

**Deliverables**:
- Tension scoring (0-100 scale with explanation)
- Hook strength scoring
- Pacing assessment
- Basic continuity checking (entity mentions vs. bible)
- Analysis result storage

### 2.5 Writing workspace UI

Interface for content generation and editing.

**App**: `apps/web`

**Deliverables**:
- Outline editor (hierarchical tree view)
- Writing workspace (split view: outline + editor)
- Generation controls (model selection, temperature, constraints)
- Real-time analysis panel
- Inline continuity warnings
- Draft history sidebar

## Phase 3: Review

Version tracking, diff generation, and review workflows.

### 3.1 Version management

Track content versions and changes.

**Package**: `packages/core/storage`

**Deliverables**:
- Content version storage
- Diff generation between versions
- Version metadata (generation params, timestamps)
- Rollback support

### 3.2 Review workflow

Structured review process with approval states.

**Package**: `packages/core/review`

**Deliverables**:
- Review queue management
- Status transitions (draft → review → approved → published)
- Paragraph-level accept/reject/regenerate
- Review comments and annotations
- Lock point management
- Published content immutability enforcement

### 3.3 Revision cascade

Handle change propagation within configured bounds.

**Package**: `packages/core/continuity`

**Deliverables**:
- Revision horizon configuration
- Impact analysis (what future content is affected)
- Lock point detection and protection
- Cascade execution (invalidate affected content)
- Cascade preview (show what would be affected)

### 3.4 Review UI

Interface for reviewing and approving content.

**App**: `apps/web`

**Deliverables**:
- Review queue page
- Side-by-side diff view
- Inline annotation interface
- Paragraph-level action buttons
- Bulk approval actions
- Lock point visualization
- Status indicators throughout UI

## Phase 4: Analytics

Visualization and tracking dashboards.

### 4.1 Tension curve data

Prepare data for pacing visualization.

**Package**: `packages/core/analysis`

**Deliverables**:
- Planned tension extraction from structure
- Actual tension aggregation from content analysis
- Chapter-level tension data points
- Divergence calculation

### 4.2 Character tracking

Track character presence and relationships over time.

**Package**: `packages/core/analysis`

**Deliverables**:
- Character appearance tracking per chapter
- Presence intensity levels (mention, scene, POV)
- Relationship evolution tracking
- Character arc progress indicators

### 4.3 Plot thread tracking

Monitor plot thread lifecycles.

**Package**: `packages/core/analysis`

**Deliverables**:
- Thread status tracking (active, dormant, resolved)
- Thread timeline (when introduced, touched, resolved)
- Dangling thread detection
- Promise/payoff matching

### 4.4 Visualization components

Reusable chart components for analytics.

**Package**: `packages/ui/visualization`

**Deliverables**:
- Tension curve chart (dual-line, interactive)
- Character presence heatmap
- Plot thread Gantt chart
- Quality trend line charts
- Chapter type distribution pie/bar chart

### 4.5 Analytics dashboard UI

Unified analytics view.

**App**: `apps/web`

**Deliverables**:
- Analytics dashboard page
- Tension curve with chapter drill-down
- Character presence view
- Plot thread timeline
- Quality metrics overview
- Filtering and date range selection

## Phase 5: Serial features

Web serial specific tooling.

### 5.1 Hook management

Track and enforce chapter ending patterns.

**Package**: `packages/core/analysis`

**Deliverables**:
- Hook type classification (revelation, decision, cliffhanger, emotional)
- Hook pattern analysis (detect repetition)
- Hook strength trending
- Variety enforcement warnings

### 5.2 Cycle enforcement

Tension cycle pattern management.

**Package**: `packages/core/structure`

**Deliverables**:
- Cycle length configuration
- Per-position tension targets
- Cycle phase detection
- Rebalancing suggestions

### 5.3 Release planning

Buffer and schedule management.

**Package**: `packages/core/release`

**Deliverables**:
- Release schedule configuration
- Buffer calculation (approved chapters - scheduled)
- Buffer depletion projection
- Deadline tracking

### 5.4 Mystery tracking

Long-term narrative element management.

**Package**: `packages/core/analysis`

**Deliverables**:
- Mystery layer classification (short, medium, long-term)
- Mystery lifecycle tracking
- Resolution detection
- Unfulfilled promise warnings

### 5.5 Serial dashboard UI

Serial-specific controls and views.

**App**: `apps/web`

**Deliverables**:
- Release calendar view
- Buffer status display
- Hook pattern visualization
- Cycle position indicator
- Mystery status board

## Phase 6: Polish

Quality of life and production readiness.

### 6.1 Bible extraction

Suggest bible entries from approved content.

**Package**: `packages/core/bible`

**Deliverables**:
- Entity mention detection in content
- New entity suggestion generation
- Existing entity update suggestions
- Configurable aggressiveness
- Suggestion review workflow

### 6.2 Export

Output formats for publishing platforms.

**Package**: `packages/core/export`

**Deliverables**:
- EPUB generation
- Royal Road markdown format
- Plain text export
- Project backup (full data export)

### 6.3 Offline support

Work without network connectivity.

**App**: `apps/web`

**Deliverables**:
- Service worker for static assets
- Local SQLite via sql.js
- Generation request queue
- Sync on reconnection
- Offline indicator

### 6.4 Performance optimization

Ensure smooth operation at scale.

**Deliverables**:
- Lazy loading for large projects
- Virtual scrolling for long lists
- Analysis result caching
- Incremental bible indexing
- Background processing for heavy operations

### 6.5 Error handling and recovery

Robust failure handling.

**Deliverables**:
- Graceful LLM failure handling
- Auto-recovery from interrupted operations
- Data corruption detection
- Backup and restore

## Dependencies

```
Phase 1 ─┬─► Phase 2 ─┬─► Phase 3 ───► Phase 4 ───► Phase 5 ───► Phase 6
         │            │
         └────────────┴─► (Can work on UI in parallel with core packages)
```

- Phase 2 requires Phase 1 (needs storage, bible, LLM interface)
- Phase 3 requires Phase 2 (needs content to review)
- Phase 4 requires Phase 3 (needs approved content for analysis)
- Phase 5 requires Phase 4 (builds on analytics)
- Phase 6 can partially parallelize with Phase 4-5

## Related documents

- [Project Goals](../goals.md)
- [Design Rationale](../rationale.md)
- [Project Proposal](../proposal/project-proposal.md)
- [Implementation Status](./status.md)
