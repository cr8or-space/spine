# Spine Framework Design Rationale

Documents key design decisions and their relationship to framework goals.

## Extraction strategy

### Decision: Build first, extract second

**Choice**: Build a complete domain tool (TechBook) first, then extract the framework from working code.

**Rationale**:
- Speculative abstractions often miss real needs
- Working code reveals which pieces are truly generic
- Extraction preserves battle-tested implementations
- Avoids over-engineering before requirements are known
- Second domain (Interactive Fiction or API Docs) validates the extraction

**Goal alignment**: Supports extract, don't speculate principle. Framework emerges from practice.

### Decision: Two-domain validation

**Choice**: Framework is not "done" until two domains build successfully on it.

**Rationale**:
- One domain can't distinguish generic from specific
- Second domain reveals hidden assumptions baked into framework
- Forces extension points to actually be extensible
- Catches over-fitting to first domain's needs

**Goal alignment**: Supports second-domain velocity metric. If the second domain is hard, the framework failed.

## Spine abstraction

### Decision: Taxonomy of base spines, not one universal abstraction

**Choice**: Provide base implementations for common shapes (Linear, Tree, DAG, Versioned). Domains extend or compose these.

**Rationale**:
- Universal graph abstraction is too abstract to be useful
- Linear spine (fiction) needs different operations than DAG spine (interactive fiction)
- Base implementations provide sensible defaults
- Domains can compose (e.g., versioned tree for API docs)
- Escape hatch: implement Spine interface directly for unusual shapes

**Goal alignment**: Supports spine abstraction goal. Common patterns are easy; unusual patterns are possible.

**Base implementations**:
- `LinearSpine<Node>`: Ordered sequence with optional grouping
- `TreeSpine<Node>`: Hierarchical, single parent per node
- `DAGSpine<Node, Edge>`: Directed acyclic graph with typed edges
- `VersionedSpine<S extends Spine>`: Wraps another spine with version/branch support

### Decision: Spine determines checkpoint semantics

**Choice**: The spine interface includes checkpoint operations, but domains define what checkpoints mean.

**Rationale**:
- Fiction: Checkpoints might be "end of chapter" or "publication boundary"
- TechBook: Checkpoints are "code compiles and tests pass"
- Interactive Fiction: Checkpoints might be "all paths to this node validated"
- Framework provides mechanism; domain provides meaning

**Goal alignment**: Supports extension clarity. Checkpoint is a framework concept with domain-specific semantics.

## Entity system

### Decision: Entity registry with type discrimination

**Choice**: Framework provides a generic entity registry. Domains register entity types with schemas.

**Rationale**:
- All domains have entities; specific types vary
- Registry provides CRUD, search, lifecycle tracking
- Type discrimination enables domain-specific validation
- Schemas enable UI generation and validation
- Relationships are first-class, not bolted on

**Goal alignment**: Supports structural consistency and domain logic stays in domains.

### Decision: Relationships are time-aware

**Choice**: Relationships have optional `validFrom` and `validUntil` spine positions.

**Rationale**:
- Fiction: "Alice and Bob are married" might only be true for part of the story
- Interactive Fiction: Relationships change based on player choices
- API Docs: Endpoints are added and deprecated across versions
- Time-unaware relationships are a special case (valid always)

**Goal alignment**: Supports structural consistency across domains with temporal dynamics.

### Decision: Entity lifecycle is explicit

**Choice**: Entities have `introducedAt` and optional `retiredAt` spine positions.

**Rationale**:
- Enables "entity used before introduced" validation
- Enables "entity used after retired" validation
- Supports evolution tracking (when did this appear?)
- Rendering can show lifecycle (introduced in Chapter 3, removed in Chapter 12)

**Goal alignment**: Supports validation pipeline. Lifecycle violations are structural constraints.

## Content system

### Decision: Content is typed, body is flexible

**Choice**: Content has a framework-defined wrapper (id, type, spine position, status, references) with a domain-defined body.

**Rationale**:
- Framework needs to track content uniformly (for indexing, status, references)
- Body structure varies wildly (prose, code snippets, dialogue trees, API examples)
- Type discrimination enables domain-specific rendering
- References are extracted from body by domain-specific extractors

