/**
 * Tests for incremental tangling
 */

import { describe, expect, it } from 'vitest';

import type { Snippet, SnippetOperation } from '@repo/techbook-types';

import {
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
} from './incremental';
import { getAffectedFiles } from '../snippets/operations';
import { assemble } from './assembler';

// Helper to create test snippets
const createSnippet = (
  overrides: Partial<Snippet> & { id: string; operation: SnippetOperation }
): Snippet => ({
  entityType: 'snippet',
  name: 'Test Snippet',
  file: 'src/main.ts',
  language: 'typescript',
  code: 'const x = 1;',
  chapterId: 'ch-1',
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('createEmptyCache', () => {
  it('should create empty cache with chapter order', () => {
    const cache = createEmptyCache(['ch-1', 'ch-2']);

    expect(cache.entries.size).toBe(0);
    expect(cache.chapterOrder).toEqual(['ch-1', 'ch-2']);
    expect(cache.updatedAt).toBeDefined();
  });
});

describe('updateCache', () => {
  it('should add entries from tangle result', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'a' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });

    const updated = updateCache(cache, result, snippets);

    expect(updated.entries.size).toBe(1);
    expect(updated.entries.has('src/a.ts')).toBe(true);

    const entry = updated.entries.get('src/a.ts');
    expect(entry?.snippetIds).toContain('s1');
    expect(entry?.contentHash).toBeDefined();
  });

  it('should preserve existing entries not in result', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets1 = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'a' }),
    ];
    const result1 = assemble(snippets1, { chapterOrder: ['ch-1'] });
    const cache1 = updateCache(cache, result1, snippets1);

    // Update with different file
    const snippets2 = [
      createSnippet({ id: 's2', operation: 'introduce', file: 'src/b.ts', code: 'b' }),
    ];
    const result2 = assemble(snippets2, { chapterOrder: ['ch-1'] });
    const cache2 = updateCache(cache1, result2, snippets2);

    expect(cache2.entries.size).toBe(2);
    expect(cache2.entries.has('src/a.ts')).toBe(true);
    expect(cache2.entries.has('src/b.ts')).toBe(true);
  });

  it('should update existing entries', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets1 = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'original' }),
    ];
    const result1 = assemble(snippets1, { chapterOrder: ['ch-1'] });
    const cache1 = updateCache(cache, result1, snippets1);
    const originalHash = cache1.entries.get('src/a.ts')?.contentHash;

    // Update same file with different content
    const snippets2 = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'updated' }),
    ];
    const result2 = assemble(snippets2, { chapterOrder: ['ch-1'] });
    const cache2 = updateCache(cache1, result2, snippets2);

    expect(cache2.entries.size).toBe(1);
    expect(cache2.entries.get('src/a.ts')?.contentHash).not.toBe(originalHash);
  });
});

describe('removeFromCache', () => {
  it('should remove specified files', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'a' }),
      createSnippet({ id: 's2', operation: 'introduce', file: 'src/b.ts', code: 'b' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets);

    const updated = removeFromCache(populatedCache, ['src/a.ts']);

    expect(updated.entries.size).toBe(1);
    expect(updated.entries.has('src/a.ts')).toBe(false);
    expect(updated.entries.has('src/b.ts')).toBe(true);
  });

  it('should handle non-existent files gracefully', () => {
    const cache = createEmptyCache(['ch-1']);

    const updated = removeFromCache(cache, ['nonexistent.ts']);

    expect(updated.entries.size).toBe(0);
  });
});

describe('checkForChanges', () => {
  it('should detect new files', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/new.ts' }),
    ];

    const changes = checkForChanges(cache, snippets);

    expect(changes.newFiles).toEqual(['src/new.ts']);
    expect(changes.addedSnippetIds).toContain('s1');
  });

  it('should detect removed files', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets);

    // Check with no snippets
    const changes = checkForChanges(populatedCache, []);

    expect(changes.removedFiles).toEqual(['src/a.ts']);
    expect(changes.removedSnippetIds).toContain('s1');
  });

  it('should detect changed snippets', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets1 = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'original' }),
    ];
    const result = assemble(snippets1, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets1);

    // Check with modified snippet
    const snippets2 = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'modified' }),
    ];
    const changes = checkForChanges(populatedCache, snippets2);

    expect(changes.staleFiles).toEqual(['src/a.ts']);
    expect(changes.changedSnippetIds).toContain('s1');
  });

  it('should detect added snippets to existing file', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets1 = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'first' }),
    ];
    const result = assemble(snippets1, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets1);

    // Check with additional snippet
    const snippets2 = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'first' }),
      createSnippet({ id: 's2', operation: 'append', file: 'src/a.ts', code: 'second' }),
    ];
    const changes = checkForChanges(populatedCache, snippets2);

    expect(changes.staleFiles).toEqual(['src/a.ts']);
    expect(changes.addedSnippetIds).toContain('s2');
  });

  it('should identify fresh files', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'content' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets);

    // Check with same snippets
    const changes = checkForChanges(populatedCache, snippets);

    expect(changes.freshFiles).toEqual(['src/a.ts']);
    expect(changes.staleFiles).toEqual([]);
  });
});

