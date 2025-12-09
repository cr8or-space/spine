# Spine Project Proposal

A system for writing, tracking, and iteratively refining LLM-generated novels with human oversight.

## Overview

Spine is a tool for authors to collaborate with LLMs on long-form fiction. It handles the mechanical aspects of novel creation—continuity tracking, pacing analysis, consistency checking—while keeping the human author in creative control. The system generates, reviews, and refines content iteratively, with the author as final arbiter.

The primary target is web serial production, though the architecture supports shorter formats. Spine is the first domain implementation of a broader framework pattern applicable to other structured authoring domains.

## Problem statement

Writing a web serial with 3-5 chapters per week at 2,000-3,000 words each is a production challenge:

1. **Continuity management** — Tracking hundreds of characters, plot threads, and world details across 250,000+ words per book
2. **Pacing discipline** — Maintaining tension cycles, varying chapter types, ensuring hooks land
3. **Consistency enforcement** — Character voices, world rules, established facts must remain stable
4. **Quality at scale** — Every chapter needs review, but reviewer fatigue is real
5. **Revision cascades** — Changing chapter 15 may invalidate chapters 16-30

Current workflow: Author writes everything manually, uses spreadsheets for tracking, hopes nothing slips through. This doesn't scale.

## Framework Vision

Spine is one instance of a broader pattern. Several authoring domains share the same shape:

| Domain | Spine | Entities | Content | Validation |
|--------|-------|----------|---------|------------|
| Serial fiction | Timeline/plot | Characters, locations, rules | Prose chapters | Continuity (LLM-judged) |
| Technical book | Checkpoints | Concepts, symbols | Prose + code | Compiles, tests pass |
| Interactive fiction | State graph | Characters, variables | Nodes + branches | Paths reachable, states valid |
| API documentation | API spec | Types, endpoints | Guides + examples | Examples run, schemas match |
| TTRPG | Rules + canon | Creatures, items, NPCs | Sessions, handouts | Math checks, rules consistent |
| Course | Learning objectives | Skills, prerequisites | Lessons, assessments | Coverage, prerequisite order |

Each has:
1. A **spine** that structures everything else
2. **Entities** that must remain consistent
3. **Content** that references entities and hangs from the spine
4. **Constraints** that can be validated
5. **Cross-references** that should be automated
6. **Multiple outputs** for different audiences

The core abstractions (Spine, Entity, Content, Constraint, Validator, Renderer) can be extracted into a framework that these domains specialize.

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
│  OpenAI-compatible API, prompt management, context assembly      │
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
│   ├── review/             # Review workflow
│   ├── release/            # Release planning
│   └── storage/            # Persistence abstraction
├── llm/                    # LLM integration
│   ├── client/             # OpenAI-compatible client
│   └── context/            # Assembly and token budgeting
├── types/                  # Shared TypeScript types and Zod schemas
│   └── base/               # Framework base interfaces
└── ui/                     # Shared Svelte components

apps/
└── web/                    # SvelteKit application
    ├── routes/
    │   ├── projects/       # Project management
    │   └── [id]/
    │       ├── bible/      # Bible editing
    │       ├── workspace/  # Writing workspace
    │       └── settings/   # Project settings
    └── lib/
        ├── components/     # UI primitives
        ├── bible/          # Bible tab components
        └── shell/          # App shell components
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

interface Character extends BaseEntity {
  type: 'character';
  name: string;
  aliases: string[];
  description: string;
  traits: Trait[];
  relationships: Relationship[];
  arc: CharacterArc;
  voiceSamples: string[];
  appearances: AppearanceRef[];
}
```

**Structure** (planning layer)
```typescript
interface Structure {
  type: 'book' | 'arc' | 'chapter' | 'scene';
  title: string;
  summary: string;
  beats: Beat[];
  tensionTarget: number;
  chapterType: 'action' | 'character' | 'worldbuilding';
  hooks: Hook[];
  children: Structure[];
}
```

**Content** (actual prose)
```typescript
interface Content extends BaseContent {
  id: string;
  structureRef: string;
  version: number;
  status: ContentStatus;  // draft | review | approved | published
  text: string;
  analysis: ContentAnalysis;
  reviews: Review[];
  references: Reference[];
}
```

### Base framework interfaces

The framework provides base interfaces that enable future extraction:

```typescript
interface BaseEntity {
  id: string;
  type: string;
  introducedAt?: SpinePosition;
  retiredAt?: SpinePosition;
}

interface BaseContent {
  id: string;
  type: string;
  spineNode: string;
  status: ContentStatus;
  references: Reference[];
}

interface Spine<Node> {
  roots(): Node[];
  children(node: Node): Node[];
  parent(node: Node): Node | null;
  linearize(): Node[];
  position(node: Node): number;
}

