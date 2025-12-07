/**
 * Tests for version service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Content, ContentVersion } from '@repo/types';
import { createVersionService } from './service';
import type { VersionService } from './types';

/**
 * Create a mock content with versions for testing
 */
function createMockContent(versions: Partial<ContentVersion>[]): Content {
  const now = new Date().toISOString();
  const fullVersions: ContentVersion[] = versions.map((v, i) => ({
    version: v.version ?? i + 1,
    text: v.text ?? '',
    wordCount: v.wordCount ?? (v.text?.split(/\s+/).filter(Boolean).length ?? 0),
    source: v.source ?? 'edited',
    previousVersion: v.previousVersion ?? (i > 0 ? i : undefined),
    metadata: v.metadata,
    createdAt: v.createdAt ?? new Date(Date.now() - (versions.length - i) * 60000).toISOString(),
  }));

  const currentVersion = fullVersions[fullVersions.length - 1];

  return {
    id: 'test-content-id',
    structureId: 'test-structure-id',
    currentVersion: currentVersion?.version ?? 1,
    versions: fullVersions,
    text: currentVersion?.text ?? '',
    status: 'draft',
    reviews: [],
    generationHistory: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('VersionService', () => {
  let service: VersionService;

  beforeEach(() => {
    service = createVersionService();
  });

  describe('computeDiffHunks', () => {
    it('should return empty array for identical texts', () => {
      const text = 'Hello world\nThis is a test';
      const hunks = service.computeDiffHunks(text, text);
      expect(hunks).toEqual([]);
    });

    it('should detect added lines', () => {
      const from = 'Line 1\nLine 2';
      const to = 'Line 1\nLine 2\nLine 3';
      const hunks = service.computeDiffHunks(from, to, 0);

      expect(hunks.length).toBeGreaterThan(0);
      const addHunk = hunks.find((h) => h.type === 'add');
      expect(addHunk).toBeDefined();
      expect(addHunk?.lines).toContain('Line 3');
    });

    it('should detect removed lines', () => {
      const from = 'Line 1\nLine 2\nLine 3';
      const to = 'Line 1\nLine 2';
      const hunks = service.computeDiffHunks(from, to, 0);

      expect(hunks.length).toBeGreaterThan(0);
      const removeHunk = hunks.find((h) => h.type === 'remove');
      expect(removeHunk).toBeDefined();
      expect(removeHunk?.lines).toContain('Line 3');
    });

    it('should include context lines when specified', () => {
      const from = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const to = 'Line 1\nLine 2\nModified Line 3\nLine 4\nLine 5';
      const hunks = service.computeDiffHunks(from, to, 2);

      expect(hunks.length).toBeGreaterThan(0);
    });
  });

  describe('computeWordDiffs', () => {
    it('should return single unchanged for identical texts', () => {
      const text = 'Hello world';
      const diffs = service.computeWordDiffs(text, text);

      const unchanged = diffs.filter((d) => d.type === 'unchanged');
      expect(unchanged.length).toBeGreaterThan(0);
    });

    it('should detect added words', () => {
      const from = 'Hello world';
      const to = 'Hello beautiful world';
      const diffs = service.computeWordDiffs(from, to);

      const added = diffs.filter((d) => d.type === 'add');
      expect(added.some((d) => d.text === 'beautiful')).toBe(true);
    });

    it('should detect removed words', () => {
      const from = 'Hello beautiful world';
      const to = 'Hello world';
      const diffs = service.computeWordDiffs(from, to);

      const removed = diffs.filter((d) => d.type === 'remove');
      expect(removed.some((d) => d.text === 'beautiful')).toBe(true);
    });
  });

  describe('getDiff', () => {
    it('should return undefined for non-existent versions', () => {
      const content = createMockContent([{ text: 'Version 1' }]);

      const diff = service.getDiff(content, 1, 99);
      expect(diff).toBeUndefined();
    });

    it('should calculate diff between two versions', () => {
      const content = createMockContent([
        { text: 'Hello world', version: 1 },
        { text: 'Hello beautiful world', version: 2 },
      ]);

      const diff = service.getDiff(content, 1, 2);

      expect(diff).toBeDefined();
      expect(diff?.contentId).toBe('test-content-id');
      expect(diff?.fromVersion).toBe(1);
      expect(diff?.toVersion).toBe(2);
      expect(diff?.stats).toBeDefined();
    });

    it('should include time delta', () => {
      const content = createMockContent([
        { text: 'Version 1', version: 1, createdAt: '2024-01-01T10:00:00Z' },
        { text: 'Version 2', version: 2, createdAt: '2024-01-01T11:00:00Z' },
      ]);

      const diff = service.getDiff(content, 1, 2);

      expect(diff?.timeDelta).toBeDefined();
      expect(diff?.timeDelta?.durationMs).toBe(60 * 60 * 1000); // 1 hour
    });

    it('should include source information', () => {
      const content = createMockContent([
        { text: 'Generated text', version: 1, source: 'generated' },
        { text: 'Edited text', version: 2, source: 'edited' },
      ]);

      const diff = service.getDiff(content, 1, 2);

      expect(diff?.sources).toEqual({
        from: 'generated',
        to: 'edited',
      });
    });

    it('should calculate change percentage', () => {
      const content = createMockContent([
        { text: 'Line 1\nLine 2\nLine 3\nLine 4', version: 1 },
        { text: 'Line 1\nModified\nLine 3\nLine 4', version: 2 },
      ]);

      const diff = service.getDiff(content, 1, 2);

      expect(diff?.stats.changePercent).toBeGreaterThan(0);
      expect(diff?.stats.changePercent).toBeLessThanOrEqual(100);
    });
  });

  describe('getComparison', () => {
    it('should return undefined for non-existent versions', () => {
      const content = createMockContent([{ text: 'Version 1' }]);

      const comparison = service.getComparison(content, 1, 99);
      expect(comparison).toBeUndefined();
    });

    it('should include diff and summary', () => {
      const content = createMockContent([
        { text: 'Hello world', version: 1 },
        { text: 'Hello beautiful world', version: 2 },
      ]);

      const comparison = service.getComparison(content, 1, 2);

      expect(comparison).toBeDefined();
      expect(comparison?.diff).toBeDefined();
      expect(comparison?.summary).toBeDefined();
      expect(comparison?.summary?.description).toContain('line');
    });

    it('should include word diffs when requested', () => {
      const content = createMockContent([
        { text: 'Hello world', version: 1 },
        { text: 'Hello beautiful world', version: 2 },
      ]);

      const comparison = service.getComparison(content, 1, 2, true);

      expect(comparison?.wordDiffs).toBeDefined();
    });

    it('should mark major changes appropriately', () => {
      // Create content with significant changes
      const originalText = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');
      const modifiedText = Array.from({ length: 50 }, (_, i) =>
        i < 25 ? `Modified Line ${i + 1}` : `Line ${i + 1}`
      ).join('\n');

      const content = createMockContent([
        { text: originalText, version: 1 },
        { text: modifiedText, version: 2 },
      ]);

      const comparison = service.getComparison(content, 1, 2);

      expect(comparison?.summary?.isMajor).toBe(true);
    });
  });

  describe('getHistory', () => {
    it('should return history with entries', () => {
      const content = createMockContent([
        { text: 'Version 1', version: 1 },
        { text: 'Version 2 with more words', version: 2 },
        { text: 'Version 3 even longer text here', version: 3 },
      ]);

      const history = service.getHistory(content);

      expect(history.contentId).toBe('test-content-id');
      expect(history.currentVersion).toBe(3);
      expect(history.totalVersions).toBe(3);
      expect(history.entries.length).toBe(3);
    });

    it('should mark current version correctly', () => {
      const content = createMockContent([
        { text: 'Version 1', version: 1 },
        { text: 'Version 2', version: 2 },
      ]);

      const history = service.getHistory(content);

      const currentEntry = history.entries.find((e) => e.isCurrent);
      expect(currentEntry?.version.version).toBe(2);
    });

    it('should calculate word count deltas', () => {
      const content = createMockContent([
        { text: 'One two three', version: 1 }, // 3 words
        { text: 'One two three four five', version: 2 }, // 5 words
      ]);

      const history = service.getHistory(content);

      // Entry for version 2 should show +2 words
      const v2Entry = history.entries.find((e) => e.version.version === 2);
      expect(v2Entry?.wordCountDelta).toBe(2);
    });

    it('should respect limit parameter', () => {
      const content = createMockContent([
        { text: 'V1', version: 1 },
        { text: 'V2', version: 2 },
        { text: 'V3', version: 3 },
        { text: 'V4', version: 4 },
        { text: 'V5', version: 5 },
      ]);

      const history = service.getHistory(content, 2);

      expect(history.entries.length).toBe(2);
      // Should have most recent versions
      expect(history.entries[0].version.version).toBe(5);
      expect(history.entries[1].version.version).toBe(4);
    });

    it('should calculate statistics', () => {
      const content = createMockContent([
        { text: 'Version 1', version: 1, source: 'generated' },
        { text: 'Version 2', version: 2, source: 'edited' },
        { text: 'Version 3', version: 3, source: 'edited' },
      ]);

      const history = service.getHistory(content);

      expect(history.stats).toBeDefined();
      expect(history.stats.mostCommonSource).toBe('edited');
      expect(history.stats.firstVersionDate).toBeDefined();
      expect(history.stats.lastVersionDate).toBeDefined();
    });
  });

  describe('canRollback', () => {
    it('should allow rollback for valid versions', () => {
      const content = createMockContent([
        { text: 'Version 1', version: 1 },
        { text: 'Version 2', version: 2 },
      ]);

      const result = service.canRollback(content, 1);

      expect(result.canRollback).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent rollback on published content', () => {
      const content: Content = {
        ...createMockContent([{ text: 'V1', version: 1 }, { text: 'V2', version: 2 }]),
        status: 'published',
      };

      const result = service.canRollback(content, 1);

      expect(result.canRollback).toBe(false);
      expect(result.reason).toContain('published');
    });

    it('should prevent rollback on locked content', () => {
      const content: Content = {
        ...createMockContent([{ text: 'V1', version: 1 }, { text: 'V2', version: 2 }]),
        locked: true,
        lockReason: 'Test lock',
      };

      const result = service.canRollback(content, 1);

      expect(result.canRollback).toBe(false);
      expect(result.reason).toContain('locked');
    });

    it('should prevent rollback to non-existent version', () => {
      const content = createMockContent([{ text: 'V1', version: 1 }]);

      const result = service.canRollback(content, 99);

      expect(result.canRollback).toBe(false);
      expect(result.reason).toContain('does not exist');
    });

    it('should prevent rollback to current version', () => {
      const content = createMockContent([
        { text: 'V1', version: 1 },
        { text: 'V2', version: 2 },
      ]);

      const result = service.canRollback(content, 2);

      expect(result.canRollback).toBe(false);
      expect(result.reason).toContain('Already at this version');
    });
  });

  describe('getChangeSummary', () => {
    it('should return undefined for invalid versions', () => {
      const content = createMockContent([{ text: 'V1' }]);

      const summary = service.getChangeSummary(content, 1, 99);
      expect(summary).toBeUndefined();
    });

    it('should include source information', () => {
      const content = createMockContent([
        { text: 'Generated', version: 1, source: 'generated' },
        { text: 'Edited', version: 2, source: 'edited' },
      ]);

      const summary = service.getChangeSummary(content, 1, 2);

      expect(summary).toContain('generated');
      expect(summary).toContain('edited');
    });

    it('should include word count change', () => {
      const content = createMockContent([
        { text: 'One two three', version: 1 },
        { text: 'One two three four five', version: 2 },
      ]);

      const summary = service.getChangeSummary(content, 1, 2);

      expect(summary).toContain('+2');
      expect(summary).toContain('Word count');
    });

    it('should include time between versions', () => {
      const content = createMockContent([
        { text: 'V1', version: 1, createdAt: '2024-01-01T10:00:00Z' },
        { text: 'V2', version: 2, createdAt: '2024-01-01T12:30:00Z' },
      ]);

      const summary = service.getChangeSummary(content, 1, 2);

      expect(summary).toContain('Time between versions');
      expect(summary).toContain('2h');
    });
  });
});

describe('VersionService with custom config', () => {
  it('should respect custom context lines', () => {
    const service = createVersionService({ contextLines: 5 });

    const from = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10';
    const to = 'Line 1\nLine 2\nLine 3\nLine 4\nModified\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10';

    const hunks = service.computeDiffHunks(from, to);
    // With 5 context lines, we should see more context around the change
    expect(hunks.length).toBeGreaterThan(0);
  });

  it('should include word diffs by default when configured', () => {
    const service = createVersionService({ includeWordDiffs: true });

    const content = createMockContent([
      { text: 'Hello world', version: 1 },
      { text: 'Hello beautiful world', version: 2 },
    ]);

    const comparison = service.getComparison(content, 1, 2);
    expect(comparison?.wordDiffs).toBeDefined();
  });
});
