/**
 * Tests for checkpoint immutability
 */

import { describe, expect, it } from 'vitest';

import type { Checkpoint, Snippet, TangledFile } from '@repo/techbook-types';

import { hashContent, combineHashes } from './snapshots';
import {
  canModifyCheckpoint,
  canDeleteCheckpoint,
  canReleaseCheckpoint,
  canModifyChapter,
  getReleasedCheckpointsBefore,
  getAffectedReleasedCheckpoints,
  checkSnippetChange,
  validateReleasedCheckpoints,
  prepareRelease,
  type ImmutabilityContext,
} from './immutability';

describe('Checkpoint modification checks', () => {
  const createCheckpoint = (
    status: Checkpoint['status'],
    overrides: Partial<Checkpoint> = {}
  ): Checkpoint => ({
    id: 'cp-001',
    entityType: 'checkpoint',
    name: 'test-checkpoint',
    description: '',
    chapterId: 'ch01',
    status,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('canModifyCheckpoint', () => {
    it('should allow modifying pending checkpoint', () => {
      expect(canModifyCheckpoint(createCheckpoint('pending'))).toBe(true);
    });

    it('should allow modifying validated checkpoint', () => {
      expect(canModifyCheckpoint(createCheckpoint('validated'))).toBe(true);
    });

    it('should allow modifying failed checkpoint', () => {
      expect(canModifyCheckpoint(createCheckpoint('failed'))).toBe(true);
    });

    it('should not allow modifying released checkpoint', () => {
      expect(canModifyCheckpoint(createCheckpoint('released'))).toBe(false);
    });
  });

  describe('canDeleteCheckpoint', () => {
    it('should allow deleting pending checkpoint', () => {
      expect(canDeleteCheckpoint(createCheckpoint('pending'))).toBe(true);
    });

    it('should allow deleting validated checkpoint', () => {
      expect(canDeleteCheckpoint(createCheckpoint('validated'))).toBe(true);
    });

    it('should allow deleting failed checkpoint', () => {
      expect(canDeleteCheckpoint(createCheckpoint('failed'))).toBe(true);
    });

    it('should not allow deleting released checkpoint', () => {
      expect(canDeleteCheckpoint(createCheckpoint('released'))).toBe(false);
    });
  });

  describe('canReleaseCheckpoint', () => {
    it('should allow releasing validated checkpoint', () => {
      expect(canReleaseCheckpoint(createCheckpoint('validated'))).toBe(true);
    });

    it('should not allow releasing pending checkpoint', () => {
      expect(canReleaseCheckpoint(createCheckpoint('pending'))).toBe(false);
    });

    it('should not allow releasing failed checkpoint', () => {
      expect(canReleaseCheckpoint(createCheckpoint('failed'))).toBe(false);
    });

    it('should not allow releasing already released checkpoint', () => {
      expect(canReleaseCheckpoint(createCheckpoint('released'))).toBe(false);
    });
  });
});

describe('Chapter modification checks', () => {
  const createCheckpoint = (
    id: string,
    chapterId: string,
    status: Checkpoint['status']
  ): Checkpoint => ({
    id,
    entityType: 'checkpoint',
    name: `checkpoint-${id}`,
    description: '',
    chapterId,
    status,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });

  describe('getReleasedCheckpointsBefore', () => {
    const chapterOrder = ['ch01', 'ch02', 'ch03', 'ch04'];

    it('should return released checkpoints before target chapter', () => {
      const checkpoints = [
        createCheckpoint('cp1', 'ch01', 'released'),
        createCheckpoint('cp2', 'ch02', 'released'),
        createCheckpoint('cp3', 'ch03', 'pending'),
      ];

      const result = getReleasedCheckpointsBefore('ch03', checkpoints, chapterOrder);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['cp1', 'cp2']);
    });

    it('should not include checkpoints at or after target', () => {
      const checkpoints = [
        createCheckpoint('cp1', 'ch02', 'released'),
        createCheckpoint('cp2', 'ch03', 'released'),
      ];

      const result = getReleasedCheckpointsBefore('ch02', checkpoints, chapterOrder);

      expect(result).toHaveLength(0);
    });

    it('should only include released checkpoints', () => {
      const checkpoints = [
        createCheckpoint('cp1', 'ch01', 'released'),
        createCheckpoint('cp2', 'ch01', 'validated'),
        createCheckpoint('cp3', 'ch02', 'pending'),
      ];

      const result = getReleasedCheckpointsBefore('ch03', checkpoints, chapterOrder);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cp1');
    });

    it('should return empty for first chapter', () => {
      const checkpoints = [createCheckpoint('cp1', 'ch01', 'released')];

      const result = getReleasedCheckpointsBefore('ch01', checkpoints, chapterOrder);

      expect(result).toHaveLength(0);
    });

    it('should return empty for unknown chapter', () => {
      const checkpoints = [createCheckpoint('cp1', 'ch01', 'released')];

      const result = getReleasedCheckpointsBefore('unknown', checkpoints, chapterOrder);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAffectedReleasedCheckpoints', () => {
    const chapterOrder = ['ch01', 'ch02', 'ch03', 'ch04'];

    it('should return released checkpoints at or after modified chapter', () => {
      const checkpoints = [
        createCheckpoint('cp1', 'ch01', 'released'),
        createCheckpoint('cp2', 'ch02', 'released'),
        createCheckpoint('cp3', 'ch03', 'released'),
      ];

      const result = getAffectedReleasedCheckpoints('ch02', checkpoints, chapterOrder);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['cp2', 'cp3']);
    });

    it('should not include checkpoints before modified chapter', () => {
      const checkpoints = [
        createCheckpoint('cp1', 'ch01', 'released'),
        createCheckpoint('cp2', 'ch03', 'released'),
      ];

      const result = getAffectedReleasedCheckpoints('ch02', checkpoints, chapterOrder);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cp2');
    });

    it('should only include released checkpoints', () => {
      const checkpoints = [
        createCheckpoint('cp1', 'ch02', 'released'),
        createCheckpoint('cp2', 'ch02', 'validated'),
        createCheckpoint('cp3', 'ch03', 'pending'),
      ];

      const result = getAffectedReleasedCheckpoints('ch02', checkpoints, chapterOrder);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cp1');
    });

    it('should return empty for unknown chapter', () => {
      const checkpoints = [createCheckpoint('cp1', 'ch02', 'released')];

      const result = getAffectedReleasedCheckpoints('unknown', checkpoints, chapterOrder);

      expect(result).toHaveLength(0);
    });
  });

  describe('canModifyChapter', () => {
    const chapterOrder = ['ch01', 'ch02', 'ch03', 'ch04'];

    it('should allow modifying chapters with no affected released checkpoints', () => {
      // Released checkpoints at ch01 and ch02, but we want to modify ch03
      // ch03 is after both checkpoints, so no released checkpoints are affected
      const checkpoints = [
        createCheckpoint('cp1', 'ch01', 'released'),
        createCheckpoint('cp2', 'ch02', 'released'),
      ];

      const result = canModifyChapter('ch03', checkpoints, chapterOrder);

      expect(result.allowed).toBe(true);
      expect(result.blockingCheckpoints).toHaveLength(0);
    });

    it('should not allow modifying chapters with affected released checkpoints', () => {
      const checkpoints = [
        createCheckpoint('cp1', 'ch02', 'released'),
        createCheckpoint('cp2', 'ch03', 'released'),
      ];

      const result = canModifyChapter('ch02', checkpoints, chapterOrder);

      expect(result.allowed).toBe(false);
      expect(result.blockingCheckpoints).toHaveLength(2);
    });

    it('should return blocking checkpoints', () => {
      const checkpoints = [
        createCheckpoint('cp1', 'ch01', 'released'),
        createCheckpoint('cp2', 'ch02', 'released'),
      ];

      const result = canModifyChapter('ch01', checkpoints, chapterOrder);

      expect(result.blockingCheckpoints).toHaveLength(2);
      expect(result.blockingCheckpoints.map((c) => c.id)).toEqual(['cp1', 'cp2']);
    });
  });
});

describe('Snippet change validation', () => {
  const createCheckpoint = (
    id: string,
    chapterId: string,
    status: Checkpoint['status']
  ): Checkpoint => ({
    id,
    entityType: 'checkpoint',
    name: `checkpoint-${id}`,
    description: '',
    chapterId,
    status,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });

  const createSnippet = (chapterId: string): Snippet => ({
    id: 'snip-001',
    entityType: 'snippet',
    name: 'test-snippet',
    file: 'src/main.ts',
    operation: 'introduce',
    language: 'typescript',
    code: 'const x = 1;',
    chapterId,
    order: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });

  const createTangledFile = (content: string): TangledFile => ({
    path: 'src/main.ts',
    content,
    parts: [],
    sourceSnippetIds: [],
    contentHash: hashContent(content),
  });

  describe('checkSnippetChange', () => {
    it('should return valid when no released checkpoints affected', () => {
      const context: ImmutabilityContext = {
        checkpoints: [createCheckpoint('cp1', 'ch03', 'released')],
        chapterOrder: ['ch01', 'ch02', 'ch03'],
        snapshots: new Map(),
        tangleForCheckpoint: () => [],
      };

      const result = checkSnippetChange(createSnippet('ch01'), context);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect violation when released checkpoint affected', () => {
      const fileHashes = { 'src/main.ts': hashContent('original') };
      const snapshot = {
        checkpointId: 'cp1',
        createdAt: '2024-01-01T00:00:00Z',
        contentHash: combineHashes(fileHashes),
        fileHashes,
      };

      const context: ImmutabilityContext = {
        checkpoints: [createCheckpoint('cp1', 'ch02', 'released')],
        chapterOrder: ['ch01', 'ch02'],
        snapshots: new Map([['cp1', snapshot]]),
        tangleForCheckpoint: () => [createTangledFile('modified')],
      };

      const result = checkSnippetChange(createSnippet('ch01'), context);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].checkpointId).toBe('cp1');
      expect(result.violations[0].type).toBe('file_modified');
    });

    it('should skip checkpoints without snapshots', () => {
      const context: ImmutabilityContext = {
        checkpoints: [createCheckpoint('cp1', 'ch02', 'released')],
        chapterOrder: ['ch01', 'ch02'],
        snapshots: new Map(), // No snapshot
        tangleForCheckpoint: () => [],
      };

      const result = checkSnippetChange(createSnippet('ch01'), context);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should report file_removed when files are removed', () => {
      const fileHashes = {
        'src/main.ts': hashContent('content'),
        'src/removed.ts': hashContent('removed'),
      };
      const snapshot = {
        checkpointId: 'cp1',
        createdAt: '2024-01-01T00:00:00Z',
        contentHash: combineHashes(fileHashes),
        fileHashes,
      };

      const context: ImmutabilityContext = {
        checkpoints: [createCheckpoint('cp1', 'ch02', 'released')],
        chapterOrder: ['ch01', 'ch02'],
        snapshots: new Map([['cp1', snapshot]]),
        tangleForCheckpoint: () => [createTangledFile('content')], // Only main.ts
      };

      const result = checkSnippetChange(createSnippet('ch01'), context);

      expect(result.valid).toBe(false);
      expect(result.violations[0].type).toBe('file_removed');
      expect(result.violations[0].affectedFiles).toContain('src/removed.ts');
    });
  });

  describe('validateReleasedCheckpoints', () => {
    it('should return valid when all snapshots match', () => {
      const fileHashes = { 'src/main.ts': hashContent('content') };
      const snapshot = {
        checkpointId: 'cp1',
        createdAt: '2024-01-01T00:00:00Z',
        contentHash: combineHashes(fileHashes),
        fileHashes,
      };

      const context: ImmutabilityContext = {
        checkpoints: [createCheckpoint('cp1', 'ch01', 'released')],
        chapterOrder: ['ch01'],
        snapshots: new Map([['cp1', snapshot]]),
        tangleForCheckpoint: () => [createTangledFile('content')],
      };

      const result = validateReleasedCheckpoints(context);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should report violation for mismatched snapshot', () => {
      const fileHashes = { 'src/main.ts': hashContent('original') };
      const snapshot = {
        checkpointId: 'cp1',
        createdAt: '2024-01-01T00:00:00Z',
        contentHash: combineHashes(fileHashes),
        fileHashes,
      };

      const context: ImmutabilityContext = {
        checkpoints: [createCheckpoint('cp1', 'ch01', 'released')],
        chapterOrder: ['ch01'],
        snapshots: new Map([['cp1', snapshot]]),
        tangleForCheckpoint: () => [createTangledFile('modified')],
      };

      const result = validateReleasedCheckpoints(context);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('should report violation for missing snapshot', () => {
      const context: ImmutabilityContext = {
        checkpoints: [createCheckpoint('cp1', 'ch01', 'released')],
        chapterOrder: ['ch01'],
        snapshots: new Map(), // No snapshot
        tangleForCheckpoint: () => [],
      };

      const result = validateReleasedCheckpoints(context);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('behavior_changed');
      expect(result.violations[0].message).toContain('has no snapshot');
    });

    it('should skip non-released checkpoints', () => {
      const context: ImmutabilityContext = {
        checkpoints: [
          createCheckpoint('cp1', 'ch01', 'pending'),
          createCheckpoint('cp2', 'ch02', 'validated'),
        ],
        chapterOrder: ['ch01', 'ch02'],
        snapshots: new Map(),
        tangleForCheckpoint: () => [],
      };

      const result = validateReleasedCheckpoints(context);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});

describe('Release preparation', () => {
  const createCheckpoint = (status: Checkpoint['status']): Checkpoint => ({
    id: 'cp-001',
    entityType: 'checkpoint',
    name: 'test-checkpoint',
    description: '',
    chapterId: 'ch01',
    status,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });

  const createTangledFile = (content: string): TangledFile => ({
    path: 'src/main.ts',
    content,
    parts: [],
    sourceSnippetIds: [],
    contentHash: hashContent(content),
  });

  describe('prepareRelease', () => {
    it('should prepare release for validated checkpoint', () => {
      const checkpoint = createCheckpoint('validated');
      const tangleResult = { files: [createTangledFile('content')] };

      const result = prepareRelease(checkpoint, tangleResult);

      expect(result.success).toBe(true);
      expect(result.checkpoint).toBeDefined();
      expect(result.checkpoint?.status).toBe('released');
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot?.checkpointId).toBe(checkpoint.id);
    });

    it('should include storage path in snapshot', () => {
      const checkpoint = createCheckpoint('validated');
      const tangleResult = { files: [createTangledFile('content')] };

      const result = prepareRelease(checkpoint, tangleResult, '/snapshots/cp-001');

      expect(result.snapshot?.storagePath).toBe('/snapshots/cp-001');
    });

    it('should fail for pending checkpoint', () => {
      const checkpoint = createCheckpoint('pending');
      const tangleResult = { files: [] };

      const result = prepareRelease(checkpoint, tangleResult);

      expect(result.success).toBe(false);
      expect(result.error).toContain("'pending'");
      expect(result.error).toContain("Must be 'validated'");
    });

    it('should fail for failed checkpoint', () => {
      const checkpoint = createCheckpoint('failed');
      const tangleResult = { files: [] };

      const result = prepareRelease(checkpoint, tangleResult);

      expect(result.success).toBe(false);
      expect(result.error).toContain("'failed'");
    });

    it('should fail for already released checkpoint', () => {
      const checkpoint = createCheckpoint('released');
      const tangleResult = { files: [] };

      const result = prepareRelease(checkpoint, tangleResult);

      expect(result.success).toBe(false);
      expect(result.error).toContain("'released'");
    });

    it('should create snapshot with correct file hashes', () => {
      const checkpoint = createCheckpoint('validated');
      const tangleResult = {
        files: [
          createTangledFile('content1'),
          { ...createTangledFile('content2'), path: 'src/lib.ts' },
        ],
      };

      const result = prepareRelease(checkpoint, tangleResult);

      expect(result.snapshot?.fileHashes).toBeDefined();
      expect(Object.keys(result.snapshot?.fileHashes || {})).toHaveLength(2);
      expect(result.snapshot?.fileHashes['src/main.ts']).toBeDefined();
      expect(result.snapshot?.fileHashes['src/lib.ts']).toBeDefined();
    });
  });
});
