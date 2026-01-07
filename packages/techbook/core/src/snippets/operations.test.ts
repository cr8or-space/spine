/**
 * Tests for snippet operations
 */

import { describe, expect, it } from 'vitest';

import type { Snippet, SnippetOperation } from '@repo/techbook-types';

import { type PartState } from './parts';
import {
  tangleSnippets,
  getFileEvolution,
  validateSnippetSequence,
  getAffectedFiles,
  getFileStateAtSnippet,
  computeLineDiff,
  validateSnippetOperation,
  computeSnippetStats,
} from './operations';

// Helper to create test snippets
const createSnippet = (
  overrides: Partial<Snippet> & { id: string; operation: SnippetOperation }
): Snippet => ({
  entityType: 'snippet',
  name: 'Test Snippet',
  file: 'src/main.ts',
  language: 'typescript',
  code: 'const x = 1;',
  chapterId: 'chapter-1',
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('tangleSnippets', () => {
  it('should tangle snippets into files', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'const main = true;',
        chapterId: 'ch-1',
        order: 0,
      }),
      createSnippet({
        id: 's2',
        operation: 'introduce',
        file: 'src/utils.ts',
        code: 'export const util = 1;',
        chapterId: 'ch-1',
        order: 1,
      }),
    ];

    const result = tangleSnippets({
      snippets,
      chapterOrder: ['ch-1'],
    });

    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(2);
    expect(result.files.find((f) => f.path === 'src/main.ts')?.content).toBe(
      'const main = true;'
    );
    expect(result.files.find((f) => f.path === 'src/utils.ts')?.content).toBe(
      'export const util = 1;'
    );
  });

  it('should apply snippets in chapter order', () => {
    const snippets = [
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/main.ts',
        code: 'second',
        chapterId: 'ch-2',
        order: 0,
      }),
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'first',
        chapterId: 'ch-1',
        order: 0,
      }),
    ];

    const result = tangleSnippets({
      snippets,
      chapterOrder: ['ch-1', 'ch-2'],
    });

    expect(result.success).toBe(true);
    expect(result.files[0]?.content).toBe('first\nsecond');
  });

  it('should report errors from invalid operations', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'append', // Can't append to nonexistent part
        file: 'src/main.ts',
        part: 'nonexistent',
        code: 'x',
        chapterId: 'ch-1',
        order: 0,
      }),
    ];

    const result = tangleSnippets({
      snippets,
      chapterOrder: ['ch-1'],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.snippetId).toBe('s1');
  });

  it('should include content hash for change detection', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'const x = 1;',
        chapterId: 'ch-1',
        order: 0,
      }),
    ];

    const result = tangleSnippets({
      snippets,
      chapterOrder: ['ch-1'],
    });

    expect(result.files[0]?.contentHash).toBeDefined();
    expect(result.files[0]?.contentHash).not.toBe('');
  });

  it('should track source snippet IDs', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'first',
        chapterId: 'ch-1',
        order: 0,
      }),
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/main.ts',
        code: 'second',
        chapterId: 'ch-1',
        order: 1,
      }),
    ];

    const result = tangleSnippets({
      snippets,
      chapterOrder: ['ch-1'],
    });

    expect(result.files[0]?.sourceSnippetIds).toContain('s1');
    expect(result.files[0]?.sourceSnippetIds).toContain('s2');
  });

  it('should include timestamp', () => {
    const before = new Date().toISOString();
    const result = tangleSnippets({
      snippets: [],
      chapterOrder: [],
    });
    const after = new Date().toISOString();

    expect(result.tangledAt).toBeDefined();
    expect(result.tangledAt >= before).toBe(true);
    expect(result.tangledAt <= after).toBe(true);
  });
});

