/**
 * Tests for Bible API
 */

import { describe, it, expect, vi } from 'vitest';
import { createBibleApi } from './bible';
import type { SpineClient } from '../client';

function createMockClient(): SpineClient {
  return {
    request: vi.fn()
  } as unknown as SpineClient;
}

describe('BibleApi', () => {
  describe('get', () => {
    it('should call bible.get', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      const mockBible = { characters: [], locations: [] };
      vi.mocked(client.request).mockResolvedValue(mockBible);

      const result = await api.get('proj-1');

      expect(client.request).toHaveBeenCalledWith('bible.get', { projectId: 'proj-1' });
      expect(result).toEqual(mockBible);
    });
  });

  describe('character', () => {
    it('should call bible.character.list', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      const mockCharacters = [{ id: 'c1', name: 'Hero' }];
      vi.mocked(client.request).mockResolvedValue(mockCharacters);

      const result = await api.character.list('proj-1');

      expect(client.request).toHaveBeenCalledWith('bible.character.list', { projectId: 'proj-1' });
      expect(result).toEqual(mockCharacters);
    });

    it('should call bible.character.get', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      const mockCharacter = { id: 'c1', name: 'Hero' };
      vi.mocked(client.request).mockResolvedValue(mockCharacter);

      const result = await api.character.get('proj-1', 'c1');

      expect(client.request).toHaveBeenCalledWith('bible.character.get', {
        projectId: 'proj-1',
        id: 'c1'
      });
      expect(result).toEqual(mockCharacter);
    });

    it('should call bible.character.create', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      const data = { name: 'New Hero', role: 'protagonist' as const };
      vi.mocked(client.request).mockResolvedValue({ id: 'c2', ...data });

      const result = await api.character.create('proj-1', data);

      expect(client.request).toHaveBeenCalledWith('bible.character.create', {
        projectId: 'proj-1',
        data
      });
      expect(result.name).toBe('New Hero');
    });

    it('should call bible.character.update', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      const data = { name: 'Updated Hero' };
      vi.mocked(client.request).mockResolvedValue({ id: 'c1', ...data });

      const result = await api.character.update('proj-1', 'c1', data);

      expect(client.request).toHaveBeenCalledWith('bible.character.update', {
        projectId: 'proj-1',
        id: 'c1',
        data
      });
      expect(result.name).toBe('Updated Hero');
    });

    it('should call bible.character.delete', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true });

      const result = await api.character.delete('proj-1', 'c1');

      expect(client.request).toHaveBeenCalledWith('bible.character.delete', {
        projectId: 'proj-1',
        id: 'c1'
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('location', () => {
    it('should call bible.location.list', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      vi.mocked(client.request).mockResolvedValue([]);

      await api.location.list('proj-1');

      expect(client.request).toHaveBeenCalledWith('bible.location.list', { projectId: 'proj-1' });
    });

    it('should call bible.location.create', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      const data = { name: 'Castle', type: 'building' as const };
      vi.mocked(client.request).mockResolvedValue({ id: 'l1', ...data });

      await api.location.create('proj-1', data);

      expect(client.request).toHaveBeenCalledWith('bible.location.create', {
        projectId: 'proj-1',
        data
      });
    });
  });

  describe('faction', () => {
    it('should call bible.faction.list', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      vi.mocked(client.request).mockResolvedValue([]);

      await api.faction.list('proj-1');

      expect(client.request).toHaveBeenCalledWith('bible.faction.list', { projectId: 'proj-1' });
    });
  });

  describe('worldRule', () => {
    it('should call bible.worldRule.create', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      const data = { name: 'Magic System', category: 'magic' as const };
      vi.mocked(client.request).mockResolvedValue({ id: 'wr1', ...data });

      await api.worldRule.create('proj-1', data);

      expect(client.request).toHaveBeenCalledWith('bible.worldRule.create', {
        projectId: 'proj-1',
        data
      });
    });
  });

  describe('plotThread', () => {
    it('should call bible.plotThread.create', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      const data = { name: 'Main Quest', type: 'main' as const };
      vi.mocked(client.request).mockResolvedValue({ id: 'pt1', ...data });

      await api.plotThread.create('proj-1', data);

      expect(client.request).toHaveBeenCalledWith('bible.plotThread.create', {
        projectId: 'proj-1',
        data
      });
    });
  });

  describe('timelineEvent', () => {
    it('should call bible.timelineEvent.create', async () => {
      const client = createMockClient();
      const api = createBibleApi(client);

      const data = { name: 'The Beginning', date: '0001-01-01' };
      vi.mocked(client.request).mockResolvedValue({ id: 'te1', ...data });

      await api.timelineEvent.create('proj-1', data);

      expect(client.request).toHaveBeenCalledWith('bible.timelineEvent.create', {
        projectId: 'proj-1',
        data
      });
    });
  });
});
