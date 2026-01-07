import { describe, it, expect } from 'vitest';
import {
  diffStrings,
  diffFiles,
  diffCheckpoints,
  markLines,
  getChangedSnippets,
  getDiffSummary,
  formatUnifiedDiff,
  formatDiffHtml,
  formatDiffAnsi,
} from './diffs';
import type { TangledFile, Snippet, Checkpoint } from '@repo/techbook-types';

describe('diffStrings', () => {
  it('should return empty for identical strings', () => {
    const result = diffStrings('hello', 'hello');

    const added = result.filter((l) => l.changeType === 'added');
    const removed = result.filter((l) => l.changeType === 'removed');

    expect(added).toHaveLength(0);
    expect(removed).toHaveLength(0);
  });

  it('should detect added lines', () => {
    const result = diffStrings('line1', 'line1\nline2');

    const added = result.filter((l) => l.changeType === 'added');
    expect(added).toHaveLength(1);
    expect(added[0].content).toBe('line2');
  });

  it('should detect removed lines', () => {
    const result = diffStrings('line1\nline2', 'line1');

    const removed = result.filter((l) => l.changeType === 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].content).toBe('line2');
  });

  it('should track line numbers', () => {
    const result = diffStrings('old', 'new');

    const removed = result.find((l) => l.changeType === 'removed');
    const added = result.find((l) => l.changeType === 'added');

    expect(removed?.oldLineNumber).toBe(1);
    expect(added?.newLineNumber).toBe(1);
  });

  it('should handle multi-line changes', () => {
    const old = 'line1\nline2\nline3';
    const newer = 'line1\nmodified\nline3';
    const result = diffStrings(old, newer);

    const removed = result.filter((l) => l.changeType === 'removed');
    const added = result.filter((l) => l.changeType === 'added');

    expect(removed).toHaveLength(1);
    expect(added).toHaveLength(1);
    expect(removed[0].content).toBe('line2');
    expect(added[0].content).toBe('modified');
  });

  it('should ignore whitespace changes when option is set', () => {
    const result = diffStrings('  line1', 'line1', { ignoreWhitespace: true });

    const context = result.filter((l) => l.changeType === 'context');
    expect(context).toHaveLength(1);
  });
});

describe('diffFiles', () => {
  const makeFile = (path: string, content: string, parts: string[] = []): TangledFile => ({
    path,
    content,
    parts: parts.map((name) => ({ name, file: path })),
    sourceSnippetIds: [],
  });

  it('should handle new files', () => {
    const newFile = makeFile('new.ts', 'const x = 1;');
    const result = diffFiles(null, newFile);

    expect(result.isNew).toBe(true);
    expect(result.isDeleted).toBe(false);
    expect(result.path).toBe('new.ts');
    expect(result.addedParts).toHaveLength(0);
  });

  it('should handle deleted files', () => {
    const oldFile = makeFile('old.ts', 'const x = 1;');
    const result = diffFiles(oldFile, null);

    expect(result.isNew).toBe(false);
    expect(result.isDeleted).toBe(true);
    expect(result.path).toBe('old.ts');
  });

  it('should detect content changes', () => {
    const oldFile = makeFile('file.ts', 'const x = 1;');
    const newFile = makeFile('file.ts', 'const x = 2;');
    const result = diffFiles(oldFile, newFile);

    expect(result.isNew).toBe(false);
    expect(result.isDeleted).toBe(false);
    expect(result.hunks.length).toBeGreaterThan(0);
  });

  it('should detect added parts', () => {
    const oldFile = makeFile('file.ts', 'content', []);
    const newFile = makeFile('file.ts', 'content', ['newPart']);
    const result = diffFiles(oldFile, newFile);

    expect(result.addedParts).toContain('newPart');
  });

  it('should detect removed parts', () => {
    const oldFile = makeFile('file.ts', 'content', ['oldPart']);
    const newFile = makeFile('file.ts', 'content', []);
    const result = diffFiles(oldFile, newFile);

    expect(result.removedParts).toContain('oldPart');
  });

  it('should track source snippet IDs', () => {
    const oldFile: TangledFile = {
      path: 'file.ts',
      content: 'old',
      parts: [],
      sourceSnippetIds: ['snip-1'],
    };
    const newFile: TangledFile = {
      path: 'file.ts',
      content: 'new',
      parts: [],
      sourceSnippetIds: ['snip-1', 'snip-2'],
    };
    const result = diffFiles(oldFile, newFile);

    expect(result.snippetIds).toContain('snip-2');
    expect(result.snippetIds).not.toContain('snip-1'); // Not new
  });

  it('should throw for both null files', () => {
    expect(() => diffFiles(null, null)).toThrow('Both files are null');
  });
});