interface Validator<Context> {
  name: string;
  phase: ValidationPhase;  // structural | automated | computed
  validate(context: Context): Promise<ValidationResult[]>;
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
  constraints: Constraint[];
  tokenUsage: TokenBreakdown;
}
```

**Generation pipeline**
```
Outline → Beat Expansion → Draft Generation → Self-Review →
Continuity Check → Human Review → Revision (if needed) → Approval
```

Each stage can be re-run independently. Failed checks trigger targeted regeneration.

## Tech stack

### Frontend
- **SvelteKit 2** with **Svelte 5** runes
- **Tailwind CSS v4** — CSS-first configuration via @theme
- **Bits UI** — Accessible headless components (Dialog, Tabs, Select)
- **Lucide Svelte** — Consistent icon system
- **vitest-browser-svelte** + **Playwright** — Component and integration tests

### Backend/Core
- **TypeScript** strict mode
- **Zod** for runtime validation
- **libsql** (SQLite) for structured data
- File system for prose content (git-friendly)

### Tooling
- **Turborepo** + pnpm workspaces
- **ESLint** + **Prettier** (with Tailwind and Svelte plugins)
- **Vitest** for unit tests

## Web interface

### Project dashboard

- Active projects with status overview
- Recent activity feed
- Quick actions: continue writing, review pending, view analytics

### Bible editor

- Tabbed interface: Characters, Locations, Plot, World, Timeline
- Search and filter across all entries
- Relationship graph visualization
- Generic components: EntityCard, EntityListPage, CreateEntityDialog

### Writing workspace

- Split view: outline on left, editor on right
- Generation controls: model selection, creativity settings, constraints
- Real-time analysis panel: tension, pacing, voice consistency
- Inline continuity warnings

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
- Character presence heatmap
- Plot thread tracker (Gantt-style)
- Quality trends over time

## Serialization technique controls

Specific controls for serial-specific concerns:

### Tension cycle management

- Define cycle length (e.g., 5-chapter arcs)
- Set tension targets per position in cycle
- Visual feedback when actual diverges from planned

### Hook configuration

- End-of-chapter hook type selection: revelation, decision, cliffhanger, emotional
- Hook strength targets and scoring
- Pattern enforcement: avoid same hook type twice consecutively

### Release planning

- Buffer status: chapters written vs. scheduled
- Calendar view of release schedule
- Deadline warnings

## Implementation phases

### Phase 1: Foundation (Complete)

- Core data models and storage (libsql + file system)
- Bible management with all entity types
- LLM interface with OpenAI-compatible client
- Web UI foundation with Tailwind, Bits UI, Lucide

### Phase 2: Generation (Complete)

- Context assembly system
- Generation pipeline (outline → draft)
- Basic analysis (tension scoring, continuity checks)
- Writing workspace UI

### Phase 3: Review (In Progress)

- Version tracking and diff generation
- Review workflow with status transitions
- Revision cascade with lock points
- Review UI (pending)

### Phase 4: Analytics (In Progress)

- Tension curve data and visualization components
- Character and plot thread tracking
- Analytics dashboard UI (pending)

### Phase 5: Serial features (Partial)

- Hook and cycle management (complete)
- Release planning (complete)
- Mystery tracking and serial dashboard (pending)

### Phase 6: Polish (Pending)

- Bible extraction from approved content
- Export formats (EPUB, Royal Road)
- Offline mode with local models
- Performance optimization

## Technical decisions

### Storage

**SQLite + File System hybrid**
- SQLite (libsql) for structured data: bible entries, metadata, analysis results
- File system for content: version-controlled markdown files
- Rationale: queryable structure + git-friendly content

### State management

**Svelte 5 runes + server state**
- Client state: UI state, draft edits, selection
- Server state: all persistent data, fetched via SvelteKit load functions
- Optimistic updates with rollback on failure

### Validation pipeline

**Three-phase execution**
1. Structural (fast, graph-based): reference integrity, prerequisite order
2. Automated (deterministic): compile, run tests, execute examples
3. Computed (LLM): quality judgments, consistency checks

### Published content immutability

Once content is marked as published, it cannot be modified. Author specifies revision horizon for cascade bounds. Lock points protect specific future content.

## Resolved decisions

1. **Bible extraction automation** — Configurable aggressiveness per project
2. **Voice consistency measurement** — LLM judgment with explanations
3. **Multi-author support** — Single-author only (out of scope)
4. **Version control integration** — No automatic commits; author controls timing

## Success criteria

1. **Usable for web serial** — Can produce Book 1 (100 chapters, 250k words)
2. **Continuity zero-defect** — No contradictions slip through to publication
3. **Pacing visibility** — Author can see and adjust tension curves before writing
4. **Review efficiency** — 10x faster than manual review for routine chapters
5. **Generation quality** — LLM output requires minimal manual editing (< 20% rewrite rate)

## Related documents

- [Project Goals](../goals.md)
- [Design Rationale](../rationale.md)
- [Implementation Plan](../implementation/plan.md)
- [Implementation Status](../implementation/status.md)
- [Coding Style Guide](../development/coding-style.md)
