---
name: spine-serial
description: "Guide for the Spine Serial domain - web serial fiction authoring. Covers bible entities, structure hierarchy, generation pipeline, review workflow, and serial-specific analysis."
---

# Spine Serial Domain

## Overview

The Serial domain supports authoring web serial fiction with:
- **Story Bible** — Characters, locations, factions, world rules, plot threads, timeline
- **Structure** — Book → Arc → Chapter → Scene hierarchy with tension targets
- **Generation** — LLM-assisted outline → beats → draft pipeline
- **Review** — Versioned content with approve/reject/publish workflow
- **Analysis** — Tension scoring, continuity checking, pacing assessment
- **Serial Features** — Hook tracking, release buffer, tension cycles

## Package Structure

```
packages/serial/
├── types/
│   └── src/
│       ├── index.ts
│       ├── bible.ts        # Character, Location, Faction, etc.
│       ├── structure.ts    # Book, Arc, Chapter, Scene
│       ├── content.ts      # Prose, Analysis scores
│       └── serial.ts       # Hook, Cycle, Release types
├── core/
│   └── src/
│       ├── bible/          # Bible entity CRUD
│       ├── structure/      # Structure tree operations
│       ├── generation/     # LLM generation pipeline
│       ├── analysis/       # Tension, pacing, continuity
│       ├── review/         # Version management, locks
│       ├── serial/         # Buffer, hooks, cycles
│       └── handlers/       # Server handler registration
└── mcp/
    └── src/
        └── tools/          # MCP tool definitions
```

## Bible Entities

### Character

```typescript
const CharacterSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
  aliases: z.array(z.string()).default([]),
  description: z.string().default(''),
  traits: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  backstory: z.string().default(''),
  voiceNotes: z.string().default(''), // How they speak
  relationships: z.array(RelationshipSchema).default([]),
  introducedAt: z.string().optional(), // Structure ID where introduced
  status: z.enum(['active', 'inactive', 'deceased']).default('active'),
});
```

**Key fields**:
- `voiceNotes` — Critical for generation consistency
- `introducedAt` — Links to structure for continuity
- `relationships` — Bidirectional tracked separately

### Location

```typescript
const LocationSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  type: z.enum(['world', 'continent', 'country', 'region', 'city', 
                'district', 'building', 'room', 'natural', 'virtual', 'other']),
  description: z.string().default(''),
  sensoryDetails: z.string().default(''), // Sights, sounds, smells
  atmosphere: z.string().default(''),
  parentId: z.string().uuid().optional(), // Hierarchical locations
  significance: z.string().default(''), // Why it matters to story
});
```

### Faction

```typescript
const FactionSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  type: z.enum(['government', 'military', 'religious', 'criminal', 'corporate',
                'secret-society', 'guild', 'family', 'informal', 'other']),
  description: z.string().default(''),
  goals: z.array(z.string()).default([]),
  values: z.array(z.string()).default([]),
  resources: z.array(z.string()).default([]),
  relationships: z.array(FactionRelationshipSchema).default([]),
});
```

### WorldRule

```typescript
const WorldRuleSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  category: z.enum(['magic', 'technology', 'social', 'physical', 'economic', 'other']),
  description: z.string(),
  limitations: z.array(z.string()).default([]),
  exceptions: z.array(z.string()).default([]),
  implications: z.array(z.string()).default([]),
});
```

### PlotThread

```typescript
const PlotThreadSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  type: z.enum(['main-plot', 'subplot', 'mystery', 'romance', 
                'conflict', 'character-arc', 'worldbuilding', 'other']),
  description: z.string().default(''),
  status: z.enum(['planned', 'active', 'dormant', 'resolved', 'abandoned']),
  promises: z.array(z.string()).default([]), // Setup/foreshadowing
  payoffs: z.array(z.string()).default([]),  // Resolutions
  involvedCharacters: z.array(z.string()).default([]), // Character IDs
});
```

### TimelineEvent

```typescript
const TimelineEventSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  date: z.string(), // In-world date (flexible format)
  description: z.string().default(''),
  type: z.enum(['backstory', 'story', 'future']),
  involvedCharacters: z.array(z.string()).default([]),
  involvedLocations: z.array(z.string()).default([]),
  structureId: z.string().uuid().optional(), // Where it appears in story
});
```

## Structure Hierarchy

```
Project
└── Book
    └── Arc
        └── Chapter
            └── Scene
```

