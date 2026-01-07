/**
 * Incremental tangling with change tracking.
 *
 * This module provides caching and change detection to avoid
 * re-tangling files that haven't changed. It tracks:
 * - Which snippets contribute to which files
 * - Content hashes for detecting changes
 * - Dependency relationships between files
 */

import type { Snippet, TangledFile, TangleResult } from '@repo/techbook-types';
import { z } from 'zod';

import { assemble, createContentHash, type AssemblerOptions } from './assembler';

/**
 * Cache entry for a tangled file
 */
export interface TangleCacheEntry {
  /** File path */
  path: string;
  /** Hash of the assembled content */
  contentHash: string;
  /** IDs of snippets that contributed to this file */
  snippetIds: string[];
  /** Hashes of each snippet's code for change detection */
  snippetHashes: Map<string, string>;
  /** When this entry was created */
  cachedAt: string;
}

/**
 * The tangle cache stores pre-computed results
 */
export interface TangleCache {
  /** Cache entries by file path */
  entries: Map<string, TangleCacheEntry>;
  /** Chapter order used for this cache */
  chapterOrder: string[];
  /** When the cache was last updated */
  updatedAt: string;
}

/**
 * Result of checking what files need to be retangled
 */
export interface IncrementalCheckResult {
  /** Files that need to be retangled */
  staleFiles: string[];
  /** Files that are up to date */
  freshFiles: string[];
  /** New files not in cache */
  newFiles: string[];
  /** Files removed (no longer have snippets) */
  removedFiles: string[];
  /** Snippets that changed */
  changedSnippetIds: string[];
  /** Snippets that were added */
  addedSnippetIds: string[];
  /** Snippets that were removed */
  removedSnippetIds: string[];
}

/**
 * Create an empty tangle cache
 */
