/**
 * Tests for Content API
 */

import { describe, it, expect, vi } from 'vitest';
import { createContentApi } from './content';
import type { SpineClient } from '../client';

function createMockClient(): SpineClient {
  return {
    request: vi.fn()
  } as unknown as SpineClient;
}

describe('ContentApi', () => {
  describe('get', () => {
    it('should call content.get', async () => {
      const client = createMockClient();
      const api = createContentApi(client);

      const mockContent = { id: 'c1', text: 'Hello world', structureId: 's1' };
      vi.mocked(client.request).mockResolvedValue(mockContent);

      const result = await api.get('proj-1', 's1');

      expect(client.request).toHaveBeenCalledWith('content.get', {
        projectId: 'proj-1',
        structureId: 's1'
      });
      expect(result).toEqual(mockContent);
    });

    it('should return null when no content exists', async () => {
      const client = createMockClient();
      const api = createContentApi(client);

      vi.mocked(client.request).mockResolvedValue(null);

      const result = await api.get('proj-1', 's1');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should call content.save', async () => {
      const client = createMockClient();
      const api = createContentApi(client);

      const mockContent = { id: 'c1', text: 'Updated content', structureId: 's1' };
      vi.mocked(client.request).mockResolvedValue(mockContent);

      const result = await api.save('proj-1', 's1', 'Updated content');

      expect(client.request).toHaveBeenCalledWith('content.save', {
        projectId: 'proj-1',
        structureId: 's1',
        text: 'Updated content'
      });
      expect(result).toEqual(mockContent);
    });
  });

  describe('getHistory', () => {
    it('should call content.getHistory', async () => {
      const client = createMockClient();
      const api = createContentApi(client);

      const mockHistory = [
        { version: 1, text: 'Version 1' },
        { version: 2, text: 'Version 2' }
      ];
      vi.mocked(client.request).mockResolvedValue(mockHistory);

      const result = await api.getHistory('proj-1', 's1');

      expect(client.request).toHaveBeenCalledWith('content.getHistory', {
        projectId: 'proj-1',
        structureId: 's1'
      });
      expect(result).toEqual(mockHistory);
    });

    it('should return empty array when no history', async () => {
      const client = createMockClient();
      const api = createContentApi(client);

      vi.mocked(client.request).mockResolvedValue([]);

      const result = await api.getHistory('proj-1', 's1');

      expect(result).toEqual([]);
    });
  });

  describe('rollback', () => {
    it('should call content.rollback', async () => {
      const client = createMockClient();
      const api = createContentApi(client);

      const mockContent = { id: 'c1', text: 'Rolled back', structureId: 's1' };
      vi.mocked(client.request).mockResolvedValue(mockContent);

      const result = await api.rollback('proj-1', 's1', 3);

      expect(client.request).toHaveBeenCalledWith('content.rollback', {
        projectId: 'proj-1',
        structureId: 's1',
        versionNumber: 3
      });
      expect(result).toEqual(mockContent);
    });
  });
});
