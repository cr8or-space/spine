/**
 * Tests for tangle assembler
 */

import { describe, expect, it } from 'vitest';

import type { Checkpoint, Snippet, SnippetOperation } from '@repo/techbook-types';

import {
  assemble,
  assembleFile,
  assembleForCheckpoint,
  createContentHash,
  filterSnippetsToCheckpoint,
  getTargetFiles,
  groupSnippetsByFile,
  sortSnippets,
  validateAssembly,
} from './assembler';

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

// Helper to create test checkpoint
const createCheckpoint = (
  overrides: Partial<Checkpoint> & { id: string; chapterId: string }
): Checkpoint => ({
  entityType: 'checkpoint',
  name: 'Test Checkpoint',
  description: '',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('createContentHash', () => {
  it('should create consistent hashes for same content', () => {
    const content = 'const x = 1;';
    const hash1 = createContentHash(content);
    const hash2 = createContentHash(content);

    expect(hash1).toBe(hash2);
  });

  it('should create different hashes for different content', () => {
    const hash1 = createContentHash('const x = 1;');
    const hash2 = createContentHash('const x = 2;');

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string', () => {
    const hash = createContentHash('');

    expect(hash).toBe('00000000');
  });

  it('should return 8-character hex string', () => {
    const hash = createContentHash('test content');

    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('sortSnippets', () => {
  it('should sort by chapter order', () => {
    const snippets = [
      createSnippet({ id: 's3', operation: 'introduce', chapterId: 'ch-3', order: 0 }),
      createSnippet({ id: 's1', operation: 'introduce', chapterId: 'ch-1', order: 0 }),
      createSnippet({ id: 's2', operation: 'introduce', chapterId: 'ch-2', order: 0 }),
    ];

    const sorted = sortSnippets(snippets, ['ch-1', 'ch-2', 'ch-3']);

    expect(sorted.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('should sort by order within same chapter', () => {
    const snippets = [
      createSnippet({ id: 's3', operation: 'introduce', chapterId: 'ch-1', order: 2 }),
      createSnippet({ id: 's1', operation: 'introduce', chapterId: 'ch-1', order: 0 }),
      createSnippet({ id: 's2', operation: 'introduce', chapterId: 'ch-1', order: 1 }),
    ];

    const sorted = sortSnippets(snippets, ['ch-1']);

    expect(sorted.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('should put unknown chapters at end', () => {
    const snippets = [
      createSnippet({ id: 's2', operation: 'introduce', chapterId: 'unknown', order: 0 }),
      createSnippet({ id: 's1', operation: 'introduce', chapterId: 'ch-1', order: 0 }),
    ];

    const sorted = sortSnippets(snippets, ['ch-1']);

    expect(sorted.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('should not mutate original array', () => {
    const snippets = [
      createSnippet({ id: 's2', operation: 'introduce', chapterId: 'ch-2', order: 0 }),
      createSnippet({ id: 's1', operation: 'introduce', chapterId: 'ch-1', order: 0 }),
    ];
    const originalOrder = snippets.map((s) => s.id);

    sortSnippets(snippets, ['ch-1', 'ch-2']);

    expect(snippets.map((s) => s.id)).toEqual(originalOrder);
  });
});

describe('groupSnippetsByFile', () => {
  it('should group snippets by file path', () => {
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
      createSnippet({ id: 's2', operation: 'introduce', file: 'src/b.ts' }),
      createSnippet({ id: 's3', operation: 'append', file: 'src/a.ts' }),
    ];

    const groups = groupSnippetsByFile(snippets);

    expect(groups.get('src/a.ts')?.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(groups.get('src/b.ts')?.map((s) => s.id)).toEqual(['s2']);
  });

  it('should handle empty array', () => {
    const groups = groupSnippetsByFile([]);

    expect(groups.size).toBe(0);
  });
});

describe('filterSnippetsToCheckpoint', () => {
  const chapterOrder = ['ch-1', 'ch-2', 'ch-3'];

  it('should include snippets up to checkpoint chapter', () => {
    const checkpoint = createCheckpoint({ id: 'cp-1', chapterId: 'ch-2' });
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', chapterId: 'ch-1' }),
      createSnippet({ id: 's2', operation: 'introduce', chapterId: 'ch-2' }),
      createSnippet({ id: 's3', operation: 'introduce', chapterId: 'ch-3' }),
    ];

    const filtered = filterSnippetsToCheckpoint(snippets, checkpoint, chapterOrder);

    expect(filtered.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('should include all snippets when checkpoint chapter not in order', () => {
    const checkpoint = createCheckpoint({ id: 'cp-1', chapterId: 'unknown' });
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', chapterId: 'ch-1' }),
      createSnippet({ id: 's2', operation: 'introduce', chapterId: 'ch-2' }),
    ];

    const filtered = filterSnippetsToCheckpoint(snippets, checkpoint, chapterOrder);

    expect(filtered.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('should exclude snippets in unknown chapters', () => {
    const checkpoint = createCheckpoint({ id: 'cp-1', chapterId: 'ch-2' });
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', chapterId: 'ch-1' }),
      createSnippet({ id: 's2', operation: 'introduce', chapterId: 'unknown' }),
    ];

    const filtered = filterSnippetsToCheckpoint(snippets, checkpoint, chapterOrder);

    expect(filtered.map((s) => s.id)).toEqual(['s1']);
  });
});

describe('assembleFile', () => {
  it('should assemble file from snippets', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'const x = 1;',
      }),
    ];

    const result = assembleFile({ file: 'src/main.ts', snippets });

    expect(result.success).toBe(true);
    expect(result.file?.content).toBe('const x = 1;');
    expect(result.file?.path).toBe('src/main.ts');
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for invalid operations', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'append', // Can't append without introduce
        file: 'src/main.ts',
        part: 'missing',
        code: 'x',
      }),
    ];

    const result = assembleFile({ file: 'src/main.ts', snippets });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.snippetId).toBe('s1');
  });

  it('should not return file for empty content', () => {
    const result = assembleFile({ file: 'src/main.ts', snippets: [] });

    expect(result.success).toBe(true);
    expect(result.file).toBeUndefined();
  });

  it('should include content hash', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'test',
      }),
    ];

    const result = assembleFile({ file: 'src/main.ts', snippets });

    expect(result.file?.contentHash).toBeDefined();
    expect(result.file?.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should track source snippet IDs', () => {
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/main.ts', code: 'a' }),
      createSnippet({ id: 's2', operation: 'append', file: 'src/main.ts', code: 'b' }),
    ];

    const result = assembleFile({ file: 'src/main.ts', snippets });

    expect(result.file?.sourceSnippetIds).toEqual(['s1', 's2']);
  });
});

describe('assemble', () => {
  it('should assemble multiple files', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/a.ts',
        code: 'const a = 1;',
        chapterId: 'ch-1',
      }),
      createSnippet({
        id: 's2',
        operation: 'introduce',
        file: 'src/b.ts',
        code: 'const b = 2;',
        chapterId: 'ch-1',
      }),
    ];

    const result = assemble(snippets, { chapterOrder: ['ch-1'] });

    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(2);
    expect(result.files.find((f) => f.path === 'src/a.ts')?.content).toBe('const a = 1;');
    expect(result.files.find((f) => f.path === 'src/b.ts')?.content).toBe('const b = 2;');
  });

  it('should respect chapter order', () => {
    const snippets = [
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/main.ts',
        code: 'second',
        chapterId: 'ch-2',
      }),
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'first',
        chapterId: 'ch-1',
      }),
    ];

    const result = assemble(snippets, { chapterOrder: ['ch-1', 'ch-2'] });

    expect(result.success).toBe(true);
    expect(result.files[0]?.content).toBe('first\nsecond');
  });

  it('should filter to checkpoint when provided', () => {
    const checkpoint = createCheckpoint({ id: 'cp-1', chapterId: 'ch-1' });
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'first',
        chapterId: 'ch-1',
      }),
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/main.ts',
        code: 'second',
        chapterId: 'ch-2',
      }),
    ];

    const result = assemble(snippets, { chapterOrder: ['ch-1', 'ch-2'], checkpoint });

    expect(result.success).toBe(true);
    expect(result.files[0]?.content).toBe('first');
  });

  it('should include timestamp', () => {
    const before = new Date().toISOString();
    const result = assemble([], { chapterOrder: [] });
    const after = new Date().toISOString();

    expect(result.tangledAt).toBeDefined();
    expect(result.tangledAt >= before).toBe(true);
    expect(result.tangledAt <= after).toBe(true);
  });

  it('should collect errors from all files', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'append', // Invalid
        file: 'src/a.ts',
        part: 'missing',
        code: 'x',
        chapterId: 'ch-1',
      }),
      createSnippet({
        id: 's2',
        operation: 'replace', // Invalid
        file: 'src/b.ts',
        part: 'missing',
        code: 'y',
        chapterId: 'ch-1',
      }),
    ];

    const result = assemble(snippets, { chapterOrder: ['ch-1'] });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.find((e) => e.snippetId === 's1')).toBeDefined();
    expect(result.errors.find((e) => e.snippetId === 's2')).toBeDefined();
  });
});

