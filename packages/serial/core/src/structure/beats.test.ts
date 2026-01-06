/**
 * Tests for beat management module
 */

import { describe, expect, it, vi } from 'vitest';

import type { Beat, Structure } from '@repo/serial-types';

import {
  addBeat,
  cloneBeats,
  createBeat,
  distributeWordCount,
  estimateTotalWordCount,
  findBeatById,
  findBeatByOrder,
  getAggregatedBeatStats,
  getBeatStats,
  getCompletedBeats,
  getIncompleteBeats,
  getNextIncompleteBeat,
  insertBeatAt,
  markAllBeatsCompleted,
  markAllBeatsIncomplete,
  markBeatCompleted,
  moveBeat,
  normalizeOrders,
  removeBeat,
  reorderBeats,
  searchBeats,
  updateBeat,
  validateBeats,
} from './beats';

// Mock generateId for predictable IDs in tests
vi.mock('../storage/repository', () => ({
  generateId: vi.fn(() => 'generated-id-' + Math.random().toString(36).slice(2, 9)),
}));

// Helper to create a mock beat
function createMockBeat(id: string, description: string, order: number, completed: boolean = false, targetWordCount?: number): Beat {
  return {
    id,
    description,
    completed,
    order,
    targetWordCount,
  };
}

// Helper to create a mock structure
function createMockStructure(beats: Beat[]): Structure {
  const now = new Date().toISOString();
  return {
    id: 'struct-1',
    type: 'chapter',
    title: 'Test Chapter',
    summary: '',
    beats,
    order: 0,
    children: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe('beats', () => {
  describe('createBeat', () => {
    it('should create a beat with required fields', () => {
      const beat = createBeat({ description: 'Opening hook' }, 0);

      expect(beat.id).toBeDefined();
      expect(beat.description).toBe('Opening hook');
      expect(beat.order).toBe(0);
      expect(beat.completed).toBe(false);
      expect(beat.targetWordCount).toBeUndefined();
    });

    it('should create a beat with optional fields', () => {
      const beat = createBeat(
        { description: 'Action sequence', targetWordCount: 1500, completed: true },
        2
      );

      expect(beat.targetWordCount).toBe(1500);
      expect(beat.completed).toBe(true);
      expect(beat.order).toBe(2);
    });
  });

  describe('addBeat', () => {
    it('should add beat to empty array', () => {
      const beats = addBeat([], { description: 'First beat' });

      expect(beats).toHaveLength(1);
      expect(beats[0].description).toBe('First beat');
      expect(beats[0].order).toBe(0);
    });

    it('should add beat at end of existing array', () => {
      const existing = [
        createMockBeat('beat-1', 'First', 0),
        createMockBeat('beat-2', 'Second', 1),
      ];

      const beats = addBeat(existing, { description: 'Third beat' });

      expect(beats).toHaveLength(3);
      expect(beats[2].description).toBe('Third beat');
      expect(beats[2].order).toBe(2);
    });
  });

  describe('insertBeatAt', () => {
    it('should insert at beginning', () => {
      const existing = [
        createMockBeat('beat-1', 'First', 0),
        createMockBeat('beat-2', 'Second', 1),
      ];

      const beats = insertBeatAt(existing, { description: 'New first' }, 0);

      expect(beats).toHaveLength(3);
      expect(beats[0].description).toBe('New first');
      expect(beats[0].order).toBe(0);
      expect(beats[1].description).toBe('First');
      expect(beats[1].order).toBe(1);
      expect(beats[2].description).toBe('Second');
      expect(beats[2].order).toBe(2);
    });

    it('should insert in middle', () => {
      const existing = [
        createMockBeat('beat-1', 'First', 0),
        createMockBeat('beat-2', 'Third', 1),
      ];

      const beats = insertBeatAt(existing, { description: 'Second' }, 1);

      expect(beats).toHaveLength(3);
      expect(beats[0].order).toBe(0);
      expect(beats[1].description).toBe('Second');
      expect(beats[1].order).toBe(1);
      expect(beats[2].order).toBe(2);
    });

    it('should clamp position to valid range', () => {
      const existing = [createMockBeat('beat-1', 'First', 0)];

      // Position beyond array length
      const beats = insertBeatAt(existing, { description: 'Last' }, 100);

      expect(beats).toHaveLength(2);
      expect(beats[1].description).toBe('Last');
    });
  });

  describe('updateBeat', () => {
    it('should update beat fields', () => {
      const existing = [
        createMockBeat('beat-1', 'Original', 0),
      ];

      const beats = updateBeat(existing, 'beat-1', { description: 'Updated' });

      expect(beats?.[0].description).toBe('Updated');
    });

    it('should return undefined for non-existent beat', () => {
      const existing = [createMockBeat('beat-1', 'First', 0)];

      const beats = updateBeat(existing, 'non-existent', { description: 'Updated' });

      expect(beats).toBeUndefined();
    });

    it('should preserve other fields', () => {
      const existing = [
        createMockBeat('beat-1', 'Original', 0, false, 500),
      ];

      const beats = updateBeat(existing, 'beat-1', { completed: true });

      expect(beats?.[0].description).toBe('Original');
      expect(beats?.[0].targetWordCount).toBe(500);
      expect(beats?.[0].completed).toBe(true);
    });
  });

  describe('removeBeat', () => {
    it('should remove beat and update orders', () => {
      const existing = [
        createMockBeat('beat-1', 'First', 0),
        createMockBeat('beat-2', 'Second', 1),
        createMockBeat('beat-3', 'Third', 2),
      ];

      const beats = removeBeat(existing, 'beat-2');

      expect(beats).toHaveLength(2);
      expect(beats?.[0].id).toBe('beat-1');
      expect(beats?.[0].order).toBe(0);
      expect(beats?.[1].id).toBe('beat-3');
      expect(beats?.[1].order).toBe(1);
    });

    it('should return undefined for non-existent beat', () => {
      const existing = [createMockBeat('beat-1', 'First', 0)];

      const beats = removeBeat(existing, 'non-existent');

      expect(beats).toBeUndefined();
    });
  });

  describe('markBeatCompleted', () => {
    it('should mark beat as completed', () => {
      const existing = [createMockBeat('beat-1', 'First', 0, false)];

      const beats = markBeatCompleted(existing, 'beat-1', true);

      expect(beats?.[0].completed).toBe(true);
    });

    it('should mark beat as incomplete', () => {
      const existing = [createMockBeat('beat-1', 'First', 0, true)];

      const beats = markBeatCompleted(existing, 'beat-1', false);

      expect(beats?.[0].completed).toBe(false);
    });
  });

  describe('markAllBeatsCompleted/markAllBeatsIncomplete', () => {
    it('should mark all beats as completed', () => {
      const existing = [
        createMockBeat('beat-1', 'First', 0, false),
        createMockBeat('beat-2', 'Second', 1, false),
      ];

      const beats = markAllBeatsCompleted(existing);

      expect(beats.every((b) => b.completed)).toBe(true);
    });

    it('should mark all beats as incomplete', () => {
      const existing = [
        createMockBeat('beat-1', 'First', 0, true),
        createMockBeat('beat-2', 'Second', 1, true),
      ];

      const beats = markAllBeatsIncomplete(existing);

      expect(beats.every((b) => !b.completed)).toBe(true);
    });
  });

  describe('reorderBeats', () => {
    it('should reorder beats according to new order', () => {
      const existing = [
        createMockBeat('beat-a', 'A', 0),
        createMockBeat('beat-b', 'B', 1),
        createMockBeat('beat-c', 'C', 2),
      ];

      const beats = reorderBeats(existing, ['beat-c', 'beat-a', 'beat-b']);

      expect(beats[0].id).toBe('beat-c');
      expect(beats[0].order).toBe(0);
      expect(beats[1].id).toBe('beat-a');
      expect(beats[1].order).toBe(1);
      expect(beats[2].id).toBe('beat-b');
      expect(beats[2].order).toBe(2);
    });

    it('should handle missing IDs in order list', () => {
      const existing = [
        createMockBeat('beat-a', 'A', 0),
        createMockBeat('beat-b', 'B', 1),
        createMockBeat('beat-c', 'C', 2),
      ];

      // Only reorder two beats, third should be appended
      const beats = reorderBeats(existing, ['beat-c', 'beat-a']);

      expect(beats).toHaveLength(3);
      expect(beats[2].id).toBe('beat-b');
    });
  });

  describe('moveBeat', () => {
    it('should move beat to new position', () => {
      const existing = [
        createMockBeat('beat-a', 'A', 0),
        createMockBeat('beat-b', 'B', 1),
        createMockBeat('beat-c', 'C', 2),
      ];

      const beats = moveBeat(existing, 'beat-c', 0);

      expect(beats?.[0].id).toBe('beat-c');
      expect(beats?.[1].id).toBe('beat-a');
      expect(beats?.[2].id).toBe('beat-b');
    });

    it('should return undefined for non-existent beat', () => {
      const existing = [createMockBeat('beat-a', 'A', 0)];

      const beats = moveBeat(existing, 'non-existent', 0);

      expect(beats).toBeUndefined();
    });
  });

  describe('getBeatStats', () => {
    it('should calculate beat statistics', () => {
      const beats = [
        createMockBeat('beat-1', 'First', 0, true, 500),
        createMockBeat('beat-2', 'Second', 1, false, 1000),
        createMockBeat('beat-3', 'Third', 2, true),
      ];

      const stats = getBeatStats(beats);

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.incomplete).toBe(1);
      expect(stats.completionPercentage).toBe(67); // 2/3 rounded
      expect(stats.totalTargetWordCount).toBe(1500);
      expect(stats.averageTargetWordCount).toBe(750);
    });

    it('should handle empty array', () => {
      const stats = getBeatStats([]);

      expect(stats.total).toBe(0);
      expect(stats.completionPercentage).toBe(0);
    });
  });

  describe('getAggregatedBeatStats', () => {
    it('should aggregate stats across structures', () => {
      const struct1 = createMockStructure([
        createMockBeat('beat-1', 'A', 0, true),
        createMockBeat('beat-2', 'B', 1, false),
      ]);
      const struct2 = createMockStructure([
        createMockBeat('beat-3', 'C', 0, true),
      ]);

      const stats = getAggregatedBeatStats([struct1, struct2]);

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
    });
  });

  describe('validateBeats', () => {
    it('should pass for valid beats', () => {
      const beats = [
        createMockBeat('beat-1', 'First', 0, false, 500),
        createMockBeat('beat-2', 'Second', 1, false, 500),
      ];

      const issues = validateBeats(beats);

      expect(issues).toHaveLength(0);
    });

    it('should detect empty description', () => {
      const beats = [
        createMockBeat('beat-1', '', 0),
        createMockBeat('beat-2', '   ', 1),
      ];

      const issues = validateBeats(beats);

      expect(issues).toHaveLength(2);
      expect(issues.every((i) => i.issueType === 'empty_description')).toBe(true);
    });

    it('should detect duplicate orders', () => {
      const beats = [
        createMockBeat('beat-1', 'First', 0),
        createMockBeat('beat-2', 'Second', 0), // Duplicate order
      ];

      const issues = validateBeats(beats);

      expect(issues.some((i) => i.issueType === 'duplicate_order')).toBe(true);
    });

    it('should detect negative orders', () => {
      const beats = [createMockBeat('beat-1', 'First', -1)];

      const issues = validateBeats(beats);

      expect(issues.some((i) => i.issueType === 'invalid_order')).toBe(true);
    });

    it('should detect zero or negative word count', () => {
      const beats = [createMockBeat('beat-1', 'First', 0, false, 0)];

      const issues = validateBeats(beats);

      expect(issues.some((i) => i.issueType === 'zero_word_count')).toBe(true);
    });
  });

  describe('normalizeOrders', () => {
    it('should normalize to sequential orders starting from 0', () => {
      const beats = [
        createMockBeat('beat-a', 'A', 5),
        createMockBeat('beat-b', 'B', 10),
        createMockBeat('beat-c', 'C', 2),
      ];

      const normalized = normalizeOrders(beats);

      expect(normalized[0].id).toBe('beat-c');
      expect(normalized[0].order).toBe(0);
      expect(normalized[1].id).toBe('beat-a');
      expect(normalized[1].order).toBe(1);
      expect(normalized[2].id).toBe('beat-b');
      expect(normalized[2].order).toBe(2);
    });
  });

  describe('getIncompleteBeats/getCompletedBeats', () => {
    it('should filter incomplete beats', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0, true),
        createMockBeat('beat-2', 'B', 1, false),
        createMockBeat('beat-3', 'C', 2, false),
      ];

      const incomplete = getIncompleteBeats(beats);

      expect(incomplete).toHaveLength(2);
      expect(incomplete.every((b) => !b.completed)).toBe(true);
    });

    it('should filter completed beats', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0, true),
        createMockBeat('beat-2', 'B', 1, false),
        createMockBeat('beat-3', 'C', 2, true),
      ];

      const completed = getCompletedBeats(beats);

      expect(completed).toHaveLength(2);
      expect(completed.every((b) => b.completed)).toBe(true);
    });
  });

  describe('getNextIncompleteBeat', () => {
    it('should return first incomplete beat in order', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0, true),
        createMockBeat('beat-2', 'B', 1, false),
        createMockBeat('beat-3', 'C', 2, false),
      ];

      const next = getNextIncompleteBeat(beats);

      expect(next?.id).toBe('beat-2');
    });

    it('should return undefined when all completed', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0, true),
        createMockBeat('beat-2', 'B', 1, true),
      ];

      const next = getNextIncompleteBeat(beats);

      expect(next).toBeUndefined();
    });
  });

  describe('estimateTotalWordCount', () => {
    it('should sum target word counts', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0, false, 500),
        createMockBeat('beat-2', 'B', 1, false, 1000),
      ];

      const total = estimateTotalWordCount(beats);

      expect(total).toBe(1500);
    });

    it('should use default for beats without target', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0),
        createMockBeat('beat-2', 'B', 1),
      ];

      const total = estimateTotalWordCount(beats, 500);

      expect(total).toBe(1000);
    });
  });

  describe('distributeWordCount', () => {
    it('should distribute word count evenly', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0),
        createMockBeat('beat-2', 'B', 1),
      ];

      const distributed = distributeWordCount(beats, 1000);

      expect(distributed[0].targetWordCount).toBe(500);
      expect(distributed[1].targetWordCount).toBe(500);
    });

    it('should handle remainder', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0),
        createMockBeat('beat-2', 'B', 1),
        createMockBeat('beat-3', 'C', 2),
      ];

      const distributed = distributeWordCount(beats, 1000);

      // 333 * 3 = 999, remainder 1 goes to first beat
      expect(distributed[0].targetWordCount).toBe(334);
      expect(distributed[1].targetWordCount).toBe(333);
      expect(distributed[2].targetWordCount).toBe(333);
    });

    it('should handle empty array', () => {
      const distributed = distributeWordCount([], 1000);

      expect(distributed).toHaveLength(0);
    });
  });

  describe('cloneBeats', () => {
    it('should create new beats with new IDs', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0, true),
        createMockBeat('beat-2', 'B', 1, false),
      ];

      const cloned = cloneBeats(beats);

      expect(cloned).toHaveLength(2);
      expect(cloned[0].id).not.toBe('beat-1');
      expect(cloned[1].id).not.toBe('beat-2');
      expect(cloned[0].description).toBe('A');
      expect(cloned[1].description).toBe('B');
    });

    it('should reset completed status by default', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0, true),
      ];

      const cloned = cloneBeats(beats);

      expect(cloned[0].completed).toBe(false);
    });

    it('should preserve completed status if requested', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0, true),
      ];

      const cloned = cloneBeats(beats, false);

      expect(cloned[0].completed).toBe(true);
    });
  });

  describe('findBeatById', () => {
    it('should find beat by ID', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0),
        createMockBeat('beat-2', 'B', 1),
      ];

      const found = findBeatById(beats, 'beat-2');

      expect(found?.description).toBe('B');
    });

    it('should return undefined for not found', () => {
      const beats = [createMockBeat('beat-1', 'A', 0)];

      const found = findBeatById(beats, 'non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('findBeatByOrder', () => {
    it('should find beat by order', () => {
      const beats = [
        createMockBeat('beat-1', 'A', 0),
        createMockBeat('beat-2', 'B', 1),
      ];

      const found = findBeatByOrder(beats, 1);

      expect(found?.description).toBe('B');
    });

    it('should return undefined for not found', () => {
      const beats = [createMockBeat('beat-1', 'A', 0)];

      const found = findBeatByOrder(beats, 5);

      expect(found).toBeUndefined();
    });
  });

  describe('searchBeats', () => {
    it('should find beats by description', () => {
      const beats = [
        createMockBeat('beat-1', 'Opening hook', 0),
        createMockBeat('beat-2', 'Character introduction', 1),
        createMockBeat('beat-3', 'Closing hook', 2),
      ];

      const results = searchBeats(beats, 'hook');

      expect(results).toHaveLength(2);
      expect(results[0].description).toBe('Opening hook');
      expect(results[1].description).toBe('Closing hook');
    });

    it('should be case insensitive', () => {
      const beats = [
        createMockBeat('beat-1', 'ACTION SEQUENCE', 0),
      ];

      const results = searchBeats(beats, 'action');

      expect(results).toHaveLength(1);
    });

    it('should return results in order', () => {
      const beats = [
        createMockBeat('beat-1', 'Test A', 2),
        createMockBeat('beat-2', 'Test B', 0),
        createMockBeat('beat-3', 'Test C', 1),
      ];

      const results = searchBeats(beats, 'test');

      expect(results[0].order).toBe(0);
      expect(results[1].order).toBe(1);
      expect(results[2].order).toBe(2);
    });
  });
});
