# NovelGen Project Proposal

A system for writing, tracking, and iteratively refining LLM-generated novels with human oversight.

## Overview

NovelGen is a tool for authors to collaborate with LLMs on long-form fiction. It handles the mechanical aspects of novel creation—continuity tracking, pacing analysis, consistency checking—while keeping the human author in creative control. The system generates, reviews, and refines content iteratively, with the author as final arbiter.

The primary target is web serial production (see `docs/examples/web.serial/The.Accident/proposal.md`), though the architecture supports shorter formats.

## Problem statement

Writing a web serial with 3-5 chapters per week at 2,000-3,000 words each is a production challenge:

1. **Continuity management** — Tracking hundreds of characters, plot threads, and world details across 250,000+ words per book
2. **Pacing discipline** — Maintaining tension cycles, varying chapter types, ensuring hooks land
3. **Consistency enforcement** — Character voices, world rules, established facts must remain stable
4. **Quality at scale** — Every chapter needs review, but reviewer fatigue is real
5. **Revision cascades** — Changing chapter 15 may invalidate chapters 16-30

Current workflow: Author writes everything manually, uses spreadsheets for tracking, hopes nothing slips through. This doesn't scale.

## Proposed solution

A three-layer system:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Interface                            │
│  Project management, visualization, review workflows, editing    │
└─────────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                        Core Engine                               │
│  Story bible, continuity graph, generation pipeline, analysis    │
└─────────────────────────────────────────────────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                        LLM Interface                             │
│  Multi-model orchestration, prompt management, context assembly  │
└─────────────────────────────────────────────────────────────────┘
```

### Core capabilities

**Story Bible Management**
- Characters: traits, relationships, arc status, voice samples
- World: locations, rules, history, factions
- Plot: threads, promises made, promises fulfilled
- Timeline: events, causality chains, temporal consistency

**Generation Pipeline**
- Outline → Beat sheet → Draft → Review → Revision cycle
- Context assembly: pulls relevant bible entries for each generation
- Constraint enforcement: checks against established facts before accepting output

**Analysis & Visualization**
- Tension curves: planned vs. actual pacing per chapter
- Character presence: who appears where, relationship evolution
- Plot thread status: active, dormant, resolved, dangling
- Quality metrics: hook strength, cliffhanger effectiveness, pacing score

**Review Workflow**
- Side-by-side comparison: generated vs. previous versions
- Inline annotation and feedback
- Accept/reject/regenerate at paragraph level
- Automatic propagation of changes to dependent content

## Architecture

### Package structure

```
packages/
├── core/                    # Domain logic, no UI dependencies
│   ├── bible/              # Story bible management
│   ├── continuity/         # Consistency checking, graph traversal
│   ├── generation/         # Pipeline orchestration
│   ├── analysis/           # Metrics, scoring, visualization data
│   └── storage/            # Persistence abstraction
├── llm/                    # LLM integration
│   ├── providers/          # Anthropic, OpenAI, local models
│   ├── prompts/            # Template management
│   └── context/            # Assembly and token budgeting
├── ui/                     # Shared Svelte components
│   ├── editor/             # Rich text editing
│   ├── visualization/      # Charts, graphs, timelines
│   └── review/             # Diff views, annotation
└── types/                  # Shared TypeScript types

apps/
└── web/                    # SvelteKit application
    ├── routes/
    │   ├── projects/       # Project management
    │   ├── bible/          # Bible editing
    │   ├── outline/        # Structure planning
    │   ├── write/          # Generation and editing
    │   ├── review/         # Quality review
    │   └── analytics/      # Visualization dashboards
    └── lib/
        └── stores/         # Svelte stores for state
```

### Data model

**Project**
```typescript
interface Project {
  id: string;
  title: string;
  format: 'short' | 'light-novel' | 'web-serial';
  settings: ProjectSettings;
  bible: Bible;
  structure: Structure;
  content: Content[];
  metadata: ProjectMetadata;
}
```

**Bible** (story knowledge base)
```typescript
interface Bible {
  characters: Character[];
  locations: Location[];
  factions: Faction[];
  worldRules: WorldRule[];
  plotThreads: PlotThread[];
  timeline: TimelineEvent[];
}