**Goal alignment**: Supports structural consistency while allowing domain flexibility.

### Decision: Reference extraction is domain-provided

**Choice**: Framework defines Reference type; domains provide extractors that find references in content bodies.

**Rationale**:
- Fiction: Scan prose for entity names
- TechBook: Parse code for symbol references
- Interactive Fiction: Examine state updates for variable references
- API Docs: Parse examples for endpoint/type references
- Extraction logic is inherently domain-specific

**Goal alignment**: Supports domain logic stays in domains. Framework stores and queries; domains extract.

### Decision: Content status is framework-defined

**Choice**: All content moves through common statuses: draft → review → approved → published.

**Rationale**:
- Status workflow is similar across domains
- Framework can provide status-based filtering and UI
- Validation can be status-aware (only validate approved content)
- Domains can extend with sub-statuses if needed

**Goal alignment**: Supports structural consistency. Status is a solved problem; don't re-solve it per domain.

## Validation system

### Decision: Three-phase validation

**Choice**: Validation runs in phases: structural → automated → computed. Each phase completes before the next begins.

**Rationale**:
- Structural checks are fast (graph queries); run first
- Automated checks may invoke external tools; run second
- Computed checks use LLM (slow, costly); run last
- Early phases catch issues before expensive phases run
- Phases can be run selectively (e.g., structural only for quick feedback)

**Goal alignment**: Supports validation pipeline. Fast feedback where possible, thorough checking when needed.

### Decision: Validators are registered, not inherited

**Choice**: Domains register validator instances with the pipeline. No base validator class to inherit from.

**Rationale**:
- Registration is explicit and discoverable
- Multiple validators of same type are easy (several structural validators)
- No dependency on framework internals
- Testing validators is straightforward (no framework setup required)

**Goal alignment**: Supports composition over inheritance and explicit extension points.

### Decision: Validation results are uniform

**Choice**: All validators return the same result type: pass/fail/warn with message, location, and optional fix suggestion.

**Rationale**:
- UI can display results uniformly
- Aggregation is straightforward (count failures, list warnings)
- Location enables jump-to-source
- Fix suggestions enable semi-automated remediation
- Domains don't reinvent result reporting

**Goal alignment**: Supports validation consistency metric. Same UI shows all validation results.

### Decision: External tool integration is first-class

**Choice**: Framework provides utilities for invoking external tools (compilers, test runners, API clients) and capturing results.

**Rationale**:
- TechBook needs compilers and test runners
- API Docs needs HTTP clients
- Common patterns: invoke, capture stdout/stderr, parse exit code, timeout handling
- Framework utilities reduce boilerplate in domain validators

**Goal alignment**: Supports validation pipeline. External tools are validators, not special cases.

### Decision: LLM constraints use shared infrastructure

**Choice**: Framework provides LLM client and prompt utilities. Domains define prompts and interpret responses.

**Rationale**:
- LLM configuration (endpoint, model, API key) is project-level
- Retry logic, rate limiting, error handling are common
- Prompt construction patterns are reusable
- Response parsing (extract judgment, confidence, explanation) is similar
- Domain provides the actual prompt and evaluation logic

**Goal alignment**: Supports validation pipeline. LLM is a tool; domains decide how to use it.

## Render system

### Decision: Two-stage rendering

**Choice**: Rendering happens in two stages: content → intermediate representation → output format.

**Rationale**:
- IR captures structure without format-specific details
- Cross-reference resolution happens in IR
- Multiple output formats share the first stage
- Domain renderers produce IR; format renderers consume it

**Goal alignment**: Supports render pipeline. Add new formats without touching domain code.

### Decision: Cross-references are automatic

**Choice**: Framework resolves cross-references (entity links, "defined in X", "modified in Y") based on reference graph.

**Rationale**:
- Manual cross-references are tedious and error-prone
- Reference graph already exists (from validation)
- Resolution rules are similar across domains
- Domains can customize presentation but not mechanics

**Goal alignment**: Supports structural consistency. Cross-references are a framework feature.

