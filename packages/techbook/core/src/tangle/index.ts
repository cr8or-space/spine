/**
 * Tangle module for TechBook domain.
 *
 * Tangling is the process of extracting runnable source code from
 * the literate program (book prose). This module provides:
 *
 * - **Assembler**: Core file assembly from snippets
 * - **Incremental**: Change tracking and caching for efficient rebuilds
 * - **Output**: Writing tangled files to disk
 *
 * @example Basic tangling
 * ```typescript
 * import { assemble } from '@repo/techbook-core';
 *
 * const result = assemble(snippets, {
 *   chapterOrder: ['ch01', 'ch02', 'ch03'],
 * });
 *
 * if (result.success) {
 *   console.log(`Tangled ${result.files.length} files`);
 * }
 * ```
 *
 * @example Tangling to a checkpoint
 * ```typescript
 * import { assembleForCheckpoint } from '@repo/techbook-core';
 *
 * const result = assembleForCheckpoint(snippets, checkpoint, chapterOrder);
 * ```
 *
 * @example Incremental tangling
 * ```typescript
 * import { createEmptyCache, incrementalTangle } from '@repo/techbook-core';
 *
 * let cache = createEmptyCache(chapterOrder);
 *
 * // First run - tangles everything
 * const { result, updatedCache } = incrementalTangle(cache, snippets, options);
 * cache = updatedCache;
 *
 * // Subsequent runs - only tangles changes
 * const { result: result2 } = incrementalTangle(cache, modifiedSnippets, options);
 * ```
 *
 * @example Writing output
 * ```typescript
 * import { writeTangledFiles } from '@repo/techbook-core';
 *
 * const writeResult = await writeTangledFiles(tangleResult, {
 *   outputDir: 'build/src',
 *   cleanOrphans: true,
 *   writeManifest: true,
 * });
 * ```
 */

// Assembler exports
export {
  assemble,
  assembleFile,
  assembleForCheckpoint,
  createContentHash,
  filterSnippetsToCheckpoint,
  getTargetFiles,
  groupSnippetsByFile,
  sortSnippets,
  validateAssembly,
  type AssemblerOptions,
  type FileAssemblyContext,
  type FileAssemblyResult,
} from './assembler';

// Incremental tangling exports
export {
  checkForChanges,
  createEmptyCache,
  deserializeCache,
  getCacheStats,
  incrementalTangle,
  invalidateAll,
  invalidateFiles,
  isCached,
  removeFromCache,
  serializeCache,
  updateCache,
  type CacheStats,
  type IncrementalCheckResult,
  type TangleCache,
  type TangleCacheEntry,
} from './incremental';

// Output exports
export {
  cleanOutputDirectory,
  compareWithManifest,
  hasOutputFiles,
  readManifest,
  writeTangledFiles,
  type ManifestComparison,
  type TangleManifest,
  type TangleOutputOptions,
  type TangleOutputResult,
} from './output';
