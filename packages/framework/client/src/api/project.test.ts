/**
 * Tests for Project API
 */

import { describe, it, expect, vi } from 'vitest';
import { createProjectApi } from './project';
import type { SpineClient } from '../client';

// Mock client
function createMockClient(): SpineClient {
  return {
    request: vi.fn()
  } as unknown as SpineClient;
}

describe('ProjectApi', () => {
  describe('list', () => {
    it('should call project.list', async () => {
      const client = createMockClient();
      const api = createProjectApi(client);

      const mockProjects = [{ id: 'p1', title: 'Project 1' }];
      vi.mocked(client.request).mockResolvedValue(mockProjects);

      const result = await api.list();

      expect(client.request).toHaveBeenCalledWith('project.list');
      expect(result).toEqual(mockProjects);
    });
  });

  describe('create', () => {
    it('should call project.create with title', async () => {
      const client = createMockClient();
      const api = createProjectApi(client);

      const mockProject = { id: 'p1', title: 'New Project' };
      vi.mocked(client.request).mockResolvedValue(mockProject);

      const result = await api.create('New Project');

      expect(client.request).toHaveBeenCalledWith('project.create', {
        title: 'New Project',
        format: 'web-serial'
      });
      expect(result).toEqual(mockProject);
    });

    it('should call project.create with format', async () => {
      const client = createMockClient();
      const api = createProjectApi(client);

      vi.mocked(client.request).mockResolvedValue({});

      await api.create('Novel', 'novel');

      expect(client.request).toHaveBeenCalledWith('project.create', {
        title: 'Novel',
        format: 'novel'
      });
    });
  });

  describe('load', () => {
    it('should call project.load with id', async () => {
      const client = createMockClient();
      const api = createProjectApi(client);

      const mockProject = { id: 'p1', title: 'Project' };
      vi.mocked(client.request).mockResolvedValue(mockProject);

      const result = await api.load('p1');

      expect(client.request).toHaveBeenCalledWith('project.load', { id: 'p1' });
      expect(result).toEqual(mockProject);
    });
  });

  describe('delete', () => {
    it('should call project.delete with id', async () => {
      const client = createMockClient();
      const api = createProjectApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true });

      const result = await api.delete('p1');

      expect(client.request).toHaveBeenCalledWith('project.delete', { id: 'p1' });
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateSettings', () => {
    it('should call project.updateSettings', async () => {
      const client = createMockClient();
      const api = createProjectApi(client);

      const settings = { revisionHorizon: 5 };
      vi.mocked(client.request).mockResolvedValue({ success: true });

      const result = await api.updateSettings('p1', settings);

      expect(client.request).toHaveBeenCalledWith('project.updateSettings', {
        id: 'p1',
        settings
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateMetadata', () => {
    it('should call project.updateMetadata', async () => {
      const client = createMockClient();
      const api = createProjectApi(client);

      const metadata = { genre: 'Fantasy', targetWordCount: 100000 };
      vi.mocked(client.request).mockResolvedValue({ success: true });

      const result = await api.updateMetadata('p1', metadata);

      expect(client.request).toHaveBeenCalledWith('project.updateMetadata', {
        id: 'p1',
        metadata
      });
      expect(result).toEqual({ success: true });
    });
  });
});
