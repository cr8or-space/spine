/**
 * Tests for Structure API
 */

import { describe, it, expect, vi } from 'vitest';
import { createStructureApi } from './structure';
import type { SpineClient } from '../client';

function createMockClient(): SpineClient {
  return {
    request: vi.fn()
  } as unknown as SpineClient;
}

describe('StructureApi', () => {
  describe('getTree', () => {
    it('should call structure.getTree', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      const mockTree = { id: 'root', type: 'book', children: [] };
      vi.mocked(client.request).mockResolvedValue(mockTree);

      const result = await api.getTree('proj-1');

      expect(client.request).toHaveBeenCalledWith('structure.getTree', { projectId: 'proj-1' });
      expect(result).toEqual(mockTree);
    });
  });

  describe('getAll', () => {
    it('should call structure.getAll', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      vi.mocked(client.request).mockResolvedValue([]);

      await api.getAll('proj-1');

      expect(client.request).toHaveBeenCalledWith('structure.getAll', { projectId: 'proj-1' });
    });
  });

  describe('get', () => {
    it('should call structure.get', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      const mockStructure = { id: 's1', type: 'chapter' };
      vi.mocked(client.request).mockResolvedValue(mockStructure);

      const result = await api.get('proj-1', 's1');

      expect(client.request).toHaveBeenCalledWith('structure.get', {
        projectId: 'proj-1',
        id: 's1'
      });
      expect(result).toEqual(mockStructure);
    });
  });

  describe('create', () => {
    it('should call structure.create', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      const data = { title: 'Chapter 1', type: 'chapter' as const };
      vi.mocked(client.request).mockResolvedValue({ id: 's1', ...data });

      const result = await api.create('proj-1', data);

      expect(client.request).toHaveBeenCalledWith('structure.create', {
        projectId: 'proj-1',
        data
      });
      expect(result.title).toBe('Chapter 1');
    });
  });

  describe('update', () => {
    it('should call structure.update', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      const data = { title: 'Updated Chapter' };
      vi.mocked(client.request).mockResolvedValue({ id: 's1', ...data });

      const result = await api.update('proj-1', 's1', data);

      expect(client.request).toHaveBeenCalledWith('structure.update', {
        projectId: 'proj-1',
        id: 's1',
        data
      });
      expect(result.title).toBe('Updated Chapter');
    });
  });

  describe('delete', () => {
    it('should call structure.delete', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true });

      const result = await api.delete('proj-1', 's1');

      expect(client.request).toHaveBeenCalledWith('structure.delete', {
        projectId: 'proj-1',
        id: 's1'
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('reorder', () => {
    it('should call structure.reorder', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      vi.mocked(client.request).mockResolvedValue({ id: 's1', order: 2 });

      const result = await api.reorder('proj-1', 's1', 2);

      expect(client.request).toHaveBeenCalledWith('structure.reorder', {
        projectId: 'proj-1',
        id: 's1',
        newOrder: 2,
        newParentId: undefined
      });
      expect(result.order).toBe(2);
    });

    it('should call structure.reorder with new parent', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      vi.mocked(client.request).mockResolvedValue({});

      await api.reorder('proj-1', 's1', 0, 'parent-1');

      expect(client.request).toHaveBeenCalledWith('structure.reorder', {
        projectId: 'proj-1',
        id: 's1',
        newOrder: 0,
        newParentId: 'parent-1'
      });
    });
  });

  describe('addBeat', () => {
    it('should call structure.addBeat', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      const mockBeat = { id: 'b1', description: 'Hero enters' };
      vi.mocked(client.request).mockResolvedValue(mockBeat);

      const result = await api.addBeat('proj-1', 's1', 'Hero enters');

      expect(client.request).toHaveBeenCalledWith('structure.addBeat', {
        projectId: 'proj-1',
        structureId: 's1',
        description: 'Hero enters',
        targetWordCount: undefined
      });
      expect(result).toEqual(mockBeat);
    });

    it('should call structure.addBeat with word count', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      vi.mocked(client.request).mockResolvedValue({});

      await api.addBeat('proj-1', 's1', 'Big fight', 500);

      expect(client.request).toHaveBeenCalledWith('structure.addBeat', {
        projectId: 'proj-1',
        structureId: 's1',
        description: 'Big fight',
        targetWordCount: 500
      });
    });
  });

  describe('removeBeat', () => {
    it('should call structure.removeBeat', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true });

      const result = await api.removeBeat('proj-1', 's1', 'b1');

      expect(client.request).toHaveBeenCalledWith('structure.removeBeat', {
        projectId: 'proj-1',
        structureId: 's1',
        beatId: 'b1'
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('setHook', () => {
    it('should call structure.setHook with hook data', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      const hook = { type: 'cliffhanger' as const, description: 'Dramatic ending' };
      vi.mocked(client.request).mockResolvedValue({ id: 's1', hook });

      const result = await api.setHook('proj-1', 's1', hook);

      expect(client.request).toHaveBeenCalledWith('structure.setHook', {
        projectId: 'proj-1',
        structureId: 's1',
        hook
      });
      expect(result.hook).toEqual(hook);
    });

    it('should call structure.setHook with null to remove', async () => {
      const client = createMockClient();
      const api = createStructureApi(client);

      vi.mocked(client.request).mockResolvedValue({ id: 's1', hook: null });

      await api.setHook('proj-1', 's1', null);

      expect(client.request).toHaveBeenCalledWith('structure.setHook', {
        projectId: 'proj-1',
        structureId: 's1',
        hook: null
      });
    });
  });
});
