# Spine: A Framework for Structured Authoring

A meta-framework for building domain-specific authoring tools where content must maintain internal consistency, track cross-references, and produce validated output.

## Observation

Several authoring domains share a common shape:

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

## Core Abstractions

### Spine

The structural backbone of the project. Domain-specific in shape, but common in purpose.

```typescript
interface Spine<Node, Edge> {
  // Structure
  nodes: Node[];
  edges: Edge[];
  
  // Traversal
  roots(): Node[];
  children(node: Node): Node[];
  path(from: Node, to: Node): Node[];
  
  // Ordering
  linearize(): Node[];  // Flatten to sequence
  position(node: Node): number;
  
  // Checkpoints
  checkpoints(): Checkpoint[];
  snapshotAt(checkpoint: Checkpoint): SpineSnapshot;
}
```

**Domain instantiations**:
- Fiction: Tree (Book → Arc → Chapter → Scene), linear ordering
- Technical book: Tree with explicit checkpoints
- Interactive fiction: Directed graph with multiple paths
- API docs: Hierarchical (Resource → Endpoint → Method) + version branches

### Entity

Things that exist in the project world. Have identity, properties, lifecycle, and relationships.

```typescript
interface Entity {
  id: string;
  type: EntityType;  // Domain-specific: Character, Concept, Variable, Endpoint...
  properties: Record<string, unknown>;
  
  // Lifecycle
  introducedAt: SpinePosition;
  retiredAt?: SpinePosition;
  
  // Relationships
  relationships: Relationship[];
}

interface Relationship {
  type: RelationshipType;  // Domain-specific: knows, requires, extends...
  target: EntityId;
  properties: Record<string, unknown>;
  validFrom?: SpinePosition;
  validUntil?: SpinePosition;
}
```

**Domain instantiations**:
- Fiction: Characters (with traits), locations, factions, world rules
- Technical book: Concepts, types, functions (with signatures)
- Interactive fiction: Characters, variables (with value ranges), items
- API docs: Types/schemas, endpoints, error codes

### Content

The authored material. Hangs from spine nodes, references entities.

```typescript
interface Content {
  id: string;
  type: ContentType;  // Domain-specific: Prose, Code, Dialogue, Example...
  body: string | StructuredBody;
  
  // Position
  spineNode: SpineNodeId;
  orderInNode: number;
  
  // Status
  status: ContentStatus;  // draft, review, approved, published
  
  // References (extracted automatically)
  references: Reference[];
}

interface Reference {
  entityId: EntityId;
  span: TextSpan;  // Where in the content
  type: ReferenceType;  // mention, definition, modification...
}
```

**Domain instantiations**:
- Fiction: Prose blocks with entity mentions
- Technical book: Prose blocks + code snippets (with file/part metadata)
- Interactive fiction: Dialogue nodes, choice branches, state updates
- API docs: Descriptions, parameter docs, code examples

### Constraint

Rules that must hold. Some are checkable automatically, some require computation (LLM), some are advisory.

```typescript
interface Constraint {
  id: string;
  type: ConstraintType;
  scope: ConstraintScope;  // global, per-checkpoint, per-node...
  
  // Evaluation
  check(context: ValidationContext): ConstraintResult;
}

type ConstraintResult = 
  | { status: 'pass' }
  | { status: 'fail', message: string, location: SpinePosition }
  | { status: 'warn', message: string, location: SpinePosition };

// Constraint categories
interface AutomatedConstraint extends Constraint {
  // Deterministic, fast: "code compiles", "all paths reachable"
}

interface ComputedConstraint extends Constraint {
  // LLM-based, slower: "voice is consistent", "explanation is clear"
  confidence: number;
  explanation: string;
}

interface StructuralConstraint extends Constraint {
  // Graph properties: "no orphan entities", "no forward references"
}
```

**Domain instantiations**:
- Fiction: No contradictions (computed), timeline consistency (structural)
- Technical book: Compiles (automated), concepts before use (structural)
- Interactive fiction: All nodes reachable (automated), no invalid states (automated)
- API docs: Examples run (automated), schemas match (automated)

### Reference Graph

Tracks all cross-references. Built automatically from content, queryable for validation and rendering.

