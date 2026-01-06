/**
 * Revision cascade service implementation
 *
 * Handles change propagation within configured bounds, protecting content
 * behind lock points and published content from changes.
 */

import type { Content, LockPoint, RevisionImpact } from '@repo/serial-types';

import type { ContentRepository } from '../storage/repositories/content-repository';
import type { LockPointRepository } from '../storage/repositories/lock-point-repository';
import type { StructureRepository } from '../storage/repositories/structure-repository';
import { nowTimestamp } from '../storage/repository';

import type {
  AffectedContent,
  AffectReason,
  CascadeExecutionOptions,
  CascadeExecutionResult,
  CascadePreview,
  CascadePreviewItem,
  ImpactAnalysisResult,
  RevisionCascadeService,
  RevisionHorizonConfig,
} from './types';
import { DEFAULT_HORIZON_CONFIG } from './types';

/**
 * In-memory storage for horizon configs per project
 * In a production system, this would be persisted to the database
 */
const projectHorizonConfigs = new Map<string, RevisionHorizonConfig>();

/**
 * Clear all stored horizon configs (for testing)
 */
export function clearHorizonConfigs(): void {
  projectHorizonConfigs.clear();
}

/**
 * Create the revision cascade service
 */
export function createRevisionCascadeService(
  contentRepo: ContentRepository,
  lockPointRepo: LockPointRepository,
  structureRepo: StructureRepository
): RevisionCascadeService {
  /**
   * Get content sorted by chapter number
   */
  function getContentByChapterOrder(projectId: string): Content[] {
    const allContent = contentRepo.findByProject(projectId);
    return allContent.sort((a, b) => {
      const aNum = a.chapterNumber ?? Infinity;
      const bNum = b.chapterNumber ?? Infinity;
      return aNum - bNum;
    });
  }

  /**
   * Find content that comes after the given content
   */
  function getSubsequentContent(
    projectId: string,
    contentId: string,
    maxChapters: number
  ): Content[] {
    const orderedContent = getContentByChapterOrder(projectId);
    const sourceIndex = orderedContent.findIndex((c) => c.id === contentId);

    if (sourceIndex === -1) {
      return [];
    }

    const sourceChapterNumber = orderedContent[sourceIndex].chapterNumber ?? 0;

    return orderedContent.filter((c, index) => {
      if (index <= sourceIndex) return false;
      const chapterNum = c.chapterNumber ?? 0;
      const distance = chapterNum - sourceChapterNumber;
      return distance > 0 && distance <= maxChapters;
    });
  }

  /**
   * Calculate chapter distance between two contents
   */
  function getChapterDistance(source: Content, target: Content): number {
    const sourceNum = source.chapterNumber ?? 0;
    const targetNum = target.chapterNumber ?? 0;
    return Math.abs(targetNum - sourceNum);
  }

  /**
   * Analyze why content might be affected by changes to source content
   */
  function analyzeContentDependency(
    source: Content,
    target: Content
  ): AffectReason | undefined {
    // Check for character references
    const sourceCharacters = source.analysis?.characterAppearances ?? [];
    const targetCharacters = target.analysis?.characterAppearances ?? [];

    for (const sourceChar of sourceCharacters) {
      const targetChar = targetCharacters.find(
        (tc) => tc.characterId === sourceChar.characterId
      );
      if (targetChar) {
        return {
          type: 'character-reference',
          characterId: sourceChar.characterId,
          characterName: sourceChar.characterId, // We don't have the name here, would need bible lookup
        };
      }
    }

    // Check for location references
    const sourceLocations = source.analysis?.locationAppearances ?? [];
    const targetLocations = target.analysis?.locationAppearances ?? [];

    for (const sourceLoc of sourceLocations) {
      if (targetLocations.includes(sourceLoc)) {
        return {
          type: 'location-reference',
          locationId: sourceLoc,
          locationName: sourceLoc,
        };
      }
    }

    // Check for plot thread references
    const sourceThreads = source.analysis?.threadTouches ?? [];
    const targetThreads = target.analysis?.threadTouches ?? [];

    for (const sourceThread of sourceThreads) {
      const targetThread = targetThreads.find(
        (tt) => tt.threadId === sourceThread.threadId
      );
      if (targetThread) {
        return {
          type: 'plot-thread-reference',
          threadId: sourceThread.threadId,
          threadName: sourceThread.threadId,
        };
      }
    }

    // Default: sequential dependency if content is immediately following
    const distance = getChapterDistance(source, target);
    if (distance === 1) {
      return {
        type: 'sequential',
        description: 'Immediately follows source content',
      };
    }

    return undefined;
  }

  /**
   * Check if content is protected by locks or published status
   */
  function checkProtection(
    projectId: string,
    contentId: string
  ): { protected: boolean; reason?: string; lockPoint?: LockPoint } {
    const content = contentRepo.findById(projectId, contentId);
    if (!content) {
      return { protected: false };
    }

    // Published content is always protected
    if (content.status === 'published') {
      return { protected: true, reason: 'Content is published and immutable' };
    }

    // Check for cascade protection lock points
    const lockPoints = lockPointRepo.findByContent(projectId, contentId);
    const cascadeLock = lockPoints.find((lp) => lp.type === 'cascade-protection');
    if (cascadeLock) {
      return {
        protected: true,
        reason: cascadeLock.reason,
        lockPoint: cascadeLock,
      };
    }

    // Check for full locks
    const fullLock = lockPoints.find((lp) => lp.type === 'full-lock');
    if (fullLock) {
      return {
        protected: true,
        reason: fullLock.reason,
        lockPoint: fullLock,
      };
    }

    return { protected: false };
  }

  /**
   * Format affect reason as a readable string
   */
  function formatAffectReason(reason: AffectReason): string {
    switch (reason.type) {
      case 'character-reference':
        return `References character: ${reason.characterName}`;
      case 'location-reference':
        return `References location: ${reason.locationName}`;
      case 'plot-thread-reference':
        return `References plot thread: ${reason.threadName}`;
      case 'timeline-dependency':
        return `Depends on timeline event`;
      case 'fact-dependency':
        return `Depends on fact: ${reason.factDescription}`;
      case 'sequential':
        return reason.description;
      default:
        return 'Unknown dependency';
    }
  }

  return {
    getHorizonConfig(projectId: string): RevisionHorizonConfig {
      return projectHorizonConfigs.get(projectId) ?? { ...DEFAULT_HORIZON_CONFIG };
    },

    setHorizonConfig(
      projectId: string,
      config: Partial<RevisionHorizonConfig>
    ): RevisionHorizonConfig {
      const current = this.getHorizonConfig(projectId);
      const updated = { ...current, ...config };
      projectHorizonConfigs.set(projectId, updated);
      return updated;
    },

    analyzeImpact(projectId: string, contentId: string): ImpactAnalysisResult {
      const sourceContent = contentRepo.findById(projectId, contentId);
      if (!sourceContent) {
        return {
          sourceContentId: contentId,
          affectedContents: [],
          protectingLockPoints: [],
          protectedContentIds: [],
          publishedContentIds: [],
          horizonConfig: this.getHorizonConfig(projectId),
          chaptersAnalyzed: 0,
          crossesLockPoints: false,
          affectsPublished: false,
          analyzedAt: nowTimestamp(),
        };
      }

      const config = this.getHorizonConfig(projectId);
      const subsequentContent = getSubsequentContent(
        projectId,
        contentId,
        config.maxChaptersAhead
      );

      const affectedContents: AffectedContent[] = [];
      const protectingLockPoints: LockPoint[] = [];
      const protectedContentIds: string[] = [];
      const publishedContentIds: string[] = [];

      for (const content of subsequentContent) {
        // Check if this content is protected
        const protection = checkProtection(projectId, content.id);

        if (protection.protected) {
          if (content.status === 'published') {
            publishedContentIds.push(content.id);
          } else if (protection.lockPoint) {
            protectingLockPoints.push(protection.lockPoint);
            protectedContentIds.push(content.id);
          }
          continue;
        }

        // Analyze dependency
        const reason = analyzeContentDependency(sourceContent, content);
        if (reason) {
          const distance = getChapterDistance(sourceContent, content);
          affectedContents.push({
            content,
            reason,
            severity: distance === 1 ? 'direct' : 'indirect',
            chapterDistance: distance,
          });
        }
      }

      return {
        sourceContentId: contentId,
        affectedContents,
        protectingLockPoints,
        protectedContentIds,
        publishedContentIds,
        horizonConfig: config,
        chaptersAnalyzed: subsequentContent.length,
        crossesLockPoints: protectingLockPoints.length > 0,
        affectsPublished: publishedContentIds.length > 0,
        analyzedAt: nowTimestamp(),
      };
    },

    getProtectingLockPoints(projectId: string, contentId: string): LockPoint[] {
      const lockPoints = lockPointRepo.findByContent(projectId, contentId);
      return lockPoints.filter(
        (lp) => lp.type === 'cascade-protection' || lp.type === 'full-lock'
      );
    },

    isProtected(
      projectId: string,
      contentId: string
    ): { protected: boolean; reason?: string; lockPoint?: LockPoint } {
      return checkProtection(projectId, contentId);
    },

    executeCascade(
      projectId: string,
      contentId: string,
      options?: CascadeExecutionOptions
    ): CascadeExecutionResult {
      const impact = this.analyzeImpact(projectId, contentId);
      const invalidatedContentIds: string[] = [];
      const skippedContentIds: string[] = [];
      const blockingLockPoints: LockPoint[] = [];
      const blockingPublishedIds: string[] = [];

      // Check for blocking conditions
      if (!options?.forcePastLocks && impact.crossesLockPoints) {
        blockingLockPoints.push(...impact.protectingLockPoints);
      }

      if (impact.affectsPublished) {
        blockingPublishedIds.push(...impact.publishedContentIds);
      }

      // If there are blocking published content, fail the cascade
      if (blockingPublishedIds.length > 0) {
        return {
          success: false,
          invalidatedContentIds: [],
          skippedContentIds: [],
          blockingLockPoints: [],
          blockingPublishedIds,
          error: 'Cannot cascade past published content',
          impact: toRevisionImpact(impact),
        };
      }

      // Add protected content to skipped list (unless forcing past locks)
      if (!options?.forcePastLocks) {
        skippedContentIds.push(...impact.protectedContentIds);
      }

      // If dry run, don't actually execute
      if (options?.dryRun) {
        return {
          success: true,
          invalidatedContentIds: impact.affectedContents.map((ac) => ac.content.id),
          skippedContentIds,
          blockingLockPoints,
          blockingPublishedIds,
          impact: toRevisionImpact(impact),
        };
      }

      // Execute the cascade
      for (const affected of impact.affectedContents) {
        // Check entity filter if provided
        if (options?.entityFilter) {
          const matchesFilter = checkEntityFilter(affected.reason, options.entityFilter);
          if (!matchesFilter) {
            skippedContentIds.push(affected.content.id);
            continue;
          }
        }

        // Invalidate the content - set to draft and clear analysis
        contentRepo.setStatus(projectId, affected.content.id, 'draft');
        contentRepo.setAnalysis(projectId, affected.content.id, undefined);
        invalidatedContentIds.push(affected.content.id);
      }

      return {
        success: true,
        invalidatedContentIds,
        skippedContentIds,
        blockingLockPoints: options?.forcePastLocks ? [] : blockingLockPoints,
        blockingPublishedIds,
        impact: toRevisionImpact(impact),
      };
    },

    previewCascade(projectId: string, contentId: string): CascadePreview {
      const sourceContent = contentRepo.findById(projectId, contentId);
      const sourceStructure = sourceContent
        ? structureRepo.findById(projectId, sourceContent.structureId)
        : undefined;

      const impact = this.analyzeImpact(projectId, contentId);

      const directAffected: CascadePreviewItem[] = [];
      const indirectAffected: CascadePreviewItem[] = [];
      const protectedByLocks: CascadePreviewItem[] = [];
      const protectedByPublished: CascadePreviewItem[] = [];

      // Build affected items
      for (const affected of impact.affectedContents) {
        const structure = structureRepo.findById(projectId, affected.content.structureId);
        const item: CascadePreviewItem = {
          contentId: affected.content.id,
          title: structure?.title ?? 'Unknown',
          chapterNumber: affected.content.chapterNumber,
          reason: formatAffectReason(affected.reason),
          status: affected.content.status,
        };

        if (affected.severity === 'direct') {
          directAffected.push(item);
        } else {
          indirectAffected.push(item);
        }
      }

      // Build protected items
      for (const lockPoint of impact.protectingLockPoints) {
        const content = contentRepo.findById(projectId, lockPoint.contentId);
        if (content) {
          const structure = structureRepo.findById(projectId, content.structureId);
          protectedByLocks.push({
            contentId: content.id,
            title: structure?.title ?? 'Unknown',
            chapterNumber: content.chapterNumber,
            reason: lockPoint.reason,
            status: content.status,
          });
        }
      }

      for (const publishedId of impact.publishedContentIds) {
        const content = contentRepo.findById(projectId, publishedId);
        if (content) {
          const structure = structureRepo.findById(projectId, content.structureId);
          protectedByPublished.push({
            contentId: content.id,
            title: structure?.title ?? 'Unknown',
            chapterNumber: content.chapterNumber,
            reason: 'Published content is immutable',
            status: content.status,
          });
        }
      }

      // Build warnings
      const warnings: string[] = [];
      if (impact.crossesLockPoints) {
        warnings.push(
          `Cascade would be blocked by ${impact.protectingLockPoints.length} lock point(s)`
        );
      }
      if (impact.affectsPublished) {
        warnings.push(
          `Cascade cannot affect ${impact.publishedContentIds.length} published chapter(s)`
        );
      }
      if (impact.affectedContents.length === 0 && impact.chaptersAnalyzed > 0) {
        warnings.push('No content found with dependencies on the source content');
      }

      return {
        source: {
          contentId,
          title: sourceStructure?.title ?? 'Unknown',
          chapterNumber: sourceContent?.chapterNumber,
        },
        affectedBySeverity: {
          direct: directAffected,
          indirect: indirectAffected,
        },
        protected: {
          byLockPoints: protectedByLocks,
          byPublished: protectedByPublished,
        },
        summary: {
          totalAffected: impact.affectedContents.length,
          totalProtected: impact.protectedContentIds.length + impact.publishedContentIds.length,
          wouldInvalidate: impact.affectedContents.filter(
            (ac) => !impact.protectedContentIds.includes(ac.content.id)
          ).length,
          horizonChapters: impact.horizonConfig.maxChaptersAhead,
        },
        warnings,
      };
    },

    createCascadeProtection(
      projectId: string,
      contentId: string,
      reason: string
    ): LockPoint | undefined {
      const content = contentRepo.findById(projectId, contentId);
      if (!content) {
        return undefined;
      }

      // Don't create duplicate protection
      const existing = lockPointRepo.findByContent(projectId, contentId);
      const hasProtection = existing.some((lp) => lp.type === 'cascade-protection');
      if (hasProtection) {
        return existing.find((lp) => lp.type === 'cascade-protection');
      }

      return lockPointRepo.create(projectId, {
        contentId,
        reason,
        type: 'cascade-protection',
      });
    },
  };
}

