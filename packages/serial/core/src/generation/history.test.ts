/**
 * Tests for generation history tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createGenerationHistoryStore,
  createHistoryEntry,
  historyEntryToRecord,
  type GenerationHistoryStore,
} from './history';
import type { GenerationOptions, PipelineState } from './types';

describe('createGenerationHistoryStore', () => {
  let store: GenerationHistoryStore;

  beforeEach(() => {
    store = createGenerationHistoryStore();
  });

  describe('add and get', () => {
    it('should add and retrieve an entry by ID', () => {
      const entry = createTestEntry('entry-1', 'structure-1');
      store.add(entry);

      const retrieved = store.get('entry-1');
      expect(retrieved).toEqual(entry);
    });

    it('should return undefined for non-existent entry', () => {
      const retrieved = store.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getForContent', () => {
    it('should retrieve entries by content ID', () => {
      const entry1 = createTestEntry('entry-1', 'structure-1', 'content-1');
      const entry2 = createTestEntry('entry-2', 'structure-1', 'content-1');
      const entry3 = createTestEntry('entry-3', 'structure-2', 'content-2');

      store.add(entry1);
      store.add(entry2);
      store.add(entry3);

      const entries = store.getForContent('content-1');
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.id)).toContain('entry-1');
      expect(entries.map((e) => e.id)).toContain('entry-2');
    });

    it('should return empty array for non-existent content', () => {
      const entries = store.getForContent('non-existent');
      expect(entries).toEqual([]);
    });

    it('should return entries sorted by date (newest first)', () => {
      const entry1 = createTestEntry('entry-1', 'structure-1', 'content-1');
      entry1.startedAt = '2024-01-01T00:00:00Z';

      const entry2 = createTestEntry('entry-2', 'structure-1', 'content-1');
      entry2.startedAt = '2024-01-02T00:00:00Z';

      store.add(entry1);
      store.add(entry2);

      const entries = store.getForContent('content-1');
      expect(entries[0].id).toBe('entry-2');
      expect(entries[1].id).toBe('entry-1');
    });
  });

  describe('getForStructure', () => {
    it('should retrieve entries by structure ID', () => {
      const entry1 = createTestEntry('entry-1', 'structure-1');
      const entry2 = createTestEntry('entry-2', 'structure-1');
      const entry3 = createTestEntry('entry-3', 'structure-2');

      store.add(entry1);
      store.add(entry2);
      store.add(entry3);

      const entries = store.getForStructure('structure-1');
      expect(entries).toHaveLength(2);
    });
  });

  describe('getRecent', () => {
    it('should return recent entries with default limit', () => {
      for (let i = 0; i < 15; i++) {
        const entry = createTestEntry(`entry-${i}`, 'structure-1');
        entry.startedAt = new Date(2024, 0, i + 1).toISOString();
        store.add(entry);
      }

      const recent = store.getRecent();
      expect(recent).toHaveLength(10); // Default limit
      expect(recent[0].id).toBe('entry-14'); // Most recent
    });

    it('should respect custom limit', () => {
      for (let i = 0; i < 10; i++) {
        store.add(createTestEntry(`entry-${i}`, 'structure-1'));
      }

      const recent = store.getRecent(5);
      expect(recent).toHaveLength(5);
    });
  });

  describe('getFailed', () => {
    it('should return only failed entries', () => {
      const successful = createTestEntry('success-1', 'structure-1');
      successful.success = true;

      const failed1 = createTestEntry('failed-1', 'structure-1');
      failed1.success = false;

      const failed2 = createTestEntry('failed-2', 'structure-1');
      failed2.success = false;

      store.add(successful);
      store.add(failed1);
      store.add(failed2);

      const failures = store.getFailed();
      expect(failures).toHaveLength(2);
      expect(failures.every((e) => !e.success)).toBe(true);
    });

    it('should respect limit', () => {
      for (let i = 0; i < 20; i++) {
        const entry = createTestEntry(`entry-${i}`, 'structure-1');
        entry.success = false;
        store.add(entry);
      }

      const failures = store.getFailed(5);
      expect(failures).toHaveLength(5);
    });
  });

  describe('getAll', () => {
    it('should return all entries', () => {
      store.add(createTestEntry('entry-1', 'structure-1'));
      store.add(createTestEntry('entry-2', 'structure-2'));
      store.add(createTestEntry('entry-3', 'structure-3'));

      const all = store.getAll();
      expect(all).toHaveLength(3);
    });

    it('should return entries sorted by date (newest first)', () => {
      const entry1 = createTestEntry('entry-1', 'structure-1');
      entry1.startedAt = '2024-01-01T00:00:00Z';

      const entry2 = createTestEntry('entry-2', 'structure-1');
      entry2.startedAt = '2024-01-03T00:00:00Z';

      const entry3 = createTestEntry('entry-3', 'structure-1');
      entry3.startedAt = '2024-01-02T00:00:00Z';

      store.add(entry1);
      store.add(entry2);
      store.add(entry3);

      const all = store.getAll();
      expect(all[0].id).toBe('entry-2');
      expect(all[1].id).toBe('entry-3');
      expect(all[2].id).toBe('entry-1');
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      store.add(createTestEntry('entry-1', 'structure-1'));
      store.add(createTestEntry('entry-2', 'structure-2'));

      store.clear();

      expect(store.getAll()).toHaveLength(0);
      expect(store.get('entry-1')).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should calculate correct statistics', () => {
      // Add successful entries
      for (let i = 0; i < 8; i++) {
        const entry = createTestEntry(`success-${i}`, 'structure-1');
        entry.success = true;
        entry.totalTokens = { prompt: 1000, completion: 500 };
        entry.totalDurationMs = 2000;
        store.add(entry);
      }

      // Add failed entries
      for (let i = 0; i < 2; i++) {
        const entry = createTestEntry(`failed-${i}`, 'structure-1');
        entry.success = false;
        entry.totalTokens = { prompt: 500, completion: 0 };
        entry.totalDurationMs = 1000;
        entry.error = { stage: 'draft', type: 'llm_error', message: 'Failed', retryable: true };
        store.add(entry);
      }

      const stats = store.getStats();

      expect(stats.totalAttempts).toBe(10);
      expect(stats.successCount).toBe(8);
      expect(stats.failureCount).toBe(2);
      expect(stats.successRate).toBe(80);
      expect(stats.totalTokens.prompt).toBe(9000); // 8*1000 + 2*500
      expect(stats.totalTokens.completion).toBe(4000); // 8*500 + 2*0
      expect(stats.averageDurationMs).toBe(1800); // (8*2000 + 2*1000) / 10
      expect(stats.failuresByStage.draft).toBe(2);
    });

    it('should handle empty store', () => {
      const stats = store.getStats();

      expect(stats.totalAttempts).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });
});

describe('createHistoryEntry', () => {
  it('should create entry from pipeline state', () => {
    const state: PipelineState = {
      currentStage: 'draft',
      stageStatuses: {
        outline: 'completed',
        beats: 'completed',
        draft: 'completed',
        revision: 'pending',
        'self-review': 'pending',
      },
      retryCount: 0,
      stageResults: {
        outline: {
          stage: 'outline',
          success: true,
          tokens: { prompt: 500, completion: 200 },
          durationMs: 1000,
        },
        beats: {
          stage: 'beats',
          success: true,
          tokens: { prompt: 600, completion: 300 },
          durationMs: 1500,
        },
        draft: {
          stage: 'draft',
          success: true,
          tokens: { prompt: 1000, completion: 2000 },
          durationMs: 5000,
        },
      },
      startedAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:10Z',
      completedAt: '2024-01-01T00:00:10Z',
    };

    const options: GenerationOptions = {
      temperature: 0.8,
      maxTokens: 4000,
      targetWordCount: 2000,
    };

    const entry = createHistoryEntry('structure-1', 'content-1', state, options, 'gpt-4');

    expect(entry.structureId).toBe('structure-1');
    expect(entry.contentId).toBe('content-1');
    expect(entry.success).toBe(true);
    expect(entry.finalStage).toBe('draft');
    expect(entry.totalTokens.prompt).toBe(2100); // 500+600+1000
    expect(entry.totalTokens.completion).toBe(2500); // 200+300+2000
    expect(entry.totalDurationMs).toBe(7500); // 1000+1500+5000
    expect(entry.modelId).toBe('gpt-4');
    expect(entry.options).toEqual(options);
  });

  it('should handle failed pipeline state', () => {
    const state: PipelineState = {
      currentStage: 'draft',
      stageStatuses: {
        outline: 'completed',
        beats: 'completed',
        draft: 'failed',
        revision: 'pending',
        'self-review': 'pending',
      },
      retryCount: 2,
      stageResults: {},
      error: {
        stage: 'draft',
        type: 'llm_error',
        message: 'Rate limited',
        retryable: true,
      },
      startedAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:05Z',
    };

    const entry = createHistoryEntry('structure-1', undefined, state, {}, 'gpt-4');

    expect(entry.success).toBe(false);
    expect(entry.error).toEqual(state.error);
    expect(entry.contentId).toBe('');
  });
});

describe('historyEntryToRecord', () => {
  it('should convert entry to generation record', () => {
    const entry = createTestEntry('entry-1', 'structure-1', 'content-1');
    entry.totalTokens = { prompt: 1000, completion: 2000 };
    entry.totalDurationMs = 5000;
    entry.modelId = 'gpt-4';
    entry.options = { temperature: 0.7 };

    const record = historyEntryToRecord(entry);

    expect(record.id).toBe('entry-1');
    expect(record.contentId).toBe('content-1');
    expect(record.version).toBe(1);
    expect(record.modelId).toBe('gpt-4');
    expect(record.temperature).toBe(0.7);
    expect(record.tokens.prompt).toBe(1000);
    expect(record.tokens.completion).toBe(2000);
    expect(record.durationMs).toBe(5000);
    expect(record.stage).toBe('draft');
    expect(record.success).toBe(true);
  });

  it('should include error message for failed entry', () => {
    const entry = createTestEntry('entry-1', 'structure-1');
    entry.success = false;
    entry.error = {
      stage: 'outline',
      type: 'timeout',
      message: 'Request timed out',
      retryable: true,
    };

    const record = historyEntryToRecord(entry);

    expect(record.success).toBe(false);
    expect(record.error).toBe('Request timed out');
  });
});

// Helper function to create test entries
function createTestEntry(
  id: string,
  structureId: string,
  contentId?: string
): import('./types').GenerationHistoryEntry {
  return {
    id,
    contentId: contentId || '',
    structureId,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    success: true,
    finalStage: 'draft',
    totalTokens: { prompt: 0, completion: 0 },
    totalDurationMs: 0,
    modelId: 'test-model',
    options: {},
  };
}
