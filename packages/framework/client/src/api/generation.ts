/**
 * Generation API methods
 */

import type { SpineClient } from '../client';
import type { PipelineState, GenerationStage } from '@repo/serial-core';

export interface GenerationApi {
  start(
    projectId: string,
    structureId: string,
    options?: GenerationOptions
  ): Promise<{ generationId: string }>;
  cancel(generationId: string): Promise<{ success: boolean }>;
  status(generationId: string): Promise<GenerationStatus>;
  retry(generationId: string, stage: GenerationStage): Promise<{ success: boolean }>;
}

export interface GenerationOptions {
  stage?: GenerationStage;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerationStatus {
  status: 'running' | 'completed' | 'cancelled';
  pipelineState: PipelineState | null;
}

export function createGenerationApi(client: SpineClient): GenerationApi {
  return {
    async start(
      projectId: string,
      structureId: string,
      options?: GenerationOptions
    ): Promise<{ generationId: string }> {
      return client.request<{ generationId: string }>('generation.start', {
        projectId,
        structureId,
        options
      });
    },

    async cancel(generationId: string): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>('generation.cancel', { generationId });
    },

    async status(generationId: string): Promise<GenerationStatus> {
      return client.request<GenerationStatus>('generation.status', { generationId });
    },

    async retry(generationId: string, stage: GenerationStage): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>('generation.retry', { generationId, stage });
    }
  };
}
