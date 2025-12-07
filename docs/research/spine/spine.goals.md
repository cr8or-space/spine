# Spine Framework Goals

High-level objectives that guide framework design and determine what belongs in the shared core versus domain-specific layers.

## Primary goal

Provide a foundation for building domain-specific authoring tools where content must maintain internal consistency, track cross-references, evolve over time, and produce validated output—without reimplementing these capabilities for each domain.

## Core objectives

### 1. Structural consistency

The framework must provide primitives for tracking entities, references, and constraints that apply across domains.

- Entities have identity, properties, lifecycle, and relationships
- Content references entities; references are extracted and indexed automatically
- Constraints are declared, checked, and reported uniformly
- Cross-references are resolved for both validation and rendering

### 2. Spine abstraction

Different domains have different structural backbones, but they share common needs: ordering, traversal, checkpoints, snapshots.

- Linear spines (chapters in order)
- Hierarchical spines (book → part → chapter → section)
- Graph spines (nodes with conditional edges)
- Versioned spines (parallel timelines, branches)
- Domains compose or extend base implementations

### 3. Validation pipeline

All domains need to check constraints. The framework provides orchestration; domains provide validators.

- Phased execution (structural → automated → computed)
- Incremental validation (only check what changed)
- Uniform result reporting (pass/fail/warn with location and message)
- External tool integration (compilers, test runners, API clients)
- LLM integration for computed constraints

### 4. Render pipeline

All domains produce output in multiple formats. The framework handles cross-references, navigation, and format orchestration.

- Multiple output formats (HTML, PDF, EPUB, custom)
- Cross-reference resolution (links, "see also," indexes)
- Incremental rendering
- Domain-specific content renderers plug into shared pipeline

### 5. Storage consistency

All domains need persistent storage with similar characteristics: structured indexes, file-based content, queryable graphs.

- SQLite for indexes, entity registry, reference graph, validation results
- File system for authored content (diffable, editor-friendly)
- Derived data is rebuildable from source
- Single-project portability (one folder = one project)

### 6. Extension clarity

The boundary between framework and domain must be obvious. Domains should know exactly what they need to provide.

- Clear extension points (spine shape, entity types, content types, validators, renderers)
- Base implementations for common patterns
- Domain starter template
- Type safety across the boundary

## Non-goals

### Not a general-purpose CMS

Spine is for structured authoring with consistency constraints. General content management (blogs, marketing sites, wikis) has different needs and existing solutions.

### Not a collaborative editing platform

Single-author tools. Real-time collaboration, conflict resolution, and multi-user permissions are out of scope. Version control is external (git).

### Not a runtime

Spine produces artifacts (books, documentation, game data). It does not run interactive fiction or serve API documentation. Export to runtime platforms is a feature; being a runtime is not.

### Not infinitely flexible

The framework encodes opinions about how structured authoring works. Domains that don't fit the spine/entity/content/constraint model should use different tools.

### Not a UI framework

Spine provides components and patterns for authoring UIs. It does not replace React, Vue, or other UI frameworks. Domains build their interfaces using standard tools, composing Spine components where useful.

## Success metrics

1. **Extraction ratio**: >60% of code in a domain tool comes from the framework
2. **Second-domain velocity**: Building the second domain takes <50% of the time the first domain took
3. **Extension clarity**: A new domain can be prototyped (basic spine, one entity type, one content type, one validator) in a single day
4. **Zero framework forks**: Domains extend, they don't copy-paste-modify framework code
5. **Validation consistency**: All domains report validation results in the same format, viewable in the same UI

## Framework principles

### Extract, don't speculate

Build a real domain tool first. Extract the framework from working code. Abstractions discovered in practice are better than abstractions designed in theory.

### Composition over inheritance

Domains compose framework pieces; they don't inherit from deep hierarchies. Extension points are interfaces and registries, not base classes.

### Explicit extension points

Every place where domains plug in is documented and typed. No "override this protected method" patterns. If it's not an explicit extension point, domains can't depend on it.

### Domain logic stays in domains

The framework doesn't know what a "character" or "endpoint" or "snippet" is. It knows about entities, content, and constraints. Domains define their specific types and behaviors.

### Validation is not optional

Every domain must have validators. The framework makes validation easy to implement and impossible to skip. A domain with no constraints isn't using Spine correctly.

### Storage is an implementation detail

Domains interact with repositories and queries, not raw SQL or file paths. Storage implementation can evolve without breaking domains.

## Glossary

**Spine**: The structural backbone of a project. Determines ordering, hierarchy, and checkpoint boundaries. Domain-specific in shape, common in interface.

**Entity**: A thing that exists in the project world. Has identity, properties, lifecycle, and relationships. Domain defines entity types; framework provides registry and graph.

**Content**: Authored material. Hangs from spine nodes, references entities. Domain defines content types; framework provides storage and reference extraction.

**Constraint**: A rule that must hold. Checked by validators, reported uniformly. Can be structural (graph properties), automated (external tools), or computed (LLM).

**Validator**: Checks constraints, produces results. Domains provide validators; framework orchestrates execution and aggregates results.

**Renderer**: Produces output in a specific format. Domains provide content/entity renderers; framework handles cross-references and orchestration.

**Reference**: A link from content to an entity. Extracted automatically, indexed for queries, resolved during rendering.

**Checkpoint**: A named point in the spine where validation occurs and snapshots are taken. Domain determines checkpoint semantics.