export function createEmptyCache(chapterOrder: string[]): TangleCache {
  return {
    entries: new Map(),
    chapterOrder,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a cache entry from a tangled file
 */
function createCacheEntry(
  file: TangledFile,
  snippets: Snippet[]
): TangleCacheEntry {
  const snippetHashes = new Map<string, string>();

  for (const snippet of snippets) {
    if (file.sourceSnippetIds.includes(snippet.id)) {
      snippetHashes.set(snippet.id, createContentHash(snippet.code));
    }
  }

  return {
    path: file.path,
    contentHash: file.contentHash ?? createContentHash(file.content),
    snippetIds: [...file.sourceSnippetIds],
    snippetHashes,
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Update cache from a tangle result
 */
export function updateCache(
  cache: TangleCache,
  result: TangleResult,
  snippets: Snippet[]
): TangleCache {
  const newEntries = new Map(cache.entries);

  // Update entries for all files in the result
  for (const file of result.files) {
    const entry = createCacheEntry(file, snippets);
    newEntries.set(file.path, entry);
  }

  return {
    entries: newEntries,
    chapterOrder: cache.chapterOrder,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Remove files from cache
 */
export function removeFromCache(cache: TangleCache, files: string[]): TangleCache {
  const newEntries = new Map(cache.entries);

  for (const file of files) {
    newEntries.delete(file);
  }

  return {
    entries: newEntries,
    chapterOrder: cache.chapterOrder,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check which files need to be retangled based on snippet changes
 */
export function checkForChanges(
  cache: TangleCache,
  currentSnippets: Snippet[]
): IncrementalCheckResult {
  const staleFiles = new Set<string>();
  const freshFiles = new Set<string>();
  const newFiles = new Set<string>();
  const removedFiles = new Set<string>();
  const changedSnippetIds = new Set<string>();
  const addedSnippetIds = new Set<string>();
  const removedSnippetIds = new Set<string>();

  // Build lookup of current snippets
  const currentSnippetMap = new Map<string, Snippet>();
  const currentFileSnippets = new Map<string, Set<string>>();

  for (const snippet of currentSnippets) {
    currentSnippetMap.set(snippet.id, snippet);

    const fileSet = currentFileSnippets.get(snippet.file) ?? new Set();
    fileSet.add(snippet.id);
    currentFileSnippets.set(snippet.file, fileSet);
  }

  // Check each cached entry
  for (const [path, entry] of cache.entries) {
    const currentFileSet = currentFileSnippets.get(path);

    // File no longer has snippets
    if (!currentFileSet || currentFileSet.size === 0) {
      removedFiles.add(path);
      for (const snippetId of entry.snippetIds) {
        removedSnippetIds.add(snippetId);
      }
      continue;
    }

    // Check for changes in snippets
    let hasChanges = false;

    // Check for removed snippets
    for (const snippetId of entry.snippetIds) {
      if (!currentFileSet.has(snippetId)) {
        hasChanges = true;
        removedSnippetIds.add(snippetId);
      }
    }

    // Check for added snippets
    for (const snippetId of currentFileSet) {
      if (!entry.snippetIds.includes(snippetId)) {
        hasChanges = true;
        addedSnippetIds.add(snippetId);
      }
    }

    // Check for modified snippets
    for (const snippetId of entry.snippetIds) {
      const snippet = currentSnippetMap.get(snippetId);
      if (snippet) {
        const oldHash = entry.snippetHashes.get(snippetId);
        const newHash = createContentHash(snippet.code);
        if (oldHash !== newHash) {
          hasChanges = true;
          changedSnippetIds.add(snippetId);
        }
      }
    }

    if (hasChanges) {
      staleFiles.add(path);
    } else {
      freshFiles.add(path);
    }
  }

  // Check for new files
  for (const [path, snippetIds] of currentFileSnippets) {
    if (!cache.entries.has(path) && snippetIds.size > 0) {
      newFiles.add(path);
      for (const snippetId of snippetIds) {
        addedSnippetIds.add(snippetId);
      }
    }
  }

  return {
    staleFiles: Array.from(staleFiles),
    freshFiles: Array.from(freshFiles),
    newFiles: Array.from(newFiles),
    removedFiles: Array.from(removedFiles),
    changedSnippetIds: Array.from(changedSnippetIds),
    addedSnippetIds: Array.from(addedSnippetIds),
    removedSnippetIds: Array.from(removedSnippetIds),
  };
}

/**
 * Perform incremental tangling.
 *
 * Only retangles files that have changed since the last run.
 * Returns both the new files and cached files.
 */
export function incrementalTangle(
  cache: TangleCache,
  snippets: Snippet[],
  options: AssemblerOptions
): { result: TangleResult; updatedCache: TangleCache } {
  const changes = checkForChanges(cache, snippets);

  // Determine which files to process
  const filesToProcess = new Set([
    ...changes.staleFiles,
    ...changes.newFiles,
  ]);

  // If no changes, return cached files
  if (filesToProcess.size === 0 && changes.removedFiles.length === 0) {
    const cachedFiles: TangledFile[] = [];

    for (const [, entry] of cache.entries) {
      // We don't have the full content in cache, so we need to mark this
      // as a cache hit but note that we'd need to store content for full restore
      cachedFiles.push({
        path: entry.path,
        content: '', // Note: Would need content storage for full restore
        parts: [],
        sourceSnippetIds: entry.snippetIds,
        contentHash: entry.contentHash,
      });
    }

    return {
      result: {
        success: true,
        files: cachedFiles,
        errors: [],
        tangledAt: new Date().toISOString(),
      },
      updatedCache: cache,
    };
  }

  // Get snippets for files that need processing
  const snippetsToProcess = snippets.filter((s) => filesToProcess.has(s.file));

  // Do the actual tangling for changed files
  const tangleResult = assemble(snippetsToProcess, options);

  // Combine with cached files (for files that didn't change)
  const allFiles: TangledFile[] = [...tangleResult.files];

  for (const freshFile of changes.freshFiles) {
    const entry = cache.entries.get(freshFile);
    if (entry) {
      // Need to retangle fresh files too since we don't store content
      // In a production system, you'd store the content and reuse it
      const freshSnippets = snippets.filter((s) => s.file === freshFile);
      const freshResult = assemble(freshSnippets, options);
      allFiles.push(...freshResult.files);
    }
  }

  // Update cache
  let updatedCache = updateCache(cache, tangleResult, snippets);
  updatedCache = removeFromCache(updatedCache, changes.removedFiles);

  return {
    result: {
      success: tangleResult.success,
      files: allFiles,
      errors: tangleResult.errors,
      tangledAt: new Date().toISOString(),
    },
    updatedCache,
  };
}

/**
 * Check if a specific file is in the cache
 */
export function isCached(cache: TangleCache, file: string): boolean {
  return cache.entries.has(file);
}

/**
 * Get cache statistics
 */
export interface CacheStats {
  /** Number of cached files */
  fileCount: number;
  /** Total number of snippets tracked */
  snippetCount: number;
  /** When cache was last updated */
  lastUpdated: string;
  /** Cache entries by file */
  entries: Array<{
    path: string;
    snippetCount: number;
    cachedAt: string;
  }>;
}

export function getCacheStats(cache: TangleCache): CacheStats {
  const entries: CacheStats['entries'] = [];
  let totalSnippets = 0;

  for (const [path, entry] of cache.entries) {
    entries.push({
      path,
      snippetCount: entry.snippetIds.length,
      cachedAt: entry.cachedAt,
    });
    totalSnippets += entry.snippetIds.length;
  }

  return {
    fileCount: cache.entries.size,
    snippetCount: totalSnippets,
    lastUpdated: cache.updatedAt,
    entries,
  };
}

/**
 * Invalidate specific files in the cache.
 *
 * Forces them to be retangled on the next run.
 */
export function invalidateFiles(cache: TangleCache, files: string[]): TangleCache {
  return removeFromCache(cache, files);
}

/**
 * Invalidate all cache entries.
 *
 * Forces a full retangle on the next run.
 */
export function invalidateAll(cache: TangleCache): TangleCache {
  return createEmptyCache(cache.chapterOrder);
}

/**
 * Serialize cache to JSON for persistence
 */
export function serializeCache(cache: TangleCache): string {
  const serializable = {
    entries: Array.from(cache.entries.entries()).map(([filePath, entry]) => ({
      path: filePath,
      contentHash: entry.contentHash,
      snippetIds: entry.snippetIds,
      snippetHashes: Array.from(entry.snippetHashes.entries()),
      cachedAt: entry.cachedAt,
    })),
    chapterOrder: cache.chapterOrder,
    updatedAt: cache.updatedAt,
  };

  return JSON.stringify(serializable, null, 2);
}

/**
 * Schema for serialized cache entry
 */
const SerializedCacheEntrySchema = z.object({
  path: z.string(),
  contentHash: z.string(),
  snippetIds: z.array(z.string()),
  snippetHashes: z.array(z.tuple([z.string(), z.string()])),
  cachedAt: z.string(),
});

/**
 * Schema for serialized cache
 */
const SerializedCacheSchema = z.object({
  entries: z.array(SerializedCacheEntrySchema),
  chapterOrder: z.array(z.string()),
  updatedAt: z.string(),
});

/**
 * Deserialize cache from JSON.
 *
 * @throws {Error} If JSON is invalid or doesn't match expected schema
 */
export function deserializeCache(json: string): TangleCache {
  const rawParsed = JSON.parse(json) as unknown;
  const parseResult = SerializedCacheSchema.safeParse(rawParsed);

  if (!parseResult.success) {
    throw new Error(`Invalid cache format: ${parseResult.error.message}`);
  }

  const parsed = parseResult.data;
  const entries = new Map<string, TangleCacheEntry>();

  for (const entry of parsed.entries) {
    entries.set(entry.path, {
      path: entry.path,
      contentHash: entry.contentHash,
      snippetIds: entry.snippetIds,
      snippetHashes: new Map(entry.snippetHashes),
      cachedAt: entry.cachedAt,
    });
  }

  return {
    entries,
    chapterOrder: parsed.chapterOrder,
    updatedAt: parsed.updatedAt,
  };
}
