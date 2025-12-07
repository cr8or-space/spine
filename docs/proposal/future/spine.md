  Analysis: Preparing NovelGen for Future Spine Framework Extraction

  After reviewing all documents, I see a clear trajectory: NovelGen → Spine Framework → Multiple domain tools (TechBook, Interactive Fiction, API Docs, etc.). Here are concrete changes to make NovelGen easier to upgrade and
  extract from:

  1. Introduce Abstract Interfaces Now

  Your current implementation has NovelGen-specific types baked in. Add abstraction layers early:

  // packages/types - Add generic base interfaces
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

  // NovelGen types extend these
  interface Character extends BaseEntity {
    type: 'character';
    // character-specific fields
  }

  Why: Spine framework defines Entity, Content, Spine interfaces. If NovelGen already uses these abstractions, extraction is mechanical.

  ---
  2. Separate Storage Schema from Domain Logic

  Your rationale mentions SQLite + files hybrid. Ensure:

  - Core schema tables (entities, content, references, validation_results) are generic
  - Domain-specific tables (characters, locations, tension_scores) extend the core
  - Repository interfaces are generic with domain implementations

  // Generic repository interface (future @spine/storage)
  interface EntityRepository<T extends BaseEntity> {
    findById(id: string): Promise<T | null>;
    findByType(type: string): Promise<T[]>;
    save(entity: T): Promise<void>;
    delete(id: string): Promise<void>;
  }

  // NovelGen implementation
  class CharacterRepository implements EntityRepository<Character> {
    // ...
  }

  Why: The Spine rationale explicitly calls out "repository pattern for all data access" and "storage is an implementation detail."

  ---
  3. Formalize the Spine Abstraction

  Your Structure (Book → Arc → Chapter → Scene) is a tree spine. Make the interface explicit:

  // packages/types/spine.ts
  interface Spine<Node> {
    roots(): Node[];
    children(node: Node): Node[];
    linearize(): Node[];
    position(node: Node): number;
  }

  // NovelGen's structure is a TreeSpine
  interface StorySpine extends Spine<StoryNode> {
    books: Book[];
    currentBook(): Book;
    timeline(): TimelineEvent[];
  }

  Why: The Spine framework proposes LinearSpine, TreeSpine, DAGSpine, VersionedSpine. If your structure already implements Spine<Node>, it slots directly into the framework.

  ---
  4. Decouple Validation from Domain

  Your analysis modules (tension scoring, continuity checking) are domain-specific validators. Structure them as pluggable:

  // Generic validator interface (future @spine/validation)
  interface Validator<Context> {
    name: string;
    phase: 'structural' | 'automated' | 'computed';
    validate(context: Context): Promise<ValidationResult[]>;
  }

  // NovelGen validators
  class ContinuityValidator implements Validator<NovelGenContext> {
    phase = 'computed' as const;
    // uses LLM
  }

  class TimelineValidator implements Validator<NovelGenContext> {
    phase = 'structural' as const;
    // graph-based
  }

  Why: Spine framework has a three-phase validation pipeline (structural → automated → computed). If your validators already fit this model, they plug in directly.

  ---
  5. Adopt Result Types for Error Handling

  The tech stack research suggests neverthrow or effect-ts. This aligns with Spine's needs:

  import { Result, ok, err } from 'neverthrow';

  // Instead of throwing
  function analyzeContent(content: string): Result<ContentAnalysis, AnalysisError> {
    // ...
  }

  // Validation results are already Result-like
  type ConstraintResult =
    | { status: 'pass' }
    | { status: 'fail'; message: string; location: SpinePosition }
    | { status: 'warn'; message: string; location: SpinePosition };

  Why: LLM operations fail unpredictably. Explicit error handling makes the boundary between "worked" and "failed" clear—essential for a framework that orchestrates validators.

  ---
  6. Consider Drizzle ORM

  Your research suggests it. Benefits for future extraction:

  - Type-safe queries that match your schema
  - Schema-as-code makes migrations explicit
  - Easier to split "core schema" from "domain schema" later

  // Core tables (future @spine/storage)
  export const entities = sqliteTable('entities', {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    projectId: text('project_id').notNull(),
    introducedAt: text('introduced_at'),
    retiredAt: text('retired_at'),
  });

  // NovelGen extends with domain tables
  export const characters = sqliteTable('characters', {
    entityId: text('entity_id').references(() => entities.id),
    fullName: text('full_name'),
    // ...
  });

  ---
  7. Standardize Reference Extraction

  Your bible tracks cross-references. Make the extraction pluggable:

  // Reference extractor interface
  interface ReferenceExtractor<Content> {
    extract(content: Content): Reference[];
  }

  // NovelGen's prose extractor
  class ProseReferenceExtractor implements ReferenceExtractor<ProseContent> {
    extract(content: ProseContent): Reference[] {
      // Scan prose for entity names
    }
  }

  Why: TechBook needs code symbol extraction, Interactive Fiction needs variable references. Same mechanism, different extractors.

  ---
  8. Prepare for Multi-Format Rendering

  Your export phase (EPUB, Royal Road, plain text) is rendering. Structure it for Spine's two-stage model:

  // Stage 1: Content → Intermediate Representation
  interface ContentRenderer<C, IR> {
    render(content: C): IR;
  }

  // Stage 2: IR → Output Format
  interface FormatRenderer<IR, Output> {
    render(ir: IR): Output;
  }

  // NovelGen
  class ProseRenderer implements ContentRenderer<ProseContent, ProseIR> { }
  class EPUBRenderer implements FormatRenderer<BookIR, Buffer> { }

  ---
  9. Structure LLM Integration for Reuse

  Your @repo/llm package should separate:

  - Client infrastructure (retry, rate limiting, streaming) → future @spine/llm
  - Prompt templates → NovelGen-specific
  - Response parsing utilities → shared

  // Reusable (future @spine/llm)
  class LLMClient {
    chat(messages: Message[], options: ChatOptions): Promise<Response>;
    chatStreaming(messages: Message[], options: ChatOptions): AsyncIterable<Chunk>;
  }

  // Structured output support (per tech stack research)
  class StructuredLLMClient extends LLMClient {
    chatWithSchema<T>(messages: Message[], schema: ZodSchema<T>): Promise<T>;
  }

  // NovelGen-specific
  class TensionAnalyzer {
    constructor(private client: LLMClient) {}
    analyze(content: string): Promise<TensionScore> {
      // NovelGen-specific prompt
    }
  }

  ---
  10. Frontend: Adopt Bits UI for Accessibility

  Your research recommends Bits UI or Melt UI. Benefits:

  - Headless components handle accessibility edge cases
  - You control styling (matches your CSS custom properties approach)
  - Same components work across Spine domains (entity editors, validation panels)

  Action: Replace hand-rolled Dialog, Select, Tabs with Bits UI equivalents. Keep your Button, Card, TextField if they're simpler.

  ---
  11. Add Entity Lifecycle Tracking

  Spine framework requires introducedAt and retiredAt for entities. Add these now:

  interface Character {
    // existing fields...
    introducedAt?: string; // chapter/scene ID where first mentioned
    retiredAt?: string;    // chapter/scene ID where killed/removed (optional)
  }

  Why: Enables "entity used before introduced" validation and lifecycle visualization.

  ---
  12. Make Content Status Framework-Defined

  Your review workflow (draft → review → approved → published) matches Spine's proposal exactly. Ensure it's:

  - Defined in @repo/types as a shared enum
  - Used consistently across all content types
  - Has transitions that are explicit (not ad-hoc mutations)

  // packages/types/content.ts
  export type ContentStatus = 'draft' | 'review' | 'approved' | 'published';

  export const validTransitions: Record<ContentStatus, ContentStatus[]> = {
    draft: ['review'],
    review: ['draft', 'approved'],
    approved: ['published'],
    published: [], // immutable
  };

  ---
  Summary: Priority Changes

  | Priority | Change                                       | Effort | Impact on Future Extraction       |
  |----------|----------------------------------------------|--------|-----------------------------------|
  | High     | Add base interfaces (Entity, Content, Spine) | Low    | Extraction becomes mechanical     |
  | High     | Separate core vs. domain schema              | Medium | Clean split to @spine/storage     |
  | High     | Pluggable validators with phases             | Medium | Direct fit to validation pipeline |
  | Medium   | Result types for error handling              | Medium | Safer LLM integration             |
  | Medium   | Drizzle ORM adoption                         | Medium | Type-safe, extractable schema     |
  | Medium   | Bits UI for complex components               | Low    | Better accessibility, reusable    |
  | Low      | Two-stage rendering architecture             | Low    | Easy to defer until export phase  |
  | Low      | Entity lifecycle tracking                    | Low    | Small schema addition             |

  The key insight: Build NovelGen as if Spine already existed. Use generic interfaces, separate domain from infrastructure, and make extension points explicit. When extraction time comes, you'll be moving files and adjusting
  imports—not rewriting architecture.