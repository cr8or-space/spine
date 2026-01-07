/**
 * Weave module for TechBook domain.
 *
 * Weaving is the process of rendering the literate program (book prose)
 * into readable output formats. This module provides:
 *
 * - **Syntax**: Code syntax highlighting with language detection
 * - **Diffs**: Diff generation and marking between checkpoints
 * - **CrossRefs**: Cross-reference index building and validation
 * - **Renderer**: Content rendering pipeline for multiple output formats
 *
 * @example Basic code highlighting
 * ```typescript
 * import { highlight, toHtml } from '@repo/techbook-core';
 *
 * const result = highlight('const x = 1;', 'typescript');
 * const html = toHtml(result, { lineNumbers: true });
 * ```
 *
 * @example Rendering a book
 * ```typescript
 * import { createBookRenderer } from '@repo/techbook-core';
 *
 * const renderer = createBookRenderer('My Technical Book');
 * const book = renderer.renderBook(
 *   chapters,
 *   concepts,
 *   snippets,
 *   symbolLinks,
 *   checkpoints,
 *   tangledFiles,
 *   { format: 'html', showDiffs: true }
 * );
 * ```
 *
 * @example Generating diffs between checkpoints
 * ```typescript
 * import { diffCheckpoints, formatDiffHtml } from '@repo/techbook-core';
 *
 * const diff = diffCheckpoints(
 *   previousFiles,
 *   currentFiles,
 *   'checkpoint-01',
 *   'checkpoint-02'
 * );
 *
 * for (const fileDiff of diff.files) {
 *   console.log(formatDiffHtml(fileDiff));
 * }
 * ```
 *
 * @example Building cross-references
 * ```typescript
 * import {
 *   buildCrossReferenceIndex,
 *   generateGlossary,
 *   validateCrossReferences
 * } from '@repo/techbook-core';
 *
 * const index = buildCrossReferenceIndex(
 *   concepts,
 *   snippets,
 *   symbolLinks,
 *   checkpoints,
 *   tangledFiles,
 *   { chapters }
 * );
 *
 * const glossary = generateGlossary(concepts, index, chapters);
 * const issues = validateCrossReferences(index, concepts, snippets, symbolLinks, chapters);
 * ```
 */

// Syntax highlighting exports
export {
  // Main functions
  highlight,
  highlightSnippet,
  detectLanguage,
  getLanguageRules,
  // Output formatters
  toHtml,
  toAnsi,
  toPlainTextWithMarkers,
  // Analysis
  countTokensByType,
  getUniqueTokens,
  // Constants
  DEFAULT_LANGUAGE_MAPPINGS,
  DEFAULT_LANGUAGE_RULES,
  // Types
  type TokenType,
  type HighlightToken,
  type HighlightedLine,
  type HighlightResult,
  type LanguageMapping,
  type LanguageRules,
  type HtmlRenderOptions,
} from './syntax';

// Diff generation exports
export {
  // Core diff functions
  diffStrings,
  diffFiles,
  diffCheckpoints,
  markLines,
  getChangedSnippets,
  getDiffSummary,
  // Formatters
  formatUnifiedDiff,
  formatDiffHtml,
  formatDiffAnsi,
  // Types
  type LineChangeType,
  type DiffLine,
  type DiffHunk,
  type WeaveDiff,
  type CheckpointDiff,
  type DiffStats,
  type DiffOptions,
  type DiffFormatOptions,
  type MarkedLine,
  type DiffSummary,
} from './diffs';

// Cross-reference exports
export {
  // Index building
  buildCrossReferenceIndex,
  validateCrossReferences,
  // Generators
  generateGlossary,
  generateIndex,
  generateLinks,
  // Queries
  getFileHistory,
  getConceptChain,
  // Types
  type ConceptIntroduction,
  type ConceptUsage,
  type SymbolDefinition,
  type SymbolReference,
  type FileIndexEntry,
  type CheckpointIndexEntry,
  type CrossReferenceIndex,
  type CrossRefIssueType,
  type CrossRefIssue,
  type ChapterInfo,
  type CrossRefOptions,
  type GlossaryEntry,
  type IndexEntry,
  type FileHistory,
  type ConceptChain,
  type CrossRefLink,
} from './crossrefs';

// Renderer exports
export {
  // Factory
  createBookRenderer,
  // Standalone renderers
  renderFile,
  renderTableOfContents,
  // Types
  type OutputFormat,
  type ChapterContent,
  type Section,
  type RenderedSnippet,
  type RenderedChapter,
  type RenderedBook,
  type TocEntry,
  type BookMetadata,
  type RenderOptions,
  type BookRenderer,
  type FileRenderOptions,
} from './renderer';
