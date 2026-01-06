/**
 * Lock point management service
 *
 * Manages lock points that protect content from modifications and revision cascades.
 * Lock points come in two types:
 * - full-lock: Prevents all modifications to content
 * - cascade-protection: Only prevents changes from revision cascades, allows direct edits
 */

import type { LockPoint, LockPointType } from '@repo/serial-types';

import type { ContentRepository } from '../storage/repositories/content-repository';
import type { LockPointRepository } from '../storage/repositories/lock-point-repository';

/**
 * Result of a lock check
 */
export interface LockCheckResult {
  /** Whether the content can be modified */
  canModify: boolean;
  /** Reason why content cannot be modified, if applicable */
  reason?: string;
  /** The lock point that prevents modification, if any */
  lockPoint?: LockPoint;
  /** Whether the content is published (immutable) */
  isPublished?: boolean;
}

/**
 * Result of a cascade lock check
 */
export interface CascadeLockCheckResult {
  /** Whether the content can be modified by a cascade */
  canCascade: boolean;
  /** Reason why cascade cannot proceed, if applicable */
  reason?: string;
  /** Lock points that block the cascade */
  blockingLockPoints: LockPoint[];
}

/**
 * Options for creating a lock point
 */
export interface CreateLockPointOptions {
  /** Content ID to lock */
  contentId: string;
  /** Reason for the lock */
  reason: string;
  /** Type of lock (full-lock or cascade-protection) */
  type: LockPointType;
}

/**
 * Lock summary for a project
 */
export interface LockSummary {
  /** Total number of lock points */
  total: number;
  /** Number of full locks */
  fullLocks: number;
  /** Number of cascade protection locks */
  cascadeProtections: number;
  /** Content IDs with any lock */
  lockedContentIds: string[];
  /** Content IDs with full locks */
  fullyLockedContentIds: string[];
}

/**
 * Lock point service interface
 */
export interface LockPointService {
  /**
   * Create a lock point to protect content
   */
  createLock(projectId: string, options: CreateLockPointOptions): LockPoint | undefined;

  /**
   * Remove a lock point
   */
  removeLock(projectId: string, lockPointId: string): boolean;

  /**
   * Get all lock points for a project
   */
  getProjectLocks(projectId: string): LockPoint[];

  /**
   * Get all lock points for specific content
   */
  getContentLocks(projectId: string, contentId: string): LockPoint[];

  /**
   * Get a summary of locks for a project
   */
  getLockSummary(projectId: string): LockSummary;

  /**
   * Check if content can be modified (considering all lock types)
   */
  canModifyContent(projectId: string, contentId: string): LockCheckResult;

  /**
   * Check if content can be modified by a revision cascade
   */
  canCascadeToContent(projectId: string, contentId: string): CascadeLockCheckResult;

  /**
   * Check if any lock points block a cascade to multiple content items
   */
  getCascadeBlockers(projectId: string, contentIds: string[]): Map<string, LockPoint[]>;

  /**
   * Create full locks for multiple content items (batch operation)
   */
  lockMultiple(
    projectId: string,
    contentIds: string[],
    reason: string,
    type: LockPointType
  ): { succeeded: string[]; failed: Array<{ contentId: string; reason: string }> };

  /**
   * Remove all locks for specific content
   */
  removeAllLocksForContent(projectId: string, contentId: string): number;

  /**
   * Check if content has any lock of a specific type
   */
  hasLockType(projectId: string, contentId: string, type: LockPointType): boolean;
}

/**
 * Create the lock point service
 */