describe('assembleForCheckpoint', () => {
  it('should be shorthand for assemble with checkpoint', () => {
    const checkpoint = createCheckpoint({ id: 'cp-1', chapterId: 'ch-1' });
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'first',
        chapterId: 'ch-1',
      }),
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/main.ts',
        code: 'second',
        chapterId: 'ch-2',
      }),
    ];
    const chapterOrder = ['ch-1', 'ch-2'];

    const result = assembleForCheckpoint(snippets, checkpoint, chapterOrder);

    expect(result.success).toBe(true);
    expect(result.files[0]?.content).toBe('first');
  });
});

describe('getTargetFiles', () => {
  it('should return unique file paths', () => {
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
      createSnippet({ id: 's2', operation: 'introduce', file: 'src/b.ts' }),
      createSnippet({ id: 's3', operation: 'append', file: 'src/a.ts' }),
    ];

    const files = getTargetFiles(snippets);

    expect(files.sort()).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('should return sorted paths', () => {
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/c.ts' }),
      createSnippet({ id: 's2', operation: 'introduce', file: 'src/a.ts' }),
      createSnippet({ id: 's3', operation: 'introduce', file: 'src/b.ts' }),
    ];

    const files = getTargetFiles(snippets);

    expect(files).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
  });

  it('should handle empty array', () => {
    const files = getTargetFiles([]);

    expect(files).toEqual([]);
  });
});

