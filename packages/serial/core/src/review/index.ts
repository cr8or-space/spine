/**
 * Review workflow package
 *
 * Provides review queue management, status transitions, paragraph-level actions,
 * comments, and lock point management for the content review process.
 *
 * Note: Revision cascade functionality is provided by the continuity/ package.
 */

// Main review workflow service
export { createReviewWorkflowService } from './service';
export type {
  ApplyActionResult,
  ReviewQueueFilters,
  ReviewWorkflowConfig,
  ReviewWorkflowService,
  StatusTransitionResult,
} from './types';
export { DEFAULT_REVIEW_CONFIG } from './types';

// Lock point management
export { createLockPointService } from './locks';
export type {
  CascadeLockCheckResult,
  CreateLockPointOptions,
  LockCheckResult,
  LockPointService,
  LockSummary,
} from './locks';
