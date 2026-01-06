/**
 * Review workflow types and interfaces
 */

import type {
  Content,
  ContentStatus,
  LockPoint,
  ParagraphAction,
  Review,
  ReviewComment,
  ReviewQueueItem,
} from '@repo/serial-types';

/**
 * Result of applying a paragraph action
 */
export interface ApplyActionResult {
  /** Whether the action was successful */
  success: boolean;
  /** Updated content if successful */
  content?: Content;
  /** Error message if failed */
  error?: string;
  /** Whether regeneration is needed */
  needsRegeneration?: boolean;
}

/**
 * Result of status transition
 */
export interface StatusTransitionResult {
  /** Whether the transition was successful */
  success: boolean;
  /** Updated content if successful */
  content?: Content;
  /** Error message if failed */
  error?: string;
  /** Previous status for rollback */
  previousStatus?: ContentStatus;
}

/**
 * Review workflow service
 */
export interface ReviewWorkflowService {
  /**
   * Get the review queue sorted by priority
   */
  getReviewQueue(projectId: string, filters?: ReviewQueueFilters): ReviewQueueItem[];

  /**
   * Add a review comment to content
   */
  addComment(
    projectId: string,
    contentId: string,
    comment: Omit<ReviewComment, 'id' | 'createdAt'>
  ): Content | undefined;

  /**
   * Resolve a review comment
   */
  resolveComment(projectId: string, contentId: string, commentId: string): Content | undefined;

  /**
   * Apply a paragraph action (accept/reject/regenerate/edit)
   */
  applyParagraphAction(
    projectId: string,
    contentId: string,
    action: ParagraphAction
  ): ApplyActionResult;

  /**
   * Transition content to a new status
   */
  transitionStatus(
    projectId: string,
    contentId: string,
    newStatus: ContentStatus,
    reason?: string
  ): StatusTransitionResult;

  /**
   * Submit a complete review
   */
  submitReview(projectId: string, review: Omit<Review, 'id'>): Content | undefined;

  /**
   * Create a lock point to protect content
   */
  createLockPoint(
    projectId: string,
    lockPoint: Omit<LockPoint, 'id' | 'createdAt'>
  ): LockPoint | undefined;

  /**
   * Remove a lock point
   */
  removeLockPoint(projectId: string, lockPointId: string): boolean;

  /**
   * Get all lock points for a project
   */
  getLockPoints(projectId: string): LockPoint[];

  /**
   * Get lock points for specific content
   */
  getLockPointsForContent(projectId: string, contentId: string): LockPoint[];

  /**
   * Check if content can be modified
   */
  canModify(
    projectId: string,
    contentId: string
  ): { canModify: boolean; reason?: string; lockPoint?: LockPoint };

  /**
   * Bulk approve content (for efficient review)
   */
  bulkApprove(projectId: string, contentIds: string[]): {
    succeeded: string[];
    failed: Array<{ contentId: string; reason: string }>;
  };
}

/**
 * Filters for review queue
 */
export interface ReviewQueueFilters {
  /** Filter by status */
  status?: ContentStatus | ContentStatus[];
  /** Minimum priority */
  minPriority?: number;
  /** Maximum number of results */
  limit?: number;
  /** Include only items with issues */
  onlyWithIssues?: boolean;
}

/**
 * Configuration for review workflow
 */
export interface ReviewWorkflowConfig {
  /** Auto-transition from draft to review when analysis is complete */
  autoTransitionToReview?: boolean;
  /** Require analysis before approval */
  requireAnalysisForApproval?: boolean;
  /** Minimum number of reviews required before approval */
  minReviewsRequired?: number;
}

/**
 * Default configuration
 */
export const DEFAULT_REVIEW_CONFIG: Required<ReviewWorkflowConfig> = {
  autoTransitionToReview: false,
  requireAnalysisForApproval: true,
  minReviewsRequired: 1,
};