interface Character {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  traits: Trait[];
  relationships: Relationship[];
  arc: CharacterArc;
  voiceSamples: string[];        // Example dialogue for consistency
  appearances: AppearanceRef[];  // Links to content
}
```

**Structure** (planning layer)
```typescript
interface Structure {
  type: 'book' | 'arc' | 'chapter' | 'scene';
  title: string;
  summary: string;
  beats: Beat[];                 // Story beats to hit
  tensionTarget: number;         // 0-100 intended tension level
  chapterType: 'action' | 'character' | 'worldbuilding';
  hooks: Hook[];                 // End-of-section hooks
  children: Structure[];
}
```

**Content** (actual prose)
```typescript
interface Content {
  id: string;
  structureRef: string;          // Links to Structure
  version: number;
  status: 'draft' | 'review' | 'approved' | 'published';
  text: string;
  analysis: ContentAnalysis;
  reviews: Review[];
  generationHistory: GenerationRecord[];
}

interface ContentAnalysis {
  tensionScore: number;          // LLM-assessed tension level
  hookStrength: number;          // How compelling is the ending
  paceScore: number;             // Reading speed/engagement
  characterVoiceScores: Record<string, number>;  // Per-character consistency
  continuityIssues: ContinuityIssue[];
}
```

### LLM integration

**OpenAI-compatible API**

All LLM access uses the OpenAI-compatible API format. This supports:
- Local models (LM Studio, Ollama, vLLM) for prototyping and offline work
- Commercial APIs when production quality is needed
- Single interface, model-agnostic code

**Context assembly**
```typescript
interface ContextAssembler {
  // Builds prompt context from bible + recent content
  assemble(
    task: GenerationTask,
    bible: Bible,
    recentContent: Content[],
    tokenBudget: number
  ): AssembledContext;
}

interface AssembledContext {
  systemPrompt: string;
  relevantCharacters: Character[];
  relevantPlotThreads: PlotThread[];
  previousChapters: ContentSummary[];
  currentOutline: Structure;
  constraints: Constraint[];      // Things that must be true
  tokenUsage: TokenBreakdown;
}
```

**Generation pipeline**
```
Outline → Beat Expansion → Draft Generation → Self-Review →
Continuity Check → Human Review → Revision (if needed) → Approval
```

Each stage can be re-run independently. Failed checks trigger targeted regeneration.

## Web interface

### Project dashboard

- Active projects with status overview
- Recent activity feed
- Quick actions: continue writing, review pending, view analytics

### Bible editor

- Tabbed interface: Characters, Locations, Plot, World, Timeline
- Search and filter across all entries
- Relationship graph visualization
- Automatic extraction: suggest bible entries from approved content

### Outline planner

- Hierarchical editor: Book → Arc → Chapter → Scene
- Drag-and-drop reordering
- Tension curve overlay: see planned pacing at a glance
- Chapter type distribution chart

### Writing workspace

- Split view: outline on left, editor on right
- Generation controls: model selection, creativity settings, constraints
- Real-time analysis panel: tension, pacing, voice consistency
- Inline continuity warnings

### Review interface

- Queue of content awaiting review
- Diff view: previous version vs. current
- Inline commenting and annotation
- Bulk actions: approve all, regenerate flagged sections
- Analytics overlay: see scores for each paragraph

### Analytics dashboard

**Tension curve visualization**
```
Tension
100│                    ╭─╮
 80│              ╭────╯  ╰──╮
 60│        ╭────╯           ╰──╮
 40│   ╭───╯                    ╰───╮
 20│──╯                              ╰──
  0└─────────────────────────────────────
    Ch.1  Ch.5  Ch.10  Ch.15  Ch.20  Ch.25

    ── Planned    ── Actual (LLM assessed)
