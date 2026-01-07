/**
 * Snippet management for TechBook domain.
 *
 * Provides:
 * - SnippetRepository: CRUD operations for snippets
 * - PartManager: Named part management within files
 * - Tangle operations: Assembling source files from snippets
 */

// Repository
export {
  createSnippetRepository,
  type SnippetRepository,
  type CreateSnippetData,
  type UpdateSnippetData,
  type ListSnippetsOptions,
} from './repository';

// Parts
export {
  createPartManager,
  parsePartName,
  getPartHierarchy,
  isChildPart,
  validatePartHierarchy,
  processSnippetsForFile,
  type PartManager,
  type PartState,
  type PartError,
  type FilePartsResult,
} from './parts';

// Operations
export {
  tangleSnippets,
  getFileEvolution,
  validateSnippetSequence,
  getAffectedFiles,
  getFileStateAtSnippet,
  computeLineDiff,
  validateSnippetOperation,
  computeSnippetStats,
  type TangleContext,
  type LineDiff,
  type SnippetStats,
} from './operations';
