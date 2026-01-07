/**
 * Tests for checkpoint snapshots
 */

import { describe, expect, it, beforeEach } from 'vitest';

import type { Checkpoint, TangledFile, TangleResult } from '@repo/techbook-types';

import {
  createSnapshot,
  createSnapshotStorage,
  compareToSnapshot,
  getFileDiffs,
  getChangesSummary,
  verifySnapshotIntegrity,
  hashContent,
  combineHashes,
  createFileHashes,
  type SnapshotStorage,
} from './snapshots';

describe('Snapshot utilities', () => {
  describe('hashContent', () => {
    it('should produce consistent hashes', () => {
      const content = 'Hello, World!';
      expect(hashContent(content)).toBe(hashContent(content));
    });

    it('should produce different hashes for different content', () => {
      expect(hashContent('Hello')).not.toBe(hashContent('World'));
    });

    it('should handle empty strings', () => {
      expect(hashContent('')).toBeDefined();
      expect(hashContent('')).toBe(hashContent(''));
    });

    it('should handle unicode content', () => {
      const hash = hashContent('日本語テスト 🎉');
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('combineHashes', () => {
    it('should produce consistent combined hashes', () => {
      const hashes = { 'a.ts': 'abc123', 'b.ts': 'def456' };
      expect(combineHashes(hashes)).toBe(combineHashes(hashes));
    });

    it('should be order-independent (sorts by path)', () => {
      const hashes1 = { 'b.ts': 'def456', 'a.ts': 'abc123' };
      const hashes2 = { 'a.ts': 'abc123', 'b.ts': 'def456' };
      expect(combineHashes(hashes1)).toBe(combineHashes(hashes2));
    });

    it('should produce different hashes for different file sets', () => {
      const hashes1 = { 'a.ts': 'abc123' };
      const hashes2 = { 'a.ts': 'abc123', 'b.ts': 'def456' };
      expect(combineHashes(hashes1)).not.toBe(combineHashes(hashes2));
    });

    it('should handle empty object', () => {
      expect(combineHashes({})).toBeDefined();
    });
  });

  describe('createFileHashes', () => {
    it('should create hashes from tangled files', () => {
      const files: TangledFile[] = [
        {
          path: 'src/main.ts',
          content: 'console.log("Hello");',
          parts: [],
          sourceSnippetIds: ['s1'],
          contentHash: 'existing-hash',
        },
        {
          path: 'src/lib.ts',
          content: 'export const x = 1;',
          parts: [],
          sourceSnippetIds: ['s2'],
        },
      ];

      const hashes = createFileHashes(files);

      expect(hashes['src/main.ts']).toBe('existing-hash'); // Uses existing hash
      expect(hashes['src/lib.ts']).toBeDefined(); // Computes hash
    });

    it('should compute hash when not provided', () => {
      const files: TangledFile[] = [
        {
          path: 'src/test.ts',
          content: 'const x = 1;',
          parts: [],
          sourceSnippetIds: [],
        },
      ];

      const hashes = createFileHashes(files);
      expect(hashes['src/test.ts']).toBe(hashContent('const x = 1;'));
    });
  });
});

describe('Snapshot creation', () => {
  const createTestCheckpoint = (overrides: Partial<Checkpoint> = {}): Checkpoint => ({
    id: 'cp-001',
    entityType: 'checkpoint',
    name: 'test-checkpoint',
    description: 'Test checkpoint',
    chapterId: 'ch01',
    status: 'validated',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const createTestTangleResult = (files: TangledFile[] = []): TangleResult => ({
    success: true,
    files,
    errors: [],
    tangledAt: '2024-01-01T00:00:00Z',
  });

  it('should create a snapshot from checkpoint and tangle result', () => {
    const checkpoint = createTestCheckpoint();
    const tangleResult = createTestTangleResult([
      {
        path: 'src/main.ts',
        content: 'const x = 1;',
        parts: [],
        sourceSnippetIds: ['s1'],
      },
    ]);

    const snapshot = createSnapshot(checkpoint, tangleResult);

    expect(snapshot.checkpointId).toBe(checkpoint.id);
    expect(snapshot.createdAt).toBeDefined();
    expect(snapshot.contentHash).toBeDefined();
    expect(snapshot.fileHashes).toBeDefined();
    expect(snapshot.fileHashes['src/main.ts']).toBeDefined();
  });

  it('should include storage path when provided', () => {
    const checkpoint = createTestCheckpoint();
    const tangleResult = createTestTangleResult();

    const snapshot = createSnapshot(checkpoint, tangleResult, {
      storagePath: '/snapshots/cp-001',
    });

    expect(snapshot.storagePath).toBe('/snapshots/cp-001');
  });

  it('should create snapshot with multiple files', () => {
    const checkpoint = createTestCheckpoint();
    const tangleResult = createTestTangleResult([
      { path: 'src/a.ts', content: 'a', parts: [], sourceSnippetIds: [] },
      { path: 'src/b.ts', content: 'b', parts: [], sourceSnippetIds: [] },
      { path: 'src/c.ts', content: 'c', parts: [], sourceSnippetIds: [] },
    ]);

    const snapshot = createSnapshot(checkpoint, tangleResult);

    expect(Object.keys(snapshot.fileHashes)).toHaveLength(3);
    expect(snapshot.fileHashes['src/a.ts']).toBeDefined();
    expect(snapshot.fileHashes['src/b.ts']).toBeDefined();
    expect(snapshot.fileHashes['src/c.ts']).toBeDefined();
  });
});

describe('Snapshot comparison', () => {
  const createSnapshot = (fileHashes: Record<string, string>) => ({
    checkpointId: 'cp-001',
    createdAt: '2024-01-01T00:00:00Z',
    contentHash: combineHashes(fileHashes),
    fileHashes,
  });

  const createTangledFile = (path: string, content: string): TangledFile => ({
    path,
    content,
    parts: [],
    sourceSnippetIds: [],
    contentHash: hashContent(content),
  });

  describe('compareToSnapshot', () => {
    it('should detect matching state', () => {
      const snapshot = createSnapshot({
        'src/main.ts': hashContent('const x = 1;'),
      });
      const currentFiles = [createTangledFile('src/main.ts', 'const x = 1;')];

      const result = compareToSnapshot(snapshot, currentFiles);

      expect(result.matches).toBe(true);
      expect(result.addedFiles).toHaveLength(0);
      expect(result.removedFiles).toHaveLength(0);
      expect(result.modifiedFiles).toHaveLength(0);
      expect(result.unchangedFiles).toEqual(['src/main.ts']);
    });

    it('should detect added files', () => {
      const snapshot = createSnapshot({
        'src/main.ts': hashContent('const x = 1;'),
      });
      const currentFiles = [
        createTangledFile('src/main.ts', 'const x = 1;'),
        createTangledFile('src/new.ts', 'const y = 2;'),
      ];

      const result = compareToSnapshot(snapshot, currentFiles);

      expect(result.matches).toBe(false);
      expect(result.addedFiles).toEqual(['src/new.ts']);
    });

    it('should detect removed files', () => {
      const snapshot = createSnapshot({
        'src/main.ts': hashContent('const x = 1;'),
        'src/old.ts': hashContent('const z = 3;'),
      });
      const currentFiles = [createTangledFile('src/main.ts', 'const x = 1;')];

      const result = compareToSnapshot(snapshot, currentFiles);

      expect(result.matches).toBe(false);
      expect(result.removedFiles).toEqual(['src/old.ts']);
    });

    it('should detect modified files', () => {
      const snapshot = createSnapshot({
        'src/main.ts': hashContent('const x = 1;'),
      });
      const currentFiles = [createTangledFile('src/main.ts', 'const x = 999;')];

      const result = compareToSnapshot(snapshot, currentFiles);

      expect(result.matches).toBe(false);
      expect(result.modifiedFiles).toEqual(['src/main.ts']);
    });

    it('should detect multiple types of changes', () => {
      const snapshot = createSnapshot({
        'src/unchanged.ts': hashContent('unchanged'),
        'src/modified.ts': hashContent('original'),
        'src/removed.ts': hashContent('to be removed'),
      });
      const currentFiles = [
        createTangledFile('src/unchanged.ts', 'unchanged'),
        createTangledFile('src/modified.ts', 'modified!'),
        createTangledFile('src/added.ts', 'new file'),
      ];

      const result = compareToSnapshot(snapshot, currentFiles);

      expect(result.matches).toBe(false);
      expect(result.unchangedFiles).toEqual(['src/unchanged.ts']);
      expect(result.modifiedFiles).toEqual(['src/modified.ts']);
      expect(result.removedFiles).toEqual(['src/removed.ts']);
      expect(result.addedFiles).toEqual(['src/added.ts']);
    });

    it('should sort file lists', () => {
      const snapshot = createSnapshot({
        'src/z.ts': hashContent('z'),
        'src/a.ts': hashContent('a'),
      });
      const currentFiles = [
        createTangledFile('src/z.ts', 'z'),
        createTangledFile('src/a.ts', 'a'),
      ];

      const result = compareToSnapshot(snapshot, currentFiles);

      expect(result.unchangedFiles).toEqual(['src/a.ts', 'src/z.ts']);
    });
  });

  describe('getFileDiffs', () => {
    it('should return detailed diffs for all files', () => {
      const snapshot = createSnapshot({
        'src/unchanged.ts': hashContent('unchanged'),
        'src/modified.ts': hashContent('original'),
        'src/removed.ts': hashContent('removed'),
      });
      const currentFiles = [
        createTangledFile('src/unchanged.ts', 'unchanged'),
        createTangledFile('src/modified.ts', 'modified!'),
        createTangledFile('src/added.ts', 'added'),
      ];

      const diffs = getFileDiffs(snapshot, currentFiles);

      expect(diffs).toHaveLength(4);

      const added = diffs.find((d) => d.path === 'src/added.ts');
      expect(added?.changeType).toBe('added');
      expect(added?.snapshotHash).toBeUndefined();
      expect(added?.currentHash).toBeDefined();

      const removed = diffs.find((d) => d.path === 'src/removed.ts');
      expect(removed?.changeType).toBe('removed');
      expect(removed?.snapshotHash).toBeDefined();
      expect(removed?.currentHash).toBeUndefined();

      const modified = diffs.find((d) => d.path === 'src/modified.ts');
      expect(modified?.changeType).toBe('modified');
      expect(modified?.snapshotHash).not.toBe(modified?.currentHash);

      const unchanged = diffs.find((d) => d.path === 'src/unchanged.ts');
      expect(unchanged?.changeType).toBe('unchanged');
      expect(unchanged?.snapshotHash).toBe(unchanged?.currentHash);
    });

    it('should sort diffs by path', () => {
      const snapshot = createSnapshot({
        'src/z.ts': hashContent('z'),
        'src/a.ts': hashContent('a'),
      });
      const currentFiles = [
        createTangledFile('src/z.ts', 'z'),
        createTangledFile('src/a.ts', 'a'),
      ];

      const diffs = getFileDiffs(snapshot, currentFiles);

      expect(diffs[0].path).toBe('src/a.ts');
      expect(diffs[1].path).toBe('src/z.ts');
    });
  });

  describe('getChangesSummary', () => {
    it('should provide summary of changes', () => {
      const snapshot = createSnapshot({
        'src/unchanged.ts': hashContent('unchanged'),
        'src/modified.ts': hashContent('original'),
        'src/removed.ts': hashContent('removed'),
      });
      const currentFiles = [
        createTangledFile('src/unchanged.ts', 'unchanged'),
        createTangledFile('src/modified.ts', 'modified!'),
        createTangledFile('src/added.ts', 'added'),
      ];

      const summary = getChangesSummary(snapshot, currentFiles);

      expect(summary.snapshotFileCount).toBe(3);
      expect(summary.currentFileCount).toBe(3);
      expect(summary.addedCount).toBe(1);
      expect(summary.removedCount).toBe(1);
      expect(summary.modifiedCount).toBe(1);
      expect(summary.unchangedCount).toBe(1);
      expect(summary.matches).toBe(false);
    });

    it('should report matches when identical', () => {
      const snapshot = createSnapshot({
        'src/main.ts': hashContent('content'),
      });
      const currentFiles = [createTangledFile('src/main.ts', 'content')];

      const summary = getChangesSummary(snapshot, currentFiles);

      expect(summary.matches).toBe(true);
      expect(summary.addedCount).toBe(0);
      expect(summary.removedCount).toBe(0);
      expect(summary.modifiedCount).toBe(0);
      expect(summary.unchangedCount).toBe(1);
    });
  });
});

describe('Snapshot integrity', () => {
  describe('verifySnapshotIntegrity', () => {
    it('should return true for valid snapshot', () => {
      const fileHashes = {
        'src/main.ts': hashContent('content'),
      };
      const snapshot = {
        checkpointId: 'cp-001',
        createdAt: '2024-01-01T00:00:00Z',
        contentHash: combineHashes(fileHashes),
        fileHashes,
      };

      expect(verifySnapshotIntegrity(snapshot)).toBe(true);
    });

    it('should return false for corrupted content hash', () => {
      const fileHashes = {
        'src/main.ts': hashContent('content'),
      };
      const snapshot = {
        checkpointId: 'cp-001',
        createdAt: '2024-01-01T00:00:00Z',
        contentHash: 'corrupted-hash',
        fileHashes,
      };

      expect(verifySnapshotIntegrity(snapshot)).toBe(false);
    });

    it('should detect if file hashes were modified', () => {
      const fileHashes = {
        'src/main.ts': hashContent('content'),
      };
      const snapshot = {
        checkpointId: 'cp-001',
        createdAt: '2024-01-01T00:00:00Z',
        contentHash: combineHashes(fileHashes),
        fileHashes: {
          'src/main.ts': hashContent('different-content'),
        },
      };

      expect(verifySnapshotIntegrity(snapshot)).toBe(false);
    });
  });
});

describe('SnapshotStorage', () => {
  let storage: SnapshotStorage;

  beforeEach(() => {
    storage = createSnapshotStorage();
  });

  const createTestSnapshot = (checkpointId: string) => ({
    checkpointId,
    createdAt: new Date().toISOString(),
    contentHash: 'test-hash',
    fileHashes: { 'src/main.ts': 'file-hash' },
  });

  it('should store and retrieve snapshots', () => {
    const snapshot = createTestSnapshot('cp-001');
    storage.store(snapshot);

    const retrieved = storage.get('cp-001');
    expect(retrieved).toEqual(snapshot);
  });

  it('should return undefined for non-existent snapshot', () => {
    expect(storage.get('non-existent')).toBeUndefined();
  });

  it('should get all snapshots', () => {
    storage.store(createTestSnapshot('cp-001'));
    storage.store(createTestSnapshot('cp-002'));

    expect(storage.getAll()).toHaveLength(2);
  });

  it('should delete snapshots', () => {
    storage.store(createTestSnapshot('cp-001'));
    const deleted = storage.delete('cp-001');

    expect(deleted).toBe(true);
    expect(storage.get('cp-001')).toBeUndefined();
  });

  it('should return false when deleting non-existent', () => {
    expect(storage.delete('non-existent')).toBe(false);
  });

  it('should check if snapshot exists', () => {
    storage.store(createTestSnapshot('cp-001'));

    expect(storage.has('cp-001')).toBe(true);
    expect(storage.has('non-existent')).toBe(false);
  });

  it('should clear all snapshots', () => {
    storage.store(createTestSnapshot('cp-001'));
    storage.store(createTestSnapshot('cp-002'));
    storage.clear();

    expect(storage.size()).toBe(0);
  });

  it('should report correct size', () => {
    expect(storage.size()).toBe(0);
    storage.store(createTestSnapshot('cp-001'));
    expect(storage.size()).toBe(1);
  });

  it('should overwrite existing snapshot', () => {
    storage.store(createTestSnapshot('cp-001'));
    storage.store({
      ...createTestSnapshot('cp-001'),
      contentHash: 'new-hash',
    });

    expect(storage.size()).toBe(1);
    expect(storage.get('cp-001')?.contentHash).toBe('new-hash');
  });
});
