/**
 * Types for the revision cascade system
 *
 * The revision cascade handles change propagation within configured bounds,
 * protecting content behind lock points and published content from changes.
 */

import type { Content, LockPoint, RevisionImpact } from '@repo/types';

/**
 * Revision horizon configuration
 *
 * Controls how far changes can propagate through the content.
 */
export interface RevisionHorizonConfig {
  /** Maximum number of chapters ahead that can be affected by a change */
  maxChaptersAhead: number;
  /** Whether to automatically invalidate content when source content changes */
  autoInvalidate: boolean;
  /** Whether to require confirmation before executing cascades */
  requireConfirmation: boolean;
  /** Minimum status level that triggers cascade (e.g., 'approved' won't cascade from 'draft') */
  minTriggerStatus: 'draft' | 'review' | 'approved';
}

/**
 * Default horizon configuration
 */
export const DEFAULT_HORIZON_CONFIG: RevisionHorizonConfig = {
  maxChaptersAhead: 5,
  autoInvalidate: false,
  requireConfirmation: true,
  minTriggerStatus: 'review',
};

/**
 * Affected content item in an impact analysis
 */
export interface AffectedContent {
  /** The content that would be affected */
  content: Content;
  /** Reason why this content would be affected */
  reason: AffectReason;
  /** How directly this content is affected */
  severity: 'direct' | 'indirect';
  /** Distance in chapters from source content */
  chapterDistance: number;
}

/**
 * Reasons why content might be affected by a change
 */
export type AffectReason =
  | { type: 'character-reference'; characterId: string; characterName: string }
  | { type: 'location-reference'; locationId: string; locationName: string }
  | { type: 'plot-thread-reference'; threadId: string; threadName: string }
  | { type: 'timeline-dependency'; eventId: string }
  | { type: 'fact-dependency'; factDescription: string }
  | { type: 'sequential'; description: string };

/**
 * Result of an impact analysis
 */
export interface ImpactAnalysisResult {
  /** The content that triggered the analysis */
  sourceContentId: string;
  /** All content that would be affected */
  affectedContents: AffectedContent[];
  /** Lock points that protect content from the cascade */
  protectingLockPoints: LockPoint[];
  /** Content IDs protected by lock points */
  protectedContentIds: string[];
  /** Content IDs protected by published status */
  publishedContentIds: string[];
  /** The horizon configuration used for analysis */
  horizonConfig: RevisionHorizonConfig;
  /** Total number of chapters analyzed */
  chaptersAnalyzed: number;
  /** Whether the cascade would cross any lock points */
  crossesLockPoints: boolean;
  /** Whether the cascade would affect published content */
  affectsPublished: boolean;
  /** Timestamp of analysis */
  analyzedAt: string;
}

/**
 * Cascade execution options
 */
export interface CascadeExecutionOptions {
  /** Only invalidate content that references specific entities */
  entityFilter?: {
    characterIds?: string[];
    locationIds?: string[];
    threadIds?: string[];
  };
  /** Force execution even if lock points exist (requires explicit confirmation) */
  forcePastLocks?: boolean;
  /** Custom reason for the cascade */
  reason?: string;
  /** Dry run - don't actually execute, just return what would happen */
  dryRun?: boolean;
}

/**
 * Result of cascade execution
 */
export interface CascadeExecutionResult {
  /** Whether the cascade was successful */
  success: boolean;
  /** Contents that were invalidated (set to draft) */
  invalidatedContentIds: string[];
  /** Contents that were skipped due to protection */
  skippedContentIds: string[];
  /** Lock points that blocked the cascade */
  blockingLockPoints: LockPoint[];
  /** Published content that blocked the cascade */
  blockingPublishedIds: string[];
  /** Error message if failed */
  error?: string;
  /** The revision impact that was used */
  impact: RevisionImpact;
}

/**
 * Cascade preview for UI display
 */
export interface CascadePreview {
  /** Source content info */
  source: {
    contentId: string;
    title: string;
    chapterNumber?: number;
  };
  /** Affected content grouped by severity */
  affectedBySeverity: {
    direct: CascadePreviewItem[];
    indirect: CascadePreviewItem[];
  };
  /** Protected content info */
  protected: {
    byLockPoints: CascadePreviewItem[];
    byPublished: CascadePreviewItem[];
  };
  /** Summary statistics */
  summary: {
    totalAffected: number;
    totalProtected: number;
    wouldInvalidate: number;
    horizonChapters: number;
  };
  /** Warnings for the user */
  warnings: string[];
}

/**
 * Item in cascade preview
 */
export interface CascadePreviewItem {
  contentId: string;
  title: string;
  chapterNumber?: number;
  reason: string;
  status: string;
}

/**
 * Revision cascade service interface
 */
export interface RevisionCascadeService {
  /**
   * Get the current horizon configuration for a project
   */
  getHorizonConfig(projectId: string): RevisionHorizonConfig;

  /**
   * Update the horizon configuration for a project
   */
  setHorizonConfig(projectId: string, config: Partial<RevisionHorizonConfig>): RevisionHorizonConfig;

  /**
   * Analyze the impact of changes to content
   *
   * This determines what other content would be affected if the source
   * content changes significantly.
   */
  analyzeImpact(projectId: string, contentId: string): ImpactAnalysisResult;

  /**
   * Get lock points that would protect content from a cascade
   */
  getProtectingLockPoints(projectId: string, contentId: string): LockPoint[];

  /**
   * Check if content is protected from cascades
   */
  isProtected(
    projectId: string,
    contentId: string
  ): { protected: boolean; reason?: string; lockPoint?: LockPoint };

  /**
   * Execute a cascade - invalidate affected content
   *
   * This sets affected content back to 'draft' status and clears
   * their analysis, requiring regeneration or review.
   */
  executeCascade(
    projectId: string,
    contentId: string,
    options?: CascadeExecutionOptions
  ): CascadeExecutionResult;

  /**
   * Generate a preview of what a cascade would do
   *
   * This is for UI display to help the user understand the impact
   * before confirming a cascade.
   */
  previewCascade(projectId: string, contentId: string): CascadePreview;

  /**
   * Create a lock point to protect content from future cascades
   */
  createCascadeProtection(
    projectId: string,
    contentId: string,
    reason: string
  ): LockPoint | undefined;
}
