# Project Goals

High-level objectives that guide feature development and architectural decisions for a literate programming system designed for progressive-build technical books.

## Primary goal

Enable a single author to produce publication-quality technical books where working code is tangled (extracted) from prose, guaranteeing that explanations and implementation can never drift apart.

## Core objectives

### 1. Code validity

The system must guarantee that tangled code works at every checkpoint. This is not advisory—it's a build failure if it doesn't.

- Tangled code compiles without errors
- All tests pass at each checkpoint
- Expected outputs (images, REPL sessions, benchmarks) match
- No undefined references (every symbol is explained before use)

### 2. Pedagogical ordering

Authors explain concepts in the order readers need them, not the order files require them. The tool handles reassembly.

- Snippets can appear in any order in prose
- Tangler assembles files correctly regardless of explanation order
- Forward references are explicit and tracked
- File structure is an output, not an input

### 3. Evolution tracking

Code grows and changes across chapters. The system tracks how each snippet evolves and ensures consistency at every checkpoint.

- Snippets are versioned (introduced, modified, replaced, removed)
- Each checkpoint is a coherent snapshot of all code
- Changes between checkpoints are diffable and reviewable
- No silent overwrites—all modifications are explicit

### 4. Concept integrity

Technical concepts form a dependency graph. The system enforces that prerequisites precede dependents.

- Concepts are defined before they're used in explanation
- Code symbols are explained before they appear in snippets
- Circular dependencies are detected and flagged
- Glossary stays synchronized with actual usage

### 5. Single source of truth

The book is the codebase. There is no separate repository to maintain.

- All code lives in the manuscript
- Tangling produces files; those files are never edited directly
- Version control operates on the book, not generated code
- If it's not in the prose, it doesn't ship

### 6. Validated builds

Every checkpoint is tested automatically. Authors know immediately when something breaks.

- Tangle → compile → test → validate outputs
- Build failures pinpoint the problematic snippet
- Expected outputs are stored and compared
- CI integration for continuous validation

## Non-goals

### Not a general literate programming tool

This system is optimized for progressive-build books where code evolves chapter by chapter. Single-state literate programming (one final codebase) is a simpler problem with existing solutions (noweb, org-mode).

### Not an IDE

The system manages the manuscript and validates builds. Authors use their preferred text editor. We provide LSP support and preview, not a full development environment.

### Not multi-language by default

Each project targets a primary implementation language. Polyglot books (e.g., showing the same algorithm in Python and Rust) are out of scope for v1. The architecture shouldn't preclude this, but it's not a priority.

### Not a publishing platform

The system produces manuscripts and tangled code. Export to PDF, EPUB, HTML, and print-ready formats is a feature. Hosting, sales, and distribution are not.

### Not interactive/executable documentation

This is for books—linear, chapter-based, edited artifacts. Jupyter-style notebooks, REPLs, and live coding environments are different tools for different purposes.

## Success metrics

1. **Build validity rate**: 100% of checkpoints pass validation in CI
2. **Sync guarantee**: Zero instances where prose describes behavior that code doesn't exhibit
3. **Tangle correctness**: Generated files are byte-identical across runs (deterministic)
4. **Concept coverage**: Every code symbol has a corresponding explanation (measurable via tooling)
5. **Author velocity**: Time from "chapter drafted" to "chapter validated" under 5 minutes for typical chapters

## Guiding principles

### The book is the source

Generated code is an artifact, like a compiled binary. Never edit it directly. If the code is wrong, the book is wrong—fix the book.

### Fail fast and loud

Broken checkpoints should halt the build immediately. Silent failures that readers discover are unacceptable. The earlier a problem surfaces, the cheaper it is to fix.

### Pedagogical order is sacred

The reader's learning sequence matters more than the compiler's expectations. The tool adapts to the author's explanation order, not the other way around.

### Checkpoints are contracts

Once a checkpoint is "released" (readers depend on it), its behavior is frozen. Future chapters can extend but not contradict. This mirrors how published content works in serialized fiction.

### Show the evolution

Technical books aren't just about the final code—they're about the journey. The system should make it easy to show diffs, highlight additions, and narrate changes.

### Verify, don't trust

LLM assistance for drafting prose is useful. LLM judgment about whether code works is not. Validation is automated and deterministic. Compilers don't hallucinate.

## Glossary

**Tangle**: Extract runnable source files from the manuscript. The term comes from Knuth's original literate programming system.

**Weave**: Render the manuscript into readable output (HTML, PDF, etc.) with syntax highlighting, cross-references, and formatting.

**Checkpoint**: A named, validated state of the complete codebase at a point in the book. Chapter N ends at checkpoint N; the code must work at that checkpoint.

**Snippet**: A fragment of code embedded in prose. Snippets have metadata: which file they belong to, which part of that file, and what operation (introduce, replace, append, etc.).

**Progressive-build book**: A technical book where readers construct a working system chapter by chapter, with runnable code at each stage. "Crafting Interpreters," "Ray Tracing in One Weekend," and "Build Your Own X" books follow this pattern.