describe('validateAssembly', () => {
  it('should return empty for valid assembly', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        part: 'init',
        code: 'x',
        chapterId: 'ch-1',
      }),
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/main.ts',
        part: 'init',
        code: 'y',
        chapterId: 'ch-1',
      }),
    ];

    const errors = validateAssembly(snippets, { chapterOrder: ['ch-1'] });

    expect(errors).toEqual([]);
  });

  it('should return errors for invalid assembly', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'append', // Invalid without introduce
        file: 'src/main.ts',
        part: 'missing',
        code: 'x',
        chapterId: 'ch-1',
      }),
    ];

    const errors = validateAssembly(snippets, { chapterOrder: ['ch-1'] });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('does not exist');
  });

  it('should respect checkpoint filter', () => {
    const checkpoint = createCheckpoint({ id: 'cp-1', chapterId: 'ch-1' });
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        part: 'init',
        code: 'x',
        chapterId: 'ch-1',
      }),
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/main.ts',
        part: 'missing', // Would be error, but in ch-2
        code: 'y',
        chapterId: 'ch-2',
      }),
    ];

    // With checkpoint, s2 is excluded so no error
    const errorsWithCheckpoint = validateAssembly(snippets, {
      chapterOrder: ['ch-1', 'ch-2'],
      checkpoint,
    });

    expect(errorsWithCheckpoint).toEqual([]);

    // Without checkpoint, s2 is included so error
    const errorsWithoutCheckpoint = validateAssembly(snippets, {
      chapterOrder: ['ch-1', 'ch-2'],
    });

    expect(errorsWithoutCheckpoint).toHaveLength(1);
  });
});
