/**
 * Tests for Analytics API
 */

import { describe, it, expect, vi } from 'vitest';
import { createAnalyticsApi } from './analytics';
import type { SpineClient } from '../client';

function createMockClient(): SpineClient {
  return {
    request: vi.fn()
  } as unknown as SpineClient;
}

describe('AnalyticsApi', () => {
  describe('tensionCurve', () => {
    it('should call analytics.tensionCurve', async () => {
      const client = createMockClient();
      const api = createAnalyticsApi(client);

      const mockCurve = { points: [{ x: 0, y: 0.5 }] };
      vi.mocked(client.request).mockResolvedValue(mockCurve);

      const result = await api.tensionCurve('proj-1');

      expect(client.request).toHaveBeenCalledWith('analytics.tensionCurve', {
        projectId: 'proj-1',
        scope: undefined
      });
      expect(result).toEqual(mockCurve);
    });

    it('should call analytics.tensionCurve with scope', async () => {
      const client = createMockClient();
      const api = createAnalyticsApi(client);

      vi.mocked(client.request).mockResolvedValue(null);

      await api.tensionCurve('proj-1', { bookId: 'b1' });

      expect(client.request).toHaveBeenCalledWith('analytics.tensionCurve', {
        projectId: 'proj-1',
        scope: { bookId: 'b1' }
      });
    });
  });

  describe('characterPresence', () => {
    it('should call analytics.characterPresence and return Map', async () => {
      const client = createMockClient();
      const api = createAnalyticsApi(client);

      const mockData = {
        'char-1': { totalAppearances: 10, chapters: [] },
        'char-2': { totalAppearances: 5, chapters: [] }
      };
      vi.mocked(client.request).mockResolvedValue(mockData);

      const result = await api.characterPresence('proj-1');

      expect(client.request).toHaveBeenCalledWith('analytics.characterPresence', {
        projectId: 'proj-1',
        scope: undefined
      });
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('char-1')).toEqual({ totalAppearances: 10, chapters: [] });
    });

    it('should call analytics.characterPresence with scope', async () => {
      const client = createMockClient();
      const api = createAnalyticsApi(client);

      vi.mocked(client.request).mockResolvedValue({});

      await api.characterPresence('proj-1', { arcId: 'arc-1' });

      expect(client.request).toHaveBeenCalledWith('analytics.characterPresence', {
        projectId: 'proj-1',
        scope: { arcId: 'arc-1' }
      });
    });
  });

  describe('plotThreads', () => {
    it('should call analytics.plotThreads and return Map', async () => {
      const client = createMockClient();
      const api = createAnalyticsApi(client);

      const mockData = {
        'thread-1': { status: 'active', events: [] }
      };
      vi.mocked(client.request).mockResolvedValue(mockData);

      const result = await api.plotThreads('proj-1');

      expect(client.request).toHaveBeenCalledWith('analytics.plotThreads', {
        projectId: 'proj-1',
        scope: undefined
      });
      expect(result).toBeInstanceOf(Map);
      expect(result.get('thread-1')).toEqual({ status: 'active', events: [] });
    });
  });

  describe('quality', () => {
    it('should call analytics.quality', async () => {
      const client = createMockClient();
      const api = createAnalyticsApi(client);

      const mockMetrics = {
        averageTensionScore: 0.7,
        averageHookStrength: 0.8,
        continuityIssueCount: 2,
        chaptersAnalyzed: 10,
        chaptersWithIssues: 1
      };
      vi.mocked(client.request).mockResolvedValue(mockMetrics);

      const result = await api.quality('proj-1');

      expect(client.request).toHaveBeenCalledWith('analytics.quality', {
        projectId: 'proj-1',
        scope: undefined
      });
      expect(result).toEqual(mockMetrics);
    });

    it('should call analytics.quality with scope', async () => {
      const client = createMockClient();
      const api = createAnalyticsApi(client);

      vi.mocked(client.request).mockResolvedValue({
        averageTensionScore: 0,
        averageHookStrength: 0,
        continuityIssueCount: 0,
        chaptersAnalyzed: 0,
        chaptersWithIssues: 0
      });

      await api.quality('proj-1', { bookId: 'b1', arcId: 'arc-1' });

      expect(client.request).toHaveBeenCalledWith('analytics.quality', {
        projectId: 'proj-1',
        scope: { bookId: 'b1', arcId: 'arc-1' }
      });
    });
  });
});
