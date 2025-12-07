# Design Rationale

Documents key design decisions and their relationship to project goals.

## Literate programming model

### Decision: Book as source, code as artifact

**Choice**: The manuscript is the sole source of truth. Tangled code files are generated artifacts, never edited directly.

**Rationale**:
- Eliminates sync problems entirely—there's only one thing to edit
- Forces explanations to exist for all code (can't have unexplained code)
- Version control operates on one artifact (the book), not two (book + repo)
- Generated code can be .gitignored; it's reproducible from source

**Goal alignment**: Directly supports single source of truth. The guarantee is structural, not procedural.

### Decision: Snippet-based assembly

**Choice**: Code is authored as named snippets embedded in prose. The tangler assembles snippets into files based on metadata.

**Rationale**:
- Snippets can appear in any order in the manuscript
- Same snippet can be shown multiple times (introduction, then modification)
- Metadata (file, part, operation) is explicit and tooling-friendly
- Granularity is flexible—a snippet can be one line or fifty

**Goal alignment**: Supports pedagogical ordering. Authors explain in reader order; the tool handles compiler order.

## Snippet operations

### Decision: Explicit evolution operations

**Choice**: Snippets declare their operation: `introduce`, `replace`, `append`, `prepend`, `delete`. No implicit overwrites.

**Rationale**:
- `introduce`: First appearance of this code part
- `replace`: Completely replaces previous version
- `append`/`prepend`: Adds to existing code (useful for growing functions)
- `delete`: Removes code (rare but necessary)
- Explicit operations make evolution reviewable and diffable
- Prevents accidental overwrites—author must state intent

**Goal alignment**: Supports evolution tracking. Every change is declared, not inferred.

### Decision: Named parts within files

**Choice**: Snippets target named parts (e.g., `file=parser.c part=parseExpression`), not line numbers or byte offsets.

**Rationale**:
- Line numbers are fragile—they shift as code grows
- Named parts are stable identifiers across chapters
- Parts can nest (a function contains parts for setup, core logic, cleanup)
- Enables surgical modifications without rewriting entire files

**Goal alignment**: Supports evolution tracking and pedagogical ordering. Parts are semantic, not positional.

## Checkpoints

### Decision: Explicit checkpoint declarations

**Choice**: Authors declare checkpoints in the manuscript. Each checkpoint names a validated state of the codebase.

**Rationale**:
- Not every chapter needs a checkpoint (some are purely explanatory)
- Checkpoint boundaries are authorial decisions, not automatic
- Checkpoints can span chapters or occur mid-chapter
- Named checkpoints are easier to reference than chapter numbers

**Goal alignment**: Supports checkpoints as contracts. The author decides what states matter.

### Decision: Checkpoints are cumulative snapshots

**Choice**: A checkpoint represents the complete codebase at that point—all snippets introduced so far, with all modifications applied.

**Rationale**:
- Readers should be able to check out any checkpoint and have working code
- No "partial" states that require mental assembly
- Diff between checkpoints shows exactly what changed
- Simplifies validation—tangle checkpoint N, run tests for checkpoint N

**Goal alignment**: Supports code validity and evolution tracking. Each checkpoint is self-contained.

### Decision: Checkpoint immutability after release

**Choice**: Once a checkpoint is marked "released," its behavior is frozen. Future changes cannot break earlier checkpoints.

**Rationale**:
- Readers working through the book depend on earlier checkpoints
- Breaking changes would invalidate their work-in-progress
- Forces forward-compatible evolution (extend, don't contradict)
- Mirrors how published content works in serialized fiction

**Goal alignment**: Supports checkpoints as contracts. Released checkpoints are promises to readers.

## Validation

### Decision: Automated, deterministic validation

**Choice**: Checkpoint validation is fully automated: tangle → compile → test → compare outputs. No human judgment required.

**Rationale**:
- "Does it work?" has a binary answer for code
- Automated validation catches regressions immediately
- Deterministic builds ensure reproducibility
- CI integration becomes straightforward

**Goal alignment**: Directly supports code validity and verified builds. Fail fast and loud.

### Decision: Expected outputs as fixtures

**Choice**: Authors commit expected outputs (test results, rendered images, benchmark numbers) alongside the manuscript. Validation compares actual against expected.

**Rationale**:
- "Correct" output isn't always defined by tests alone
- Ray tracing books need image comparison
- Performance-sensitive code needs benchmark validation
- Fixtures make expectations explicit and reviewable

**Goal alignment**: Supports code validity. The definition of "working" is captured, not assumed.

### Decision: Validation per checkpoint, not per snippet

**Choice**: Validation runs at checkpoint granularity, not after every snippet.

**Rationale**:
- Individual snippets may not compile in isolation
- Checkpoint is the unit of "working code"
- Finer granularity would be noisy and slow
- Authors can manually validate more frequently if needed

**Goal alignment**: Supports code validity without sacrificing author velocity.

## Concept tracking

### Decision: Explicit concept definitions

**Choice**: Authors define concepts (terms, types, algorithms) in a structured glossary. The system tracks where they're introduced and used.

**Rationale**:
- Technical books depend on precise terminology
- Forward references confuse readers
- Explicit definitions enable automated prerequisite checking
- Glossary can be rendered as an appendix or index

**Goal alignment**: Supports concept integrity. Prerequisites are enforced, not hoped for.

### Decision: Symbol-to-concept linking

**Choice**: Code symbols (function names, types, variables) link to concept definitions. The system warns if a symbol appears before its concept is introduced.

**Rationale**:
- Code and prose must agree on terminology
- Readers shouldn't encounter `Token` in code before learning what a token is
- Linking enables rich cross-references in rendered output
- Catches terminology drift (using different names for the same thing)

**Goal alignment**: Supports concept integrity and pedagogical ordering.

## Storage

### Decision: Markdown with structured frontmatter

**Choice**: Chapters are Markdown files. Metadata (checkpoint declarations, concept definitions) lives in YAML frontmatter or structured blocks.

**Rationale**:
- Markdown is portable, readable, editor-agnostic
- Frontmatter is standard practice, well-supported by tooling
- Authors can use any text editor
- Git diffs are meaningful
- No proprietary format lock-in

**Goal alignment**: Supports author velocity and single source of truth. The format is an implementation detail.

### Decision: Structured database for indexes

**Choice**: SQLite database stores derived data: snippet index, concept graph, checkpoint manifests, validation results.

**Rationale**:
- Fast queries across large manuscripts (which snippet defines part X?)
- Derived data is reproducible from source files
- Database is a cache, not the source of truth
- Single-file portability for the index

**Goal alignment**: Supports author velocity without compromising single source of truth.

### Decision: Generated code is ephemeral

**Choice**: Tangled output lives in a build directory, excluded from version control. Regenerated on every build.

**Rationale**:
- Generated code is deterministic—no need to store it
- Prevents temptation to edit generated files
- Keeps repository focused on source (the book)
- Build directory can be wiped without data loss

**Goal alignment**: Supports single source of truth. If it's generated, it's not source.

## Build system

### Decision: Language-agnostic tangler, language-specific validators

**Choice**: The tangler assembles files without understanding the target language. Validation plugins handle compilation and testing per language.

**Rationale**:
- Tangling is a text operation—no parsing required
- Validation requires language-specific toolchains
- Plugin architecture supports diverse targets (C, Python, Rust, etc.)
- Authors configure their build/test commands

**Goal alignment**: Supports code validity across different project types.

### Decision: Incremental tangling

**Choice**: The tangler tracks which snippets changed and regenerates only affected files.

**Rationale**:
- Full regeneration is slow for large books
- Incremental builds improve author feedback loop
- Change tracking is straightforward with snippet versioning
- Full rebuild remains available for validation

**Goal alignment**: Supports author velocity. Fast iteration enables better writing.

## Rendering

### Decision: Multiple output formats

**Choice**: The weaver produces HTML, PDF, and EPUB from the same source.

**Rationale**:
- Different readers prefer different formats
- Print books need PDF; online reading needs HTML; e-readers need EPUB
- Single source ensures consistency across formats
- Format-specific styling is a presentation concern, not a content concern

**Goal alignment**: Supports the book as source principle. Output format is a build target.

### Decision: Rich code presentation

**Choice**: Rendered output includes syntax highlighting, line annotations, diff highlighting for changes, and collapsible sections.

**Rationale**:
- Code presentation quality affects readability
- Showing "what changed" is crucial for progressive books
- Annotations can mark "new" vs. "context" lines
- Collapsible sections let readers focus on relevant code

**Goal alignment**: Supports show the evolution principle. Readers see the journey, not just the destination.

### Decision: Cross-reference generation

**Choice**: The weaver automatically generates cross-references: concept links, "defined in Chapter N," "modified in Chapter M," index entries.

**Rationale**:
- Manual cross-references are error-prone and tedious
- Readers need to navigate forward and backward
- Concept links enable glossary lookups
- Index generation is mechanical and should be automated

**Goal alignment**: Supports concept integrity and author velocity.

## Editor integration

### Decision: LSP support, not a custom IDE

**Choice**: Provide a Language Server Protocol implementation for editor features. Authors use their preferred editor.

**Rationale**:
- Authors have strong editor preferences
- LSP is supported by VS Code, Neovim, Emacs, Sublime, etc.
- Features: snippet completion, concept lookup, validation errors, preview
- We focus on the book tooling, not reinventing text editing

**Goal alignment**: Supports author velocity without imposing workflow constraints.

### Decision: Live preview

**Choice**: A preview server renders the current chapter in real-time, including tangled code state.

**Rationale**:
- Authors need to see how code will appear
- Preview shows assembled file state, not just individual snippets
- Catches presentation issues early
- Hot reload on save for fast feedback

**Goal alignment**: Supports author velocity. Write, preview, iterate.

## LLM assistance

### Decision: LLM for prose, not for validation

**Choice**: LLM assistance is available for drafting explanations, suggesting transitions, and reviewing clarity. LLMs never judge code correctness.

**Rationale**:
- Prose quality is subjective; LLMs can help
- Code correctness is objective; compilers are authoritative
- LLM suggestions require human review
- Keeps validation deterministic and trustworthy

**Goal alignment**: Supports verify, don't trust. Automation assists; it doesn't decide.

### Decision: Concept explanation generation

**Choice**: Given a code snippet, the system can draft explanatory prose using LLM assistance.

**Rationale**:
- Explaining code is time-consuming
- LLM drafts provide a starting point
- Author refines for voice and accuracy
- Particularly useful for boilerplate explanations

**Goal alignment**: Supports author velocity without compromising single source of truth. Generated prose is reviewed, not trusted.