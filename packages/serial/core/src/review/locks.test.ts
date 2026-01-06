/**
 * Tests for lock point service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import {
  createContentRepository,
  type ContentRepository,
} from '../storage/repositories/content-repository';
import {
  createLockPointRepository,
  type LockPointRepository,
} from '../storage/repositories/lock-point-repository';
import {
  createStructureRepository,
  type StructureRepository,
} from '../storage/repositories/structure-repository';

import { createLockPointService, type LockPointService } from './locks';

describe('LockPointService', () => {
  let db: DatabaseConnection;
  let contentRepo: ContentRepository;
  let lockPointRepo: LockPointRepository;
  let structureRepo: StructureRepository; // Still needed for test setup
  let lockService: LockPointService;
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

    lockService = createLockPointService(contentRepo, lockPointRepo);

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
      text: 'Test content',
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

  describe('createLock', () => {
    it('should create a full-lock lock point', () => {
      const lockPoint = lockService.createLock(projectId, {
        contentId,
        reason: 'Important milestone',
        type: 'full-lock',
      });

      expect(lockPoint).toBeDefined();
      expect(lockPoint?.contentId).toBe(contentId);
      expect(lockPoint?.reason).toBe('Important milestone');
      expect(lockPoint?.type).toBe('full-lock');
    });

    it('should create a cascade-protection lock point', () => {
      const lockPoint = lockService.createLock(projectId, {
        contentId,
        reason: 'Foreshadowing planted',
        type: 'cascade-protection',
      });

      expect(lockPoint).toBeDefined();
      expect(lockPoint?.type).toBe('cascade-protection');
    });

    it('should return undefined for non-existent content', () => {
      const lockPoint = lockService.createLock(projectId, {
        contentId: 'non-existent',
        reason: 'Test',
        type: 'full-lock',
      });

      expect(lockPoint).toBeUndefined();
    });

    it('should allow creating lock on published content', () => {
      // Publish the content
      contentRepo.setStatus(projectId, contentId, 'approved');
      contentRepo.publish(projectId, contentId);

      const lockPoint = lockService.createLock(projectId, {
        contentId,
        reason: 'Audit trail',
        type: 'full-lock',
      });

      // Can still create for audit trail
      expect(lockPoint).toBeDefined();
    });
  });

  describe('removeLock', () => {
    it('should remove a lock point', () => {
      const lockPoint = lockService.createLock(projectId, {
        contentId,
        reason: 'Test',
        type: 'full-lock',
      });

      const result = lockService.removeLock(projectId, lockPoint!.id);

      expect(result).toBe(true);

      const locks = lockService.getContentLocks(projectId, contentId);
      expect(locks.length).toBe(0);
    });

    it('should return false for non-existent lock point', () => {
      const result = lockService.removeLock(projectId, 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getProjectLocks', () => {
    it('should return all locks for a project', () => {
      // Create multiple locks
      lockService.createLock(projectId, {
        contentId,
        reason: 'Lock 1',
        type: 'full-lock',
      });

      lockService.createLock(projectId, {
        contentId,
        reason: 'Lock 2',
        type: 'cascade-protection',
      });

      const locks = lockService.getProjectLocks(projectId);

      expect(locks.length).toBe(2);
    });

    it('should return empty array for project with no locks', () => {
      const locks = lockService.getProjectLocks(projectId);
      expect(locks.length).toBe(0);
    });
  });

  describe('getContentLocks', () => {
    it('should return locks for specific content', () => {
      // Create another content
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
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      // Create locks on both
      lockService.createLock(projectId, {
        contentId,
        reason: 'Lock for content 1',
        type: 'full-lock',
      });

      lockService.createLock(projectId, {
        contentId: content2.id,
        reason: 'Lock for content 2',
        type: 'cascade-protection',
      });

      const locks1 = lockService.getContentLocks(projectId, contentId);
      const locks2 = lockService.getContentLocks(projectId, content2.id);

      expect(locks1.length).toBe(1);
      expect(locks1[0].reason).toBe('Lock for content 1');

      expect(locks2.length).toBe(1);
      expect(locks2[0].reason).toBe('Lock for content 2');
    });
  });

  describe('getLockSummary', () => {
    it('should return accurate lock summary', () => {
      // Create another content
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
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      // Create various locks
      lockService.createLock(projectId, {
        contentId,
        reason: 'Full lock 1',
        type: 'full-lock',
      });

      lockService.createLock(projectId, {
        contentId,
        reason: 'Cascade protection',
        type: 'cascade-protection',
      });

      lockService.createLock(projectId, {
        contentId: content2.id,
        reason: 'Full lock 2',
        type: 'full-lock',
      });

      const summary = lockService.getLockSummary(projectId);

      expect(summary.total).toBe(3);
      expect(summary.fullLocks).toBe(2);
      expect(summary.cascadeProtections).toBe(1);
      expect(summary.lockedContentIds).toContain(contentId);
      expect(summary.lockedContentIds).toContain(content2.id);
      expect(summary.fullyLockedContentIds).toContain(contentId);
      expect(summary.fullyLockedContentIds).toContain(content2.id);
    });

    it('should return empty summary for no locks', () => {
      const summary = lockService.getLockSummary(projectId);

      expect(summary.total).toBe(0);
      expect(summary.fullLocks).toBe(0);
      expect(summary.cascadeProtections).toBe(0);
      expect(summary.lockedContentIds.length).toBe(0);
      expect(summary.fullyLockedContentIds.length).toBe(0);
    });
  });

  describe('canModifyContent', () => {
    it('should allow modification of unlocked content', () => {
      const result = lockService.canModifyContent(projectId, contentId);

      expect(result.canModify).toBe(true);
    });

    it('should prevent modification of content with full-lock', () => {
      lockService.createLock(projectId, {
        contentId,
        reason: 'Protected content',
        type: 'full-lock',
      });

      const result = lockService.canModifyContent(projectId, contentId);

      expect(result.canModify).toBe(false);
      expect(result.reason).toBe('Protected content');
      expect(result.lockPoint).toBeDefined();
    });

    it('should allow modification of content with only cascade-protection', () => {
      lockService.createLock(projectId, {
        contentId,
        reason: 'Cascade protected',
        type: 'cascade-protection',
      });

      const result = lockService.canModifyContent(projectId, contentId);

      // cascade-protection allows direct edits
      expect(result.canModify).toBe(true);
    });

    it('should prevent modification of published content', () => {
      contentRepo.setStatus(projectId, contentId, 'approved');
      contentRepo.publish(projectId, contentId);

      const result = lockService.canModifyContent(projectId, contentId);

      expect(result.canModify).toBe(false);
      expect(result.isPublished).toBe(true);
      expect(result.reason).toContain('immutable');
    });

    it('should prevent modification of content with locked flag', () => {
      contentRepo.lock(projectId, contentId, 'Content locked by system');

      const result = lockService.canModifyContent(projectId, contentId);

      expect(result.canModify).toBe(false);
      expect(result.reason).toBe('Content locked by system');
    });

    it('should return cannot modify for non-existent content', () => {
      const result = lockService.canModifyContent(projectId, 'non-existent');

      expect(result.canModify).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('canCascadeToContent', () => {
    it('should allow cascade to unlocked content', () => {
      const result = lockService.canCascadeToContent(projectId, contentId);

      expect(result.canCascade).toBe(true);
      expect(result.blockingLockPoints.length).toBe(0);
    });

    it('should prevent cascade to content with full-lock', () => {
      const lockPoint = lockService.createLock(projectId, {
        contentId,
        reason: 'Full protection',
        type: 'full-lock',
      });

      const result = lockService.canCascadeToContent(projectId, contentId);

      expect(result.canCascade).toBe(false);
      expect(result.blockingLockPoints.length).toBe(1);
      expect(result.blockingLockPoints[0].id).toBe(lockPoint!.id);
    });

    it('should prevent cascade to content with cascade-protection', () => {
      lockService.createLock(projectId, {
        contentId,
        reason: 'Cascade protection',
        type: 'cascade-protection',
      });

      const result = lockService.canCascadeToContent(projectId, contentId);

      // cascade-protection blocks cascades
      expect(result.canCascade).toBe(false);
      expect(result.blockingLockPoints.length).toBe(1);
    });

    it('should prevent cascade to published content', () => {
      contentRepo.setStatus(projectId, contentId, 'approved');
      contentRepo.publish(projectId, contentId);

      const result = lockService.canCascadeToContent(projectId, contentId);

      expect(result.canCascade).toBe(false);
      expect(result.reason).toContain('immutable');
    });

    it('should return cannot cascade for non-existent content', () => {
      const result = lockService.canCascadeToContent(projectId, 'non-existent');

      expect(result.canCascade).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('getCascadeBlockers', () => {
    it('should return blockers for multiple content items', () => {
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
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      // Lock one content
      lockService.createLock(projectId, {
        contentId,
        reason: 'Blocked',
        type: 'cascade-protection',
      });

      const blockers = lockService.getCascadeBlockers(projectId, [contentId, content2.id]);

      expect(blockers.size).toBe(1);
      expect(blockers.has(contentId)).toBe(true);
      expect(blockers.has(content2.id)).toBe(false);
    });

    it('should return empty map when no blockers', () => {
      const blockers = lockService.getCascadeBlockers(projectId, [contentId]);

      expect(blockers.size).toBe(0);
    });
  });

  describe('lockMultiple', () => {
    it('should lock multiple content items', () => {
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
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      const result = lockService.lockMultiple(
        projectId,
        [contentId, content2.id],
        'Batch lock',
        'full-lock'
      );

      expect(result.succeeded.length).toBe(2);
      expect(result.failed.length).toBe(0);

      // Verify both are locked
      const check1 = lockService.canModifyContent(projectId, contentId);
      const check2 = lockService.canModifyContent(projectId, content2.id);

      expect(check1.canModify).toBe(false);
      expect(check2.canModify).toBe(false);
    });

    it('should report failures for non-existent content', () => {
      const result = lockService.lockMultiple(
        projectId,
        [contentId, 'non-existent'],
        'Batch lock',
        'full-lock'
      );

      expect(result.succeeded.length).toBe(1);
      expect(result.succeeded[0]).toBe(contentId);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].contentId).toBe('non-existent');
    });
  });

  describe('removeAllLocksForContent', () => {
    it('should remove all locks for content', () => {
      // Create multiple locks
      lockService.createLock(projectId, {
        contentId,
        reason: 'Lock 1',
        type: 'full-lock',
      });

      lockService.createLock(projectId, {
        contentId,
        reason: 'Lock 2',
        type: 'cascade-protection',
      });

      const removed = lockService.removeAllLocksForContent(projectId, contentId);

      expect(removed).toBe(2);

      const locks = lockService.getContentLocks(projectId, contentId);
      expect(locks.length).toBe(0);
    });

    it('should return 0 when no locks to remove', () => {
      const removed = lockService.removeAllLocksForContent(projectId, contentId);
      expect(removed).toBe(0);
    });
  });

  describe('hasLockType', () => {
    it('should return true when lock type exists', () => {
      lockService.createLock(projectId, {
        contentId,
        reason: 'Full lock',
        type: 'full-lock',
      });

      expect(lockService.hasLockType(projectId, contentId, 'full-lock')).toBe(true);
      expect(lockService.hasLockType(projectId, contentId, 'cascade-protection')).toBe(false);
    });

    it('should return false when no locks exist', () => {
      expect(lockService.hasLockType(projectId, contentId, 'full-lock')).toBe(false);
      expect(lockService.hasLockType(projectId, contentId, 'cascade-protection')).toBe(false);
    });
  });
});
