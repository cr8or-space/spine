/**
 * Tests for Serial API
 */

import { describe, it, expect, vi } from 'vitest';
import { createSerialApi } from './serial';
import type { SpineClient } from '../client';

function createMockClient(): SpineClient {
  return {
    request: vi.fn()
  } as unknown as SpineClient;
}

describe('SerialApi', () => {
  describe('bufferStatus', () => {
    it('should call serial.bufferStatus', async () => {
      const client = createMockClient();
      const api = createSerialApi(client);

      const mockStatus = {
        ready: 5,
        inReview: 2,
        draft: 3,
        total: 10,
        minimumBuffer: 3,
        status: 'healthy'
      };
      vi.mocked(client.request).mockResolvedValue(mockStatus);

      const result = await api.bufferStatus('proj-1');

      expect(client.request).toHaveBeenCalledWith('serial.bufferStatus', {
        projectId: 'proj-1'
      });
      expect(result).toEqual(mockStatus);
    });
  });

  describe('releaseSchedule', () => {
    it('should call serial.releaseSchedule', async () => {
      const client = createMockClient();
      const api = createSerialApi(client);

      const mockSchedule = {
        schedule: [{ date: '2024-01-01', isPublished: false }],
        nextReleaseDate: '2024-01-01',
        releasesPerWeek: 1,
        depletion: {
          currentBuffer: 5,
          depletionDate: null,
          daysUntilDepletion: null
        }
      };
      vi.mocked(client.request).mockResolvedValue(mockSchedule);

      const result = await api.releaseSchedule('proj-1');

      expect(client.request).toHaveBeenCalledWith('serial.releaseSchedule', {
        projectId: 'proj-1'
      });
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('hookPatterns', () => {
    it('should call serial.hookPatterns', async () => {
      const client = createMockClient();
      const api = createSerialApi(client);

      const mockPatterns = {
        patterns: [],
        averageHookStrength: 0.7,
        chaptersWithHooks: 8,
        totalChapters: 10
      };
      vi.mocked(client.request).mockResolvedValue(mockPatterns);

      const result = await api.hookPatterns('proj-1');

      expect(client.request).toHaveBeenCalledWith('serial.hookPatterns', {
        projectId: 'proj-1',
        scope: undefined
      });
      expect(result).toEqual(mockPatterns);
    });

    it('should call serial.hookPatterns with scope', async () => {
      const client = createMockClient();
      const api = createSerialApi(client);

      vi.mocked(client.request).mockResolvedValue({});

      await api.hookPatterns('proj-1', { bookId: 'b1' });

      expect(client.request).toHaveBeenCalledWith('serial.hookPatterns', {
        projectId: 'proj-1',
        scope: { bookId: 'b1' }
      });
    });
  });

  describe('cycleStatus', () => {
    it('should call serial.cycleStatus', async () => {
      const client = createMockClient();
      const api = createSerialApi(client);

      const mockStatus = {
        cycles: [],
        currentCyclePosition: 'rising',
        averageCycleLength: 5
      };
      vi.mocked(client.request).mockResolvedValue(mockStatus);

      const result = await api.cycleStatus('proj-1');

      expect(client.request).toHaveBeenCalledWith('serial.cycleStatus', {
        projectId: 'proj-1',
        scope: undefined
      });
      expect(result).toEqual(mockStatus);
    });

    it('should call serial.cycleStatus with scope', async () => {
      const client = createMockClient();
      const api = createSerialApi(client);

      vi.mocked(client.request).mockResolvedValue({});

      await api.cycleStatus('proj-1', { arcId: 'arc-1' });

      expect(client.request).toHaveBeenCalledWith('serial.cycleStatus', {
        projectId: 'proj-1',
        scope: { arcId: 'arc-1' }
      });
    });
  });

  describe('mysteryBoard', () => {
    it('should call serial.mysteryBoard and return Map', async () => {
      const client = createMockClient();
      const api = createSerialApi(client);

      const mockData = {
        'mystery-1': { clues: [], status: 'active' },
        'mystery-2': { clues: [], status: 'resolved' }
      };
      vi.mocked(client.request).mockResolvedValue(mockData);

      const result = await api.mysteryBoard('proj-1');

      expect(client.request).toHaveBeenCalledWith('serial.mysteryBoard', {
        projectId: 'proj-1'
      });
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('mystery-1')).toEqual({ clues: [], status: 'active' });
    });
  });
});
