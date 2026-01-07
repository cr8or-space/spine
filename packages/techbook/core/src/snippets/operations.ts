/**
 * Snippet operation application.
 *
 * This module handles applying snippet operations to build tangled files.
 * It processes snippets in order and assembles the final file content.
 */

import type {
  FileEvolution,
  FilePart,
  Snippet,
  SnippetHistoryEntry,
  TangleResult,
  TangledFile,
} from '@repo/techbook-types';

import { createPartManager, type PartError, type PartState } from './parts';

/**
 * Context for tangling operations
 */
export interface TangleContext {
  /** Snippets to process (should be in order) */
  snippets: Snippet[];
  /** Chapter order for sorting */
  chapterOrder: string[];
}

/**
 * Create a content hash for change detection
 */
function createContentHash(content: string): string {
  // Simple hash using string charCodes
  // In production, you'd use a proper hash function
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Process snippets and produce tangled files.
 *
 * This is the main entry point for tangling operations.
 */
export function tangleSnippets(context: TangleContext): TangleResult {
  const { snippets, chapterOrder } = context;

  // Sort snippets by chapter order and then by order within chapter
  const chapterIndex = new Map<string, number>();
  chapterOrder.forEach((id, idx) => chapterIndex.set(id, idx));

  const sortedSnippets = [...snippets].sort((a, b) => {
    const aChapter = chapterIndex.get(a.chapterId) ?? Infinity;
    const bChapter = chapterIndex.get(b.chapterId) ?? Infinity;

    if (aChapter !== bChapter) {
      return aChapter - bChapter;
    }
    return a.order - b.order;
  });

  // Group snippets by file
  const fileSnippets = new Map<string, Snippet[]>();
  for (const snippet of sortedSnippets) {
    const existing = fileSnippets.get(snippet.file) ?? [];
    existing.push(snippet);
    fileSnippets.set(snippet.file, existing);
  }

  // Process each file
  const files: TangledFile[] = [];
  const errors: { snippetId?: string; file?: string; message: string }[] = [];

  for (const [file, fileSnippetList] of fileSnippets) {
    const result = processFile(file, fileSnippetList);

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        errors.push({
          snippetId: error.snippetId,
          file: error.file,
          message: error.message,
        });
      }
    }

    // Only include file if it has content
    if (result.content.trim() !== '' || result.parts.length > 0) {
      files.push({
        path: file,
        content: result.content,
        parts: result.parts,
        sourceSnippetIds: result.sourceSnippetIds,
        contentHash: createContentHash(result.content),
      });
    }
  }

  return {
    success: errors.length === 0,
    files,
    errors,
    tangledAt: new Date().toISOString(),
  };
}

/**
 * Result of processing a single file
 */
interface ProcessFileResult {
  content: string;
  parts: FilePart[];
  sourceSnippetIds: string[];
  errors: PartError[];
}

/**
 * Process snippets for a single file
 */
function processFile(file: string, snippets: Snippet[]): ProcessFileResult {
  const manager = createPartManager(file);
  const sourceSnippetIds: string[] = [];

  // Apply each snippet in order
  for (const snippet of snippets) {
    const error = manager.applySnippet(snippet);
    if (!error) {
      sourceSnippetIds.push(snippet.id);
    }
  }

  // Get final content
  const content = manager.assemble();

  // Get part information
  const activeParts = manager.getActiveParts();
  const parts: FilePart[] = activeParts.map((p) => ({
    name: p.part.name,
    file: p.part.file,
    parentPart: p.part.parentPart,
  }));

  return {
    content,
    parts,
    sourceSnippetIds,
    errors: manager.getErrors(),
  };
}

/**
 * Get the evolution history for a file or part.
 *
 * Shows how a piece of code changed over time.
 */
export function getFileEvolution(
  file: string,
  snippets: Snippet[],
  part?: string
): FileEvolution {
  // Filter snippets for this file (and part if specified)
  const relevantSnippets = snippets.filter((s) => {
    if (s.file !== file) return false;
    if (part !== undefined && s.part !== part) return false;
    return true;
  });

  const history: SnippetHistoryEntry[] = relevantSnippets.map((s) => ({
    snippetId: s.id,
    chapterId: s.chapterId,
    operation: s.operation,
    description: s.name,
  }));

  return {
    file,
    part,
    history,
  };
}

/**
 * Validate that snippets can be applied successfully.
 *
 * Returns errors without actually modifying any state.
 */
export function validateSnippetSequence(
  file: string,
  snippets: Snippet[]
): PartError[] {
  const manager = createPartManager(file);

  for (const snippet of snippets) {
    manager.applySnippet(snippet);
  }

  return manager.getErrors();
}

/**
 * Get all files that would be affected by a snippet change.
 *
 * Useful for incremental tangling.
 */
