/**
 * Tests for lock point repository
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../database';
import { createContentRepository, type ContentRepository } from './content-repository';
import { createLockPointRepository, type LockPointRepository } from './lock-point-repository';
import { createStructureRepository, type StructureRepository } from './structure-repository';

describe('LockPointRepository', () => {
  let db: DatabaseConnection;
  let lockPointRepo: LockPointRepository;
  let contentRepo: ContentRepository;
  let structureRepo: StructureRepository;
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

    structureRepo = createStructureRepository(db.db);
    contentRepo = createContentRepository(db.db);
    lockPointRepo = createLockPointRepository(db.db);

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

  describe('create', () => {
    it('should create a cascade-protection lock point', () => {
      const lockPoint = lockPointRepo.create(projectId, {
        contentId,
        reason: 'Important plot point established',
        type: 'cascade-protection',
      });

      expect(lockPoint.id).toBeDefined();
      expect(lockPoint.contentId).toBe(contentId);
      expect(lockPoint.reason).toBe('Important plot point established');
      expect(lockPoint.type).toBe('cascade-protection');
      expect(lockPoint.createdAt).toBeDefined();
    });

    it('should create a full-lock lock point', () => {
      const lockPoint = lockPointRepo.create(projectId, {
        contentId,
        reason: 'Content approved by editor',
        type: 'full-lock',
      });

      expect(lockPoint.type).toBe('full-lock');
    });

    it('should create multiple lock points for same content', () => {
      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 1',
        type: 'cascade-protection',
      });

      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 2',
        type: 'full-lock',
      });

      const lockPoints = lockPointRepo.findByContent(projectId, contentId);
      expect(lockPoints.length).toBe(2);
    });
  });

  describe('findById', () => {
    it('should find lock point by id', () => {
      const created = lockPointRepo.create(projectId, {
        contentId,
        reason: 'Test reason',
        type: 'cascade-protection',
      });

      const found = lockPointRepo.findById(projectId, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.reason).toBe('Test reason');
    });

    it('should return undefined for non-existent id', () => {
      const found = lockPointRepo.findById(projectId, 'non-existent-id');

      expect(found).toBeUndefined();
    });

    it('should not find lock point from different project', () => {
      const created = lockPointRepo.create(projectId, {
        contentId,
        reason: 'Test reason',
        type: 'cascade-protection',
      });

      const found = lockPointRepo.findById('other-project', created.id);

      expect(found).toBeUndefined();
    });
  });

  describe('findByProject', () => {
    it('should return all lock points for a project', () => {
      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 1',
        type: 'cascade-protection',
      });

      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 2',
        type: 'full-lock',
      });

      const lockPoints = lockPointRepo.findByProject(projectId);

      expect(lockPoints.length).toBe(2);
    });

    it('should return empty array for project with no lock points', () => {
      const lockPoints = lockPointRepo.findByProject('empty-project');

      expect(lockPoints).toEqual([]);
    });
  });

  describe('findByContent', () => {
    it('should find lock points for specific content', () => {
      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 1',
        type: 'cascade-protection',
      });

      // Create another content
      const anotherContent = contentRepo.create(projectId, {
        structureId,
        text: 'Another content',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      lockPointRepo.create(projectId, {
        contentId: anotherContent.id,
        reason: 'Reason 2',
        type: 'cascade-protection',
      });

      const lockPoints = lockPointRepo.findByContent(projectId, contentId);

      expect(lockPoints.length).toBe(1);
      expect(lockPoints[0].contentId).toBe(contentId);
    });

    it('should return empty array for content with no lock points', () => {
      const lockPoints = lockPointRepo.findByContent(projectId, 'no-lock-content');

      expect(lockPoints).toEqual([]);
    });
  });

  describe('update', () => {
    it('should return undefined (lock points are immutable)', () => {
      const created = lockPointRepo.create(projectId, {
        contentId,
        reason: 'Original reason',
        type: 'cascade-protection',
      });

      const updated = lockPointRepo.update(projectId, created.id, {
        reason: 'New reason',
      });

      expect(updated).toBeUndefined();

      // Verify original is unchanged
      const found = lockPointRepo.findById(projectId, created.id);
      expect(found?.reason).toBe('Original reason');
    });
  });

  describe('delete', () => {
    it('should delete a lock point', () => {
      const created = lockPointRepo.create(projectId, {
        contentId,
        reason: 'Test reason',
        type: 'cascade-protection',
      });

      const result = lockPointRepo.delete(projectId, created.id);

      expect(result).toBe(true);

      const found = lockPointRepo.findById(projectId, created.id);
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent lock point', () => {
      const result = lockPointRepo.delete(projectId, 'non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('deleteByContent', () => {
    it('should delete all lock points for specific content', () => {
      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 1',
        type: 'cascade-protection',
      });

      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 2',
        type: 'full-lock',
      });

      const deletedCount = lockPointRepo.deleteByContent(projectId, contentId);

      expect(deletedCount).toBe(2);

      const lockPoints = lockPointRepo.findByContent(projectId, contentId);
      expect(lockPoints.length).toBe(0);
    });

    it('should return 0 when no lock points exist for content', () => {
      const deletedCount = lockPointRepo.deleteByContent(projectId, 'no-lock-content');

      expect(deletedCount).toBe(0);
    });

    it('should not affect lock points for other content', () => {
      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 1',
        type: 'cascade-protection',
      });

      // Create another content with a lock point
      const anotherContent = contentRepo.create(projectId, {
        structureId,
        text: 'Another content',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      lockPointRepo.create(projectId, {
        contentId: anotherContent.id,
        reason: 'Reason 2',
        type: 'cascade-protection',
      });

      lockPointRepo.deleteByContent(projectId, contentId);

      const remainingLockPoints = lockPointRepo.findByContent(projectId, anotherContent.id);
      expect(remainingLockPoints.length).toBe(1);
    });
  });

  describe('deleteByProject', () => {
    it('should delete all lock points for a project', () => {
      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 1',
        type: 'cascade-protection',
      });

      lockPointRepo.create(projectId, {
        contentId,
        reason: 'Reason 2',
        type: 'full-lock',
      });

      const deletedCount = lockPointRepo.deleteByProject(projectId);

      expect(deletedCount).toBe(2);

      const lockPoints = lockPointRepo.findByProject(projectId);
      expect(lockPoints.length).toBe(0);
    });
  });
});
