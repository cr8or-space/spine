/**
 * Tests for plot thread service
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createProjectService } from '../storage/project-service';
import {
  createPlotThreadRepository,
  type CreatePlotThreadData,
} from '../storage/repositories';
import { createPlotThreadService, type PlotThreadService } from './plot-thread-service';

describe('PlotThreadService', () => {
  let db: DatabaseConnection;
  let service: PlotThreadService;
  let projectId: string;

  beforeEach(() => {
    db = createTestDatabase();
    const projectService = createProjectService(db.db, db.drizzle);
    const project = projectService.createProject('Test Project', 'web-serial');
    projectId = project.id;

    const repository = createPlotThreadRepository(db.db, db.drizzle);
    service = createPlotThreadService(projectId, repository);
  });

  afterEach(() => {
    db.close();
  });

  const createTestThread = (overrides: Partial<CreatePlotThreadData> = {}): CreatePlotThreadData => ({
    name: 'Test Thread',
    description: 'A test plot thread.',
    type: 'subplot',
    status: 'planned',
    scope: 'arc',
    priority: 50,
    involvedCharacters: [],
    relatedLocations: [],
    promises: [],
    touches: [],
    childThreads: [],
    ...overrides,
  });

  describe('CRUD operations', () => {
    it('should create a plot thread', () => {
      const thread = service.create(createTestThread({
        name: 'Main Quest',
        type: 'main-plot',
      }));

      expect(thread.id).toBeDefined();
      expect(thread.name).toBe('Main Quest');
      expect(thread.type).toBe('main-plot');
    });

    it('should retrieve a plot thread by ID', () => {
      const created = service.create(createTestThread({ name: 'Quest' }));
      const retrieved = service.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Quest');
    });

    it('should return undefined for non-existent thread', () => {
      const result = service.get('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should update a plot thread', () => {
      const created = service.create(createTestThread({ name: 'Old Thread' }));
      const updated = service.update(created.id, { name: 'New Thread', priority: 80 });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('New Thread');
      expect(updated?.priority).toBe(80);
    });

    it('should delete a plot thread', () => {
      const created = service.create(createTestThread({ name: 'ToDelete' }));
      const deleted = service.delete(created.id);

      expect(deleted).toBe(true);
      expect(service.get(created.id)).toBeUndefined();
    });

    it('should get all threads', () => {
      service.create(createTestThread({ name: 'Thread1' }));
      service.create(createTestThread({ name: 'Thread2' }));
      service.create(createTestThread({ name: 'Thread3' }));

      const all = service.getAll();
      expect(all.length).toBe(3);
    });
  });

  describe('filtering by type', () => {
    beforeEach(() => {
      service.create(createTestThread({ name: 'Main', type: 'main-plot' }));
      service.create(createTestThread({ name: 'Sub', type: 'subplot' }));
      service.create(createTestThread({ name: 'Mystery', type: 'mystery' }));
      service.create(createTestThread({ name: 'Romance', type: 'romance' }));
      service.create(createTestThread({ name: 'Arc', type: 'character-arc' }));
    });

    it('should get main plot threads', () => {
      const main = service.getByType('main-plot');
      expect(main.length).toBe(1);
      expect(main[0].name).toBe('Main');
    });

    it('should get subplot threads', () => {
      const sub = service.getByType('subplot');
      expect(sub.length).toBe(1);
      expect(sub[0].name).toBe('Sub');
    });

    it('should get mystery threads', () => {
      const mystery = service.getByType('mystery');
      expect(mystery.length).toBe(1);
      expect(mystery[0].name).toBe('Mystery');
    });

    it('should get character arc threads', () => {
      const arcs = service.getByType('character-arc');
      expect(arcs.length).toBe(1);
      expect(arcs[0].name).toBe('Arc');
    });
  });

  describe('filtering by status', () => {
    beforeEach(() => {
      service.create(createTestThread({ name: 'Planned', status: 'planned' }));
      service.create(createTestThread({ name: 'Active', status: 'active' }));
      service.create(createTestThread({ name: 'Dormant', status: 'dormant' }));
      service.create(createTestThread({ name: 'Resolved', status: 'resolved' }));
      service.create(createTestThread({ name: 'Abandoned', status: 'abandoned' }));
    });

    it('should get planned threads', () => {
      const planned = service.getByStatus('planned');
      expect(planned.length).toBe(1);
      expect(planned[0].name).toBe('Planned');
    });

    it('should get active threads', () => {
      const active = service.getActive();
      expect(active.length).toBe(1);
      expect(active[0].name).toBe('Active');
    });

    it('should get dormant threads', () => {
      const dormant = service.getByStatus('dormant');
      expect(dormant.length).toBe(1);
      expect(dormant[0].name).toBe('Dormant');
    });

    it('should get resolved threads', () => {
      const resolved = service.getByStatus('resolved');
      expect(resolved.length).toBe(1);
      expect(resolved[0].name).toBe('Resolved');
    });

    it('should get unresolved threads', () => {
      const unresolved = service.getUnresolved();
      expect(unresolved.length).toBe(3); // planned, active, dormant
    });
  });

  describe('filtering by scope', () => {
    beforeEach(() => {
      service.create(createTestThread({ name: 'Scene Scope', scope: 'scene' }));
      service.create(createTestThread({ name: 'Chapter Scope', scope: 'chapter' }));
      service.create(createTestThread({ name: 'Arc Scope', scope: 'arc' }));
      service.create(createTestThread({ name: 'Book Scope', scope: 'book' }));
      service.create(createTestThread({ name: 'Series Scope', scope: 'series' }));
    });

    it('should get scene scope threads', () => {
      const scene = service.getByScope('scene');
      expect(scene.length).toBe(1);
      expect(scene[0].name).toBe('Scene Scope');
    });

    it('should get arc scope threads', () => {
      const arc = service.getByScope('arc');
      expect(arc.length).toBe(1);
      expect(arc[0].name).toBe('Arc Scope');
    });

    it('should get series scope threads', () => {
      const series = service.getByScope('series');
      expect(series.length).toBe(1);
      expect(series[0].name).toBe('Series Scope');
    });
  });

  describe('search and find', () => {
    beforeEach(() => {
      service.create(createTestThread({
        name: 'Dragon Quest',
        description: 'Find the ancient dragon.',
      }));
      service.create(createTestThread({
        name: 'Love Triangle',
        description: 'Romantic subplot.',
      }));
    });

    it('should find by exact name', () => {
      const result = service.findByName('Dragon Quest');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Dragon Quest');
    });

    it('should search by name', () => {
      const results = service.search('Dragon');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Dragon Quest');
    });

    it('should search by description', () => {
      const results = service.search('romantic');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Love Triangle');
    });
  });

  describe('status and priority management', () => {
    it('should set status', () => {
      const thread = service.create(createTestThread({ name: 'Thread', status: 'planned' }));
      const updated = service.setStatus(thread.id, 'active');

      expect(updated?.status).toBe('active');
    });

    it('should set priority', () => {
      const thread = service.create(createTestThread({ name: 'Thread', priority: 50 }));
      const updated = service.setPriority(thread.id, 75);

      expect(updated?.priority).toBe(75);
    });

    it('should clamp priority to 0-100', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));

      const tooLow = service.setPriority(thread.id, -10);
      expect(tooLow?.priority).toBe(0);

      const tooHigh = service.setPriority(thread.id, 150);
      expect(tooHigh?.priority).toBe(100);
    });

    it('should get threads sorted by priority', () => {
      service.create(createTestThread({ name: 'Low', priority: 20 }));
      service.create(createTestThread({ name: 'High', priority: 80 }));
      service.create(createTestThread({ name: 'Medium', priority: 50 }));

      const sorted = service.getByPriority();
      expect(sorted[0].name).toBe('High');
      expect(sorted[1].name).toBe('Medium');
      expect(sorted[2].name).toBe('Low');
    });
  });

  describe('touch management', () => {
    it('should add a touch', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      const updated = service.addTouch(thread.id, {
        contentId: 'chapter-1',
        type: 'development',
        description: 'Plot advances',
      });

      expect(updated?.touches.length).toBe(1);
      expect(updated?.touches[0].contentId).toBe('chapter-1');
    });

    it('should add multiple touches', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      service.addTouch(thread.id, {
        contentId: 'chapter-1',
        type: 'introduction',
        description: 'Introduce thread',
      });
      const updated = service.addTouch(thread.id, {
        contentId: 'chapter-2',
        type: 'development',
        description: 'Plot advances',
      });

      expect(updated?.touches.length).toBe(2);
    });

    it('should remove a touch', () => {
      const thread = service.create(createTestThread({
        name: 'Thread',
        touches: [
          { contentId: 'ch-1', type: 'introduction', description: 'S1' },
          { contentId: 'ch-2', type: 'development', description: 'S2' },
          { contentId: 'ch-3', type: 'resolution', description: 'S3' },
        ],
      }));
      const updated = service.removeTouch(thread.id, 1);

      expect(updated?.touches.length).toBe(2);
      expect(updated?.touches[0].contentId).toBe('ch-1');
      expect(updated?.touches[1].contentId).toBe('ch-3');
    });
  });

  describe('promise management', () => {
    it('should add a promise', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      const updated = service.addPromise(thread.id, {
        description: 'Hero will confront villain',
        madeAt: { contentId: 'chapter-1' },
        expectedPayoff: 'long-term',
        status: 'pending',
      });

      expect(updated?.promises.length).toBe(1);
      expect(updated?.promises[0].description).toBe('Hero will confront villain');
      expect(updated?.promises[0].id).toBeDefined();
    });

    it('should update a promise', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      const withPromise = service.addPromise(thread.id, {
        description: 'Original',
        madeAt: { contentId: 'chapter-1' },
        expectedPayoff: 'short-term',
        status: 'pending',
      });
      const promiseId = withPromise!.promises[0].id;

      const updated = service.updatePromise(thread.id, promiseId, {
        description: 'Updated description',
      });

      expect(updated?.promises[0].description).toBe('Updated description');
    });

    it('should fulfill a promise', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      const withPromise = service.addPromise(thread.id, {
        description: 'Promise',
        madeAt: { contentId: 'chapter-1' },
        expectedPayoff: 'long-term',
        status: 'pending',
      });
      const promiseId = withPromise!.promises[0].id;

      const updated = service.fulfillPromise(thread.id, promiseId, {
        contentId: 'chapter-10',
        chapterNumber: 10,
      });

      expect(updated?.promises[0].status).toBe('fulfilled');
      expect(updated?.promises[0].fulfilledAt?.contentId).toBe('chapter-10');
    });

    it('should get unfulfilled promises for a thread', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      service.addPromise(thread.id, {
        description: 'Pending 1',
        madeAt: { contentId: 'ch-1' },
        expectedPayoff: 'short-term',
        status: 'pending',
      });
      service.addPromise(thread.id, {
        description: 'Pending 2',
        madeAt: { contentId: 'ch-2' },
        expectedPayoff: 'long-term',
        status: 'pending',
      });

      // Fulfill one promise
      const updated = service.get(thread.id)!;
      service.fulfillPromise(thread.id, updated.promises[0].id, { contentId: 'ch-5' });

      const unfulfilled = service.getUnfulfilledPromises(thread.id);
      expect(unfulfilled.length).toBe(1);
      expect(unfulfilled[0].description).toBe('Pending 2');
    });

    it('should get all unfulfilled promises across threads', () => {
      const thread1 = service.create(createTestThread({ name: 'Thread1' }));
      const thread2 = service.create(createTestThread({ name: 'Thread2' }));

      service.addPromise(thread1.id, {
        description: 'Promise 1',
        madeAt: { contentId: 'ch-1' },
        expectedPayoff: 'short-term',
        status: 'pending',
      });
      service.addPromise(thread2.id, {
        description: 'Promise 2',
        madeAt: { contentId: 'ch-2' },
        expectedPayoff: 'long-term',
        status: 'pending',
      });

      const allUnfulfilled = service.getAllUnfulfilledPromises();
      expect(allUnfulfilled.length).toBe(2);
    });
  });

  describe('character management', () => {
    it('should add an involved character', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      const updated = service.addInvolvedCharacter(thread.id, 'char-123');

      expect(updated?.involvedCharacters).toContain('char-123');
    });

    it('should not duplicate character', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      service.addInvolvedCharacter(thread.id, 'char-123');
      const updated = service.addInvolvedCharacter(thread.id, 'char-123');

      expect(updated?.involvedCharacters.filter(c => c === 'char-123').length).toBe(1);
    });

    it('should remove an involved character', () => {
      const thread = service.create(createTestThread({
        name: 'Thread',
        involvedCharacters: ['char-123', 'char-456'],
      }));
      const updated = service.removeInvolvedCharacter(thread.id, 'char-123');

      expect(updated?.involvedCharacters).not.toContain('char-123');
      expect(updated?.involvedCharacters).toContain('char-456');
    });

    it('should get threads by character', () => {
      service.create(createTestThread({
        name: 'Thread1',
        involvedCharacters: ['char-123'],
      }));
      service.create(createTestThread({
        name: 'Thread2',
        involvedCharacters: ['char-123'],
      }));
      service.create(createTestThread({
        name: 'Thread3',
        involvedCharacters: ['char-456'],
      }));

      const threads = service.getByCharacter('char-123');
      expect(threads.length).toBe(2);
    });
  });

  describe('location management', () => {
    it('should add a related location', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      const updated = service.addRelatedLocation(thread.id, 'loc-123');

      expect(updated?.relatedLocations).toContain('loc-123');
    });

    it('should not duplicate location', () => {
      const thread = service.create(createTestThread({ name: 'Thread' }));
      service.addRelatedLocation(thread.id, 'loc-123');
      const updated = service.addRelatedLocation(thread.id, 'loc-123');

      expect(updated?.relatedLocations.filter(l => l === 'loc-123').length).toBe(1);
    });

    it('should remove a related location', () => {
      const thread = service.create(createTestThread({
        name: 'Thread',
        relatedLocations: ['loc-123', 'loc-456'],
      }));
      const updated = service.removeRelatedLocation(thread.id, 'loc-123');

      expect(updated?.relatedLocations).not.toContain('loc-123');
      expect(updated?.relatedLocations).toContain('loc-456');
    });

    it('should get threads by location', () => {
      service.create(createTestThread({
        name: 'Thread1',
        relatedLocations: ['loc-123'],
      }));
      service.create(createTestThread({
        name: 'Thread2',
        relatedLocations: ['loc-123'],
      }));
      service.create(createTestThread({
        name: 'Thread3',
        relatedLocations: ['loc-456'],
      }));

      const threads = service.getByLocation('loc-123');
      expect(threads.length).toBe(2);
    });
  });

  describe('hierarchy management', () => {
    it('should set parent thread', () => {
      const parent = service.create(createTestThread({ name: 'Parent' }));
      const child = service.create(createTestThread({ name: 'Child' }));

      const updated = service.setParent(child.id, parent.id);

      expect(updated?.parentThreadId).toBe(parent.id);

      // Verify parent's childThreads updated
      const parentUpdated = service.get(parent.id);
      expect(parentUpdated?.childThreads).toContain(child.id);
    });

    it('should prevent circular references', () => {
      const parent = service.create(createTestThread({ name: 'Parent' }));
      const child = service.create(createTestThread({ name: 'Child' }));

      service.setParent(child.id, parent.id);
      const result = service.setParent(parent.id, child.id);

      expect(result).toBeUndefined();
    });

    it('should get children', () => {
      const parent = service.create(createTestThread({ name: 'Parent' }));
      const child1 = service.create(createTestThread({ name: 'Child1' }));
      const child2 = service.create(createTestThread({ name: 'Child2' }));

      service.setParent(child1.id, parent.id);
      service.setParent(child2.id, parent.id);

      const children = service.getChildren(parent.id);
      expect(children.length).toBe(2);
    });

    it('should get ancestors', () => {
      const grandparent = service.create(createTestThread({ name: 'Grandparent' }));
      const parent = service.create(createTestThread({ name: 'Parent' }));
      const child = service.create(createTestThread({ name: 'Child' }));

      service.setParent(parent.id, grandparent.id);
      service.setParent(child.id, parent.id);

      const ancestors = service.getAncestors(child.id);
      expect(ancestors.length).toBe(2);
      expect(ancestors[0].name).toBe('Parent');
      expect(ancestors[1].name).toBe('Grandparent');
    });

    it('should clean up child references when deleting parent', () => {
      const parent = service.create(createTestThread({ name: 'Parent' }));
      const child = service.create(createTestThread({ name: 'Child' }));

      service.setParent(child.id, parent.id);
      service.delete(parent.id);

      const childUpdated = service.get(child.id);
      expect(childUpdated?.parentThreadId).toBeUndefined();
    });
  });

  describe('introduction and resolution marking', () => {
    it('should mark thread as introduced', () => {
      const thread = service.create(createTestThread({ name: 'Thread', status: 'planned' }));
      const updated = service.markIntroduced(thread.id, 'chapter-5', 5);

      expect(updated?.introducedAt?.contentId).toBe('chapter-5');
      expect(updated?.introducedAt?.chapterNumber).toBe(5);
      expect(updated?.status).toBe('active');
    });

    it('should mark thread as resolved', () => {
      const thread = service.create(createTestThread({ name: 'Thread', status: 'active' }));
      const updated = service.markResolved(thread.id, 'chapter-20', 20);

      expect(updated?.resolvedAt?.contentId).toBe('chapter-20');
      expect(updated?.resolvedAt?.chapterNumber).toBe(20);
      expect(updated?.status).toBe('resolved');
    });
  });

  describe('summaries', () => {
    it('should get a thread summary', () => {
      const thread = service.create(createTestThread({
        name: 'Dragon Quest',
        type: 'main-plot',
        status: 'active',
        priority: 80,
        description: 'Find the ancient dragon. It holds the key to everything.',
      }));

      const summary = service.getSummary(thread.id);

      expect(summary).toBeDefined();
      expect(summary?.id).toBe(thread.id);
      expect(summary?.name).toBe('Dragon Quest');
      expect(summary?.type).toBe('main-plot');
      expect(summary?.status).toBe('active');
      expect(summary?.priority).toBe(80);
      expect(summary?.brief).toBe('Find the ancient dragon');
    });

    it('should return undefined for non-existent thread summary', () => {
      const summary = service.getSummary('non-existent');
      expect(summary).toBeUndefined();
    });

    it('should get all summaries', () => {
      service.create(createTestThread({ name: 'Thread1' }));
      service.create(createTestThread({ name: 'Thread2' }));
      service.create(createTestThread({ name: 'Thread3' }));

      const summaries = service.getAllSummaries();
      expect(summaries.length).toBe(3);
    });
  });
});
