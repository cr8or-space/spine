# Design Rationale

Documents key design decisions and their relationship to project goals.

## LLM integration

### Decision: OpenAI-compatible API

**Choice**: All LLM access goes through an OpenAI-compatible server interface.

**Rationale**:
- Supports local models (LM Studio, Ollama, vLLM) for prototyping and offline work
- Supports commercial APIs (OpenAI, Anthropic via proxy, etc.) for production quality
- Single interface reduces complexity
- Author controls model selection and cost

**Goal alignment**: Supports graceful degradation (swap models freely) and data ownership (local models keep data local).

### Decision: LLM-based quality judgment

**Choice**: Use LLM judgment for subjective analysis (voice consistency, tension scoring, hook strength) rather than heuristic metrics.

**Rationale**:
- Heuristics (word frequency, sentence length) don't capture narrative quality
- LLMs can explain their judgments, making analysis actionable
- Consistency with the generation model improves coherence
- Quality of judgment scales with model capability

**Goal alignment**: Supports explainable analysis—LLM can articulate why a passage feels off-voice or low-tension.

## Content management

### Decision: Immutable published content

**Choice**: Once content is marked as published, it cannot be modified within the system.

**Rationale**:
- Published content is a promise to readers
- Prevents accidental breaking of reader expectations
- Forces forward-compatible writing (work around established facts)
- Simplifies continuity tracking (published = ground truth)

**Goal alignment**: Directly supports continuity integrity. Published facts are constraints, not suggestions.

### Decision: Configurable revision horizon

**Choice**: Author specifies how far forward changes should propagate (e.g., 20 chapters, end of current book).

**Rationale**:
- Full cascade (invalidate everything after a change) is expensive and often unnecessary
- No cascade risks silent inconsistencies
- Author knows which future content is "soft" (can change) vs. "firm" (locked in mentally)
- Different projects have different needs

**Goal alignment**: Supports controlled revision scope. Author decides the blast radius.

### Decision: Lock points

**Choice**: Author can mark future content as locked, protecting it from revision cascades.

**Rationale**:
- Some future content is already committed (foreshadowing planted, promises made)
- Author may have written ahead and approved content
- Prevents accidental invalidation of planned payoffs
- Explicit > implicit

**Goal alignment**: Supports controlled revision scope and author authority.

## Storage

### Decision: SQLite + file system hybrid

**Choice**:
- SQLite for structured data (bible entries, metadata, analysis, relationships)
- File system for prose content (markdown files)

**Rationale**:
- SQLite: Fast queries across bible, relationships, timeline; ACID guarantees; single-file portability
- File system: Git-friendly diffs; human-readable without tools; standard editor compatibility
- Hybrid gets benefits of both without forcing everything into one paradigm

**Goal alignment**: Supports data ownership (portable, standard formats) and graceful degradation (content readable without the app).

### Decision: No automatic git commits

**Choice**: Git integration is manual. Author decides when to commit.

**Rationale**:
- Automatic commits create noise (every save, every generation attempt)
- Author's commit history should reflect meaningful milestones
- Timer-based auto-save to a separate branch is acceptable (recoverable, non-polluting)
- Git is optional—system works without it

**Goal alignment**: Supports author authority. Version control is a tool, not a requirement.

## Analysis

### Decision: Configurable bible extraction

**Choice**: Aggressiveness of automatic bible entry suggestions is author-configurable.

**Rationale**:
- Too aggressive: Noise, author ignores suggestions
- Too conservative: Missed entries, manual work
- Different authors have different tolerances
- Can tune based on project phase (more aggressive early, less later)

**Goal alignment**: Supports author authority and efficient review workflow.

### Decision: Dual tension curves

**Choice**: Display both planned tension (from outline) and actual tension (from LLM analysis) on the same visualization.

**Rationale**:
- Planned without actual: No feedback on whether execution matched intent
- Actual without planned: No reference point for whether pacing is correct
- Overlay shows divergence at a glance
- Enables targeted revision (fix chapters where lines diverge)

**Goal alignment**: Directly supports pacing visibility goal.

## Workflow

### Decision: Paragraph-level review granularity

**Choice**: Accept/reject/regenerate operates at paragraph level, not chapter or sentence.

**Rationale**:
- Chapter level: Too coarse, throws away good content with bad
- Sentence level: Too fine, review becomes tedious
- Paragraph is natural unit of thought in prose
- Matches how authors typically evaluate flow

**Goal alignment**: Supports efficient review workflow.

### Decision: Single-author scope

**Choice**: No multi-author, collaboration, or shared editing features.

**Rationale**:
- Collaboration adds significant complexity (conflict resolution, permissions, real-time sync)
- Primary use case is solo author with LLM assistance
- Can be revisited if demand emerges
- Simpler system is more reliable system

**Goal alignment**: Explicit non-goal. Keeps scope manageable.

## Serialization

### Decision: Hook type tracking

**Choice**: System tracks end-of-chapter hook types and enforces variety.

**Rationale**:
- Web serial readers expect compelling chapter endings
- Same hook type repeatedly becomes predictable
- Tracking enables author to see patterns
- Enforcement is optional but available

**Goal alignment**: Supports serialization discipline.

### Decision: Release buffer visibility

**Choice**: Dashboard prominently displays buffer status (chapters written vs. scheduled).

**Rationale**:
- Buffer depletion is an emergency in serial publishing
- Early warning enables course correction
- Visibility reduces anxiety (know where you stand)
- Integrates with deadline tracking

**Goal alignment**: Supports serialization discipline and efficient review workflow.