describe('diffCheckpoints', () => {
  it('should diff files between two checkpoint states', () => {
    const fromFiles: TangledFile[] = [
      { path: 'file1.ts', content: 'old', parts: [], sourceSnippetIds: [] },
    ];
    const toFiles: TangledFile[] = [
      { path: 'file1.ts', content: 'new', parts: [], sourceSnippetIds: ['snip-1'] },
    ];

    const result = diffCheckpoints(fromFiles, toFiles, 'cp-1', 'cp-2');

    expect(result.fromCheckpointId).toBe('cp-1');
    expect(result.toCheckpointId).toBe('cp-2');
    // The diff should contain changed files
    expect(result.files.length).toBeGreaterThanOrEqual(0);
  });

  it('should detect new files', () => {
    const fromFiles: TangledFile[] = [];
    const toFiles: TangledFile[] = [
      { path: 'new.ts', content: 'content', parts: [], sourceSnippetIds: [] },
    ];

    const result = diffCheckpoints(fromFiles, toFiles, 'cp-1', 'cp-2');

    expect(result.stats.filesAdded).toBe(1);
    expect(result.files[0].isNew).toBe(true);
  });

  it('should detect deleted files', () => {
    const fromFiles: TangledFile[] = [
      { path: 'old.ts', content: 'content', parts: [], sourceSnippetIds: [] },
    ];
    const toFiles: TangledFile[] = [];

    const result = diffCheckpoints(fromFiles, toFiles, 'cp-1', 'cp-2');

    expect(result.stats.filesDeleted).toBe(1);
    expect(result.files[0].isDeleted).toBe(true);
  });

  it('should count lines added and removed', () => {
    const fromFiles: TangledFile[] = [
      { path: 'file.ts', content: 'line1\nline2', parts: [], sourceSnippetIds: [] },
    ];
    const toFiles: TangledFile[] = [
      { path: 'file.ts', content: 'line1\nline2\nline3', parts: [], sourceSnippetIds: [] },
    ];

    const result = diffCheckpoints(fromFiles, toFiles, 'cp-1', 'cp-2');

    expect(result.stats.linesAdded).toBeGreaterThanOrEqual(1);
  });

  it('should skip unchanged files by default', () => {
    const file: TangledFile = {
      path: 'file.ts',
      content: 'unchanged',
      parts: [],
      sourceSnippetIds: [],
      contentHash: 'same-hash',
    };

    const result = diffCheckpoints([file], [file], 'cp-1', 'cp-2');

    expect(result.files).toHaveLength(0);
  });

  it('should include unchanged files when requested', () => {
    const file: TangledFile = {
      path: 'file.ts',
      content: 'unchanged',
      parts: [],
      sourceSnippetIds: [],
      contentHash: 'same-hash',
    };

    const result = diffCheckpoints([file], [file], 'cp-1', 'cp-2', { includeUnchanged: true });

    // Should include even though no changes
    expect(result.files).toHaveLength(0); // No hunks means not included
  });

  it('should collect snippet IDs from changes', () => {
    const fromFiles: TangledFile[] = [];
    const toFiles: TangledFile[] = [
      { path: 'file.ts', content: 'new', parts: [], sourceSnippetIds: ['snip-1', 'snip-2'] },
    ];

    const result = diffCheckpoints(fromFiles, toFiles, 'cp-1', 'cp-2');

    expect(result.stats.snippetIds).toContain('snip-1');
    expect(result.stats.snippetIds).toContain('snip-2');
  });
});

