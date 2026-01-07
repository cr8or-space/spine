/**
 * File assembly from snippets.
 *
 * The assembler is responsible for taking a collection of snippets
 * and producing the final tangled files. It handles:
 * - Sorting snippets by chapter and order
 * - Grouping snippets by target file
 * - Applying operations in sequence
 * - Producing final file contents with part metadata
 */

import type { Checkpoint, Snippet, TangledFile, TangleResult } from '@repo/techbook-types';

import { createPartManager, type PartError } from '../snippets/parts';

/**
 * Options for the tangle assembler
 */
export interface AssemblerOptions {
  /** Chapter IDs in order (for sorting snippets) */
  chapterOrder: string[];
  /** Optional checkpoint to tangle up to (uses all snippets if not specified) */
  checkpoint?: Checkpoint;
}

/**
 * Context for a single file being assembled
 */
export interface FileAssemblyContext {
  /** File path */
  file: string;
  /** Snippets targeting this file (in order) */
  snippets: Snippet[];
}

/**
 * Result of assembling a single file
 */
export interface FileAssemblyResult {
  /** Whether assembly succeeded */
  success: boolean;
  /** The tangled file (if successful) */
  file?: TangledFile;
  /** Errors encountered */
  errors: PartError[];
}

/**
 * Create a content hash for change detection.
 *
 * Uses a simple string hash for speed. For production use cases
 * requiring collision resistance, replace with crypto hash.
 */
export function createContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Sort snippets by chapter order and order within chapter
 */
export function sortSnippets(snippets: Snippet[], chapterOrder: string[]): Snippet[] {
  const chapterIndex = new Map<string, number>();
  chapterOrder.forEach((id, idx) => chapterIndex.set(id, idx));

  return [...snippets].sort((a, b) => {
    const aChapter = chapterIndex.get(a.chapterId) ?? Infinity;
    const bChapter = chapterIndex.get(b.chapterId) ?? Infinity;

    if (aChapter !== bChapter) {
      return aChapter - bChapter;
    }
    return a.order - b.order;
  });
}

/**
 * Group snippets by target file
 */
export function groupSnippetsByFile(snippets: Snippet[]): Map<string, Snippet[]> {
  const groups = new Map<string, Snippet[]>();

  for (const snippet of snippets) {
    const existing = groups.get(snippet.file) ?? [];
    existing.push(snippet);
    groups.set(snippet.file, existing);
  }

  return groups;
}

/**
 * Filter snippets up to a checkpoint.
 *
 * Returns only snippets that appear before or in the checkpoint's chapter.
 */
export function filterSnippetsToCheckpoint(
  snippets: Snippet[],
  checkpoint: Checkpoint,
  chapterOrder: string[]
): Snippet[] {
  const chapterIndex = new Map<string, number>();
  chapterOrder.forEach((id, idx) => chapterIndex.set(id, idx));

  const checkpointChapterIdx = chapterIndex.get(checkpoint.chapterId);
  if (checkpointChapterIdx === undefined) {
    // Checkpoint chapter not in order - include all snippets
    return snippets;
  }

  return snippets.filter((snippet) => {
    const snippetChapterIdx = chapterIndex.get(snippet.chapterId);
    if (snippetChapterIdx === undefined) {
      // Snippet chapter not in order - exclude it
      return false;
    }
    return snippetChapterIdx <= checkpointChapterIdx;
  });
}

/**
 * Assemble a single file from its snippets.
 */
export function assembleFile(context: FileAssemblyContext): FileAssemblyResult {
  const { file, snippets } = context;
  const manager = createPartManager(file);
  const sourceSnippetIds: string[] = [];

  // Apply each snippet in order
  for (const snippet of snippets) {
    const error = manager.applySnippet(snippet);
    if (!error) {
      sourceSnippetIds.push(snippet.id);
    }
  }

  const errors = manager.getErrors();
  const content = manager.assemble();

  // Only include file if it has content
  if (content.trim() === '' && manager.getActiveParts().length === 0) {
    return {
      success: errors.length === 0,
      errors,
    };
  }

  const activeParts = manager.getActiveParts();
  const tangledFile: TangledFile = {
    path: file,
    content,
    parts: activeParts.map((p) => ({
      name: p.part.name,
      file: p.part.file,
      parentPart: p.part.parentPart,
    })),
    sourceSnippetIds,
    contentHash: createContentHash(content),
  };

  return {
    success: errors.length === 0,
    file: tangledFile,
    errors,
  };
}

/**
 * Main assembler function.
 *
 * Takes a collection of snippets and produces tangled files.
 */
export function assemble(snippets: Snippet[], options: AssemblerOptions): TangleResult {
  const { chapterOrder, checkpoint } = options;

  // Sort snippets
  let sortedSnippets = sortSnippets(snippets, chapterOrder);

  // Filter to checkpoint if specified
  if (checkpoint) {
    sortedSnippets = filterSnippetsToCheckpoint(sortedSnippets, checkpoint, chapterOrder);
  }

  // Group by file
  const fileGroups = groupSnippetsByFile(sortedSnippets);

  // Assemble each file
  const files: TangledFile[] = [];
  const errors: { snippetId?: string; file?: string; message: string }[] = [];

  for (const [file, fileSnippets] of fileGroups) {
    const result = assembleFile({ file, snippets: fileSnippets });

    for (const error of result.errors) {
      errors.push({
        snippetId: error.snippetId,
        file: error.file,
        message: error.message,
      });
    }

    if (result.file) {
      files.push(result.file);
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
 * Assemble files for a specific checkpoint.
 *
 * Convenience function that combines filtering and assembly.
 */
export function assembleForCheckpoint(
  snippets: Snippet[],
  checkpoint: Checkpoint,
  chapterOrder: string[]
): TangleResult {
  return assemble(snippets, { chapterOrder, checkpoint });
}

/**
 * Get the list of files that would be produced by tangling.
 *
 * Useful for previewing without doing the full assembly.
 */
export function getTargetFiles(snippets: Snippet[]): string[] {
  const files = new Set<string>();
  for (const snippet of snippets) {
    files.add(snippet.file);
  }
  return Array.from(files).sort();
}

/**
 * Validate that snippets can be assembled without errors.
 *
 * Does a dry-run assembly and returns any errors found.
 */
export function validateAssembly(
  snippets: Snippet[],
  options: AssemblerOptions
): PartError[] {
  const { chapterOrder, checkpoint } = options;

  let sortedSnippets = sortSnippets(snippets, chapterOrder);

  if (checkpoint) {
    sortedSnippets = filterSnippetsToCheckpoint(sortedSnippets, checkpoint, chapterOrder);
  }

  const fileGroups = groupSnippetsByFile(sortedSnippets);
  const allErrors: PartError[] = [];

  for (const [file, fileSnippets] of fileGroups) {
    const result = assembleFile({ file, snippets: fileSnippets });
    allErrors.push(...result.errors);
  }

  return allErrors;
}
