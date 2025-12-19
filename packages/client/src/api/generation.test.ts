/**
 * Tests for Generation API
 */

import { describe, it, expect, vi } from 'vitest';
import { createGenerationApi } from './generation';
import type { SpineClient } from '../client';

function createMockClient(): SpineClient {
  return {
    request: vi.fn()
  } as unknown as SpineClient;
}

describe('GenerationApi', () => {
  describe('start', () => {
    it('should call generation.start', async () => {
      const client = createMockClient();
      const api = createGenerationApi(client);

      vi.mocked(client.request).mockResolvedValue({ generationId: 'gen-1' });

      const result = await api.start('proj-1', 's1');

      expect(client.request).toHaveBeenCalledWith('generation.start', {
        projectId: 'proj-1',
        structureId: 's1',
        options: undefined
      });
      expect(result).toEqual({ generationId: 'gen-1' });
    });

    it('should call generation.start with options', async () => {
      const client = createMockClient();
      const api = createGenerationApi(client);

      vi.mocked(client.request).mockResolvedValue({ generationId: 'gen-1' });

      const options = { temperature: 0.7, maxTokens: 2000 };
      await api.start('proj-1', 's1', options);

      expect(client.request).toHaveBeenCalledWith('generation.start', {
        projectId: 'proj-1',
        structureId: 's1',
        options
      });
    });
  });

  describe('cancel', () => {
    it('should call generation.cancel', async () => {
      const client = createMockClient();
      const api = createGenerationApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true });

      const result = await api.cancel('gen-1');

      expect(client.request).toHaveBeenCalledWith('generation.cancel', {
        generationId: 'gen-1'
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('status', () => {
    it('should call generation.status', async () => {
      const client = createMockClient();
      const api = createGenerationApi(client);

      const mockStatus = { status: 'running', pipelineState: null };
      vi.mocked(client.request).mockResolvedValue(mockStatus);

      const result = await api.status('gen-1');

      expect(client.request).toHaveBeenCalledWith('generation.status', {
        generationId: 'gen-1'
      });
      expect(result).toEqual(mockStatus);
    });

    it('should return completed status with pipeline state', async () => {
      const client = createMockClient();
      const api = createGenerationApi(client);

      const mockStatus = {
        status: 'completed',
        pipelineState: {
          startedAt: '2024-01-01',
          completedAt: '2024-01-01',
          stageStatuses: {}
        }
      };
      vi.mocked(client.request).mockResolvedValue(mockStatus);

      const result = await api.status('gen-1');

      expect(result.status).toBe('completed');
      expect(result.pipelineState).toBeDefined();
    });
  });

  describe('retry', () => {
    it('should call generation.retry', async () => {
      const client = createMockClient();
      const api = createGenerationApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true });

      const result = await api.retry('gen-1', 'outline');

      expect(client.request).toHaveBeenCalledWith('generation.retry', {
        generationId: 'gen-1',
        stage: 'outline'
      });
      expect(result).toEqual({ success: true });
    });
  });
});