export function createLockPointService(
  contentRepo: ContentRepository,
  lockPointRepo: LockPointRepository
): LockPointService {
  return {
    createLock(projectId: string, options: CreateLockPointOptions): LockPoint | undefined {
      // Verify content exists
      const content = contentRepo.findById(projectId, options.contentId);
      if (!content) {
        return undefined;
      }

      // Don't create redundant full locks on published content
      if (content.status === 'published' && options.type === 'full-lock') {
        // Published content is already immutable, but we can still create the lock
        // for audit trail purposes
      }

      return lockPointRepo.create(projectId, {
        contentId: options.contentId,
        reason: options.reason,
        type: options.type,
      });
    },

    removeLock(projectId: string, lockPointId: string): boolean {
      return lockPointRepo.delete(projectId, lockPointId);
    },

    getProjectLocks(projectId: string): LockPoint[] {
      return lockPointRepo.findByProject(projectId);
    },

    getContentLocks(projectId: string, contentId: string): LockPoint[] {
      return lockPointRepo.findByContent(projectId, contentId);
    },

    getLockSummary(projectId: string): LockSummary {
      const allLocks = lockPointRepo.findByProject(projectId);

      const fullLocks = allLocks.filter((lp) => lp.type === 'full-lock');
      const cascadeProtections = allLocks.filter((lp) => lp.type === 'cascade-protection');

      // Get unique content IDs
      const lockedContentIds = [...new Set(allLocks.map((lp) => lp.contentId))];
      const fullyLockedContentIds = [...new Set(fullLocks.map((lp) => lp.contentId))];

      return {
        total: allLocks.length,
        fullLocks: fullLocks.length,
        cascadeProtections: cascadeProtections.length,
        lockedContentIds,
        fullyLockedContentIds,
      };
    },

    canModifyContent(projectId: string, contentId: string): LockCheckResult {
      const content = contentRepo.findById(projectId, contentId);
      if (!content) {
        return { canModify: false, reason: 'Content not found' };
      }

      // Published content is immutable
      if (content.status === 'published') {
        return {
          canModify: false,
          reason: 'Published content is immutable and cannot be modified',
          isPublished: true,
        };
      }

      // Check content's own lock flag
      if (content.locked) {
        return {
          canModify: false,
          reason: content.lockReason ?? 'Content is locked',
        };
      }

      // Check for full-lock lock points
      const lockPoints = lockPointRepo.findByContent(projectId, contentId);
      const fullLock = lockPoints.find((lp) => lp.type === 'full-lock');
      if (fullLock) {
        return {
          canModify: false,
          reason: fullLock.reason,
          lockPoint: fullLock,
        };
      }

      // cascade-protection doesn't block direct modifications
      return { canModify: true };
    },

    canCascadeToContent(projectId: string, contentId: string): CascadeLockCheckResult {
      const content = contentRepo.findById(projectId, contentId);
      if (!content) {
        return {
          canCascade: false,
          reason: 'Content not found',
          blockingLockPoints: [],
        };
      }

      // Published content cannot be cascaded to
      if (content.status === 'published') {
        return {
          canCascade: false,
          reason: 'Published content is immutable',
          blockingLockPoints: [],
        };
      }

      // Check content's own lock flag
      if (content.locked) {
        return {
          canCascade: false,
          reason: content.lockReason ?? 'Content is locked',
          blockingLockPoints: [],
        };
      }

      // Check for any lock points (both types block cascades)
      const lockPoints = lockPointRepo.findByContent(projectId, contentId);
      if (lockPoints.length > 0) {
        return {
          canCascade: false,
          reason: `Content is protected by ${lockPoints.length} lock point(s)`,
          blockingLockPoints: lockPoints,
        };
      }

      return { canCascade: true, blockingLockPoints: [] };
    },

    getCascadeBlockers(projectId: string, contentIds: string[]): Map<string, LockPoint[]> {
      const blockers = new Map<string, LockPoint[]>();

      for (const contentId of contentIds) {
        const result = this.canCascadeToContent(projectId, contentId);
        if (!result.canCascade && result.blockingLockPoints.length > 0) {
          blockers.set(contentId, result.blockingLockPoints);
        }
      }

      return blockers;
    },

    lockMultiple(
      projectId: string,
      contentIds: string[],
      reason: string,
      type: LockPointType
    ): { succeeded: string[]; failed: Array<{ contentId: string; reason: string }> } {
      const succeeded: string[] = [];
      const failed: Array<{ contentId: string; reason: string }> = [];

      for (const contentId of contentIds) {
        const lockPoint = this.createLock(projectId, { contentId, reason, type });
        if (lockPoint) {
          succeeded.push(contentId);
        } else {
          failed.push({ contentId, reason: 'Content not found' });
        }
      }

      return { succeeded, failed };
    },

    removeAllLocksForContent(projectId: string, contentId: string): number {
      return lockPointRepo.deleteByContent(projectId, contentId);
    },

    hasLockType(projectId: string, contentId: string, type: LockPointType): boolean {
      const lockPoints = lockPointRepo.findByContent(projectId, contentId);
      return lockPoints.some((lp) => lp.type === type);
    },
  };
}
