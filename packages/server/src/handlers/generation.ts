/**
 * Generation API handlers - Content generation with streaming support
 *
 * These handlers manage the generation pipeline for producing content,
 * including starting, canceling, and monitoring generation progress.
 * Real-time progress is delivered via subscriptions.
 */

import type { Router } from '../router';
import { ApiError } from '../router';
import type { Services } from '../services';
import type { SubscriptionManager } from '../subscriptions';
import { API_METHODS, SUBSCRIPTION_CHANNELS } from '../protocol';
import {
  generateId,
  type GenerationStage,
  type GenerationRequest,
  type GenerationResult,
  type PipelineState,
  type StageResult
} from '@repo/core';
import { assembleContext } from '@repo/llm';

// Track active generations
interface ActiveGeneration {
  id: string;
  projectId: string;
  structureId: string;
  connectionId: string;
  startedAt: string;
  cancelled: boolean;
  pipelineState: PipelineState | null;
}

const activeGenerations = new Map<string, ActiveGeneration>();

// Simplified param types
interface GenerationStartParams {
  projectId: string;
  structureId: string;
  options?: {
    stage?: GenerationStage;
    temperature?: number;
    maxTokens?: number;
  };
}

interface GenerationIdParams {
  generationId: string;
}

interface GenerationRetryParams {
  generationId: string;
  stage: GenerationStage;
}

/**
 * Register generation handlers on the router.
 */
export function registerGenerationHandlers(
  router: Router,
  services: Services,
  subscriptions: SubscriptionManager
): void {
  // generation.start - Start a new content generation
  router.register<GenerationStartParams, { generationId: string }>(
    API_METHODS.GENERATION_START,
    async (params, context) => {
      if (!services.generation) {
        throw ApiError.llmError('LLM client not configured - generation unavailable');
      }

      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      // Verify structure exists
      const structureService = services.structure(params.projectId);
      const structure = structureService.getById(params.structureId);
      if (!structure) {
        throw ApiError.entityNotFound('Structure', params.structureId);
      }

      // Check if content is locked
      const content = services.project.repos.contents.findByStructure(
        params.projectId,
        params.structureId
      );
      if (content?.locked) {
        throw ApiError.contentLocked(params.structureId);
      }

      // Create generation ID
      const generationId = generateId();
      const connectionId = context.connection.id;

      // Track generation
      const activeGeneration: ActiveGeneration = {
        id: generationId,
        projectId: params.projectId,
        structureId: params.structureId,
        connectionId,
        startedAt: new Date().toISOString(),
        cancelled: false,
        pipelineState: null
      };
      activeGenerations.set(generationId, activeGeneration);

      // Assemble context for generation
      const bible = services.bible(params.projectId).getBible();
      const structureTree = structureService.getFullTree();

      const assembledContext = assembleContext({
        bible,
        structure: structureTree,
        targetStructureId: params.structureId,
        contentRepository: services.project.repos.contents,
        projectId: params.projectId
      });

      // Build generation request
      const request: GenerationRequest = {
        structure,
        context: assembledContext,
        options: {
          temperature: params.options?.temperature,
          maxTokens: params.options?.maxTokens,
          stages: params.options?.stage ? [params.options.stage] : undefined,
          onStageStart: (stage: GenerationStage) => {
            // Broadcast stage start to subscribers
            subscriptions.broadcastToConnection(connectionId, SUBSCRIPTION_CHANNELS.GENERATION_PROGRESS, {
              generationId,
              event: 'stage_start',
              stage,
              timestamp: new Date().toISOString()
            });
          },
          onStageComplete: (stage: GenerationStage, result: StageResult) => {
            // Broadcast stage completion to subscribers
            subscriptions.broadcastToConnection(connectionId, SUBSCRIPTION_CHANNELS.GENERATION_PROGRESS, {
              generationId,
              event: 'stage_complete',
              stage,
              success: result.success,
              tokens: result.tokens,
              durationMs: result.durationMs,
              error: result.error,
              timestamp: new Date().toISOString()
            });
          },
          onToken: (token: string) => {
            // Stream tokens to the connection
            subscriptions.broadcastToConnection(connectionId, SUBSCRIPTION_CHANNELS.GENERATION_PROGRESS, {
              generationId,
              event: 'token',
              token,
              timestamp: new Date().toISOString()
            });
          }
        }
      };

      // Start generation asynchronously
      runGeneration(generationId, request, services, subscriptions);

      return { generationId };
    }
  );

  // generation.cancel - Cancel a running generation
  router.register<GenerationIdParams, { success: boolean }>(
    API_METHODS.GENERATION_CANCEL,
    (params) => {
      const generation = activeGenerations.get(params.generationId);
      if (!generation) {
        throw ApiError.entityNotFound('Generation', params.generationId);
      }

      // Mark as cancelled
      generation.cancelled = true;

      // Cancel the pipeline if available
      if (services.generation) {
        services.generation.cancel();
      }

      return { success: true };
    }
  );

  // generation.status - Get status of a generation
  router.register<GenerationIdParams, { status: string; pipelineState: PipelineState | null }>(
    API_METHODS.GENERATION_STATUS,
    (params) => {
      const generation = activeGenerations.get(params.generationId);
      if (!generation) {
        throw ApiError.entityNotFound('Generation', params.generationId);
      }

      const status = generation.cancelled
        ? 'cancelled'
        : generation.pipelineState?.completedAt
          ? 'completed'
          : 'running';

      return {
        status,
        pipelineState: generation.pipelineState
      };
    }
  );

  // generation.retry - Retry a failed stage
  router.register<GenerationRetryParams, { success: boolean }>(
    API_METHODS.GENERATION_RETRY,
    async (params) => {
      if (!services.generation) {
        throw ApiError.llmError('LLM client not configured - generation unavailable');
      }

      const generation = activeGenerations.get(params.generationId);
      if (!generation) {
        throw ApiError.entityNotFound('Generation', params.generationId);
      }

      if (!generation.pipelineState) {
        throw ApiError.generationError('No pipeline state available for retry');
      }

      // Verify the stage failed
      const stageStatus = generation.pipelineState.stageStatuses[params.stage];
      if (stageStatus !== 'failed') {
        throw ApiError.generationError(`Stage ${params.stage} is not in failed state`);
      }

      // Get structure and context again
      const structureService = services.structure(generation.projectId);
      const structure = structureService.getById(generation.structureId);
      if (!structure) {
        throw ApiError.entityNotFound('Structure', generation.structureId);
      }

      const bible = services.bible(generation.projectId).getBible();
      const structureTree = structureService.getFullTree();

      const assembledContext = assembleContext({
        bible,
        structure: structureTree,
        targetStructureId: generation.structureId,
        contentRepository: services.project.repos.contents,
        projectId: generation.projectId
      });

      const request: GenerationRequest = {
        structure,
        context: assembledContext,
        options: {
          onStageStart: (stage: GenerationStage) => {
            subscriptions.broadcastToConnection(generation.connectionId, SUBSCRIPTION_CHANNELS.GENERATION_PROGRESS, {
              generationId: params.generationId,
              event: 'stage_start',
              stage,
              timestamp: new Date().toISOString()
            });
          },
          onStageComplete: (stage: GenerationStage, result: StageResult) => {
            subscriptions.broadcastToConnection(generation.connectionId, SUBSCRIPTION_CHANNELS.GENERATION_PROGRESS, {
              generationId: params.generationId,
              event: 'stage_complete',
              stage,
              success: result.success,
              tokens: result.tokens,
              durationMs: result.durationMs,
              timestamp: new Date().toISOString()
            });
          }
        }
      };

      // Retry the stage
      await services.generation.retryStage(
        params.stage,
        request,
        generation.pipelineState.stageResults
      );

      return { success: true };
    }
  );
}