### Decision: Domains provide content renderers

**Choice**: Each domain registers renderers for its content types. Framework orchestrates and handles cross-cutting concerns.

**Rationale**:
- Prose rendering differs from code snippet rendering differs from dialogue rendering
- Domain knows how its content should appear
- Framework handles navigation, TOC, cross-references, format-specific wrappers
- Clear boundary: domain renders content blocks; framework assembles documents

**Goal alignment**: Supports explicit extension points and domain logic stays in domains.

## Storage system

### Decision: SQLite + files hybrid

**Choice**: SQLite for structured data (entities, references, validation results); file system for content (Markdown, etc.).

**Rationale**:
- SQLite: Fast queries, ACID guarantees, single-file portability
- Files: Git-friendly diffs, human-readable, standard editor support
- Hybrid gets benefits of both
- Derived data (indexes, graphs) lives in SQLite, rebuilt from files on demand

**Goal alignment**: Supports storage consistency. Same storage patterns across domains.

### Decision: Repository pattern for all data access

**Choice**: Domains interact with repositories (EntityRepository, ContentRepository, etc.), never raw storage.

**Rationale**:
- Abstracts storage implementation
- Enables caching, lazy loading, change tracking
- Testing with in-memory repositories is easy
- Storage migrations don't break domain code

**Goal alignment**: Supports storage is an implementation detail.

### Decision: Index is derived, not source

**Choice**: SQLite indexes are built from source files. Corruption or loss is recoverable by rebuild.

**Rationale**:
- Single source of truth (files) is easier to reason about
- Rebuild is always safe; no desync possible
- Index can be .gitignored
- Upgrade path: delete index, rebuild with new schema

**Goal alignment**: Supports storage consistency and single-project portability.

## UI system

### Decision: Shell + workspace pattern

**Choice**: Framework provides shell (navigation, status bar, settings); domains provide workspace (main authoring interface).

**Rationale**:
- Navigation, project switching, validation status are similar across domains
- Authoring interface differs wildly (prose editor vs. code editor vs. graph editor)
- Shell provides consistent chrome; workspace is the domain's canvas
- Domains can use framework components in workspace (entity editors, graph views)

**Goal alignment**: Supports extension clarity. Shell is framework; workspace is domain.

### Decision: Component library, not component framework

**Choice**: Framework provides React components for common patterns. Domains compose them freely.

**Rationale**:
- Entity editor, validation panel, reference list, graph viewer are reusable
- Domains may need to customize or extend
- Components are building blocks, not constraints
- No lock-in to framework's UI opinions beyond what domains choose to use

**Goal alignment**: Supports not a UI framework. Components help; they don't constrain.

### Decision: LSP base with domain extensions

**Choice**: Framework provides LSP server infrastructure. Domains register handlers for domain-specific features.

**Rationale**:
- Diagnostics, completions, hover info are universal needs
- Specific completions (entity names, snippet parts) are domain-specific
- Framework handles protocol; domains handle content
- Single LSP server per project, regardless of domain

**Goal alignment**: Supports extraction ratio metric. LSP is framework; handlers are domain.

## Extension model

### Decision: Registry-based extension

**Choice**: All extension points are registries. Domains register implementations at startup.

**Rationale**:
- Explicit: All extensions are visible in one place
- Typed: Registrations are type-checked
- Testable: Mock registrations for testing
- No magic: No convention-over-configuration discovery

**Goal alignment**: Supports explicit extension points and zero framework forks.

### Decision: Extension points are interfaces

**Choice**: Extension points are TypeScript interfaces. Domains implement interfaces; framework consumes implementations.

**Rationale**:
- Type safety across boundary
- IDE support (autocomplete, error checking)
- Documentation via types
- No runtime reflection or string-based lookup

**Goal alignment**: Supports extension clarity and composition over inheritance.

### Decision: Domain starter template

**Choice**: Provide a template project that demonstrates all extension points with minimal implementations.

**Rationale**:
- Learning by example
- Copy-paste starting point
- Ensures extension points are actually usable
- Template is tested as part of framework CI

**Goal alignment**: Supports extension clarity metric. New domain in a day.