```typescript
interface ReferenceGraph {
  // Queries
  referencesTo(entity: EntityId): Reference[];
  referencesFrom(content: ContentId): Reference[];
  firstMention(entity: EntityId): SpinePosition;
  
  // Validation helpers
  forwardReferences(): Reference[];  // Used before introduced
  orphanEntities(): Entity[];  // Never referenced
  
  // Rendering helpers
  crossReferences(entity: EntityId): CrossReference[];  // "See also..."
}
```

### Validation Pipeline

Orchestrates constraint checking. Extensible with domain-specific validators.

```typescript
interface ValidationPipeline {
  // Registration
  register(validator: Validator): void;
  
  // Execution
  validate(scope: ValidationScope): ValidationReport;
  validateIncremental(changes: Change[]): ValidationReport;
  
  // Results
  report: ValidationReport;
}

interface Validator {
  name: string;
  phase: ValidationPhase;  // structural, automated, computed
  constraints: Constraint[];
  
  validate(context: ValidationContext): ConstraintResult[];
}
```

**Phase ordering**:
1. Structural (fast, graph-based): reference integrity, prerequisite order
2. Automated (deterministic): compile, run tests, execute examples
3. Computed (LLM): quality judgments, consistency checks

### Renderer

Produces output in multiple formats. Cross-references resolved automatically.

```typescript
interface Renderer<Output> {
  // Configuration
  format: OutputFormat;
  options: RenderOptions;
  
  // Rendering
  render(project: Project): Output;
  renderIncremental(project: Project, changes: Change[]): Output;
  
  // Extensibility
  registerContentRenderer(type: ContentType, renderer: ContentRenderer): void;
  registerEntityRenderer(type: EntityType, renderer: EntityRenderer): void;
}
```

## Framework Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Domain Layer                            │
│  (Spine, TechBook, InteractiveFiction, APIDocs, etc.)       │
├─────────────────────────────────────────────────────────────────┤
│                        Spine Framework                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │   Spine   │ │  Entity   │ │  Content  │ │ Reference │       │
│  │  Manager  │ │  Registry │ │  Store    │ │   Graph   │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                     │
│  │Validation │ │  Render   │ │    LLM    │                     │
│  │ Pipeline  │ │  Pipeline │ │  Services │                     │
│  └───────────┘ └───────────┘ └───────────┘                     │
├─────────────────────────────────────────────────────────────────┤
│                        Storage Layer                            │
│         SQLite (indexes, graphs) + Files (content)             │
├─────────────────────────────────────────────────────────────────┤
│                          UI Shell                               │
│      (Shared components, layouts, patterns)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Domain Specialization Points

Each domain provides:

### 1. Spine Shape

```typescript
// Fiction: Linear with hierarchy
interface FictionSpine extends Spine<StoryNode, ContainsEdge> {
  books: Book[];
  currentBook(): Book;
  timeline(): TimelineEvent[];
}

// Interactive Fiction: State graph
interface IFSpine extends Spine<SceneNode, TransitionEdge> {
  startNode: SceneNode;
  endNodes: SceneNode[];
  variables: Variable[];
  pathsThrough(): Path[];
}

// API Docs: Versioned hierarchy
interface APISpine extends Spine<ResourceNode, ContainsEdge> {
  versions: Version[];
  currentVersion(): Version;
  changelog(from: Version, to: Version): Change[];
}
```

### 2. Entity Types

```typescript
// Fiction
type FictionEntityType = 'character' | 'location' | 'faction' | 'worldRule' | 'plotThread';

// Interactive Fiction  
type IFEntityType = 'character' | 'variable' | 'item' | 'flag' | 'counter';

// API Docs
type APIEntityType = 'type' | 'endpoint' | 'parameter' | 'errorCode' | 'example';
```

### 3. Content Types

```typescript
// Fiction
type FictionContentType = 'prose' | 'note' | 'outline';

// Technical Book
type TechBookContentType = 'prose' | 'snippet' | 'exercise' | 'aside';

// Interactive Fiction
type IFContentType = 'narration' | 'dialogue' | 'choice' | 'stateUpdate' | 'condition';

// API Docs
type APIContentType = 'description' | 'parameter' | 'example' | 'guide';
```

