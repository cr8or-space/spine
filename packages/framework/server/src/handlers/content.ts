/**
 * Content API handlers - Content read, write, history, rollback
 */

import type { Router } from '../router';
import { ApiError } from '../router';
import type { Services } from '../services';
import { API_METHODS } from '../protocol';
import type { Content, ContentVersion } from '@repo/serial-types';

// Simplified param types
interface ContentGetParams {
  projectId: string;
  structureId: string;
}

interface ContentSaveParams {
  projectId: string;
  structureId: string;
  text: string;
}

interface ContentHistoryParams {
  projectId: string;
  structureId: string;
}

interface ContentRollbackParams {
  projectId: string;
  structureId: string;
  versionNumber: number;
}

/**
 * Register content handlers on the router.
 */
export function registerContentHandlers(router: Router, services: Services): void {
  // content.get - Get content for a structure
  router.register<ContentGetParams, Content | null>(
    API_METHODS.CONTENT_GET,
    (params) => {
      const content = services.project.repos.contents.findByStructure(
        params.projectId,
        params.structureId
      );
      return content ?? null;
    }
  );

  // content.save - Save content for a structure
  router.register<ContentSaveParams, Content>(
    API_METHODS.CONTENT_SAVE,
    (params) => {
      const existing = services.project.repos.contents.findByStructure(
        params.projectId,
        params.structureId
      );

      if (existing) {
        // Check if content is locked
        if (existing.locked) {
          throw ApiError.contentLocked(params.structureId);
        }

        // Update existing content
        const updated = services.project.repos.contents.update(
          params.projectId,
          existing.id,
          { text: params.text }
        );
        if (!updated) {
          throw ApiError.databaseError('Failed to update content');
        }
        return updated;
      } else {
        // Create new content
        const created = services.project.repos.contents.create(params.projectId, {
          structureId: params.structureId,
          text: params.text,
          initialText: params.text,
          status: 'draft',
          source: 'edited',
          reviews: [],
          generationHistory: [],
          locked: false
        });
        return created;
      }
    }
  );

  // content.getHistory - Get version history for content
  router.register<ContentHistoryParams, ContentVersion[]>(
    API_METHODS.CONTENT_GET_HISTORY,
    (params) => {
      const content = services.project.repos.contents.findByStructure(
        params.projectId,
        params.structureId
      );

      if (!content) {
        return [];
      }

      return content.versions;
    }
  );

  // content.rollback - Rollback to a specific version
  router.register<ContentRollbackParams, Content>(
    API_METHODS.CONTENT_ROLLBACK,
    (params) => {
      const content = services.project.repos.contents.findByStructure(
        params.projectId,
        params.structureId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.structureId);
      }

      if (content.locked) {
        throw ApiError.contentLocked(params.structureId);
      }

      // Find the target version by version number
      const targetVersion = content.versions.find(
        (v) => v.version === params.versionNumber
      );
      if (!targetVersion) {
        throw ApiError.entityNotFound('Version', String(params.versionNumber));
      }

      // Update content with the rolled back text
      const updated = services.project.repos.contents.update(
        params.projectId,
        content.id,
        { text: targetVersion.text }
      );

      if (!updated) {
        throw ApiError.databaseError('Failed to rollback content');
      }

      return updated;
    }
  );
}
