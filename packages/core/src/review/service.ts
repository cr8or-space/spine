/**
 * Review workflow service implementation
 *
 * Manages the review process including status transitions, paragraph-level actions,
 * comments, and lock points.
 */

import type {
  Content,
  ContentStatus,
  LockPoint,
  ParagraphAction,
  Review,
  ReviewComment,
  ReviewQueueItem,
} from '@repo/types';

import type { ContentRepository } from '../storage/repositories/content-repository';
import type { LockPointRepository } from '../storage/repositories/lock-point-repository';
import type { StructureRepository } from '../storage/repositories/structure-repository';
import { generateId, nowTimestamp } from '../storage/repository';

import type {
  ApplyActionResult,
  ReviewQueueFilters,
  ReviewWorkflowConfig,
  ReviewWorkflowService,
  StatusTransitionResult,
} from './types';
import { DEFAULT_REVIEW_CONFIG } from './types';

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ['review', 'approved'], // Can skip review for simple changes
  review: ['draft', 'approved', 'published'], // Can send back, approve, or direct publish
  approved: ['published', 'review'], // Can publish or send back for revisions
  published: [], // Published is immutable
};

/**
 * Create the review workflow service
 */
export function createReviewWorkflowService(
  contentRepo: ContentRepository,
  lockPointRepo: LockPointRepository,
  structureRepo: StructureRepository,
  config?: ReviewWorkflowConfig
): ReviewWorkflowService {
  const mergedConfig: Required<ReviewWorkflowConfig> = {
    ...DEFAULT_REVIEW_CONFIG,
    ...config,
  };

  function isValidTransition(from: ContentStatus, to: ContentStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  function canModifyContent(
    projectId: string,
    contentId: string
  ): { canModify: boolean; reason?: string; lockPoint?: LockPoint } {
    const content = contentRepo.findById(projectId, contentId);
    if (!content) {
      return { canModify: false, reason: 'Content not found' };
    }

    // Published content is immutable
    if (content.status === 'published') {
      return {
        canModify: false,
        reason: 'Published content is immutable and cannot be modified',
      };
    }

    // Check for lock points
    const lockPoints = lockPointRepo.findByContent(projectId, contentId);
    const fullLock = lockPoints.find((lp) => lp.type === 'full-lock');
    if (fullLock) {
      return {
        canModify: false,
        reason: fullLock.reason,
        lockPoint: fullLock,
      };
    }

    // Check content's own lock flag
    if (content.locked) {
      return {
        canModify: false,
        reason: content.lockReason ?? 'Content is locked',
      };
    }

    return { canModify: true };
  }

  return {
    getReviewQueue(projectId: string, filters?: ReviewQueueFilters): ReviewQueueItem[] {
      // Get all content for the project
      const allContent = contentRepo.findByProject(projectId);

      // Filter by status if specified
      let filteredContent = allContent;
      if (filters?.status) {
        const statusList = Array.isArray(filters.status) ? filters.status : [filters.status];
        filteredContent = filteredContent.filter((c) => statusList.includes(c.status));
      } else {
        // Default: only show review and draft
        filteredContent = filteredContent.filter((c) =>
          ['draft', 'review'].includes(c.status)
        );
      }

      // Build queue items
      const queueItems: ReviewQueueItem[] = [];

      for (const content of filteredContent) {
        // Get structure for title
        const structure = structureRepo.findById(projectId, content.structureId);
        if (!structure) continue;

        // Count unresolved issues
        const issueCount = content.reviews.reduce((count, review) => {
          return (
            count +
            review.comments.filter((c) => c.type === 'issue' && !c.resolved).length
          );
        }, 0);

        // Skip if onlyWithIssues is set and there are no issues
        if (filters?.onlyWithIssues && issueCount === 0) {
          continue;
        }

        // Calculate priority
        let priority = 50; // Base priority

        // Higher priority for review status
        if (content.status === 'review') priority += 30;

        // Higher priority if has issues
        if (issueCount > 0) priority += issueCount * 5;

        // Higher priority for older content
        const ageHours = (Date.now() - new Date(content.updatedAt).getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) priority += 10;
        if (ageHours > 72) priority += 10;

        // Lower priority if recently updated
        if (ageHours < 1) priority -= 10;

        // Filter by minimum priority if specified
        if (filters?.minPriority !== undefined && priority < filters.minPriority) {
          continue;
        }

        queueItems.push({
          contentId: content.id,
          structureId: content.structureId,
          title: structure.title,
          status: content.status,
          priority,
          queuedAt: content.updatedAt,
          issueCount,
          wordCount: content.text.trim().split(/\s+/).filter((w) => w.length > 0).length,
        });
      }

      // Sort by priority descending
      queueItems.sort((a, b) => b.priority - a.priority);

      // Apply limit if specified
      if (filters?.limit) {
        return queueItems.slice(0, filters.limit);
      }

      return queueItems;
    },

    addComment(
      projectId: string,
      contentId: string,
      comment: Omit<ReviewComment, 'id' | 'createdAt'>
    ): Content | undefined {
      const content = contentRepo.findById(projectId, contentId);
      if (!content) return undefined;

      // Find the most recent review or create a new one
      let currentReview: Review;
      const latestReview = content.reviews[content.reviews.length - 1];

      if (latestReview && !latestReview.completedAt) {
        // Add to existing in-progress review
        currentReview = latestReview;
      } else {
        // Create a new review
        currentReview = {
          id: generateId(),
          contentId,
          contentVersion: content.currentVersion,
          comments: [],
          paragraphActions: [],
          startedAt: nowTimestamp(),
        };
      }

      // Add the comment
      const newComment: ReviewComment = {
        ...comment,
        id: generateId(),
        createdAt: nowTimestamp(),
      };

      currentReview.comments.push(newComment);

      // Update reviews array
      const updatedReviews =
        latestReview && !latestReview.completedAt
          ? [...content.reviews.slice(0, -1), currentReview]
          : [...content.reviews, currentReview];

      return contentRepo.update(projectId, contentId, { reviews: updatedReviews });
    },

    resolveComment(projectId: string, contentId: string, commentId: string): Content | undefined {
      const content = contentRepo.findById(projectId, contentId);
      if (!content) return undefined;

      // Find and update the comment
      const updatedReviews = content.reviews.map((review) => ({
        ...review,
        comments: review.comments.map((comment) =>
          comment.id === commentId ? { ...comment, resolved: true } : comment
        ),
      }));

      return contentRepo.update(projectId, contentId, { reviews: updatedReviews });
    },

    applyParagraphAction(
      projectId: string,
      contentId: string,
      action: ParagraphAction
    ): ApplyActionResult {
      const checkResult = canModifyContent(projectId, contentId);
      if (!checkResult.canModify) {
        return {
          success: false,
          error: checkResult.reason,
        };
      }

      const content = contentRepo.findById(projectId, contentId);
      if (!content) {
        return { success: false, error: 'Content not found' };
      }

      // Split content into paragraphs
      const paragraphs = content.text.split(/\n\n+/);

      if (action.paragraphIndex < 0 || action.paragraphIndex >= paragraphs.length) {
        return { success: false, error: 'Invalid paragraph index' };
      }

      let updatedText = content.text;
      let needsRegeneration = false;

      switch (action.action) {
        case 'accept':
          // No changes needed - paragraph is already in content
          break;

        case 'reject':
          // Remove the paragraph
          paragraphs.splice(action.paragraphIndex, 1);
          updatedText = paragraphs.join('\n\n');
          break;

        case 'edit':
          if (!action.newText) {
            return { success: false, error: 'New text required for edit action' };
          }
          paragraphs[action.paragraphIndex] = action.newText;
          updatedText = paragraphs.join('\n\n');
          break;

        case 'regenerate':
          // Mark for regeneration - actual regeneration happens in generation pipeline
          needsRegeneration = true;
          break;
      }

      // Add action to the current review
      let currentReview: Review;
      const latestReview = content.reviews[content.reviews.length - 1];

      if (latestReview && !latestReview.completedAt) {
        currentReview = latestReview;
      } else {
        currentReview = {
          id: generateId(),
          contentId,
          contentVersion: content.currentVersion,
          comments: [],
          paragraphActions: [],
          startedAt: nowTimestamp(),
        };
      }

      currentReview.paragraphActions.push(action);

      const updatedReviews =
        latestReview && !latestReview.completedAt
          ? [...content.reviews.slice(0, -1), currentReview]
          : [...content.reviews, currentReview];

      // Update content if text changed
      let updatedContent: Content | undefined;
      if (updatedText !== content.text) {
        // Create a new version with the edited text
        updatedContent = contentRepo.addVersion(projectId, contentId, updatedText, 'edited', {
          editDescription: `Paragraph ${action.paragraphIndex} ${action.action}`,
        });

        // Update reviews after version change
        if (updatedContent) {
          updatedContent = contentRepo.update(projectId, contentId, {
            reviews: updatedReviews,
          });
        }
      } else {
        // Just update the reviews
        updatedContent = contentRepo.update(projectId, contentId, { reviews: updatedReviews });
      }

      return {
        success: true,
        content: updatedContent,
        needsRegeneration,
      };
    },

    transitionStatus(
      projectId: string,
      contentId: string,
      newStatus: ContentStatus
    ): StatusTransitionResult {
      const content = contentRepo.findById(projectId, contentId);
      if (!content) {
        return { success: false, error: 'Content not found' };
      }

      const currentStatus = content.status;

      // Check if transition is valid
      if (!isValidTransition(currentStatus, newStatus)) {
        return {
          success: false,
          error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
          previousStatus: currentStatus,
        };
      }

      // Published content cannot be transitioned
      if (currentStatus === 'published') {
        return {
          success: false,
          error: 'Published content is immutable',
          previousStatus: currentStatus,
        };
      }

      // Check requirements for approval
      if (newStatus === 'approved') {
        // Require analysis if configured
        if (mergedConfig.requireAnalysisForApproval && !content.analysis) {
          return {
            success: false,
            error: 'Content must be analyzed before approval',
            previousStatus: currentStatus,
          };
        }

        // Check minimum reviews
        const completedReviews = content.reviews.filter((r) => r.completedAt).length;
        if (completedReviews < mergedConfig.minReviewsRequired) {
          return {
            success: false,
            error: `At least ${mergedConfig.minReviewsRequired} review(s) required for approval`,
            previousStatus: currentStatus,
          };
        }

        // Check for unresolved issues
        const unresolvedIssues = content.reviews.some((r) =>
          r.comments.some((c) => c.type === 'issue' && !c.resolved)
        );
        if (unresolvedIssues) {
          return {
            success: false,
            error: 'All issues must be resolved before approval',
            previousStatus: currentStatus,
          };
        }
      }

      // Use publish method for publishing (handles locking)
      if (newStatus === 'published') {
        const published = contentRepo.publish(projectId, contentId);
        if (!published) {
          return {
            success: false,
            error: 'Failed to publish content - may not be approved',
            previousStatus: currentStatus,
          };
        }
        return {
          success: true,
          content: published,
          previousStatus: currentStatus,
        };
      }

      // Perform the transition
      const updated = contentRepo.setStatus(projectId, contentId, newStatus);
      if (!updated) {
        return {
          success: false,
          error: 'Failed to update status',
          previousStatus: currentStatus,
        };
      }

      return {
        success: true,
        content: updated,
        previousStatus: currentStatus,
      };
    },

    submitReview(projectId: string, review: Omit<Review, 'id'>): Content | undefined {
      const content = contentRepo.findById(projectId, review.contentId);
      if (!content) return undefined;

      // Complete the review
      const completedReview: Review = {
        ...review,
        id: generateId(),
        completedAt: nowTimestamp(),
      };

      // Find if this is an update to an existing review
      const existingIndex = content.reviews.findIndex(
        (r) => r.contentVersion === review.contentVersion && !r.completedAt
      );

      let updatedReviews: Review[];
      if (existingIndex >= 0) {
        // Update existing review
        updatedReviews = [...content.reviews];
        updatedReviews[existingIndex] = {
          ...updatedReviews[existingIndex],
          ...completedReview,
        };
      } else {
        // Add new review
        updatedReviews = [...content.reviews, completedReview];
      }

      return contentRepo.update(projectId, review.contentId, { reviews: updatedReviews });
    },

    createLockPoint(
      projectId: string,
      lockPoint: Omit<LockPoint, 'id' | 'createdAt'>
    ): LockPoint | undefined {
      // Verify content exists
      const content = contentRepo.findById(projectId, lockPoint.contentId);
      if (!content) return undefined;

      return lockPointRepo.create(projectId, lockPoint);
    },

    removeLockPoint(projectId: string, lockPointId: string): boolean {
      return lockPointRepo.delete(projectId, lockPointId);
    },

    getLockPoints(projectId: string): LockPoint[] {
      return lockPointRepo.findByProject(projectId);
    },

    getLockPointsForContent(projectId: string, contentId: string): LockPoint[] {
      return lockPointRepo.findByContent(projectId, contentId);
    },

    canModify(
      projectId: string,
      contentId: string
    ): { canModify: boolean; reason?: string; lockPoint?: LockPoint } {
      return canModifyContent(projectId, contentId);
    },

    bulkApprove(
      projectId: string,
      contentIds: string[]
    ): { succeeded: string[]; failed: Array<{ contentId: string; reason: string }> } {
      const succeeded: string[] = [];
      const failed: Array<{ contentId: string; reason: string }> = [];

      for (const contentId of contentIds) {
        const result = this.transitionStatus(projectId, contentId, 'approved');
        if (result.success) {
          succeeded.push(contentId);
        } else {
          failed.push({
            contentId,
            reason: result.error ?? 'Unknown error',
          });
        }
      }

      return { succeeded, failed };
    },
  };
}
