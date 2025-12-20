/**
 * Extraction API - Bible entity detection from content
 */

import type { SpineClient } from '../client';
import type {
  EntitySuggestion,
  SuggestionSummary,
  ExtractionResult,
  ExtractionOptions,
  SuggestionStatus,
  AcceptResult,
  ExtractableEntityType,
} from '@repo/types';

export interface ExtractionApi {
  /** Run extraction on project content */
  run(projectId: string, options?: ExtractionOptions): Promise<ExtractionResult>;

  /** Get all suggestions for a project */
  suggestions(
    projectId: string,
    status?: SuggestionStatus,
    entityType?: ExtractableEntityType
  ): Promise<SuggestionSummary[]>;

  /** Get a single suggestion */
  suggestion(suggestionId: string): Promise<EntitySuggestion>;

  /** Accept a suggestion */
  accept(suggestionId: string, reviewNotes?: string): Promise<AcceptResult>;

  /** Reject a suggestion */
  reject(suggestionId: string, reviewNotes?: string): Promise<EntitySuggestion>;

  /** Get count of pending suggestions */
  pendingCount(projectId: string): Promise<number>;

  /** Clean up old reviewed suggestions */
  cleanup(projectId: string, days?: number): Promise<number>;
}

export function createExtractionApi(client: SpineClient): ExtractionApi {
  return {
    async run(projectId: string, options?: ExtractionOptions): Promise<ExtractionResult> {
      return client.request('extraction.run', { projectId, options });
    },

    async suggestions(
      projectId: string,
      status?: SuggestionStatus,
      entityType?: ExtractableEntityType
    ): Promise<SuggestionSummary[]> {
      return client.request('extraction.suggestions', { projectId, status, entityType });
    },

    async suggestion(suggestionId: string): Promise<EntitySuggestion> {
      return client.request('extraction.suggestion', { suggestionId });
    },

    async accept(suggestionId: string, reviewNotes?: string): Promise<AcceptResult> {
      return client.request('extraction.accept', { suggestionId, reviewNotes });
    },

    async reject(suggestionId: string, reviewNotes?: string): Promise<EntitySuggestion> {
      return client.request('extraction.reject', { suggestionId, reviewNotes });
    },

    async pendingCount(projectId: string): Promise<number> {
      const result = await client.request<{ count: number }>('extraction.pendingCount', {
        projectId,
      });
      return result.count;
    },

    async cleanup(projectId: string, days?: number): Promise<number> {
      const result = await client.request<{ deleted: number }>('extraction.cleanup', {
        projectId,
        days,
      });
      return result.deleted;
    },
  };
}