describe('getFileEvolution', () => {
  it('should return evolution history for a file', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        name: 'Initial',
        operation: 'introduce',
        file: 'src/main.ts',
        chapterId: 'ch-1',
        order: 0,
      }),
      createSnippet({
        id: 's2',
        name: 'Add feature',
        operation: 'append',
        file: 'src/main.ts',
        chapterId: 'ch-2',
        order: 0,
      }),
      createSnippet({
        id: 's3',
        name: 'Other file',
        operation: 'introduce',
        file: 'src/other.ts',
        chapterId: 'ch-2',
        order: 1,
      }),
    ];

    const evolution = getFileEvolution('src/main.ts', snippets);

    expect(evolution.file).toBe('src/main.ts');
    expect(evolution.part).toBeUndefined();
    expect(evolution.history).toHaveLength(2);
    expect(evolution.history[0]?.snippetId).toBe('s1');
    expect(evolution.history[0]?.operation).toBe('introduce');
    expect(evolution.history[1]?.snippetId).toBe('s2');
  });

  it('should filter by part when specified', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        part: 'init',
        chapterId: 'ch-1',
        order: 0,
      }),
      createSnippet({
        id: 's2',
        operation: 'introduce',
        file: 'src/main.ts',
        part: 'parse',
        chapterId: 'ch-1',
        order: 1,
      }),
      createSnippet({
        id: 's3',
        operation: 'append',
        file: 'src/main.ts',
        part: 'init',
        chapterId: 'ch-2',
        order: 0,
      }),
    ];

    const evolution = getFileEvolution('src/main.ts', snippets, 'init');

    expect(evolution.part).toBe('init');
    expect(evolution.history).toHaveLength(2);
    expect(evolution.history.map((h) => h.snippetId)).toEqual(['s1', 's3']);
  });
});

describe('validateSnippetSequence', () => {
  it('should return empty array for valid sequence', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        part: 'init',
        code: 'x',
        chapterId: 'ch-1',
        order: 0,
      }),
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/main.ts',
        part: 'init',
        code: 'y',
        chapterId: 'ch-1',
        order: 1,
      }),
    ];

    const errors = validateSnippetSequence('src/main.ts', snippets);
    expect(errors).toEqual([]);
  });

  it('should return errors for invalid sequence', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'append', // Invalid: part doesn't exist
        file: 'src/main.ts',
        part: 'init',
        code: 'x',
        chapterId: 'ch-1',
        order: 0,
      }),
    ];

    const errors = validateSnippetSequence('src/main.ts', snippets);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('does not exist');
  });
});

describe('getAffectedFiles', () => {
  it('should return files affected by changed snippets', () => {
    const snippets = [
      createSnippet({ id: 's1', operation: 'introduce', file: 'src/a.ts' }),
      createSnippet({ id: 's2', operation: 'introduce', file: 'src/b.ts' }),
      createSnippet({ id: 's3', operation: 'append', file: 'src/a.ts' }),
      createSnippet({ id: 's4', operation: 'introduce', file: 'src/c.ts' }),
    ];

    const affected = getAffectedFiles(new Set(['s1', 's4']), snippets);

    expect(affected.sort()).toEqual(['src/a.ts', 'src/c.ts']);
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

describe('getFileStateAtSnippet', () => {
  const chapterOrder = ['ch-1', 'ch-2', 'ch-3'];

  it('should return file state at a specific snippet', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'first',
        chapterId: 'ch-1',
        order: 0,
      }),
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/main.ts',
        code: 'second',
        chapterId: 'ch-2',
        order: 0,
      }),
      createSnippet({
        id: 's3',
        operation: 'append',
        file: 'src/main.ts',
        code: 'third',
        chapterId: 'ch-3',
        order: 0,
      }),
    ];

    const stateAtS2 = getFileStateAtSnippet('src/main.ts', 's2', snippets, chapterOrder);

    expect(stateAtS2?.content).toBe('first\nsecond');
    expect(stateAtS2?.sourceSnippetIds).toEqual(['s1', 's2']);
  });

  it('should return undefined for non-existent snippet', () => {
    const result = getFileStateAtSnippet('src/main.ts', 'nonexistent', [], chapterOrder);
    expect(result).toBeUndefined();
  });

  it('should return undefined for snippet in unknown chapter', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/main.ts',
        code: 'x',
        chapterId: 'unknown',
        order: 0,
      }),
    ];

    const result = getFileStateAtSnippet('src/main.ts', 's1', snippets, chapterOrder);
    expect(result).toBeUndefined();
  });
});