```

- Interactive: click chapter to see details
- Overlay controls: show both lines, planned only, actual only
- Annotation markers for key plot points

**Character presence heatmap**
- Y-axis: characters
- X-axis: chapters
- Cell color: presence intensity (mention → scene → POV)

**Plot thread tracker**
- Gantt-style view of thread lifecycles
- Status indicators: active, dormant, resolved
- Dangling thread warnings

**Quality trends**
- Line charts over time: average tension, hook strength, voice consistency
- Identify patterns: which chapter types score highest, which characters are hardest to voice

## Serialization technique controls

Per the web serial proposal, specific controls for serial-specific concerns:

### Tension cycle management

- Define cycle length (e.g., 5-chapter arcs)
- Set tension targets per position in cycle
- Visual feedback when actual diverges from planned
- Suggestions for rebalancing

### Hook configuration

- End-of-chapter hook type selection: revelation, decision, cliffhanger, emotional
- Hook strength targets and scoring
- Pattern enforcement: avoid same hook type twice consecutively

### Reader engagement tracking

- Mystery layer status: short-term, medium-term, long-term
- Promise/payoff ledger: what's been promised, what's been delivered
- Pacing variety: ensure chapter type rotation

### Release planning

- Buffer status: chapters written vs. scheduled
- Calendar view of release schedule
- Deadline warnings

## Implementation phases

### Phase 1: Foundation

- [ ] Core data models and storage (SQLite + file system)
- [ ] Basic bible management (CRUD operations)
- [ ] Simple LLM interface (single provider)
- [ ] Minimal web UI: project list, bible editor

### Phase 2: Generation

- [ ] Context assembly system
- [ ] Generation pipeline (outline → draft)
- [ ] Basic analysis (tension scoring, continuity checks)
- [ ] Writing workspace UI

### Phase 3: Review

- [ ] Version tracking and diff generation
- [ ] Review workflow UI
- [ ] Inline annotation system
- [ ] Revision targeting (regenerate specific sections)

### Phase 4: Analytics

- [ ] Tension curve visualization
- [ ] Character presence tracking
- [ ] Plot thread management
- [ ] Quality dashboards

### Phase 5: Serial features

- [ ] Release calendar and buffer tracking
- [ ] Hook type management
- [ ] Cycle enforcement
- [ ] Reader engagement metrics

### Phase 6: Polish

- [ ] Multi-model orchestration
- [ ] Offline mode with local models
- [ ] Export formats (EPUB, Royal Road markdown)
- [ ] Collaboration features (multiple reviewers)

## Technical decisions

### Storage

**SQLite + File System hybrid**
- SQLite for structured data: bible entries, metadata, analysis results
- File system for content: version-controlled markdown files
- Rationale: queryable structure + git-friendly content

### State management

**Svelte 5 runes + server state**
- Client state: UI state, draft edits, selection
- Server state: all persistent data, fetched via SvelteKit load functions
- Optimistic updates with rollback on failure

### LLM cost management

- Token budget tracking per project
- Cost estimates before generation
- Caching: don't re-analyze unchanged content
- Batching: combine small requests

### Offline capability

- Service worker for static assets
- Local SQLite replica (sql.js)
- Queue generation requests when offline
- Sync on reconnection

## Resolved decisions

1. **Bible extraction automation** — Configurable. Author sets aggressiveness level per project.

2. **Regeneration scope** — Published content is immutable. Author specifies revision horizon (e.g., 20 chapters, end of book X). Lock points protect specific future content from cascades.

3. **Voice consistency measurement** — LLM judgment. Heuristics don't capture narrative quality; LLMs can explain their reasoning.

4. **Multi-author support** — Single-author only. Collaboration is out of scope.

5. **Version control integration** — No automatic commits. Author controls commit timing. Timer-based auto-save to a separate branch is acceptable.

## Success criteria

1. **Usable for The Accident web serial** — Can produce Book 1 (100 chapters, 250k words) with the system
2. **Continuity zero-defect** — No contradictions slip through to publication
3. **Pacing visibility** — Author can see and adjust tension curves before writing
4. **Review efficiency** — 10x faster than manual review for routine chapters
5. **Generation quality** — LLM output requires minimal manual editing (< 20% rewrite rate)

## Related documents

- [Project Goals](./goals.md)
- [Design Rationale](../rationale.md)
- [The Accident - Web Serial Proposal](../examples/web.serial/The.Accident/proposal.md)
- [The Accident - Light Novel Proposal](../examples/light/The.Accident/proposal.md)
- [Coding Style Guide](../development/coding-style.md)
- [Documentation Style Guide](../development/documentation-style.md)