/**
 * Check if an affect reason matches the entity filter
 */
function checkEntityFilter(
  reason: AffectReason,
  filter: NonNullable<CascadeExecutionOptions['entityFilter']>
): boolean {
  if (reason.type === 'character-reference' && filter.characterIds) {
    return filter.characterIds.includes(reason.characterId);
  }
  if (reason.type === 'location-reference' && filter.locationIds) {
    return filter.locationIds.includes(reason.locationId);
  }
  if (reason.type === 'plot-thread-reference' && filter.threadIds) {
    return filter.threadIds.includes(reason.threadId);
  }
  // If no specific filter matches, include all
  return true;
}

/**
 * Convert internal impact analysis to the RevisionImpact type
 */
function toRevisionImpact(impact: ImpactAnalysisResult): RevisionImpact {
  return {
    sourceContentId: impact.sourceContentId,
    affectedContents: impact.affectedContents.map((ac) => ({
      contentId: ac.content.id,
      reason: formatAffectReasonForStorage(ac.reason),
      severity: ac.severity,
    })),
    protectedByLocks: impact.protectingLockPoints.map((lp) => lp.id),
    horizonChapters: impact.horizonConfig.maxChaptersAhead,
    analyzedAt: impact.analyzedAt,
  };
}

/**
 * Format affect reason for storage
 */
function formatAffectReasonForStorage(reason: AffectReason): string {
  switch (reason.type) {
    case 'character-reference':
      return `character:${reason.characterId}`;
    case 'location-reference':
      return `location:${reason.locationId}`;
    case 'plot-thread-reference':
      return `thread:${reason.threadId}`;
    case 'timeline-dependency':
      return `timeline:${reason.eventId}`;
    case 'fact-dependency':
      return `fact:${reason.factDescription}`;
    case 'sequential':
      return `sequential:${reason.description}`;
    default:
      return 'unknown';
  }
}