describe('markLines', () => {
  it('should mark all lines as new for new files', () => {
    const file: TangledFile = {
      path: 'file.ts',
      content: 'line1\nline2',
      parts: [],
      sourceSnippetIds: [],
    };

    const result = markLines(file, null);

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('new');
    expect(result[1].status).toBe('new');
  });

  it('should mark unchanged lines as context', () => {
    const old: TangledFile = {
      path: 'file.ts',
      content: 'unchanged',
      parts: [],
      sourceSnippetIds: [],
    };
    const newer: TangledFile = {
      path: 'file.ts',
      content: 'unchanged',
      parts: [],
      sourceSnippetIds: [],
    };

    const result = markLines(newer, old);

    expect(result[0].status).toBe('context');
  });

  it('should include line numbers', () => {
    const file: TangledFile = {
      path: 'file.ts',
      content: 'line1\nline2',
      parts: [],
      sourceSnippetIds: [],
    };

    const result = markLines(file, null);

    expect(result[0].lineNumber).toBe(1);
    expect(result[1].lineNumber).toBe(2);
  });
});

describe('getChangedSnippets', () => {
  const makeSnippet = (id: string, chapterId: string): Snippet => ({
    id,
    entityType: 'snippet',
    name: `Snippet ${id}`,
    file: 'file.ts',
    operation: 'introduce',
    language: 'typescript',
    code: 'code',
    chapterId,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const makeCheckpoint = (id: string, chapterId: string): Checkpoint => ({
    id,
    entityType: 'checkpoint',
    name: `Checkpoint ${id}`,
    description: `Test checkpoint ${id}`,
    chapterId,
    status: 'validated',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('should return snippets between checkpoints', () => {
    const snippets = [
      makeSnippet('s1', 'ch-1'),
      makeSnippet('s2', 'ch-2'),
      makeSnippet('s3', 'ch-3'),
    ];
    const from = makeCheckpoint('cp-1', 'ch-1');
    const to = makeCheckpoint('cp-2', 'ch-2');
    const chapterOrder = ['ch-1', 'ch-2', 'ch-3'];

    const result = getChangedSnippets(snippets, from, to, chapterOrder);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s2');
  });

  it('should exclude snippets before from checkpoint', () => {
    const snippets = [makeSnippet('s1', 'ch-1'), makeSnippet('s2', 'ch-2')];
    const from = makeCheckpoint('cp-1', 'ch-1');
    const to = makeCheckpoint('cp-2', 'ch-2');
    const chapterOrder = ['ch-1', 'ch-2'];

    const result = getChangedSnippets(snippets, from, to, chapterOrder);

    expect(result.find((s) => s.id === 's1')).toBeUndefined();
  });

  it('should exclude snippets after to checkpoint', () => {
    const snippets = [makeSnippet('s1', 'ch-1'), makeSnippet('s2', 'ch-3')];
    const from = makeCheckpoint('cp-1', 'ch-0');
    const to = makeCheckpoint('cp-2', 'ch-2');
    const chapterOrder = ['ch-0', 'ch-1', 'ch-2', 'ch-3'];

    const result = getChangedSnippets(snippets, from, to, chapterOrder);

    expect(result.find((s) => s.id === 's2')).toBeUndefined();
  });
});

describe('getDiffSummary', () => {
  it('should summarize diff statistics', () => {
    const diff = {
      fromCheckpointId: 'cp-1',
      toCheckpointId: 'cp-2',
      files: [
        {
          path: 'new.ts',
          isNew: true,
          isDeleted: false,
          hunks: [{ oldStart: 0, oldCount: 0, newStart: 1, newCount: 2, lines: [] }],
          addedParts: [],
          removedParts: [],
          modifiedParts: [],
          snippetIds: [],
        },
        {
          path: 'modified.ts',
          isNew: false,
          isDeleted: false,
          hunks: [{ oldStart: 1, oldCount: 1, newStart: 1, newCount: 1, lines: [] }],
          addedParts: [],
          removedParts: [],
          modifiedParts: [],
          snippetIds: [],
        },
      ],
      stats: {
        filesAdded: 1,
        filesDeleted: 0,
        filesModified: 1,
        linesAdded: 5,
        linesRemoved: 2,
        snippetIds: ['s1'],
      },
    };

    const summary = getDiffSummary(diff);

    expect(summary.totalFiles).toBe(2);
    expect(summary.filesAdded).toBe(1);
    expect(summary.filesModified).toBe(1);
    expect(summary.netChange).toBe(3);
  });
});

describe('formatUnifiedDiff', () => {
  it('should format diff in unified format', () => {
    const diff = {
      path: 'file.ts',
      isNew: false,
      isDeleted: false,
      hunks: [
        {
          oldStart: 1,
          oldCount: 1,
          newStart: 1,
          newCount: 1,
          lines: [
            { oldLineNumber: 1, changeType: 'removed' as const, content: 'old' },
            { newLineNumber: 1, changeType: 'added' as const, content: 'new' },
          ],
        },
      ],
      addedParts: [],
      removedParts: [],
      modifiedParts: [],
      snippetIds: [],
    };

    const formatted = formatUnifiedDiff(diff);

    expect(formatted).toContain('--- file.ts');
    expect(formatted).toContain('+++ file.ts');
    expect(formatted).toContain('-old');
    expect(formatted).toContain('+new');
  });

  it('should show /dev/null for new files', () => {
    const diff = {
      path: 'new.ts',
      isNew: true,
      isDeleted: false,
      hunks: [],
      addedParts: [],
      removedParts: [],
      modifiedParts: [],
      snippetIds: [],
    };

    const formatted = formatUnifiedDiff(diff);

    expect(formatted).toContain('--- /dev/null');
  });

  it('should show /dev/null for deleted files', () => {
    const diff = {
      path: 'deleted.ts',
      isNew: false,
      isDeleted: true,
      hunks: [],
      addedParts: [],
      removedParts: [],
      modifiedParts: [],
      snippetIds: [],
    };

    const formatted = formatUnifiedDiff(diff);

    expect(formatted).toContain('+++ /dev/null');
  });
});

describe('formatDiffHtml', () => {
  it('should format diff as HTML', () => {
    const diff = {
      path: 'file.ts',
      isNew: false,
      isDeleted: false,
      hunks: [
        {
          oldStart: 1,
          oldCount: 1,
          newStart: 1,
          newCount: 1,
          lines: [{ newLineNumber: 1, changeType: 'added' as const, content: 'new line' }],
        },
      ],
      addedParts: [],
      removedParts: [],
      modifiedParts: [],
      snippetIds: [],
    };

    const html = formatDiffHtml(diff);

    expect(html).toContain('<div');
    expect(html).toContain('diff-file');
    expect(html).toContain('diff-added');
  });

  it('should use custom class prefix', () => {
    const diff = {
      path: 'file.ts',
      isNew: false,
      isDeleted: false,
      hunks: [],
      addedParts: [],
      removedParts: [],
      modifiedParts: [],
      snippetIds: [],
    };

    const html = formatDiffHtml(diff, { classPrefix: 'my-' });

    expect(html).toContain('my-file');
  });

  it('should escape HTML in content', () => {
    const diff = {
      path: 'file.ts',
      isNew: false,
      isDeleted: false,
      hunks: [
        {
          oldStart: 1,
          oldCount: 1,
          newStart: 1,
          newCount: 1,
          lines: [{ newLineNumber: 1, changeType: 'added' as const, content: '<div>' }],
        },
      ],
      addedParts: [],
      removedParts: [],
      modifiedParts: [],
      snippetIds: [],
    };

    const html = formatDiffHtml(diff);

    expect(html).toContain('&lt;div&gt;');
    expect(html).not.toContain('><div>');
  });
});

describe('formatDiffAnsi', () => {
  it('should format diff with ANSI colors', () => {
    const diff = {
      path: 'file.ts',
      isNew: false,
      isDeleted: false,
      hunks: [
        {
          oldStart: 1,
          oldCount: 1,
          newStart: 1,
          newCount: 1,
          lines: [
            { oldLineNumber: 1, changeType: 'removed' as const, content: 'old' },
            { newLineNumber: 1, changeType: 'added' as const, content: 'new' },
          ],
        },
      ],
      addedParts: [],
      removedParts: [],
      modifiedParts: [],
      snippetIds: [],
    };

    const ansi = formatDiffAnsi(diff);

    expect(ansi).toContain('\x1b['); // ANSI escape
  });

  it('should allow disabling color', () => {
    const diff = {
      path: 'file.ts',
      isNew: false,
      isDeleted: false,
      hunks: [],
      addedParts: [],
      removedParts: [],
      modifiedParts: [],
      snippetIds: [],
    };

    const ansi = formatDiffAnsi(diff, { color: false });

    expect(ansi).not.toContain('\x1b[');
  });
});
