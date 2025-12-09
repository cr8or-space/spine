/**
 * Structure service tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { Hook } from '@repo/types';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createStructureRepository, type StructureRepository } from '../storage/repositories';
import { createStructureService, type StructureService } from './structure-service';

describe('StructureService', () => {
  let db: DatabaseConnection;
  let repo: StructureRepository;
  let service: StructureService;
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
    service = createStructureService(projectId, repo);
  });

  afterEach(() => {
    db.close();
  });

  describe('Basic CRUD', () => {
    it('should create and get a structure', () => {
      const created = service.create({
        type: 'book',
        title: 'My Novel',
        summary: 'An epic story',
        beats: [],
        order: 0,
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('My Novel');

      const retrieved = service.get(created.id);
      expect(retrieved?.title).toBe('My Novel');
    });

    it('should get all structures', () => {
      service.create({ type: 'book', title: 'Book 1', summary: '', beats: [], order: 0 });
      service.create({ type: 'book', title: 'Book 2', summary: '', beats: [], order: 1 });

      const all = service.getAll();
      expect(all).toHaveLength(2);
    });

    it('should get structures by type', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      service.create({ type: 'arc', title: 'Arc 1', summary: '', beats: [], order: 0, parentId: book.id });
      service.create({ type: 'chapter', title: 'Chapter 1', summary: '', beats: [], order: 0, parentId: book.id });

      const arcs = service.getByType('arc');
      expect(arcs).toHaveLength(1);
      expect(arcs[0].title).toBe('Arc 1');
    });

    it('should update a structure', () => {
      const created = service.create({ type: 'book', title: 'Original', summary: '', beats: [], order: 0 });

      const updated = service.update(created.id, { title: 'Updated', summary: 'New summary' });

      expect(updated?.title).toBe('Updated');
      expect(updated?.summary).toBe('New summary');
    });

    it('should delete a structure and descendants', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      const arc = service.create({ type: 'arc', title: 'Arc', summary: '', beats: [], order: 0, parentId: book.id });
      service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0, parentId: arc.id });

      const deleted = service.delete(book.id);
      expect(deleted).toBe(true);

      expect(service.getAll()).toHaveLength(0);
    });
  });

  describe('Tree operations', () => {
    it('should get root structure', () => {
      const book = service.create({ type: 'book', title: 'Root Book', summary: '', beats: [], order: 0 });
      service.create({ type: 'arc', title: 'Arc', summary: '', beats: [], order: 0, parentId: book.id });

      const root = service.getRoot();
      expect(root?.title).toBe('Root Book');
    });

    it('should get full tree with children loaded', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      const arc = service.create({ type: 'arc', title: 'Arc', summary: '', beats: [], order: 0, parentId: book.id });
      service.create({ type: 'chapter', title: 'Chapter 1', summary: '', beats: [], order: 0, parentId: arc.id });
      service.create({ type: 'chapter', title: 'Chapter 2', summary: '', beats: [], order: 1, parentId: arc.id });

      const tree = service.getFullTree();

      expect(tree?.title).toBe('Book');
      expect(tree?.children).toHaveLength(1);
      expect(tree?.children[0].title).toBe('Arc');
      expect(tree?.children[0].children).toHaveLength(2);
    });

    it('should get children of a structure', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      service.create({ type: 'arc', title: 'Arc 1', summary: '', beats: [], order: 0, parentId: book.id });
      service.create({ type: 'arc', title: 'Arc 2', summary: '', beats: [], order: 1, parentId: book.id });

      const children = service.getChildren(book.id);
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.title)).toEqual(['Arc 1', 'Arc 2']);
    });

    it('should get ancestors of a structure', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      const arc = service.create({ type: 'arc', title: 'Arc', summary: '', beats: [], order: 0, parentId: book.id });
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0, parentId: arc.id });

      const ancestors = service.getAncestors(chapter.id);

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].title).toBe('Arc'); // Parent first
      expect(ancestors[1].title).toBe('Book'); // Grandparent second
    });

    it('should get descendants of a structure', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      const arc = service.create({ type: 'arc', title: 'Arc', summary: '', beats: [], order: 0, parentId: book.id });
      service.create({ type: 'chapter', title: 'Chapter 1', summary: '', beats: [], order: 0, parentId: arc.id });
      service.create({ type: 'chapter', title: 'Chapter 2', summary: '', beats: [], order: 1, parentId: arc.id });

      const descendants = service.getDescendants(book.id);

      expect(descendants).toHaveLength(3); // arc + 2 chapters
    });

    it('should move a structure to a new parent', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      const arc1 = service.create({ type: 'arc', title: 'Arc 1', summary: '', beats: [], order: 0, parentId: book.id });
      const arc2 = service.create({ type: 'arc', title: 'Arc 2', summary: '', beats: [], order: 1, parentId: book.id });
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0, parentId: arc1.id });

      // Move chapter from Arc 1 to Arc 2
      const moved = service.move(chapter.id, arc2.id, 0);

      expect(moved?.parentId).toBe(arc2.id);
      expect(service.getChildren(arc1.id)).toHaveLength(0);
      expect(service.getChildren(arc2.id)).toHaveLength(1);
    });

    it('should prevent moving structure into its descendant', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      const arc = service.create({ type: 'arc', title: 'Arc', summary: '', beats: [], order: 0, parentId: book.id });
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0, parentId: arc.id });

      // Try to move book into its descendant chapter - should fail
      // Note: This is actually an invalid parent-child relationship anyway
      const moved = service.move(book.id, chapter.id, 0);
      expect(moved).toBeUndefined();
    });

    it('should reorder children', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      const arc1 = service.create({ type: 'arc', title: 'Arc A', summary: '', beats: [], order: 0, parentId: book.id });
      const arc2 = service.create({ type: 'arc', title: 'Arc B', summary: '', beats: [], order: 1, parentId: book.id });
      const arc3 = service.create({ type: 'arc', title: 'Arc C', summary: '', beats: [], order: 2, parentId: book.id });

      // Reorder to C, A, B
      service.reorder(book.id, [arc3.id, arc1.id, arc2.id]);

      const children = service.getChildren(book.id);
      expect(children.map((c) => c.title)).toEqual(['Arc C', 'Arc A', 'Arc B']);
    });
  });

  describe('Beat management', () => {
    it('should add a beat to a structure', () => {
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0 });

      const updated = service.addBeat(chapter.id, 'Opening hook to grab attention');

      expect(updated?.beats).toHaveLength(1);
      expect(updated?.beats[0].description).toBe('Opening hook to grab attention');
      expect(updated?.beats[0].completed).toBe(false);
      expect(updated?.beats[0].id).toBeDefined();
    });

    it('should add beat with target word count', () => {
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0 });

      const updated = service.addBeat(chapter.id, 'Action sequence', 1500);

      expect(updated?.beats[0].targetWordCount).toBe(1500);
    });

    it('should update a beat', () => {
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0 });
      const withBeat = service.addBeat(chapter.id, 'Original description');
      const beatId = withBeat!.beats[0].id;

      const updated = service.updateBeat(chapter.id, beatId, {
        description: 'Updated description',
        targetWordCount: 500,
      });

      expect(updated?.beats[0].description).toBe('Updated description');
      expect(updated?.beats[0].targetWordCount).toBe(500);
    });

    it('should remove a beat', () => {
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0 });
      service.addBeat(chapter.id, 'Beat 1');
      const withBeats = service.addBeat(chapter.id, 'Beat 2');
      const beatId = withBeats!.beats[0].id;

      const updated = service.removeBeat(chapter.id, beatId);

      expect(updated?.beats).toHaveLength(1);
      expect(updated?.beats[0].description).toBe('Beat 2');
    });

    it('should mark beat as completed', () => {
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0 });
      const withBeat = service.addBeat(chapter.id, 'Write the opening');
      const beatId = withBeat!.beats[0].id;

      const updated = service.markBeatCompleted(chapter.id, beatId, true);

      expect(updated?.beats[0].completed).toBe(true);
    });

    it('should reorder beats', () => {
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0 });
      service.addBeat(chapter.id, 'Beat A');
      service.addBeat(chapter.id, 'Beat B');
      const withBeats = service.addBeat(chapter.id, 'Beat C');

      const beatIds = withBeats!.beats.map((b) => b.id);
      // Reverse order: C, B, A
      const reordered = service.reorderBeats(chapter.id, [beatIds[2], beatIds[1], beatIds[0]]);

      expect(reordered?.beats.map((b) => b.description)).toEqual(['Beat C', 'Beat B', 'Beat A']);
      expect(reordered?.beats.map((b) => b.order)).toEqual([0, 1, 2]);
    });
  });

  describe('Hook management', () => {
    it('should set hook on a structure', () => {
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0 });

      const hook: Hook = {
        type: 'cliffhanger',
        description: 'Hero falls off the cliff',
        targetStrength: 90,
      };

      const updated = service.setHook(chapter.id, hook);

      expect(updated?.hook?.type).toBe('cliffhanger');
      expect(updated?.hook?.description).toBe('Hero falls off the cliff');
      expect(updated?.hook?.targetStrength).toBe(90);
    });

    it('should remove hook', () => {
      const chapter = service.create({
        type: 'chapter',
        title: 'Chapter',
        summary: '',
        beats: [],
        order: 0,
        hook: { type: 'revelation', description: 'Secret revealed' },
      });

      const updated = service.setHook(chapter.id, undefined);

      expect(updated?.hook).toBeUndefined();
    });

    it('should find structures needing hooks', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      service.create({
        type: 'chapter',
        title: 'Chapter with hook',
        summary: '',
        beats: [],
        order: 0,
        parentId: book.id,
        hook: { type: 'cliffhanger', description: 'Cliffhanger' },
      });
      service.create({
        type: 'chapter',
        title: 'Chapter without hook',
        summary: '',
        beats: [],
        order: 1,
        parentId: book.id,
      });
      service.create({
        type: 'chapter',
        title: 'Another without hook',
        summary: '',
        beats: [],
        order: 2,
        parentId: book.id,
      });

      const needingHooks = service.getStructuresNeedingHooks();

      expect(needingHooks).toHaveLength(2);
      expect(needingHooks.map((s) => s.title)).toContain('Chapter without hook');
      expect(needingHooks.map((s) => s.title)).toContain('Another without hook');
    });
  });

  describe('Tension management', () => {
    it('should set tension target', () => {
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0 });

      const updated = service.setTensionTarget(chapter.id, 75);

      expect(updated?.tensionTarget).toBe(75);
    });

    it('should get tension curve', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      service.create({
        type: 'chapter',
        title: 'Setup',
        summary: '',
        beats: [],
        order: 0,
        parentId: book.id,
        tensionTarget: 30,
      });
      service.create({
        type: 'chapter',
        title: 'Rising Action',
        summary: '',
        beats: [],
        order: 1,
        parentId: book.id,
        tensionTarget: 60,
      });
      service.create({
        type: 'chapter',
        title: 'Climax',
        summary: '',
        beats: [],
        order: 2,
        parentId: book.id,
        tensionTarget: 95,
      });

      const curve = service.getTensionCurve();

      expect(curve).toHaveLength(3);
      expect(curve.map((c) => c.tensionTarget)).toEqual([30, 60, 95]);
    });
  });

  describe('Chapter type management', () => {
    it('should set chapter type', () => {
      const chapter = service.create({ type: 'chapter', title: 'Chapter', summary: '', beats: [], order: 0 });

      const updated = service.setChapterType(chapter.id, 'action');

      expect(updated?.chapterType).toBe('action');
    });

    it('should get chapter type distribution', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      service.create({ type: 'chapter', title: 'Ch 1', summary: '', beats: [], order: 0, parentId: book.id, chapterType: 'action' });
      service.create({ type: 'chapter', title: 'Ch 2', summary: '', beats: [], order: 1, parentId: book.id, chapterType: 'character' });
      service.create({ type: 'chapter', title: 'Ch 3', summary: '', beats: [], order: 2, parentId: book.id, chapterType: 'action' });
      service.create({ type: 'chapter', title: 'Ch 4', summary: '', beats: [], order: 3, parentId: book.id, chapterType: 'worldbuilding' });

      const distribution = service.getChapterTypeDistribution();

      expect(distribution.action).toBe(2);
      expect(distribution.character).toBe(1);
      expect(distribution.worldbuilding).toBe(1);
      expect(distribution.dialogue).toBe(0);
    });
  });

  describe('Summaries and stats', () => {
    it('should get structure summary', () => {
      const chapter = service.create({
        type: 'chapter',
        title: 'Epic Chapter',
        summary: 'An exciting chapter',
        beats: [
          { id: 'beat-1', description: 'Beat 1', completed: true, order: 0 },
          { id: 'beat-2', description: 'Beat 2', completed: false, order: 1 },
        ],
        tensionTarget: 80,
        chapterType: 'climax',
        hook: { type: 'revelation', description: 'Big reveal' },
        order: 0,
      });

      const summary = service.getSummary(chapter.id);

      expect(summary?.title).toBe('Epic Chapter');
      expect(summary?.tensionTarget).toBe(80);
      expect(summary?.chapterType).toBe('climax');
      expect(summary?.hasHook).toBe(true);
      expect(summary?.beatCount).toBe(2);
      expect(summary?.completedBeats).toBe(1);
    });

    it('should get all refs', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      service.create({ type: 'arc', title: 'Arc', summary: '', beats: [], order: 0, parentId: book.id });

      const refs = service.getAllRefs();

      expect(refs).toHaveLength(2);
      expect(refs[0]).toHaveProperty('id');
      expect(refs[0]).toHaveProperty('type');
      expect(refs[0]).toHaveProperty('title');
      expect(refs[0]).toHaveProperty('order');
    });

    it('should get stats', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });
      const arc = service.create({ type: 'arc', title: 'Arc', summary: '', beats: [], order: 0, parentId: book.id });
      service.create({
        type: 'chapter',
        title: 'Chapter 1',
        summary: '',
        beats: [
          { id: 'b1', description: 'Beat 1', completed: true, order: 0 },
          { id: 'b2', description: 'Beat 2', completed: false, order: 1 },
        ],
        order: 0,
        parentId: arc.id,
        tensionTarget: 50,
        hook: { type: 'cliffhanger', description: 'Cliffhanger' },
        targetWordCount: 3000,
      });
      service.create({
        type: 'chapter',
        title: 'Chapter 2',
        summary: '',
        beats: [{ id: 'b3', description: 'Beat 3', completed: false, order: 0 }],
        order: 1,
        parentId: arc.id,
        targetWordCount: 2500,
      });
      service.create({ type: 'scene', title: 'Scene 1', summary: '', beats: [], order: 0, parentId: arc.id });

      const stats = service.getStats();

      expect(stats.bookCount).toBe(1);
      expect(stats.arcCount).toBe(1);
      expect(stats.chapterCount).toBe(2);
      expect(stats.sceneCount).toBe(1);
      expect(stats.totalBeats).toBe(3);
      expect(stats.completedBeats).toBe(1);
      expect(stats.totalTargetWordCount).toBe(5500);
      expect(stats.chaptersWithHooks).toBe(1);
      expect(stats.chaptersWithTensionTargets).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should validate parent-child relationships', () => {
      expect(service.isValidParentChild(null, 'book')).toBe(true);
      expect(service.isValidParentChild(null, 'arc')).toBe(false);
      expect(service.isValidParentChild('book', 'arc')).toBe(true);
      expect(service.isValidParentChild('book', 'chapter')).toBe(true);
      expect(service.isValidParentChild('arc', 'chapter')).toBe(true);
      expect(service.isValidParentChild('chapter', 'scene')).toBe(true);
      expect(service.isValidParentChild('scene', 'chapter')).toBe(false);
      expect(service.isValidParentChild('chapter', 'arc')).toBe(false);
    });

    it('should validate tree and report issues', () => {
      const book = service.create({ type: 'book', title: 'Book', summary: '', beats: [], order: 0 });

      // Create a chapter without a hook (should be flagged)
      service.create({
        type: 'chapter',
        title: 'Chapter without hook',
        summary: '',
        beats: [],
        order: 0,
        parentId: book.id,
      });

      // Create a structure with empty title
      service.create({
        type: 'chapter',
        title: '',
        summary: '',
        beats: [],
        order: 1,
        parentId: book.id,
      });

      const issues = service.validateTree();

      expect(issues.length).toBeGreaterThanOrEqual(2);
      expect(issues.some((i) => i.issue.includes('missing hook'))).toBe(true);
      expect(issues.some((i) => i.issue.includes('Empty title'))).toBe(true);
    });
  });

  describe('Search', () => {
    it('should find structures by title', () => {
      service.create({ type: 'book', title: 'The Great Adventure', summary: '', beats: [], order: 0 });
      service.create({ type: 'book', title: 'A Small Story', summary: '', beats: [], order: 1 });
      service.create({ type: 'book', title: 'Another Great Tale', summary: '', beats: [], order: 2 });

      const results = service.findByTitle('great');

      expect(results).toHaveLength(2);
      expect(results.map((s) => s.title)).toContain('The Great Adventure');
      expect(results.map((s) => s.title)).toContain('Another Great Tale');
    });

    it('should be case insensitive', () => {
      service.create({ type: 'chapter', title: 'IMPORTANT CHAPTER', summary: '', beats: [], order: 0 });

      const results = service.findByTitle('important');

      expect(results).toHaveLength(1);
    });
  });
});
