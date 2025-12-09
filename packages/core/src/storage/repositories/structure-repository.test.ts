/**
 * Structure repository tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { Beat, Hook } from '@repo/types';

import { createTestDatabase, type DatabaseConnection } from '../database';
import { createStructureRepository, type StructureRepository, type CreateStructureData } from './structure-repository';

describe('StructureRepository', () => {
  let db: DatabaseConnection;
  let repo: StructureRepository;
  const projectId = 'test-project';

  beforeEach(() => {
    db = createTestDatabase();

    // Create a test project
    db.db
      .prepare(
        `
      INSERT INTO projects (id, title, format, settings_json, metadata_json, created_at, updated_at)
      VALUES (?, 'Test Project', 'web-serial', '{}', '{"genres":[]}', datetime('now'), datetime('now'))
    `
      )
      .run(projectId);

    repo = createStructureRepository(db.db, db.drizzle);
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Helper to create minimal structure data
   */
  function createMinimalStructure(overrides: Partial<CreateStructureData> = {}): CreateStructureData {
    return {
      type: 'chapter',
      title: 'Test Chapter',
      summary: '',
      beats: [],
      order: 0,
      ...overrides,
    };
  }

  describe('create', () => {
    it('should create a structure with all fields', () => {
      const beat: Beat = {
        id: 'beat-1',
        description: 'Opening scene',
        completed: false,
        targetWordCount: 500,
        order: 0,
      };

      const hook: Hook = {
        type: 'cliffhanger',
        description: 'Protagonist faces impossible choice',
        targetStrength: 85,
      };

      const structure = repo.create(projectId, {
        type: 'chapter',
        title: 'Chapter One',
        summary: 'The story begins',
        beats: [beat],
        tensionTarget: 75,
        chapterType: 'action',
        hook,
        order: 0,
        parentId: undefined,
        targetWordCount: 3000,
        notes: 'Key chapter for setup',
      });

      expect(structure.id).toBeDefined();
      expect(structure.type).toBe('chapter');
      expect(structure.title).toBe('Chapter One');
      expect(structure.summary).toBe('The story begins');
      expect(structure.beats).toHaveLength(1);
      expect(structure.beats[0].description).toBe('Opening scene');
      expect(structure.tensionTarget).toBe(75);
      expect(structure.chapterType).toBe('action');
      expect(structure.hook?.type).toBe('cliffhanger');
      expect(structure.hook?.targetStrength).toBe(85);
      expect(structure.order).toBe(0);
      expect(structure.targetWordCount).toBe(3000);
      expect(structure.notes).toBe('Key chapter for setup');
      expect(structure.children).toEqual([]);
      expect(structure.createdAt).toBeDefined();
      expect(structure.updatedAt).toBeDefined();
    });

    it('should create a minimal structure', () => {
      const structure = repo.create(projectId, createMinimalStructure());

      expect(structure.id).toBeDefined();
      expect(structure.type).toBe('chapter');
      expect(structure.title).toBe('Test Chapter');
      expect(structure.beats).toEqual([]);
      expect(structure.tensionTarget).toBeUndefined();
      expect(structure.chapterType).toBeUndefined();
      expect(structure.hook).toBeUndefined();
      expect(structure.parentId).toBeUndefined();
      expect(structure.notes).toBeUndefined();
    });

    it('should generate unique IDs', () => {
      const struct1 = repo.create(projectId, createMinimalStructure({ title: 'Chapter 1' }));
      const struct2 = repo.create(projectId, createMinimalStructure({ title: 'Chapter 2' }));

      expect(struct1.id).not.toBe(struct2.id);
    });

    it('should create structures with parent-child relationship', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'My Novel' }));
      const arc = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Act One', parentId: book.id, order: 0 }));
      const chapter = repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter 1', parentId: arc.id, order: 0 }));

      expect(arc.parentId).toBe(book.id);
      expect(chapter.parentId).toBe(arc.id);
    });
  });

  describe('findById', () => {
    it('should find existing structure', () => {
      const created = repo.create(projectId, createMinimalStructure());

      const found = repo.findById(projectId, created.id);
      expect(found).toBeDefined();
      expect(found?.title).toBe('Test Chapter');
    });

    it('should return undefined for non-existent structure', () => {
      const found = repo.findById(projectId, 'nonexistent');
      expect(found).toBeUndefined();
    });

    it('should not find structure from different project', () => {
      const created = repo.create(projectId, createMinimalStructure());

      const found = repo.findById('other-project', created.id);
      expect(found).toBeUndefined();
    });

    it('should return structure without children loaded', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc', parentId: book.id }));

      const found = repo.findById(projectId, book.id);
      expect(found?.children).toEqual([]);
    });
  });

  describe('findByProject', () => {
    it('should return all structures in a project', () => {
      repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc' }));
      repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter' }));

      const structures = repo.findByProject(projectId);
      expect(structures).toHaveLength(3);
    });

    it('should return empty array for empty project', () => {
      const structures = repo.findByProject(projectId);
      expect(structures).toEqual([]);
    });

    it('should not include structures from other projects', () => {
      // Create another project
      db.db
        .prepare(
          `
        INSERT INTO projects (id, title, format, settings_json, metadata_json, created_at, updated_at)
        VALUES (?, 'Other Project', 'web-serial', '{}', '{"genres":[]}', datetime('now'), datetime('now'))
      `
        )
        .run('other-project');

      repo.create(projectId, createMinimalStructure({ title: 'Project 1 Chapter' }));
      repo.create('other-project', createMinimalStructure({ title: 'Project 2 Chapter' }));

      const structures = repo.findByProject(projectId);
      expect(structures).toHaveLength(1);
      expect(structures[0].title).toBe('Project 1 Chapter');
    });
  });

  describe('update', () => {
    it('should update structure fields', () => {
      const created = repo.create(projectId, createMinimalStructure());

      const updated = repo.update(projectId, created.id, {
        title: 'Updated Title',
        summary: 'New summary',
        tensionTarget: 80,
        chapterType: 'character',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.summary).toBe('New summary');
      expect(updated?.tensionTarget).toBe(80);
      expect(updated?.chapterType).toBe('character');
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should preserve unchanged fields', () => {
      const created = repo.create(projectId, {
        type: 'chapter',
        title: 'Original',
        summary: 'Original summary',
        beats: [{ id: 'beat-1', description: 'Beat', completed: false, order: 0 }],
        tensionTarget: 50,
        chapterType: 'action',
        order: 0,
        notes: 'Some notes',
      });

      const updated = repo.update(projectId, created.id, { title: 'New Title' });

      expect(updated?.title).toBe('New Title');
      expect(updated?.summary).toBe('Original summary');
      expect(updated?.beats).toHaveLength(1);
      expect(updated?.tensionTarget).toBe(50);
      expect(updated?.chapterType).toBe('action');
      expect(updated?.notes).toBe('Some notes');
    });

    it('should allow clearing optional fields', () => {
      const created = repo.create(projectId, {
        type: 'chapter',
        title: 'Chapter',
        summary: '',
        beats: [],
        tensionTarget: 50,
        chapterType: 'action',
        hook: { type: 'cliffhanger', description: 'Test' },
        order: 0,
        notes: 'Notes',
      });

      const updated = repo.update(projectId, created.id, {
        tensionTarget: undefined,
        chapterType: undefined,
        hook: undefined,
        notes: undefined,
      });

      expect(updated?.tensionTarget).toBeUndefined();
      expect(updated?.chapterType).toBeUndefined();
      expect(updated?.hook).toBeUndefined();
      expect(updated?.notes).toBeUndefined();
    });

    it('should return undefined for non-existent structure', () => {
      const updated = repo.update(projectId, 'nonexistent', { title: 'New' });
      expect(updated).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete existing structure', () => {
      const created = repo.create(projectId, createMinimalStructure());

      const deleted = repo.delete(projectId, created.id);
      expect(deleted).toBe(true);

      const found = repo.findById(projectId, created.id);
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent structure', () => {
      const deleted = repo.delete(projectId, 'nonexistent');
      expect(deleted).toBe(false);
    });

    it('should not delete structure from different project', () => {
      const created = repo.create(projectId, createMinimalStructure());

      const deleted = repo.delete('other-project', created.id);
      expect(deleted).toBe(false);

      const found = repo.findById(projectId, created.id);
      expect(found).toBeDefined();
    });
  });

  describe('deleteByProject', () => {
    it('should delete all structures in a project', () => {
      repo.create(projectId, createMinimalStructure({ title: 'Chapter 1' }));
      repo.create(projectId, createMinimalStructure({ title: 'Chapter 2' }));
      repo.create(projectId, createMinimalStructure({ title: 'Chapter 3' }));

      const deleted = repo.deleteByProject(projectId);
      expect(deleted).toBe(3);

      const remaining = repo.findByProject(projectId);
      expect(remaining).toHaveLength(0);
    });

    it('should return 0 for empty project', () => {
      const deleted = repo.deleteByProject(projectId);
      expect(deleted).toBe(0);
    });
  });

  describe('findByType', () => {
    it('should find structures by type', () => {
      repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book 1' }));
      repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 1' }));
      repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter 1' }));
      repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter 2' }));
      repo.create(projectId, createMinimalStructure({ type: 'scene', title: 'Scene 1' }));

      const chapters = repo.findByType(projectId, 'chapter');
      expect(chapters).toHaveLength(2);
      expect(chapters.every((s) => s.type === 'chapter')).toBe(true);
    });

    it('should return empty array when no structures of type exist', () => {
      repo.create(projectId, createMinimalStructure({ type: 'chapter' }));

      const books = repo.findByType(projectId, 'book');
      expect(books).toEqual([]);
    });
  });

  describe('findChildren', () => {
    it('should find direct children of a structure', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 1', parentId: book.id, order: 0 }));
      repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 2', parentId: book.id, order: 1 }));

      const children = repo.findChildren(projectId, book.id);
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.title)).toEqual(['Arc 1', 'Arc 2']);
    });

    it('should return children in sort order', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 3', parentId: book.id, order: 2 }));
      repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 1', parentId: book.id, order: 0 }));
      repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 2', parentId: book.id, order: 1 }));

      const children = repo.findChildren(projectId, book.id);
      expect(children.map((c) => c.title)).toEqual(['Arc 1', 'Arc 2', 'Arc 3']);
    });

    it('should return empty array for structure with no children', () => {
      const chapter = repo.create(projectId, createMinimalStructure({ type: 'chapter' }));

      const children = repo.findChildren(projectId, chapter.id);
      expect(children).toEqual([]);
    });

    it('should find root-level structures with null parent', () => {
      repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book 1', order: 0 }));
      repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book 2', order: 1 }));

      const roots = repo.findChildren(projectId, null);
      expect(roots).toHaveLength(2);
    });
  });

  describe('findRoot', () => {
    it('should find the root structure', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Root Book' }));
      repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc', parentId: book.id }));

      const root = repo.findRoot(projectId);
      expect(root).toBeDefined();
      expect(root?.title).toBe('Root Book');
      expect(root?.parentId).toBeUndefined();
    });

    it('should return undefined when no root exists', () => {
      const root = repo.findRoot(projectId);
      expect(root).toBeUndefined();
    });

    it('should return first root if multiple exist', () => {
      repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book 1' }));
      repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book 2' }));

      const root = repo.findRoot(projectId);
      expect(root).toBeDefined();
      // Should return one of them (first by insertion order)
      expect(['Book 1', 'Book 2']).toContain(root?.title);
    });
  });

  describe('loadWithChildren', () => {
    it('should load structure with all children recursively', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      const arc = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc', parentId: book.id, order: 0 }));
      repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter 1', parentId: arc.id, order: 0 }));
      repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter 2', parentId: arc.id, order: 1 }));

      const loaded = repo.loadWithChildren(projectId, book.id);

      expect(loaded).toBeDefined();
      expect(loaded?.title).toBe('Book');
      expect(loaded?.children).toHaveLength(1);
      expect(loaded?.children[0].title).toBe('Arc');
      expect(loaded?.children[0].children).toHaveLength(2);
      expect(loaded?.children[0].children.map((c) => c.title)).toEqual(['Chapter 1', 'Chapter 2']);
    });

    it('should return undefined for non-existent structure', () => {
      const loaded = repo.loadWithChildren(projectId, 'nonexistent');
      expect(loaded).toBeUndefined();
    });

    it('should handle structure with no children', () => {
      const chapter = repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Lonely Chapter' }));

      const loaded = repo.loadWithChildren(projectId, chapter.id);
      expect(loaded).toBeDefined();
      expect(loaded?.children).toEqual([]);
    });
  });

  describe('loadFullTree', () => {
    it('should load entire project structure tree', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      const arc1 = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 1', parentId: book.id, order: 0 }));
      const arc2 = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 2', parentId: book.id, order: 1 }));
      repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter 1', parentId: arc1.id, order: 0 }));
      repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter 2', parentId: arc1.id, order: 1 }));
      repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter 3', parentId: arc2.id, order: 0 }));

      const tree = repo.loadFullTree(projectId);

      expect(tree).toBeDefined();
      expect(tree?.title).toBe('Book');
      expect(tree?.children).toHaveLength(2);
      expect(tree?.children[0].title).toBe('Arc 1');
      expect(tree?.children[0].children).toHaveLength(2);
      expect(tree?.children[1].title).toBe('Arc 2');
      expect(tree?.children[1].children).toHaveLength(1);
    });

    it('should return undefined when no root exists', () => {
      const tree = repo.loadFullTree(projectId);
      expect(tree).toBeUndefined();
    });
  });

  describe('reorder', () => {
    it('should reorder children within a parent', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      const arc1 = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc A', parentId: book.id, order: 0 }));
      const arc2 = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc B', parentId: book.id, order: 1 }));
      const arc3 = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc C', parentId: book.id, order: 2 }));

      // Reorder: C, A, B
      repo.reorder(projectId, book.id, [arc3.id, arc1.id, arc2.id]);

      const children = repo.findChildren(projectId, book.id);
      expect(children.map((c) => c.title)).toEqual(['Arc C', 'Arc A', 'Arc B']);
    });

    it('should update sort_order values correctly', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      const arc1 = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 1', parentId: book.id, order: 0 }));
      const arc2 = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 2', parentId: book.id, order: 1 }));

      repo.reorder(projectId, book.id, [arc2.id, arc1.id]);

      const reloadedArc1 = repo.findById(projectId, arc1.id);
      const reloadedArc2 = repo.findById(projectId, arc2.id);

      expect(reloadedArc2?.order).toBe(0);
      expect(reloadedArc1?.order).toBe(1);
    });
  });

  describe('addBeat', () => {
    it('should add a beat to a structure', () => {
      const chapter = repo.create(projectId, createMinimalStructure({ title: 'Chapter' }));

      const beat: Beat = {
        id: 'beat-1',
        description: 'Opening hook',
        completed: false,
        order: 0,
      };

      const updated = repo.addBeat(projectId, chapter.id, beat);

      expect(updated?.beats).toHaveLength(1);
      expect(updated?.beats[0].description).toBe('Opening hook');
    });

    it('should append beat to existing beats', () => {
      const chapter = repo.create(projectId, {
        ...createMinimalStructure({ title: 'Chapter' }),
        beats: [{ id: 'beat-1', description: 'First beat', completed: false, order: 0 }],
      });

      const newBeat: Beat = {
        id: 'beat-2',
        description: 'Second beat',
        completed: false,
        order: 1,
      };

      const updated = repo.addBeat(projectId, chapter.id, newBeat);

      expect(updated?.beats).toHaveLength(2);
      expect(updated?.beats[1].description).toBe('Second beat');
    });

    it('should return undefined for non-existent structure', () => {
      const beat: Beat = { id: 'beat-1', description: 'Beat', completed: false, order: 0 };
      const updated = repo.addBeat(projectId, 'nonexistent', beat);
      expect(updated).toBeUndefined();
    });
  });

  describe('removeBeat', () => {
    it('should remove a beat by id', () => {
      const chapter = repo.create(projectId, {
        ...createMinimalStructure({ title: 'Chapter' }),
        beats: [
          { id: 'beat-1', description: 'Beat 1', completed: false, order: 0 },
          { id: 'beat-2', description: 'Beat 2', completed: false, order: 1 },
          { id: 'beat-3', description: 'Beat 3', completed: false, order: 2 },
        ],
      });

      const updated = repo.removeBeat(projectId, chapter.id, 'beat-2');

      expect(updated?.beats).toHaveLength(2);
      expect(updated?.beats.map((b) => b.id)).toEqual(['beat-1', 'beat-3']);
    });

    it('should do nothing if beat id not found', () => {
      const chapter = repo.create(projectId, {
        ...createMinimalStructure({ title: 'Chapter' }),
        beats: [{ id: 'beat-1', description: 'Beat 1', completed: false, order: 0 }],
      });

      const updated = repo.removeBeat(projectId, chapter.id, 'nonexistent-beat');

      expect(updated?.beats).toHaveLength(1);
    });

    it('should return undefined for non-existent structure', () => {
      const updated = repo.removeBeat(projectId, 'nonexistent', 'beat-1');
      expect(updated).toBeUndefined();
    });
  });

  describe('updateBeat', () => {
    it('should update beat fields', () => {
      const chapter = repo.create(projectId, {
        ...createMinimalStructure({ title: 'Chapter' }),
        beats: [{ id: 'beat-1', description: 'Original', completed: false, order: 0 }],
      });

      const updated = repo.updateBeat(projectId, chapter.id, 'beat-1', {
        description: 'Updated description',
        completed: true,
      });

      expect(updated?.beats[0].description).toBe('Updated description');
      expect(updated?.beats[0].completed).toBe(true);
    });

    it('should preserve unchanged beat fields', () => {
      const chapter = repo.create(projectId, {
        ...createMinimalStructure({ title: 'Chapter' }),
        beats: [{ id: 'beat-1', description: 'Original', completed: false, targetWordCount: 500, order: 0 }],
      });

      const updated = repo.updateBeat(projectId, chapter.id, 'beat-1', { completed: true });

      expect(updated?.beats[0].description).toBe('Original');
      expect(updated?.beats[0].targetWordCount).toBe(500);
      expect(updated?.beats[0].completed).toBe(true);
    });

    it('should only update the specified beat', () => {
      const chapter = repo.create(projectId, {
        ...createMinimalStructure({ title: 'Chapter' }),
        beats: [
          { id: 'beat-1', description: 'Beat 1', completed: false, order: 0 },
          { id: 'beat-2', description: 'Beat 2', completed: false, order: 1 },
        ],
      });

      const updated = repo.updateBeat(projectId, chapter.id, 'beat-1', { completed: true });

      expect(updated?.beats[0].completed).toBe(true);
      expect(updated?.beats[1].completed).toBe(false);
    });

    it('should return undefined for non-existent structure', () => {
      const updated = repo.updateBeat(projectId, 'nonexistent', 'beat-1', { completed: true });
      expect(updated).toBeUndefined();
    });
  });

  describe('setHook', () => {
    it('should set hook on a structure', () => {
      const chapter = repo.create(projectId, createMinimalStructure({ title: 'Chapter' }));

      const hook: Hook = {
        type: 'revelation',
        description: 'Major secret revealed',
        targetStrength: 90,
      };

      const updated = repo.setHook(projectId, chapter.id, hook);

      expect(updated?.hook).toBeDefined();
      expect(updated?.hook?.type).toBe('revelation');
      expect(updated?.hook?.description).toBe('Major secret revealed');
      expect(updated?.hook?.targetStrength).toBe(90);
    });

    it('should update existing hook', () => {
      const chapter = repo.create(projectId, {
        ...createMinimalStructure({ title: 'Chapter' }),
        hook: { type: 'cliffhanger', description: 'Old hook' },
      });

      const updated = repo.setHook(projectId, chapter.id, {
        type: 'twist',
        description: 'New hook',
        targetStrength: 95,
      });

      expect(updated?.hook?.type).toBe('twist');
      expect(updated?.hook?.description).toBe('New hook');
    });

    it('should remove hook when set to undefined', () => {
      const chapter = repo.create(projectId, {
        ...createMinimalStructure({ title: 'Chapter' }),
        hook: { type: 'cliffhanger', description: 'Hook' },
      });

      const updated = repo.setHook(projectId, chapter.id, undefined);

      expect(updated?.hook).toBeUndefined();
    });

    it('should return undefined for non-existent structure', () => {
      const hook: Hook = { type: 'cliffhanger', description: 'Hook' };
      const updated = repo.setHook(projectId, 'nonexistent', hook);
      expect(updated).toBeUndefined();
    });
  });

  describe('move', () => {
    it('should move structure to new parent', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      const arc1 = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 1', parentId: book.id }));
      const arc2 = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc 2', parentId: book.id }));
      const chapter = repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter', parentId: arc1.id }));

      // Move chapter from Arc 1 to Arc 2
      const updated = repo.move(projectId, chapter.id, arc2.id, 0);

      expect(updated?.parentId).toBe(arc2.id);

      // Verify in database
      const reloaded = repo.findById(projectId, chapter.id);
      expect(reloaded?.parentId).toBe(arc2.id);
    });

    it('should move structure to root (null parent)', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      const arc = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Arc', parentId: book.id }));

      const updated = repo.move(projectId, arc.id, null, 0);

      expect(updated?.parentId).toBeUndefined();
    });

    it('should update order when moving', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));
      const chapter = repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter', parentId: book.id, order: 0 }));

      const updated = repo.move(projectId, chapter.id, book.id, 5);

      expect(updated?.order).toBe(5);
    });

    it('should return undefined for non-existent structure', () => {
      const updated = repo.move(projectId, 'nonexistent', null, 0);
      expect(updated).toBeUndefined();
    });
  });

  describe('complex hierarchy operations', () => {
    it('should handle deep nesting (book -> arc -> chapter -> scene)', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'My Novel' }));
      const arc = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Act One', parentId: book.id }));
      const chapter = repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Chapter 1', parentId: arc.id }));
      repo.create(projectId, createMinimalStructure({ type: 'scene', title: 'Scene 1', parentId: chapter.id, order: 0 }));
      repo.create(projectId, createMinimalStructure({ type: 'scene', title: 'Scene 2', parentId: chapter.id, order: 1 }));

      const tree = repo.loadFullTree(projectId);

      expect(tree?.type).toBe('book');
      expect(tree?.children[0].type).toBe('arc');
      expect(tree?.children[0].children[0].type).toBe('chapter');
      expect(tree?.children[0].children[0].children).toHaveLength(2);
      expect(tree?.children[0].children[0].children[0].type).toBe('scene');
    });

    it('should handle multiple branches at each level', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book' }));

      // Create 3 arcs
      for (let a = 1; a <= 3; a++) {
        const arc = repo.create(projectId, createMinimalStructure({ type: 'arc', title: `Arc ${a}`, parentId: book.id, order: a - 1 }));

        // Create 2 chapters per arc
        for (let c = 1; c <= 2; c++) {
          repo.create(projectId, createMinimalStructure({
            type: 'chapter',
            title: `Arc ${a} Chapter ${c}`,
            parentId: arc.id,
            order: c - 1
          }));
        }
      }

      const tree = repo.loadFullTree(projectId);

      expect(tree?.children).toHaveLength(3);
      expect(tree?.children[0].children).toHaveLength(2);
      expect(tree?.children[1].children).toHaveLength(2);
      expect(tree?.children[2].children).toHaveLength(2);
    });
  });

  describe('chapter-specific features', () => {
    it('should support all chapter types', () => {
      const chapterTypes = ['action', 'character', 'worldbuilding', 'dialogue', 'introspection', 'transition', 'climax', 'resolution'] as const;

      for (const chapterType of chapterTypes) {
        const chapter = repo.create(projectId, createMinimalStructure({
          type: 'chapter',
          title: `${chapterType} chapter`,
          chapterType,
        }));

        expect(chapter.chapterType).toBe(chapterType);
      }
    });

    it('should support all hook types', () => {
      const hookTypes = ['revelation', 'decision', 'cliffhanger', 'emotional', 'question', 'twist', 'promise'] as const;

      for (const hookType of hookTypes) {
        const chapter = repo.create(projectId, createMinimalStructure({
          type: 'chapter',
          title: `${hookType} hook chapter`,
          hook: { type: hookType, description: `A ${hookType} ending` },
        }));

        expect(chapter.hook?.type).toBe(hookType);
      }
    });

    it('should track tension targets at each level', () => {
      const book = repo.create(projectId, createMinimalStructure({ type: 'book', title: 'Book', tensionTarget: 50 }));
      const arc = repo.create(projectId, createMinimalStructure({ type: 'arc', title: 'Climax Arc', tensionTarget: 90, parentId: book.id }));
      const chapter = repo.create(projectId, createMinimalStructure({ type: 'chapter', title: 'Battle', tensionTarget: 95, parentId: arc.id }));
      const scene = repo.create(projectId, createMinimalStructure({ type: 'scene', title: 'Confrontation', tensionTarget: 100, parentId: chapter.id }));

      expect(book.tensionTarget).toBe(50);
      expect(arc.tensionTarget).toBe(90);
      expect(chapter.tensionTarget).toBe(95);
      expect(scene.tensionTarget).toBe(100);
    });
  });
});
