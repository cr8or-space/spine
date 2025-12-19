/**
 * Review API handlers - Review workflow, comments, lock points, and status transitions
 *
 * These handlers manage the content review workflow including
 * the review queue, paragraph actions, comments, lock points,
 * and status transitions.
 */

import type { Router } from '../router';
import { ApiError } from '../router';
import type { Services } from '../services';
import { API_METHODS } from '../protocol';
import type {
  Content,
  ContentStatus,
  LockPoint,
  ReviewQueueItem
} from '@repo/types';
import type { ApplyActionResult, StatusTransitionResult } from '@repo/core';

// Simplified param types
interface ReviewQueueParams {
  projectId: string;
  status?: ContentStatus;
}

interface ReviewGetItemParams {
  projectId: string;
  contentId: string;
}

interface ReviewSubmitActionParams {
  projectId: string;
  contentId: string;
  paragraphIndex: number;
  action: 'accept' | 'reject' | 'regenerate';
}

interface ReviewBulkApproveParams {
  projectId: string;
  contentIds: string[];
}

interface ReviewCreateLockPointParams {
  projectId: string;
  structureId: string;
}

interface ReviewRemoveLockPointParams {
  projectId: string;
  lockPointId: string;
}

interface ReviewGetLockPointsParams {
  projectId: string;
  contentId?: string;
}

interface ReviewAddCommentParams {
  projectId: string;
  contentId: string;
  comment: {
    paragraphIndex: number;
    text: string;
    author?: string;
  };
}

interface ReviewResolveCommentParams {
  projectId: string;
  contentId: string;
  commentId: string;
}

interface ReviewTransitionStatusParams {
  projectId: string;
  contentId: string;
  newStatus: ContentStatus;
  reason?: string;
}

interface ReviewCascadeParams {
  projectId: string;
  contentId: string;
}

/**
 * Register review handlers on the router.
 */
