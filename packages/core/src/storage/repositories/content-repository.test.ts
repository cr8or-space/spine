/**
 * Tests for content repository
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, type DatabaseConnection } from '../database';
import { createStructureRepository, type StructureRepository } from './structure-repository';
import { createContentRepository, type ContentRepository } from './content-repository';

describe('ContentRepository', () => {
  let db: DatabaseConnection;
  let contentRepo: ContentRepository;
  let structureRepo: StructureRepository;
  const projectId = 'test-project';
  let structureId: string;

  beforeEach(() => {
    db = createTestDatabase();

    // Create test project using raw SQL (simpler for tests)
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

    // Create a test structure to attach content to
    const structure = structureRepo.create(projectId, {
      type: 'chapter',
      title: 'Test Chapter',
      summary: 'A test chapter',
      beats: [],
      order: 0,
    });
    structureId = structure.id;
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create content with initial version', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Hello world',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
        source: 'generated',
      });

      expect(content.id).toBeDefined();
      expect(content.structureId).toBe(structureId);
      expect(content.currentVersion).toBe(1);
      expect(content.versions.length).toBe(1);
      expect(content.versions[0].text).toBe('Hello world');
      expect(content.versions[0].source).toBe('generated');
    });

    it('should create content with metadata', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Generated text',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
        source: 'generated',
        metadata: {
          modelId: 'gpt-4',
          temperature: 0.7,
          generationStage: 'draft',
        },
      });

      expect(content.versions[0].metadata).toBeDefined();
      expect(content.versions[0].metadata?.modelId).toBe('gpt-4');
      expect(content.versions[0].metadata?.temperature).toBe(0.7);
    });
  });

  describe('addVersion', () => {
    it('should add a new version with incremented version number', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      const updated = contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');

      expect(updated).toBeDefined();
      expect(updated?.currentVersion).toBe(2);
      expect(updated?.text).toBe('Version 2');
      expect(updated?.versions.length).toBe(2);
    });

    it('should add version with metadata', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      const updated = contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited', {
        editDescription: 'Fixed typo',
        tags: ['minor-edit'],
      });

      expect(updated?.versions[1].metadata).toBeDefined();
      expect(updated?.versions[1].metadata?.editDescription).toBe('Fixed typo');
      expect(updated?.versions[1].metadata?.tags).toContain('minor-edit');
    });

    it('should set previousVersion correctly', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');
      const updated = contentRepo.addVersion(projectId, content.id, 'Version 3', 'edited');

      expect(updated?.versions[2].previousVersion).toBe(2);
    });

    it('should not allow adding version to published content', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'approved',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.publish(projectId, content.id);
      const updated = contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');

      expect(updated).toBeUndefined();
    });

    it('should clear analysis when adding new version', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      // Set analysis
      contentRepo.setAnalysis(projectId, content.id, {
        id: 'test-analysis',
        contentId: content.id,
        contentVersion: 1,
        tensionScore: { score: 50, explanation: 'Test' },
        paceScore: { score: 50, explanation: 'Test' },
        continuityIssues: [],
        wordCount: 2,
        readingTime: 1,
        characterAppearances: [],
        locationAppearances: [],
        threadTouches: [],
        characterVoiceScores: {},
        analyzedAt: new Date().toISOString(),
        modelId: 'test',
      });

      const updated = contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');

      expect(updated?.analysis).toBeUndefined();
    });
  });

  describe('rollbackToVersion', () => {
    it('should create a new version with old content', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1 original',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.addVersion(projectId, content.id, 'Version 2 modified', 'edited');
      contentRepo.addVersion(projectId, content.id, 'Version 3 different', 'edited');

      const rolledBack = contentRepo.rollbackToVersion(projectId, content.id, 1);

      expect(rolledBack).toBeDefined();
      expect(rolledBack?.currentVersion).toBe(4);
      expect(rolledBack?.text).toBe('Version 1 original');
      expect(rolledBack?.versions[3].source).toBe('rollback');
    });

    it('should include rollback metadata', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');
      const rolledBack = contentRepo.rollbackToVersion(projectId, content.id, 1);

      expect(rolledBack?.versions[2].metadata?.rolledBackFrom).toBe(2);
      expect(rolledBack?.versions[2].metadata?.editDescription).toContain('Rolled back');
    });

    it('should not rollback published content', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'approved',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');
      contentRepo.update(projectId, content.id, { status: 'approved' });
      contentRepo.publish(projectId, content.id);

      const rolledBack = contentRepo.rollbackToVersion(projectId, content.id, 1);

      expect(rolledBack).toBeUndefined();
    });

    it('should not rollback to non-existent version', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      const rolledBack = contentRepo.rollbackToVersion(projectId, content.id, 99);

      expect(rolledBack).toBeUndefined();
    });

    it('should not rollback to current version', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      const rolledBack = contentRepo.rollbackToVersion(projectId, content.id, 1);

      expect(rolledBack).toBeUndefined();
    });
  });

  describe('getVersionCount', () => {
    it('should return correct version count', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');
      contentRepo.addVersion(projectId, content.id, 'Version 3', 'edited');

      const count = contentRepo.getVersionCount(projectId, content.id);

      expect(count).toBe(3);
    });

    it('should return 0 for non-existent content', () => {
      const count = contentRepo.getVersionCount(projectId, 'non-existent-id');

      expect(count).toBe(0);
    });
  });

  describe('getLatestVersions', () => {
    it('should return versions in descending order', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');
      contentRepo.addVersion(projectId, content.id, 'Version 3', 'edited');

      const versions = contentRepo.getLatestVersions(projectId, content.id, 2);

      expect(versions.length).toBe(2);
      expect(versions[0].version).toBe(3);
      expect(versions[1].version).toBe(2);
    });

    it('should respect limit', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');
      contentRepo.addVersion(projectId, content.id, 'Version 3', 'edited');
      contentRepo.addVersion(projectId, content.id, 'Version 4', 'edited');
      contentRepo.addVersion(projectId, content.id, 'Version 5', 'edited');

      const versions = contentRepo.getLatestVersions(projectId, content.id, 3);

      expect(versions.length).toBe(3);
      expect(versions[0].version).toBe(5);
    });

    it('should return empty array for non-existent content', () => {
      const versions = contentRepo.getLatestVersions(projectId, 'non-existent-id', 5);

      expect(versions).toEqual([]);
    });
  });

  describe('getVersion', () => {
    it('should return specific version', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');

      const v1 = contentRepo.getVersion(projectId, content.id, 1);
      const v2 = contentRepo.getVersion(projectId, content.id, 2);

      expect(v1?.text).toBe('Version 1');
      expect(v2?.text).toBe('Version 2');
    });

    it('should return undefined for non-existent version', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      const version = contentRepo.getVersion(projectId, content.id, 99);

      expect(version).toBeUndefined();
    });
  });

  describe('getAllVersions', () => {
    it('should return all versions in order', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Version 1',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
      });

      contentRepo.addVersion(projectId, content.id, 'Version 2', 'edited');
      contentRepo.addVersion(projectId, content.id, 'Version 3', 'generated');

      const versions = contentRepo.getAllVersions(projectId, content.id);

      expect(versions.length).toBe(3);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(3);
    });
  });

  describe('version source types', () => {
    it('should support rollback source type', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Original',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
        source: 'generated',
      });

      contentRepo.addVersion(projectId, content.id, 'Modified', 'edited');
      const updated = contentRepo.addVersion(projectId, content.id, 'Original', 'rollback', {
        rolledBackFrom: 2,
      });

      expect(updated?.versions[2].source).toBe('rollback');
      expect(updated?.versions[2].metadata?.rolledBackFrom).toBe(2);
    });

    it('should support imported source type', () => {
      const content = contentRepo.create(projectId, {
        structureId,
        text: 'Imported content',
        status: 'draft',
        reviews: [],
        generationHistory: [],
        locked: false,
        source: 'imported',
        metadata: {
          importSource: 'external-file.txt',
        },
      });

      expect(content.versions[0].source).toBe('imported');
      expect(content.versions[0].metadata?.importSource).toBe('external-file.txt');
    });
  });
});