/**
 * Run generation asynchronously and broadcast results.
 */
async function runGeneration(
  generationId: string,
  request: GenerationRequest,
  services: Services,
  subscriptions: SubscriptionManager
): Promise<void> {
  const generation = activeGenerations.get(generationId);
  if (!generation || !services.generation) {
    return;
  }

  try {
    const result: GenerationResult = await services.generation.generate(request);

    // Update tracked state
    generation.pipelineState = result.pipelineState;

    // Broadcast completion
    subscriptions.broadcastToConnection(generation.connectionId, SUBSCRIPTION_CHANNELS.GENERATION_COMPLETE, {
      generationId,
      success: result.success,
      contentId: result.content?.id,
      selfReviewFeedback: result.selfReviewFeedback,
      timestamp: new Date().toISOString()
    });

    // Save generated content if successful
    if (result.success && result.content) {
      const existing = services.project.repos.contents.findByStructure(
        generation.projectId,
        generation.structureId
      );

      if (existing) {
        services.project.repos.contents.update(generation.projectId, existing.id, {
          text: result.content.text,
          source: 'generated'
        });
      } else {
        services.project.repos.contents.create(generation.projectId, {
          structureId: generation.structureId,
          text: result.content.text,
          initialText: result.content.text,
          status: 'draft',
          source: 'generated',
          reviews: [],
          generationHistory: [],
          locked: false
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Broadcast error
    subscriptions.broadcastToConnection(generation.connectionId, SUBSCRIPTION_CHANNELS.GENERATION_ERROR, {
      generationId,
      error: message,
      timestamp: new Date().toISOString()
    });
  }
}