export function registerReviewHandlers(router: Router, services: Services): void {
  // review.queue - Get the review queue
  router.register<ReviewQueueParams, ReviewQueueItem[]>(
    API_METHODS.REVIEW_QUEUE,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      const reviewService = services.review(params.projectId);
      const filters = params.status ? { status: params.status } : undefined;

      return reviewService.getReviewQueue(params.projectId, filters);
    }
  );

  // review.getItem - Get a specific review item
  router.register<ReviewGetItemParams, Content>(
    API_METHODS.REVIEW_GET_ITEM,
    (params) => {
      const content = services.project.repos.contents.findById(
        params.projectId,
        params.contentId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      return content;
    }
  );

  // review.submitAction - Submit a paragraph-level action
  router.register<ReviewSubmitActionParams, ApplyActionResult>(
    API_METHODS.REVIEW_SUBMIT_ACTION,
    (params) => {
      const reviewService = services.review(params.projectId);

      const result = reviewService.applyParagraphAction(
        params.projectId,
        params.contentId,
        {
          action: params.action,
          paragraphIndex: params.paragraphIndex
        }
      );

      if (!result.success) {
        throw ApiError.reviewError(result.error ?? 'Failed to apply action');
      }

      return result;
    }
  );

  // review.bulkApprove - Bulk approve multiple content items
  router.register<ReviewBulkApproveParams, { succeeded: string[]; failed: Array<{ contentId: string; reason: string }> }>(
    API_METHODS.REVIEW_BULK_APPROVE,
    (params) => {
      const reviewService = services.review(params.projectId);
      return reviewService.bulkApprove(params.projectId, params.contentIds);
    }
  );

  // review.createLockPoint - Create a lock point
  router.register<ReviewCreateLockPointParams, LockPoint>(
    API_METHODS.REVIEW_CREATE_LOCK_POINT,
    (params) => {
      const reviewService = services.review(params.projectId);

      // Find content for the structure
      const content = services.project.repos.contents.findByStructure(
        params.projectId,
        params.structureId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.structureId);
      }

      const lockPoint = reviewService.createLockPoint(params.projectId, {
        contentId: content.id,
        structureId: params.structureId,
        type: 'full-lock',
        reason: 'Author lock point'
      });

      if (!lockPoint) {
        throw ApiError.reviewError('Failed to create lock point');
      }

      return lockPoint;
    }
  );

  // review.removeLockPoint - Remove a lock point
  router.register<ReviewRemoveLockPointParams, { success: boolean }>(
    API_METHODS.REVIEW_REMOVE_LOCK_POINT,
    (params) => {
      const reviewService = services.review(params.projectId);
      const success = reviewService.removeLockPoint(params.projectId, params.lockPointId);

      if (!success) {
        throw ApiError.entityNotFound('LockPoint', params.lockPointId);
      }

      return { success };
    }
  );

  // review.getLockPoints - Get lock points
  router.register<ReviewGetLockPointsParams, LockPoint[]>(
    API_METHODS.REVIEW_GET_LOCK_POINTS,
    (params) => {
      const reviewService = services.review(params.projectId);

      if (params.contentId) {
        return reviewService.getLockPointsForContent(params.projectId, params.contentId);
      }

      return reviewService.getLockPoints(params.projectId);
    }
  );

  // review.addComment - Add a review comment
  router.register<ReviewAddCommentParams, Content>(
    API_METHODS.REVIEW_ADD_COMMENT,
    (params) => {
      const reviewService = services.review(params.projectId);

      const content = reviewService.addComment(params.projectId, params.contentId, {
        paragraphIndex: params.comment.paragraphIndex,
        text: params.comment.text,
        author: params.comment.author ?? 'Author',
        resolved: false
      });

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      return content;
    }
  );

  // review.resolveComment - Resolve a comment
  router.register<ReviewResolveCommentParams, Content>(
    API_METHODS.REVIEW_RESOLVE_COMMENT,
    (params) => {
      const reviewService = services.review(params.projectId);

      const content = reviewService.resolveComment(
        params.projectId,
        params.contentId,
        params.commentId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      return content;
    }
  );

  // review.transitionStatus - Transition content status
  router.register<ReviewTransitionStatusParams, StatusTransitionResult>(
    API_METHODS.REVIEW_TRANSITION_STATUS,
    (params) => {
      const reviewService = services.review(params.projectId);

      const result = reviewService.transitionStatus(
        params.projectId,
        params.contentId,
        params.newStatus,
        params.reason
      );

      if (!result.success) {
        throw ApiError.reviewError(result.error ?? 'Failed to transition status');
      }

      return result;
    }
  );

  // review.previewCascade - Preview revision cascade impact
  router.register<ReviewCascadeParams, { affectedStructures: string[]; lockPoints: LockPoint[] }>(
    API_METHODS.REVIEW_PREVIEW_CASCADE,
    (params) => {
      const reviewService = services.review(params.projectId);

      // Get structure hierarchy to determine cascade scope
      const content = services.project.repos.contents.findById(
        params.projectId,
        params.contentId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      // Find all structures that would be affected by a change
      const structureService = services.structure(params.projectId);
      const allStructures = structureService.getAll();

      // Find structure for this content
      const currentStructure = allStructures.find(s => s.id === content.structureId);
      if (!currentStructure) {
        throw ApiError.entityNotFound('Structure', content.structureId);
      }

      // Get all child structures (would be affected by cascade)
      const affectedStructures: string[] = [];
      const collectChildren = (parentId: string): void => {
        for (const s of allStructures) {
          if (s.parentId === parentId) {
            affectedStructures.push(s.id);
            collectChildren(s.id);
          }
        }
      };
      collectChildren(currentStructure.id);

      // Get lock points that would block cascade
      const lockPoints = reviewService.getLockPoints(params.projectId);
      const blockingLockPoints = lockPoints.filter(lp =>
        affectedStructures.includes(lp.structureId)
      );

      return {
        affectedStructures,
        lockPoints: blockingLockPoints
      };
    }
  );

  // review.executeCascade - Execute revision cascade
  router.register<ReviewCascadeParams, { success: boolean; affected: number }>(
    API_METHODS.REVIEW_EXECUTE_CASCADE,
    (params) => {
      // Note: Full cascade implementation would require the continuity/cascade service
      // For now, we mark the content and children as needing review

      const content = services.project.repos.contents.findById(
        params.projectId,
        params.contentId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      // Find child content and transition to draft
      const structureService = services.structure(params.projectId);
      const allStructures = structureService.getAll();
      const currentStructure = allStructures.find(s => s.id === content.structureId);

      if (!currentStructure) {
        throw ApiError.entityNotFound('Structure', content.structureId);
      }

      const reviewService = services.review(params.projectId);
      let affected = 0;

      // Collect child structure IDs
      const childStructureIds: string[] = [];
      const collectChildren = (parentId: string): void => {
        for (const s of allStructures) {
          if (s.parentId === parentId) {
            childStructureIds.push(s.id);
            collectChildren(s.id);
          }
        }
      };
      collectChildren(currentStructure.id);

      // Transition child content back to draft
      for (const structureId of childStructureIds) {
        const childContent = services.project.repos.contents.findByStructure(
          params.projectId,
          structureId
        );

        if (childContent && childContent.status !== 'published') {
          const result = reviewService.transitionStatus(
            params.projectId,
            childContent.id,
            'draft',
            'Cascade from parent revision'
          );
          if (result.success) {
            affected++;
          }
        }
      }

      return { success: true, affected };
    }
  );
}