describe('incrementalTangle', () => {
  it('should tangle new files', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'content' }),
    ];

    const { result, updatedCache } = incrementalTangle(cache, snippets, {
      chapterOrder: ['ch-1'],
    });

    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(updatedCache.entries.has('src/a.ts')).toBe(true);
  });

  it('should retangle stale files', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets1 = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'original' }),
    ];
    const result1 = assemble(snippets1, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result1, snippets1);

    // Modify snippet
    const snippets2 = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'modified' }),
    ];
    const { result, updatedCache } = incrementalTangle(populatedCache, snippets2, {
      chapterOrder: ['ch-1'],
    });

    expect(result.success).toBe(true);
    const file = result.files.find((f) => f.path === 'src/a.ts');
    expect(file?.content).toBe('modified');
    expect(updatedCache.entries.get('src/a.ts')?.contentHash).not.toBe(
      populatedCache.entries.get('src/a.ts')?.contentHash
    );
  });
});

describe('getAffectedFiles', () => {
  it('should return files containing changed snippets', () => {
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
      createSnippet({ id: 's2', operation: 'introduce', file: 'src/b.ts' }),
      createSnippet({ id: 's3', operation: 'append', file: 'src/a.ts' }),
    ];

    const affected = getAffectedFiles(new Set(['s1', 's3']), snippets);

    expect(affected).toEqual(['src/a.ts']);
  });

  it('should deduplicate files', () => {
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
      createSnippet({ id: 's2', operation: 'append', file: 'src/a.ts' }),
    ];

    const affected = getAffectedFiles(new Set(['s1', 's2']), snippets);

    expect(affected).toEqual(['src/a.ts']);
  });
});

describe('isCached', () => {
  it('should return true for cached files', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets);

    expect(isCached(populatedCache, 'src/a.ts')).toBe(true);
    expect(isCached(populatedCache, 'src/b.ts')).toBe(false);
  });
});

describe('getCacheStats', () => {
  it('should return cache statistics', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
      createSnippet({ id: 's2', operation: 'append', file: 'src/a.ts' }),
      createSnippet({ id: 's3', operation: 'introduce', file: 'src/b.ts' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets);

    const stats = getCacheStats(populatedCache);

    expect(stats.fileCount).toBe(2);
    expect(stats.snippetCount).toBe(3);
    expect(stats.entries).toHaveLength(2);
    expect(stats.lastUpdated).toBe(populatedCache.updatedAt);
  });
});

describe('invalidateFiles', () => {
  it('should remove specific files from cache', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
      createSnippet({ id: 's2', operation: 'introduce', file: 'src/b.ts' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets);

    const invalidated = invalidateFiles(populatedCache, ['src/a.ts']);

    expect(invalidated.entries.has('src/a.ts')).toBe(false);
    expect(invalidated.entries.has('src/b.ts')).toBe(true);
  });
});

describe('invalidateAll', () => {
  it('should clear all cache entries', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
      createSnippet({ id: 's2', operation: 'introduce', file: 'src/b.ts' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets);

    const cleared = invalidateAll(populatedCache);

    expect(cleared.entries.size).toBe(0);
    expect(cleared.chapterOrder).toEqual(['ch-1']);
  });
});

describe('serializeCache/deserializeCache', () => {
  it('should round-trip cache through JSON', () => {
    const cache = createEmptyCache(['ch-1', 'ch-2']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts', code: 'content' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets);

    const json = serializeCache(populatedCache);
    const restored = deserializeCache(json);

    expect(restored.chapterOrder).toEqual(populatedCache.chapterOrder);
    expect(restored.updatedAt).toBe(populatedCache.updatedAt);
    expect(restored.entries.size).toBe(populatedCache.entries.size);

    const originalEntry = populatedCache.entries.get('src/a.ts');
    const restoredEntry = restored.entries.get('src/a.ts');

    expect(restoredEntry?.path).toBe(originalEntry?.path);
    expect(restoredEntry?.contentHash).toBe(originalEntry?.contentHash);
    expect(restoredEntry?.snippetIds).toEqual(originalEntry?.snippetIds);
  });

  it('should produce valid JSON', () => {
    const cache = createEmptyCache(['ch-1']);
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
    ];
    const result = assemble(snippets, { chapterOrder: ['ch-1'] });
    const populatedCache = updateCache(cache, result, snippets);

    const json = serializeCache(populatedCache);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should throw error for invalid JSON structure', () => {
    expect(() => deserializeCache('not valid json')).toThrow();
  });

  it('should throw error for invalid cache format', () => {
    const invalidCache = JSON.stringify({ entries: 'not an array' });

    expect(() => deserializeCache(invalidCache)).toThrow('Invalid cache format');
  });

  it('should throw error for missing required fields', () => {
    const incompleteCache = JSON.stringify({ entries: [] });

    expect(() => deserializeCache(incompleteCache)).toThrow('Invalid cache format');
  });
});
