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
import type {
  ApplyActionResult,
  StatusTransitionResult,
  CascadePreview,
  CascadeExecutionResult,
  CascadeExecutionOptions
} from '@repo/core';

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

interface ReviewExecuteCascadeParams {
  projectId: string;
  contentId: string;
  options?: CascadeExecutionOptions;
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
          paragraphIndex: params.paragraphIndex,
          timestamp: new Date().toISOString()
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
        location: {
          paragraphIndex: params.comment.paragraphIndex
        },
        text: params.comment.text,
        type: 'note',
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
  router.register<ReviewCascadeParams, CascadePreview>(
    API_METHODS.REVIEW_PREVIEW_CASCADE,
    (params) => {
      // Verify content exists
      const content = services.project.repos.contents.findById(
        params.projectId,
        params.contentId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      // Use the full cascade service for preview
      return services.cascade.previewCascade(params.projectId, params.contentId);
    }
  );

  // review.executeCascade - Execute revision cascade
  router.register<ReviewExecuteCascadeParams, CascadeExecutionResult>(
    API_METHODS.REVIEW_EXECUTE_CASCADE,
    (params) => {
      // Verify content exists
      const content = services.project.repos.contents.findById(
        params.projectId,
        params.contentId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      // Use the full cascade service for execution
      const result = services.cascade.executeCascade(
        params.projectId,
        params.contentId,
        params.options
      );

      if (!result.success) {
        throw ApiError.reviewError(result.error ?? 'Cascade execution failed');
      }

      return result;
    }
  );
}