### 4. Validators

```typescript
// Fiction
class ContinuityValidator implements Validator { /* LLM-based */ }
class TimelineValidator implements Validator { /* structural */ }

// Technical Book
class CompileValidator implements Validator { /* automated, external */ }
class ConceptOrderValidator implements Validator { /* structural */ }

// Interactive Fiction
class ReachabilityValidator implements Validator { /* automated, graph */ }
class StateConsistencyValidator implements Validator { /* automated */ }

// API Docs
class ExampleValidator implements Validator { /* automated, external */ }
class SchemaValidator implements Validator { /* automated */ }
```

### 5. Renderers

Each domain provides content renderers for its types:

```typescript
// Technical Book: Code snippets with diff highlighting
class SnippetRenderer implements ContentRenderer<Snippet> {
  render(snippet: Snippet, context: RenderContext): RenderedContent;
  renderDiff(before: Snippet, after: Snippet): RenderedContent;
}

// Interactive Fiction: Choice trees
class ChoiceRenderer implements ContentRenderer<Choice> {
  render(choice: Choice, context: RenderContext): RenderedContent;
}
```

## What the Framework Provides

### Core packages (domain-agnostic)

- `@spine/types` — Base interfaces, common types
- `@spine/storage` — SQLite + file hybrid, migrations
- `@spine/graph` — Reference graph, traversal, queries
- `@spine/validation` — Pipeline orchestration, result aggregation
- `@spine/render` — Base renderer, cross-reference resolution
- `@spine/llm` — LLM client, prompt utilities, computed constraints
- `@spine/ui` — Shared components (editors, graphs, status indicators)
- `@spine/cli` — CLI framework, common commands
- `@spine/lsp` — LSP base, common features

### What domains add

- Spine implementation (shape, traversal)
- Entity type definitions and schemas
- Content type definitions and parsers
- Domain-specific validators
- Domain-specific renderers
- Custom UI components
- Custom CLI commands

## Implementation Strategy

### Phase 1: Extract from TechBook

Build the technical book tool first (it's well-defined), then extract common pieces into the framework.

1. Build `packages/core/*` for TechBook
2. Identify which pieces are domain-specific vs. generic
3. Extract generic pieces to `@spine/*`
4. Refactor TechBook to use framework

### Phase 2: Validate with Second Domain

Build Interactive Fiction or API Docs on the framework.

1. Implement domain layer only
2. Find gaps in framework
3. Iterate on abstractions
4. Extract more commonality

### Phase 3: Stabilize Framework

Once two domains work well:

1. Document extension points
2. Create domain starter template
3. Build remaining domains

## Open Questions

### Spine flexibility vs. simplicity

Linear (fiction), tree (techbook), DAG (interactive fiction), versioned (API docs)—can one abstraction serve all, or do we need a small taxonomy?

**Proposal**: Provide base implementations for common shapes (Linear, Tree, DAG), let domains compose or extend.

### Storage: shared or separate?

Should all domains use identical storage, or can domains customize?

**Proposal**: Shared schema for core tables (entities, content, references), domain-specific tables for specialized data.

### UI: shared shell or domain-specific?

How much UI is common? Entity editors, graph visualizers, and validation panels are similar across domains. Writing interfaces differ.

**Proposal**: Shared shell (navigation, status, settings), domain provides workspace components.

### Validation: how much is extractable?

Structural validation (graphs, references) is very generic. Automated validation (compile, run) varies wildly. Computed validation (LLM) shares infrastructure but not prompts.

**Proposal**: Framework provides orchestration and structural validators. Domains provide automated and computed validators, but can use shared LLM utilities.

## Next Steps

1. Draft TechBook goals/rationale/plan (done)
2. Build TechBook Phase 1-2 with framework extraction in mind
3. Document which pieces feel generic during development
4. Extract framework once patterns stabilize
5. Build second domain to validate

## Related Documents

- [Spine Goals](./spine/goals.md)
- [Spine Rationale](./spine/rationale.md)
- [TechBook Goals](./techbook/goals.md)
- [TechBook Rationale](./techbook/rationale.md)
- [TechBook Plan](./techbook/plan.md)