export function getAffectedFiles(
  changedSnippetIds: Set<string>,
  allSnippets: Snippet[]
): string[] {
  const affectedFiles = new Set<string>();

  for (const snippet of allSnippets) {
    if (changedSnippetIds.has(snippet.id)) {
      affectedFiles.add(snippet.file);
    }
  }

  return Array.from(affectedFiles);
}

/**
 * Get the state of a file at a specific point in the snippet sequence.
 *
 * Useful for showing "what the code looked like at this point in the book."
 */
export function getFileStateAtSnippet(
  file: string,
  snippetId: string,
  allSnippets: Snippet[],
  chapterOrder: string[]
): ProcessFileResult | undefined {
  // Find the target snippet
  const targetSnippet = allSnippets.find((s) => s.id === snippetId);
  if (!targetSnippet) return undefined;

  // Sort snippets by order
  const chapterIndex = new Map<string, number>();
  chapterOrder.forEach((id, idx) => chapterIndex.set(id, idx));

  const targetChapterIdx = chapterIndex.get(targetSnippet.chapterId) ?? -1;
  if (targetChapterIdx === -1) return undefined;

  // Get all snippets up to and including this one
  const snippetsToApply = allSnippets
    .filter((s) => s.file === file)
    .filter((s) => {
      const chapterIdx = chapterIndex.get(s.chapterId) ?? Infinity;
      if (chapterIdx < targetChapterIdx) return true;
      if (chapterIdx === targetChapterIdx) return s.order <= targetSnippet.order;
      return false;
    })
    .sort((a, b) => {
      const aChapter = chapterIndex.get(a.chapterId) ?? 0;
      const bChapter = chapterIndex.get(b.chapterId) ?? 0;
      if (aChapter !== bChapter) return aChapter - bChapter;
      return a.order - b.order;
    });

  return processFile(file, snippetsToApply);
}

/**
 * Compute the diff between two states of a file.
 *
 * Returns line-based differences for display in the woven output.
 */
export interface LineDiff {
  type: 'add' | 'remove' | 'context';
  lineNumber: number;
  content: string;
}

export function computeLineDiff(oldContent: string, newContent: string): LineDiff[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diffs: LineDiff[] = [];

  // Simple line-by-line comparison
  // A real implementation would use a proper diff algorithm (Myers, patience, etc.)
  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      if (newLine !== undefined) {
        diffs.push({ type: 'context', lineNumber: i + 1, content: newLine });
      }
    } else {
      if (oldLine !== undefined) {
        diffs.push({ type: 'remove', lineNumber: i + 1, content: oldLine });
      }
      if (newLine !== undefined) {
        diffs.push({ type: 'add', lineNumber: i + 1, content: newLine });
      }
    }
  }

  return diffs;
}

/**
 * Check if a snippet operation would be valid.
 *
 * Returns undefined if valid, or an error message if invalid.
 */
export function validateSnippetOperation(
  snippet: Snippet,
  currentParts: Map<string, PartState>
): string | undefined {
  const { operation, part } = snippet;

  // File-level operations
  if (!part) {
    switch (operation) {
      case 'introduce':
        // Can always introduce a new file
        return undefined;
      case 'replace':
      case 'append':
      case 'prepend':
      case 'delete':
        // These are always valid for files
        return undefined;
    }
  }

  // Part-level operations
  const existingPart = currentParts.get(part);
  const partExists = existingPart && !existingPart.deleted;

  switch (operation) {
    case 'introduce':
      if (partExists) {
        return `Part "${part}" already exists`;
      }
      return undefined;

    case 'replace':
    case 'append':
    case 'prepend':
    case 'delete':
      if (!partExists) {
        return `Part "${part}" does not exist`;
      }
      return undefined;
  }
}

/**
 * Get statistics about snippet usage in a project.
 */
export interface SnippetStats {
  totalSnippets: number;
  byOperation: Record<string, number>;
  byLanguage: Record<string, number>;
  totalFiles: number;
  totalParts: number;
  averageSnippetsPerFile: number;
}

export function computeSnippetStats(snippets: Snippet[]): SnippetStats {
  const byOperation: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const files = new Set<string>();
  const parts = new Set<string>();

  for (const snippet of snippets) {
    // Count by operation
    byOperation[snippet.operation] = (byOperation[snippet.operation] ?? 0) + 1;

    // Count by language
    byLanguage[snippet.language] = (byLanguage[snippet.language] ?? 0) + 1;

    // Track files
    files.add(snippet.file);

    // Track parts
    if (snippet.part) {
      parts.add(`${snippet.file}:${snippet.part}`);
    }
  }

  return {
    totalSnippets: snippets.length,
    byOperation,
    byLanguage,
    totalFiles: files.size,
    totalParts: parts.size,
    averageSnippetsPerFile: files.size > 0 ? snippets.length / files.size : 0,
  };
}