### Structure Types

```typescript
const StructureTypeSchema = z.enum(['book', 'arc', 'chapter', 'scene']);

const StructureSchema = BaseEntitySchema.extend({
  type: StructureTypeSchema,
  title: z.string().min(1),
  summary: z.string().default(''),
  parentId: z.string().uuid().optional(),
  order: z.number().int().nonnegative(),
  
  // Chapter-specific
  chapterType: z.enum(['action', 'character', 'worldbuilding', 'transition']).optional(),
  targetTension: z.number().min(0).max(100).optional(),
  targetWordCount: z.number().int().positive().optional(),
  
  // Beats (for chapters)
  beats: z.array(BeatSchema).default([]),
  
  // Hook (for chapters)
  hook: HookSchema.optional(),
  
  // Notes
  notes: z.string().default(''),
});
```

### Beats

Beats are the atomic units of a chapter's outline:

```typescript
const BeatSchema = z.object({
  id: z.string().uuid(),
  summary: z.string(),
  purpose: z.enum(['setup', 'development', 'climax', 'resolution', 'transition']),
  tension: z.number().min(0).max(100),
  povCharacter: z.string().optional(), // Character ID
  order: z.number().int().nonnegative(),
});
```

### Hooks

Every chapter should end with a hook:

```typescript
const HookSchema = z.object({
  type: z.enum(['revelation', 'decision', 'cliffhanger', 'emotional', 'question']),
  description: z.string(),
  strength: z.number().min(0).max(100).optional(), // Analysis score
});
```

## Generation Pipeline

### Stages

```
Outline → Beats → Draft → Self-Review → Human Review
```

1. **Outline** — Generate chapter summary from story bible + structure
2. **Beats** — Expand outline into specific beats
3. **Draft** — Generate prose from beats
4. **Self-Review** — LLM checks for issues
5. **Human Review** — Author approve/reject/revise

### Pipeline State

```typescript
const GenerationStateSchema = z.object({
  structureId: z.string().uuid(),
  stage: z.enum(['idle', 'outline', 'beats', 'draft', 'review', 'complete', 'failed']),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
  attempts: z.number().int().nonnegative().default(0),
});
```

### Context Assembly

Generation requires assembling relevant context:

```typescript
interface GenerationContext {
  // Always included
  projectSettings: ProjectSettings;
  structureContext: StructureContext; // Current chapter + surrounding
  
  // Relevance-scored
  characters: Character[];      // POV character + mentioned characters
  locations: Location[];        // Scene locations
  activeThreads: PlotThread[];  // Active plot threads
  worldRules: WorldRule[];      // Relevant rules
  
  // Previous content
  previousChapter?: ContentSummary;
  previousScene?: ContentSummary;
  
  // Constraints
  establishedFacts: string[];   // From bible + published content
  tensionTarget: number;
  wordCountTarget: number;
}
```

## Review Workflow

### Content Status

```
draft → review → approved → published
         ↓
       rejected → draft (revision)
```

```typescript
const ContentStatusSchema = z.enum(['draft', 'review', 'approved', 'published']);
```

### Version Management

Every content change creates a version:

```typescript
const ContentVersionSchema = z.object({
  id: z.string().uuid(),
  contentId: z.string().uuid(),
  version: z.number().int().positive(),
  body: z.string(),
  createdAt: z.date(),
  source: z.enum(['generation', 'manual', 'revision']),
  analysis: ContentAnalysisSchema.optional(),
});
```

### Lock Points

Protect content from revision cascades:

```typescript
const LockPointSchema = z.object({
  id: z.string().uuid(),
  structureId: z.string().uuid(),
  reason: z.string(),
  createdAt: z.date(),
});
```

**Key rule**: Published content is immutable. Lock points prevent changes to approved-but-not-published content.

### Revision Cascade

When content changes, downstream content may need revision:

```typescript
interface CascadePreview {
  affectedStructures: string[];  // Structure IDs that would be invalidated
  blockedBy: LockPoint[];        // Lock points preventing cascade
  horizon: number;               // How far forward to cascade
}
```

## Analysis

### Tension Scoring

```typescript
const TensionAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  factors: z.array(z.object({
    factor: z.string(),
    contribution: z.number(),
  })),
  justification: z.string(),
});
```

Factors include: conflict level, stakes, pacing, emotional intensity, uncertainty.

### Continuity Checking