describe('computeLineDiff', () => {
  it('should detect additions', () => {
    const diff = computeLineDiff('line1', 'line1\nline2');

    expect(diff).toContainEqual({ type: 'context', lineNumber: 1, content: 'line1' });
    expect(diff).toContainEqual({ type: 'add', lineNumber: 2, content: 'line2' });
  });

  it('should detect removals', () => {
    const diff = computeLineDiff('line1\nline2', 'line1');

    expect(diff).toContainEqual({ type: 'context', lineNumber: 1, content: 'line1' });
    expect(diff).toContainEqual({ type: 'remove', lineNumber: 2, content: 'line2' });
  });

  it('should detect changes', () => {
    const diff = computeLineDiff('old', 'new');

    expect(diff).toContainEqual({ type: 'remove', lineNumber: 1, content: 'old' });
    expect(diff).toContainEqual({ type: 'add', lineNumber: 1, content: 'new' });
  });

  it('should handle empty strings', () => {
    // Empty to empty: both split to [''], which compare equal as context
    const emptyDiff = computeLineDiff('', '');
    expect(emptyDiff).toHaveLength(1);
    expect(emptyDiff[0]?.type).toBe('context');

    expect(computeLineDiff('', 'new')).toContainEqual({
      type: 'add',
      lineNumber: 1,
      content: 'new',
    });
    expect(computeLineDiff('old', '')).toContainEqual({
      type: 'remove',
      lineNumber: 1,
      content: 'old',
    });
  });
});

describe('validateSnippetOperation', () => {
  it('should allow file-level operations', () => {
    const parts = new Map<string, PartState>();

    expect(
      validateSnippetOperation(
        createSnippet({ id: 's1', operation: 'introduce', code: 'x' }),
        parts
      )
    ).toBeUndefined();
    expect(
      validateSnippetOperation(
        createSnippet({ id: 's1', operation: 'append', code: 'x' }),
        parts
      )
    ).toBeUndefined();
  });

  it('should reject introduce on existing part', () => {
    const parts = new Map<string, PartState>([
      [
        'init',
        {
          part: { name: 'init', file: 'src/main.ts' },
          content: 'x',
          sourceSnippetIds: [],
          deleted: false,
        },
      ],
    ]);

    const error = validateSnippetOperation(
      createSnippet({ id: 's1', operation: 'introduce', part: 'init', code: 'x' }),
      parts
    );

    expect(error).toContain('already exists');
  });

  it('should reject operations on non-existent part', () => {
    const parts = new Map<string, PartState>();

    expect(
      validateSnippetOperation(
        createSnippet({ id: 's1', operation: 'append', part: 'missing', code: 'x' }),
        parts
      )
    ).toContain('does not exist');
    expect(
      validateSnippetOperation(
        createSnippet({ id: 's1', operation: 'replace', part: 'missing', code: 'x' }),
        parts
      )
    ).toContain('does not exist');
  });

  it('should allow operations on existing part', () => {
    const parts = new Map<string, PartState>([
      [
        'init',
        {
          part: { name: 'init', file: 'src/main.ts' },
          content: 'x',
          sourceSnippetIds: [],
          deleted: false,
        },
      ],
    ]);

    expect(
      validateSnippetOperation(
        createSnippet({ id: 's1', operation: 'append', part: 'init', code: 'x' }),
        parts
      )
    ).toBeUndefined();
    expect(
      validateSnippetOperation(
        createSnippet({ id: 's1', operation: 'replace', part: 'init', code: 'x' }),
        parts
      )
    ).toBeUndefined();
  });
});

describe('computeSnippetStats', () => {
  it('should compute statistics for snippets', () => {
    const snippets = [
      createSnippet({
        id: 's1',
        operation: 'introduce',
        file: 'src/a.ts',
        language: 'typescript',
      }),
      createSnippet({
        id: 's2',
        operation: 'append',
        file: 'src/a.ts',
        language: 'typescript',
      }),
      createSnippet({
        id: 's3',
        operation: 'introduce',
        file: 'src/b.ts',
        part: 'init',
        language: 'typescript',
      }),
      createSnippet({
        id: 's4',
        operation: 'introduce',
        file: 'src/c.ts',
        language: 'python',
      }),
    ];

    const stats = computeSnippetStats(snippets);

    expect(stats.totalSnippets).toBe(4);
    expect(stats.byOperation).toEqual({
      introduce: 3,
      append: 1,
    });
    expect(stats.byLanguage).toEqual({
      typescript: 3,
      python: 1,
    });
    expect(stats.totalFiles).toBe(3);
    expect(stats.totalParts).toBe(1);
    expect(stats.averageSnippetsPerFile).toBeCloseTo(4 / 3);
  });

  it('should handle empty snippet list', () => {
    const stats = computeSnippetStats([]);

    expect(stats.totalSnippets).toBe(0);
    expect(stats.byOperation).toEqual({});
    expect(stats.byLanguage).toEqual({});
    expect(stats.totalFiles).toBe(0);
    expect(stats.totalParts).toBe(0);
    expect(stats.averageSnippetsPerFile).toBe(0);
  });
});
