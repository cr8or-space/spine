/**
 * Extraction handlers for bible entity detection
 */

import type { Router } from '../router';
import type { Services } from '../services';
import type {
  EntitySuggestion,
  SuggestionSummary,
  ExtractionResult,
  ExtractionOptions,
  SuggestionStatus,
  AcceptResult,
  ExtractableEntityType,
} from '@repo/types';
import { ApiError, ErrorCode } from '../errors';

// Parameter interfaces
interface ProjectIdParams {
  projectId: string;
}

interface ExtractParams {
  projectId: string;
  options?: ExtractionOptions;
}

interface SuggestionListParams {
  projectId: string;
  status?: SuggestionStatus;
  entityType?: ExtractableEntityType;
}

interface SuggestionIdParams {
  suggestionId: string;
}

interface ReviewParams {
  suggestionId: string;
  reviewNotes?: string;
}

/**
 * Register extraction handlers on the router.
 */
export function registerExtractionHandlers(router: Router, services: Services): void {
  // extraction.run - Run extraction on project content
  router.register<ExtractParams, ExtractionResult>(
    'extraction.run',
    async (params) => {
      if (!services.extraction) {
        throw new ApiError(ErrorCode.LLM_ERROR, 'LLM not configured for extraction');
      }

      const project = services.project.get(params.projectId);
      if (!project) {
        throw new ApiError(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');
      }

      const bibleService = services.bible(params.projectId);
      const bible = bibleService.getBible();

      // Get all content with structures
      const contents = services.project.repos.contents.getByProject(params.projectId);
      const structures = services.project.repos.structures.getAll(params.projectId);

      // Map contents to their structures
      const contentWithStructures = contents
        .map((content) => {
          const structure = structures.find((s) => s.id === content.structureId);
          if (!structure) return null;
          return { content, structure };
        })
        .filter((c): c is { content: typeof contents[0]; structure: typeof structures[0] } => c !== null);

      const result = await services.extraction.extract(
        params.projectId,
        contentWithStructures,
        bible,
        project.settings.extraction,
        params.options
      );

      return result;
    }
  );

  // extraction.suggestions - Get suggestions list
  router.register<SuggestionListParams, SuggestionSummary[]>(
    'extraction.suggestions',
    (params) => {
      if (!services.extraction) {
        throw new ApiError(ErrorCode.LLM_ERROR, 'LLM not configured for extraction');
      }

      let summaries = services.extraction.getSummaries(params.projectId, params.status);

      if (params.entityType) {
        summaries = summaries.filter((s) => s.entityType === params.entityType);
      }

      return summaries;
    }
  );

  // extraction.suggestion - Get single suggestion detail
  router.register<SuggestionIdParams, EntitySuggestion>(
    'extraction.suggestion',
    (params) => {
      if (!services.extraction) {
        throw new ApiError(ErrorCode.LLM_ERROR, 'LLM not configured for extraction');
      }

      const suggestion = services.extraction.getSuggestion(params.suggestionId);
      if (!suggestion) {
        throw new ApiError(ErrorCode.ENTITY_NOT_FOUND, 'Suggestion not found');
      }

      return suggestion;
    }
  );

  // extraction.accept - Accept a suggestion
  router.register<ReviewParams, AcceptResult>(
    'extraction.accept',
    (params) => {
      if (!services.extraction) {
        throw new ApiError(ErrorCode.LLM_ERROR, 'LLM not configured for extraction');
      }

      return services.extraction.acceptSuggestion(params.suggestionId, params.reviewNotes);
    }
  );

  // extraction.reject - Reject a suggestion
  router.register<ReviewParams, EntitySuggestion>(
    'extraction.reject',
    (params) => {
      if (!services.extraction) {
        throw new ApiError(ErrorCode.LLM_ERROR, 'LLM not configured for extraction');
      }

      const result = services.extraction.rejectSuggestion(params.suggestionId, params.reviewNotes);
      if (!result) {
        throw new ApiError(ErrorCode.ENTITY_NOT_FOUND, 'Suggestion not found');
      }

      return result;
    }
  );

  // extraction.pendingCount - Get count of pending suggestions
  router.register<ProjectIdParams, { count: number }>(
    'extraction.pendingCount',
    (params) => {
      if (!services.extraction) {
        throw new ApiError(ErrorCode.LLM_ERROR, 'LLM not configured for extraction');
      }

      const count = services.extraction.getPendingCount(params.projectId);
      return { count };
    }
  );

  // extraction.cleanup - Clean up old reviewed suggestions
  router.register<ProjectIdParams & { days?: number }, { deleted: number }>(
    'extraction.cleanup',
    (params) => {
      if (!services.extraction) {
        throw new ApiError(ErrorCode.LLM_ERROR, 'LLM not configured for extraction');
      }

      const deleted = services.extraction.cleanup(params.projectId, params.days);
      return { deleted };
    }
  );
}
