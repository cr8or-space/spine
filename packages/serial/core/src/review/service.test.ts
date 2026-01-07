/**
 * Tests for review workflow service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { ParagraphAction } from '@repo/serial-types';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createContentRepository, type ContentRepository } from '../storage/repositories/content-repository';
import { createLockPointRepository, type LockPointRepository } from '../storage/repositories/lock-point-repository';
import { createStructureRepository, type StructureRepository } from '../storage/repositories/structure-repository';

import { createReviewWorkflowService } from './service';
import type { ReviewWorkflowService } from './types';

describe('ReviewWorkflowService', () => {
  let db: DatabaseConnection;
  let contentRepo: ContentRepository;
  let lockPointRepo: LockPointRepository;
  let structureRepo: StructureRepository;
  let reviewService: ReviewWorkflowService;
  const projectId = 'test-project';
  let structureId: string;
  let contentId: string;

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

    structureRepo = createStructureRepository(db.db, db.drizzle);
    contentRepo = createContentRepository(db.db, db.drizzle);
    lockPointRepo = createLockPointRepository(db.db, db.drizzle);

    reviewService = createReviewWorkflowService(contentRepo, lockPointRepo, structureRepo, {
      requireAnalysisForApproval: false, // Simplify testing
      minReviewsRequired: 0,
    });

    // Create a test structure
    const structure = structureRepo.create(projectId, {
      type: 'chapter',
      title: 'Test Chapter',
      summary: 'A test chapter',
      beats: [],
      order: 0,
    });
    structureId = structure.id;

    // Create test content
    const content = contentRepo.create(projectId, {
      structureId,
      text: 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.',
      status: 'draft',
      reviews: [],
      generationHistory: [],
      locked: false,
    });
    contentId = content.id;
  });

  afterEach(() => {
    db.close();
  });

  describe('getReviewQueue', () => {
    it('should return content in review queue', () => {
      const queue = reviewService.getReviewQueue(projectId);

      expect(queue.length).toBe(1);
      expect(queue[0].contentId).toBe(contentId);
      expect(queue[0].status).toBe('draft');
      expect(queue[0].title).toBe('Test Chapter');
    });

    it('should filter by status', () => {
      contentRepo.setStatus(projectId, contentId, 'review');

      const draftQueue = reviewService.getReviewQueue(projectId, { status: 'draft' });
      const reviewQueue = reviewService.getReviewQueue(projectId, { status: 'review' });

      expect(draftQueue.length).toBe(0);
      expect(reviewQueue.length).toBe(1);
    });

    it('should filter by multiple statuses', () => {
      const queue = reviewService.getReviewQueue(projectId, {
        status: ['draft', 'review'],
      });

      expect(queue.length).toBe(1);
    });

    it('should exclude published and approved by default', () => {
      reviewService.transitionStatus(projectId, contentId, 'approved');
      reviewService.transitionStatus(projectId, contentId, 'published');

      const queue = reviewService.getReviewQueue(projectId);

      expect(queue.length).toBe(0);
    });

    it('should respect limit', () => {
      // Create more content
      for (let i = 0; i < 5; i++) {
        const structure = structureRepo.create(projectId, {
          type: 'chapter',
          title: `Chapter ${i + 2}`,
          summary: 'Another chapter',
          beats: [],
          order: i + 1,
        });
        contentRepo.create(projectId, {
          structureId: structure.id,
          text: `Content ${i}`,
          status: 'draft',
          reviews: [],
          generationHistory: [],
          locked: false,
        });
      }

      const queue = reviewService.getReviewQueue(projectId, { limit: 3 });

      expect(queue.length).toBe(3);
    });

    it('should sort by priority (review status higher)', () => {
      // Create more content with different statuses
      const structure2 = structureRepo.create(projectId, {
        type: 'chapter',
        title: 'Chapter 2',
        summary: 'Another chapter',
        beats: [],
        order: 1,
      });
      const content2 = contentRepo.create(projectId, {
        structureId: structure2.id,
        text: 'Content 2',
        status: 'review',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      const queue = reviewService.getReviewQueue(projectId);

      expect(queue[0].contentId).toBe(content2.id);
      expect(queue[0].status).toBe('review');
    });
  });

  describe('addComment', () => {
    it('should add a comment to content', () => {
      const updated = reviewService.addComment(projectId, contentId, {
        location: { paragraphIndex: 0 },
        text: 'This needs more detail',
        type: 'suggestion',
        resolved: false,
      });

      expect(updated).toBeDefined();
      expect(updated?.reviews.length).toBe(1);
      expect(updated?.reviews[0].comments.length).toBe(1);
      expect(updated?.reviews[0].comments[0].text).toBe('This needs more detail');
      expect(updated?.reviews[0].comments[0].type).toBe('suggestion');
    });

    it('should add comments to existing review', () => {
      reviewService.addComment(projectId, contentId, {
        location: { paragraphIndex: 0 },
        text: 'Comment 1',
        type: 'suggestion',
        resolved: false,
      });

      const updated = reviewService.addComment(projectId, contentId, {
        location: { paragraphIndex: 1 },
        text: 'Comment 2',
        type: 'issue',
        resolved: false,
      });

      expect(updated?.reviews.length).toBe(1);
      expect(updated?.reviews[0].comments.length).toBe(2);
    });

    it('should return undefined for non-existent content', () => {
      const updated = reviewService.addComment(projectId, 'non-existent', {
        location: { paragraphIndex: 0 },
        text: 'Comment',
        type: 'suggestion',
        resolved: false,
      });

      expect(updated).toBeUndefined();
    });
  });

  describe('resolveComment', () => {
    it('should resolve a comment', () => {
      const withComment = reviewService.addComment(projectId, contentId, {
        location: { paragraphIndex: 0 },
        text: 'Issue',
        type: 'issue',
        resolved: false,
      });

      const commentId = withComment!.reviews[0].comments[0].id;
      const updated = reviewService.resolveComment(projectId, contentId, commentId);

      expect(updated?.reviews[0].comments[0].resolved).toBe(true);
    });
  });

  describe('applyParagraphAction', () => {
    it('should accept a paragraph', () => {
      const action: ParagraphAction = {
        paragraphIndex: 0,
        action: 'accept',
      };

      const result = reviewService.applyParagraphAction(projectId, contentId, action);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });

    it('should reject a paragraph by removing it', () => {
      const action: ParagraphAction = {
        paragraphIndex: 1,
        action: 'reject',
      };

      const result = reviewService.applyParagraphAction(projectId, contentId, action);

      expect(result.success).toBe(true);
      expect(result.content?.text).not.toContain('Second paragraph');
    });

    it('should edit a paragraph', () => {
      const action: ParagraphAction = {
        paragraphIndex: 0,
        action: 'edit',
        newText: 'Updated first paragraph.',
      };

      const result = reviewService.applyParagraphAction(projectId, contentId, action);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain('Updated first paragraph');
    });

    it('should mark regenerate for regeneration', () => {
      const action: ParagraphAction = {
        paragraphIndex: 0,
        action: 'regenerate',
      };

      const result = reviewService.applyParagraphAction(projectId, contentId, action);

      expect(result.success).toBe(true);
      expect(result.needsRegeneration).toBe(true);
    });

    it('should fail for invalid paragraph index', () => {
      const action: ParagraphAction = {
        paragraphIndex: 999,
        action: 'accept',
      };

      const result = reviewService.applyParagraphAction(projectId, contentId, action);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid paragraph index');
    });

    it('should fail for edit without new text', () => {
      const action: ParagraphAction = {
        paragraphIndex: 0,
        action: 'edit',
      };

      const result = reviewService.applyParagraphAction(projectId, contentId, action);

      expect(result.success).toBe(false);
      expect(result.error).toContain('New text required');
    });

    it('should fail for locked content', () => {
      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Content locked',
        type: 'full-lock',
      });

      const action: ParagraphAction = {
        paragraphIndex: 0,
        action: 'reject',
      };

      const result = reviewService.applyParagraphAction(projectId, contentId, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Content locked');
    });

    it('should fail for published content', () => {
      contentRepo.setStatus(projectId, contentId, 'approved');
      contentRepo.publish(projectId, contentId);

      const action: ParagraphAction = {
        paragraphIndex: 0,
        action: 'edit',
        newText: 'New text',
      };

      const result = reviewService.applyParagraphAction(projectId, contentId, action);

      expect(result.success).toBe(false);
      expect(result.error).toContain('immutable');
    });
  });

  describe('transitionStatus', () => {
    it('should transition draft to review', () => {
      const result = reviewService.transitionStatus(projectId, contentId, 'review');

      expect(result.success).toBe(true);
      expect(result.content?.status).toBe('review');
      expect(result.previousStatus).toBe('draft');
    });

    it('should transition review to approved', () => {
      contentRepo.setStatus(projectId, contentId, 'review');

      const result = reviewService.transitionStatus(projectId, contentId, 'approved');

      expect(result.success).toBe(true);
      expect(result.content?.status).toBe('approved');
    });

    it('should transition approved to published', () => {
      contentRepo.setStatus(projectId, contentId, 'approved');

      const result = reviewService.transitionStatus(projectId, contentId, 'published');

      expect(result.success).toBe(true);
      expect(result.content?.status).toBe('published');
      expect(result.content?.locked).toBe(true);
    });

    it('should fail for invalid transition', () => {
      const result = reviewService.transitionStatus(projectId, contentId, 'published');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });

    it('should not transition published content', () => {
      contentRepo.setStatus(projectId, contentId, 'approved');
      contentRepo.publish(projectId, contentId);

      const result = reviewService.transitionStatus(projectId, contentId, 'review');

      expect(result.success).toBe(false);
      // Published content has no valid transitions
      expect(result.error).toContain('Invalid status transition');
    });

    it('should fail approval with unresolved issues', () => {
      contentRepo.setStatus(projectId, contentId, 'review');

      // Add an unresolved issue
      reviewService.addComment(projectId, contentId, {
        location: { paragraphIndex: 0 },
        text: 'Critical issue',
        type: 'issue',
        resolved: false,
      });

      const result = reviewService.transitionStatus(projectId, contentId, 'approved');

      expect(result.success).toBe(false);
      expect(result.error).toContain('issues must be resolved');
    });

    it('should allow approval after resolving issues', () => {
      contentRepo.setStatus(projectId, contentId, 'review');

      // Add and resolve an issue
      const withComment = reviewService.addComment(projectId, contentId, {
        location: { paragraphIndex: 0 },
        text: 'Critical issue',
        type: 'issue',
        resolved: false,
      });
      const commentId = withComment!.reviews[0].comments[0].id;
      reviewService.resolveComment(projectId, contentId, commentId);

      const result = reviewService.transitionStatus(projectId, contentId, 'approved');

      expect(result.success).toBe(true);
    });
  });

  describe('submitReview', () => {
    it('should submit a complete review', () => {
      const content = contentRepo.findById(projectId, contentId)!;

      const updated = reviewService.submitReview(projectId, {
        contentId,
        contentVersion: content.currentVersion,
        comments: [
          {
            id: 'test-comment',
            location: { paragraphIndex: 0 },
            text: 'Good',
            type: 'praise',
            resolved: false,
            createdAt: new Date().toISOString(),
          },
        ],
        paragraphActions: [],
        startedAt: new Date().toISOString(),
      });

      expect(updated).toBeDefined();
      expect(updated?.reviews[0].completedAt).toBeDefined();
    });
  });

  describe('lock point operations', () => {
    it('should create a lock point', () => {
      const lockPoint = reviewService.createLockPoint(projectId, {
        contentId,
        reason: 'Important milestone',
        type: 'cascade-protection',
      });

      expect(lockPoint).toBeDefined();
      expect(lockPoint?.reason).toBe('Important milestone');
    });

    it('should return undefined for non-existent content', () => {
      const lockPoint = reviewService.createLockPoint(projectId, {
        contentId: 'non-existent',
        reason: 'Test',
        type: 'cascade-protection',
      });

      expect(lockPoint).toBeUndefined();
    });

    it('should remove a lock point', () => {
      const lockPoint = reviewService.createLockPoint(projectId, {
        contentId,
        reason: 'Test',
        type: 'cascade-protection',
      });

      const result = reviewService.removeLockPoint(projectId, lockPoint!.id);

      expect(result).toBe(true);
    });

    it('should get all lock points for project', () => {
      reviewService.createLockPoint(projectId, {
        contentId,
        reason: 'Test 1',
        type: 'cascade-protection',
      });

      reviewService.createLockPoint(projectId, {
        contentId,
        reason: 'Test 2',
        type: 'full-lock',
      });

      const lockPoints = reviewService.getLockPoints(projectId);

      expect(lockPoints.length).toBe(2);
    });

    it('should get lock points for specific content', () => {
      reviewService.createLockPoint(projectId, {
        contentId,
        reason: 'Test',
        type: 'cascade-protection',
      });

      const lockPoints = reviewService.getLockPointsForContent(projectId, contentId);

      expect(lockPoints.length).toBe(1);
    });
  });

  describe('canModify', () => {
    it('should allow modification of draft content', () => {
      const result = reviewService.canModify(projectId, contentId);

      expect(result.canModify).toBe(true);
    });

    it('should prevent modification of published content', () => {
      contentRepo.setStatus(projectId, contentId, 'approved');
      contentRepo.publish(projectId, contentId);

      const result = reviewService.canModify(projectId, contentId);

      expect(result.canModify).toBe(false);
      expect(result.reason).toContain('immutable');
    });

    it('should prevent modification of fully locked content', () => {
      reviewService.createLockPoint(projectId, {
        contentId,
        reason: 'Locked for review',
        type: 'full-lock',
      });

      const result = reviewService.canModify(projectId, contentId);

      expect(result.canModify).toBe(false);
      expect(result.reason).toBe('Locked for review');
      expect(result.lockPoint).toBeDefined();
    });

    it('should allow modification with cascade-protection lock', () => {
      reviewService.createLockPoint(projectId, {
        contentId,
        reason: 'Protected',
        type: 'cascade-protection',
      });

      const result = reviewService.canModify(projectId, contentId);

      // cascade-protection only prevents cascade, not direct edits
      expect(result.canModify).toBe(true);
    });

    it('should return false for non-existent content', () => {
      const result = reviewService.canModify(projectId, 'non-existent');

      expect(result.canModify).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('bulkApprove', () => {
    it('should approve multiple content items', () => {
      // Create more content
      const structure2 = structureRepo.create(projectId, {
        type: 'chapter',
        title: 'Chapter 2',
        summary: 'Another chapter',
        beats: [],
        order: 1,
      });
      const content2 = contentRepo.create(projectId, {
        structureId: structure2.id,
        text: 'Content 2',
        status: 'review',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.setStatus(projectId, contentId, 'review');

      const result = reviewService.bulkApprove(projectId, [contentId, content2.id]);

      expect(result.succeeded.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    it('should report failures', () => {
      // Try to approve draft content without transitioning first
      const result = reviewService.bulkApprove(projectId, [contentId, 'non-existent']);

      // contentId succeeds (draft can skip to approved in our config)
      // non-existent fails
      expect(result.succeeded.length).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].contentId).toBe('non-existent');
    });
  });

  describe('requireAnalysisForApproval', () => {
    it('should require analysis when configured', () => {
      // Create service with requireAnalysisForApproval: true
      const strictService = createReviewWorkflowService(
        contentRepo,
        lockPointRepo,
        structureRepo,
        {
          requireAnalysisForApproval: true,
          minReviewsRequired: 0,
        }
      );

      contentRepo.setStatus(projectId, contentId, 'review');

      const result = strictService.transitionStatus(projectId, contentId, 'approved');

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be analyzed');
    });

    it('should allow approval with analysis', () => {
      const strictService = createReviewWorkflowService(
        contentRepo,
        lockPointRepo,
        structureRepo,
        {
          requireAnalysisForApproval: true,
          minReviewsRequired: 0,
        }
      );

      contentRepo.setStatus(projectId, contentId, 'review');
      contentRepo.setAnalysis(projectId, contentId, {
        id: 'test-analysis',
        contentId,
        contentVersion: 1,
        tensionScore: { score: 50, explanation: 'Test' },
        paceScore: { score: 50, explanation: 'Test' },
        continuityIssues: [],
        wordCount: 10,
        readingTime: 1,
        characterAppearances: [],
        locationAppearances: [],
        threadTouches: [],
        characterVoiceScores: {},
        analyzedAt: new Date().toISOString(),
        modelId: 'test',
      });

      const result = strictService.transitionStatus(projectId, contentId, 'approved');

      expect(result.success).toBe(true);
    });
  });

  describe('minReviewsRequired', () => {
    it('should require minimum reviews when configured', () => {
      const strictService = createReviewWorkflowService(
        contentRepo,
        lockPointRepo,
        structureRepo,
        {
          requireAnalysisForApproval: false,
          minReviewsRequired: 1,
        }
      );

      contentRepo.setStatus(projectId, contentId, 'review');

      const result = strictService.transitionStatus(projectId, contentId, 'approved');

      expect(result.success).toBe(false);
      expect(result.error).toContain('review(s) required');
    });

    it('should allow approval with completed review', () => {
      const strictService = createReviewWorkflowService(
        contentRepo,
        lockPointRepo,
        structureRepo,
        {
          requireAnalysisForApproval: false,
          minReviewsRequired: 1,
        }
      );

      contentRepo.setStatus(projectId, contentId, 'review');

      // Submit a completed review
      const content = contentRepo.findById(projectId, contentId)!;
      strictService.submitReview(projectId, {
        contentId,
        contentVersion: content.currentVersion,
        comments: [],
        paragraphActions: [],
        startedAt: new Date().toISOString(),
      });

      const result = strictService.transitionStatus(projectId, contentId, 'approved');

      expect(result.success).toBe(true);
    });
  });
});