```typescript
const ContinuityCheckSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.object({
    severity: z.enum(['error', 'warning', 'info']),
    description: z.string(),
    establishedFact: z.string().optional(),
    conflictingContent: z.string().optional(),
    structureId: z.string().optional(),
  })),
});
```

### Pacing Assessment

```typescript
const PacingAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  actualTension: z.number(),
  targetTension: z.number(),
  divergence: z.number(), // Absolute difference
  suggestions: z.array(z.string()),
});
```

## Serial Features

### Hook Tracking

Track hook types across chapters to ensure variety:

```typescript
interface HookPattern {
  recentHooks: { chapterId: string; type: HookType }[];
  distribution: Record<HookType, number>;
  suggestions: string[]; // "Consider using a revelation hook"
}
```

### Tension Cycles

Web serials follow tension cycles:

```typescript
const TensionCycleSchema = z.object({
  length: z.number().int().positive(), // Chapters per cycle
  phases: z.array(z.object({
    name: z.string(),
    targetTension: z.number(),
    chapters: z.number(),
  })),
});

// Example: 5-chapter cycle
// Rising (2 chapters, 40-60) → Climax (1 chapter, 80+) → Falling (2 chapters, 30-50)
```

### Release Buffer

Track how far ahead content is written:

```typescript
interface ReleaseBuffer {
  scheduledReleases: number;       // Chapters ready to publish
  minimumBuffer: number;           // Target minimum
  daysUntilDepletion: number;      // At current release rate
  status: 'healthy' | 'warning' | 'critical';
}
```

### Mystery Tracking

For mysteries and foreshadowing:

```typescript
const MysterySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  layer: z.enum(['surface', 'intermediate', 'deep']),
  status: z.enum(['planted', 'developing', 'resolved']),
  clues: z.array(z.object({
    description: z.string(),
    structureId: z.string(),
  })),
  resolution: z.string().optional(),
  resolutionStructureId: z.string().optional(),
});
```

## CLI Commands

```bash
# Project management
serial project list
serial project create "My Web Serial" --format web-serial
serial project load <id>

# Bible management
serial bible character list
serial bible character create --name "Elena" --role protagonist
serial bible character update <id> --traits "brave,curious"
serial bible location create --name "Dragon Spire" --type building

# Structure
serial structure tree
serial structure create chapter --parent <arc-id> --title "The Awakening"
serial structure beats add <chapter-id> --summary "Elena discovers..." --tension 60
serial structure hook set <chapter-id> --type cliffhanger --description "..."

# Content
serial content get <structure-id>
serial content save <structure-id> --file chapter.md
serial content history <structure-id>

# Generation
serial generate start <chapter-id>
serial generate status
serial generate cancel

# Review
serial review queue
serial review approve <content-id>
serial review reject <content-id> --reason "Continuity issue"
serial review publish <content-id>
serial review lock <structure-id> --reason "Foreshadowing planted"

# Analysis
serial analyze tension <book-id>
serial analyze continuity <chapter-id>
serial analyze pacing <arc-id>

# Serial features
serial release buffer
serial release schedule
serial hooks analyze <book-id>
serial cycles status <book-id>
```

## MCP Tools

Tools follow the pattern `spine_{resource}_{action}`:

**Bible tools**: `spine_bible_character_create`, `spine_bible_location_list`, etc.

**Structure tools**: `spine_structure_tree`, `spine_structure_create`, `spine_structure_add_beat`

**Content tools**: `spine_content_get`, `spine_content_save`, `spine_content_history`

**Generation tools**: `spine_generate_start`, `spine_generate_status`

**Review tools**: `spine_review_queue`, `spine_review_approve`, `spine_review_lock`

**Analytics tools**: `spine_analytics_tension`, `spine_analytics_characters`

**Serial tools**: `spine_serial_buffer`, `spine_serial_hooks`, `spine_serial_mysteries`

## Key Principles

### Published Content is Immutable

Once content is published, it cannot be changed. This is enforced at the storage layer.

### Continuity is King

Every fact established in approved content becomes a constraint. The system tracks:
- Character states and locations
- Established world rules
- Timeline causality
- Relationship statuses

### Hooks End Every Chapter

Web serial readers expect compelling endings. The system tracks hook types and warns about repetition.

### Buffer is Life

Running out of content is a crisis. The release buffer is always visible and warnings trigger early.

### Author Authority

LLM suggestions require human approval. The system assists but never publishes without explicit author action.