/**
 * Tests for revision cascade service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createContentRepository, type ContentRepository } from '../storage/repositories/content-repository';
import { createLockPointRepository, type LockPointRepository } from '../storage/repositories/lock-point-repository';
import { createStructureRepository, type StructureRepository } from '../storage/repositories/structure-repository';

import { clearHorizonConfigs, createRevisionCascadeService } from './service';
import type { RevisionCascadeService } from './types';
import { DEFAULT_HORIZON_CONFIG } from './types';

describe('RevisionCascadeService', () => {
  let db: DatabaseConnection;
  let contentRepo: ContentRepository;
  let lockPointRepo: LockPointRepository;
  let structureRepo: StructureRepository;
  let cascadeService: RevisionCascadeService;
  const projectId = 'test-project';
  let structureIds: string[] = [];
  let contentIds: string[] = [];

  beforeEach(() => {
    db = createTestDatabase();

    // Create test project
    db.db
      .prepare(
        `
      INSERT INTO projects (id, title, format, settings_json, metadata_json, created_at, updated_at)
      VALUES (?, 'Test Project', 'web-serial', '{}', '{"genres":[]}', datetime('now'), datetime('now'))
    `
      )
      .run(projectId);

    structureRepo = createStructureRepository(db.db);
    contentRepo = createContentRepository(db.db);
    lockPointRepo = createLockPointRepository(db.db);

    cascadeService = createRevisionCascadeService(contentRepo, lockPointRepo, structureRepo);

    // Create a series of chapters
    structureIds = [];
    contentIds = [];

    for (let i = 1; i <= 5; i++) {
      const structure = structureRepo.create(projectId, {
        type: 'chapter',
        title: `Chapter ${i}`,
        summary: `Summary for chapter ${i}`,
        beats: [],
        order: i - 1,
      });
      structureIds.push(structure.id);

      const content = contentRepo.create(projectId, {
        structureId: structure.id,
        text: `Content for chapter ${i}`,
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
        chapterNumber: i,
      });
      contentIds.push(content.id);

      // Add analysis with shared characters/locations to create dependencies
      contentRepo.setAnalysis(projectId, content.id, {
        id: `analysis-${i}`,
        contentId: content.id,
        contentVersion: 1,
        tensionScore: { score: 50, explanation: 'Test' },
        paceScore: { score: 50, explanation: 'Test' },
        continuityIssues: [],
        wordCount: 100,
        readingTime: 1,
        characterAppearances: [
          { characterId: 'char-alice', type: 'scene' },
          ...(i <= 3 ? [{ characterId: 'char-bob', type: 'scene' as const }] : []),
        ],
        locationAppearances: ['loc-castle'],
        threadTouches: [
          { threadId: 'thread-main', type: 'development' as const },
        ],
        characterVoiceScores: {},
        analyzedAt: new Date().toISOString(),
        modelId: 'test',
      });
    }
  });

  afterEach(() => {
    clearHorizonConfigs();
    db.close();
  });

  describe('getHorizonConfig', () => {
    it('should return default config for new project', () => {
      const config = cascadeService.getHorizonConfig('new-project');

      expect(config.maxChaptersAhead).toBe(DEFAULT_HORIZON_CONFIG.maxChaptersAhead);
      expect(config.autoInvalidate).toBe(DEFAULT_HORIZON_CONFIG.autoInvalidate);
      expect(config.requireConfirmation).toBe(DEFAULT_HORIZON_CONFIG.requireConfirmation);
    });

    it('should return configured values', () => {
      cascadeService.setHorizonConfig(projectId, { maxChaptersAhead: 10 });

      const config = cascadeService.getHorizonConfig(projectId);

      expect(config.maxChaptersAhead).toBe(10);
    });
  });

  describe('setHorizonConfig', () => {
    it('should update partial config', () => {
      const updated = cascadeService.setHorizonConfig(projectId, {
        maxChaptersAhead: 3,
        autoInvalidate: true,
      });

      expect(updated.maxChaptersAhead).toBe(3);
      expect(updated.autoInvalidate).toBe(true);
      expect(updated.requireConfirmation).toBe(DEFAULT_HORIZON_CONFIG.requireConfirmation);
    });

    it('should persist config', () => {
      cascadeService.setHorizonConfig(projectId, { maxChaptersAhead: 7 });

      const config = cascadeService.getHorizonConfig(projectId);

      expect(config.maxChaptersAhead).toBe(7);
    });
  });

  describe('analyzeImpact', () => {
    it('should find affected content', () => {
      const impact = cascadeService.analyzeImpact(projectId, contentIds[0]);

      expect(impact.sourceContentId).toBe(contentIds[0]);
      expect(impact.affectedContents.length).toBeGreaterThan(0);
    });

    it('should respect horizon configuration', () => {
      cascadeService.setHorizonConfig(projectId, { maxChaptersAhead: 2 });

      const impact = cascadeService.analyzeImpact(projectId, contentIds[0]);

      // Should only include chapters within 2 ahead
      const maxChapter = Math.max(
        ...impact.affectedContents.map((ac) => ac.content.chapterNumber ?? 0)
      );
      expect(maxChapter).toBeLessThanOrEqual(3); // Chapter 1 + 2 = 3
    });

    it('should identify direct and indirect dependencies', () => {
      const impact = cascadeService.analyzeImpact(projectId, contentIds[0]);

      const directCount = impact.affectedContents.filter((ac) => ac.severity === 'direct').length;
      const indirectCount = impact.affectedContents.filter((ac) => ac.severity === 'indirect').length;

      // Chapter 2 should be direct (immediately following)
      expect(directCount).toBeGreaterThan(0);
      expect(indirectCount).toBeGreaterThanOrEqual(0);
    });

    it('should identify protecting lock points', () => {
      // Create a lock point on chapter 3
      lockPointRepo.create(projectId, {
        contentId: contentIds[2],
        reason: 'Important milestone',
        type: 'cascade-protection',
      });

      const impact = cascadeService.analyzeImpact(projectId, contentIds[0]);

      expect(impact.protectingLockPoints.length).toBe(1);
      expect(impact.protectedContentIds).toContain(contentIds[2]);
      expect(impact.crossesLockPoints).toBe(true);
    });

    it('should identify published content', () => {
      // Publish chapter 3
      contentRepo.setStatus(projectId, contentIds[2], 'approved');
      contentRepo.publish(projectId, contentIds[2]);

      const impact = cascadeService.analyzeImpact(projectId, contentIds[0]);

      expect(impact.publishedContentIds).toContain(contentIds[2]);
      expect(impact.affectsPublished).toBe(true);
    });

    it('should return empty result for non-existent content', () => {
      const impact = cascadeService.analyzeImpact(projectId, 'non-existent');

      expect(impact.affectedContents.length).toBe(0);
      expect(impact.chaptersAnalyzed).toBe(0);
    });

    it('should not include content before source', () => {
      // Analyze from chapter 3 - should not affect chapters 1 and 2
      const impact = cascadeService.analyzeImpact(projectId, contentIds[2]);

      const affectedIds = impact.affectedContents.map((ac) => ac.content.id);
      expect(affectedIds).not.toContain(contentIds[0]);
      expect(affectedIds).not.toContain(contentIds[1]);
    });
  });

  describe('getProtectingLockPoints', () => {
    it('should return cascade-protection lock points', () => {
      lockPointRepo.create(projectId, {
        contentId: contentIds[0],
        reason: 'Protected',
        type: 'cascade-protection',
      });

      const lockPoints = cascadeService.getProtectingLockPoints(projectId, contentIds[0]);

      expect(lockPoints.length).toBe(1);
      expect(lockPoints[0].type).toBe('cascade-protection');
    });

    it('should return full-lock lock points', () => {
      lockPointRepo.create(projectId, {
        contentId: contentIds[0],
        reason: 'Fully locked',
        type: 'full-lock',
      });

      const lockPoints = cascadeService.getProtectingLockPoints(projectId, contentIds[0]);

      expect(lockPoints.length).toBe(1);
      expect(lockPoints[0].type).toBe('full-lock');
    });

    it('should return empty for unprotected content', () => {
      const lockPoints = cascadeService.getProtectingLockPoints(projectId, contentIds[0]);

      expect(lockPoints.length).toBe(0);
    });
  });

  describe('isProtected', () => {
    it('should return protected for published content', () => {
      contentRepo.setStatus(projectId, contentIds[0], 'approved');
      contentRepo.publish(projectId, contentIds[0]);

      const result = cascadeService.isProtected(projectId, contentIds[0]);

      expect(result.protected).toBe(true);
      expect(result.reason).toContain('published');
    });

    it('should return protected for cascade-protection lock', () => {
      lockPointRepo.create(projectId, {
        contentId: contentIds[0],
        reason: 'Milestone',
        type: 'cascade-protection',
      });

      const result = cascadeService.isProtected(projectId, contentIds[0]);

      expect(result.protected).toBe(true);
      expect(result.reason).toBe('Milestone');
      expect(result.lockPoint).toBeDefined();
    });

    it('should return protected for full-lock', () => {
      lockPointRepo.create(projectId, {
        contentId: contentIds[0],
        reason: 'Locked',
        type: 'full-lock',
      });

      const result = cascadeService.isProtected(projectId, contentIds[0]);

      expect(result.protected).toBe(true);
      expect(result.lockPoint?.type).toBe('full-lock');
    });

    it('should return not protected for regular content', () => {
      const result = cascadeService.isProtected(projectId, contentIds[0]);

      expect(result.protected).toBe(false);
    });
  });

  describe('executeCascade', () => {
    it('should invalidate affected content', () => {
      // Set chapter 2-4 to review status first
      contentRepo.setStatus(projectId, contentIds[1], 'review');
      contentRepo.setStatus(projectId, contentIds[2], 'review');
      contentRepo.setStatus(projectId, contentIds[3], 'review');

      const result = cascadeService.executeCascade(projectId, contentIds[0]);

      expect(result.success).toBe(true);
      expect(result.invalidatedContentIds.length).toBeGreaterThan(0);

      // Verify content was set back to draft
      for (const contentId of result.invalidatedContentIds) {
        const content = contentRepo.findById(projectId, contentId);
        expect(content?.status).toBe('draft');
        expect(content?.analysis).toBeUndefined();
      }
    });

    it('should skip protected content', () => {
      // Protect chapter 3
      lockPointRepo.create(projectId, {
        contentId: contentIds[2],
        reason: 'Protected',
        type: 'cascade-protection',
      });

      const result = cascadeService.executeCascade(projectId, contentIds[0]);

      expect(result.success).toBe(true);
      expect(result.skippedContentIds).toContain(contentIds[2]);
      expect(result.invalidatedContentIds).not.toContain(contentIds[2]);
    });

    it('should fail when affecting published content', () => {
      // Publish chapter 3
      contentRepo.setStatus(projectId, contentIds[2], 'approved');
      contentRepo.publish(projectId, contentIds[2]);

      const result = cascadeService.executeCascade(projectId, contentIds[0]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('published');
      expect(result.blockingPublishedIds).toContain(contentIds[2]);
    });

    it('should support dry run', () => {
      const result = cascadeService.executeCascade(projectId, contentIds[0], {
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.invalidatedContentIds.length).toBeGreaterThan(0);

      // Verify nothing was actually changed
      for (const contentId of result.invalidatedContentIds) {
        const content = contentRepo.findById(projectId, contentId);
        expect(content?.analysis).toBeDefined();
      }
    });

    it('should support entity filter', () => {
      const result = cascadeService.executeCascade(projectId, contentIds[0], {
        entityFilter: {
          characterIds: ['char-bob'], // Only Bob appears in chapters 1-3
        },
        dryRun: true,
      });

      expect(result.success).toBe(true);
      // Should only affect chapters that reference Bob
    });

    it('should support forcePastLocks', () => {
      // Protect chapter 3
      lockPointRepo.create(projectId, {
        contentId: contentIds[2],
        reason: 'Protected',
        type: 'cascade-protection',
      });

      const result = cascadeService.executeCascade(projectId, contentIds[0], {
        forcePastLocks: true,
      });

      expect(result.success).toBe(true);
      expect(result.blockingLockPoints.length).toBe(0);
    });
  });

  describe('previewCascade', () => {
    it('should generate preview with source info', () => {
      const preview = cascadeService.previewCascade(projectId, contentIds[0]);

      expect(preview.source.contentId).toBe(contentIds[0]);
      expect(preview.source.title).toBe('Chapter 1');
      expect(preview.source.chapterNumber).toBe(1);
    });

    it('should group affected content by severity', () => {
      const preview = cascadeService.previewCascade(projectId, contentIds[0]);

      expect(preview.affectedBySeverity.direct).toBeDefined();
      expect(preview.affectedBySeverity.indirect).toBeDefined();
    });

    it('should show protected content', () => {
      // Protect chapter 3
      lockPointRepo.create(projectId, {
        contentId: contentIds[2],
        reason: 'Protected',
        type: 'cascade-protection',
      });

      const preview = cascadeService.previewCascade(projectId, contentIds[0]);

      expect(preview.protected.byLockPoints.length).toBe(1);
      expect(preview.protected.byLockPoints[0].contentId).toBe(contentIds[2]);
    });

    it('should show published content', () => {
      // Publish chapter 3
      contentRepo.setStatus(projectId, contentIds[2], 'approved');
      contentRepo.publish(projectId, contentIds[2]);

      const preview = cascadeService.previewCascade(projectId, contentIds[0]);

      expect(preview.protected.byPublished.length).toBe(1);
      expect(preview.protected.byPublished[0].contentId).toBe(contentIds[2]);
    });

    it('should include summary statistics', () => {
      const preview = cascadeService.previewCascade(projectId, contentIds[0]);

      expect(preview.summary.totalAffected).toBeGreaterThanOrEqual(0);
      expect(preview.summary.totalProtected).toBeGreaterThanOrEqual(0);
      expect(preview.summary.horizonChapters).toBe(DEFAULT_HORIZON_CONFIG.maxChaptersAhead);
    });

    it('should include warnings', () => {
      // Protect chapter 3
      lockPointRepo.create(projectId, {
        contentId: contentIds[2],
        reason: 'Protected',
        type: 'cascade-protection',
      });

      const preview = cascadeService.previewCascade(projectId, contentIds[0]);

      expect(preview.warnings.length).toBeGreaterThan(0);
      expect(preview.warnings.some((w) => w.includes('lock point'))).toBe(true);
    });
  });

  describe('createCascadeProtection', () => {
    it('should create a cascade-protection lock point', () => {
      const lockPoint = cascadeService.createCascadeProtection(
        projectId,
        contentIds[0],
        'Important chapter'
      );

      expect(lockPoint).toBeDefined();
      expect(lockPoint?.type).toBe('cascade-protection');
      expect(lockPoint?.reason).toBe('Important chapter');
    });

    it('should return existing lock point if already protected', () => {
      const first = cascadeService.createCascadeProtection(
        projectId,
        contentIds[0],
        'First reason'
      );

      const second = cascadeService.createCascadeProtection(
        projectId,
        contentIds[0],
        'Second reason'
      );

      expect(first?.id).toBe(second?.id);
      expect(second?.reason).toBe('First reason'); // Original reason preserved
    });

    it('should return undefined for non-existent content', () => {
      const lockPoint = cascadeService.createCascadeProtection(
        projectId,
        'non-existent',
        'Reason'
      );

      expect(lockPoint).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle cascade with multiple dependencies', () => {
      // Update analysis to create complex dependency graph
      // Chapter 2 depends on chapter 1 characters
      // Chapter 3 depends on chapter 2 locations
      // Chapter 4 depends on chapter 1 plot thread

      const impact = cascadeService.analyzeImpact(projectId, contentIds[0]);
      const preview = cascadeService.previewCascade(projectId, contentIds[0]);

      expect(impact.affectedContents.length).toBeGreaterThan(0);
      expect(preview.summary.totalAffected).toBeGreaterThan(0);
    });

    it('should handle empty project', () => {
      // Create a new empty project
      db.db
        .prepare(
          `
        INSERT INTO projects (id, title, format, settings_json, metadata_json, created_at, updated_at)
        VALUES (?, 'Empty Project', 'web-serial', '{}', '{"genres":[]}', datetime('now'), datetime('now'))
      `
        )
        .run('empty-project');

      const impact = cascadeService.analyzeImpact('empty-project', 'non-existent');
      const preview = cascadeService.previewCascade('empty-project', 'non-existent');

      expect(impact.affectedContents.length).toBe(0);
      expect(preview.summary.totalAffected).toBe(0);
    });

    it('should handle content without chapter numbers', () => {
      // Create content without chapter number
      const structure = structureRepo.create(projectId, {
        type: 'scene',
        title: 'Unnumbered Scene',
        summary: 'A scene without chapter number',
        beats: [],
        order: 10,
      });

      const content = contentRepo.create(projectId, {
        structureId: structure.id,
        text: 'Scene content',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
        // No chapterNumber
      });

      // Should not crash
      const impact = cascadeService.analyzeImpact(projectId, content.id);
      expect(impact).toBeDefined();
    });
  });
});
