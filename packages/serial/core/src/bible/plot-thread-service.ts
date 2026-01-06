/**
 * Plot thread service for bible management
 *
 * Provides high-level CRUD operations for plot threads with
 * promise tracking and thread lifecycle management.
 */

import type {
  NarrativePromise,
  PlotThread,
  PlotThreadSummary,
  ThreadTouch,
} from '@repo/serial-types';

import type {
  CreatePlotThreadData,
  PlotThreadRepository,
  UpdatePlotThreadData,
} from '../storage/repositories';

/**
 * Plot thread service interface
 */
export interface PlotThreadService {
  /** Get a plot thread by ID */
  get(id: string): PlotThread | undefined;

  /** Get all plot threads */
  getAll(): PlotThread[];

  /** Get threads by type */
  getByType(type: PlotThread['type']): PlotThread[];

  /** Get threads by status */
  getByStatus(status: PlotThread['status']): PlotThread[];

  /** Get threads by scope */
  getByScope(scope: PlotThread['scope']): PlotThread[];

  /** Get active threads */
  getActive(): PlotThread[];

  /** Get unresolved threads (not resolved or abandoned) */
  getUnresolved(): PlotThread[];

  /** Search threads by name or description */
  search(query: string): PlotThread[];

  /** Find thread by exact name */
  findByName(name: string): PlotThread | undefined;

  /** Create a new plot thread */
  create(data: CreatePlotThreadData): PlotThread;

  /** Update a plot thread */
  update(id: string, data: UpdatePlotThreadData): PlotThread | undefined;

  /** Delete a plot thread */
  delete(id: string): boolean;

  /** Update thread status */
  setStatus(id: string, status: PlotThread['status']): PlotThread | undefined;

  /** Update priority */
  setPriority(id: string, priority: number): PlotThread | undefined;

  /** Get threads sorted by priority */
  getByPriority(): PlotThread[];

  /** Add a touch point */
  addTouch(id: string, touch: ThreadTouch): PlotThread | undefined;

  /** Remove a touch point */
  removeTouch(id: string, touchIndex: number): PlotThread | undefined;

  /** Add a narrative promise */
  addPromise(id: string, promise: Omit<NarrativePromise, 'id'>): PlotThread | undefined;

  /** Update a promise */
  updatePromise(id: string, promiseId: string, updates: Partial<NarrativePromise>): PlotThread | undefined;

  /** Mark a promise as fulfilled */
  fulfillPromise(
    id: string,
    promiseId: string,
    fulfilledAt: { contentId: string; chapterNumber?: number }
  ): PlotThread | undefined;

  /** Get unfulfilled promises */
  getUnfulfilledPromises(id: string): NarrativePromise[];

  /** Get all unfulfilled promises across all threads */
  getAllUnfulfilledPromises(): Array<{ thread: PlotThread; promise: NarrativePromise }>;

  /** Add involved character */
  addInvolvedCharacter(id: string, characterId: string): PlotThread | undefined;

  /** Remove involved character */
  removeInvolvedCharacter(id: string, characterId: string): PlotThread | undefined;

  /** Get threads involving a character */
  getByCharacter(characterId: string): PlotThread[];

  /** Add related location */
  addRelatedLocation(id: string, locationId: string): PlotThread | undefined;

  /** Remove related location */
  removeRelatedLocation(id: string, locationId: string): PlotThread | undefined;

  /** Get threads related to a location */
  getByLocation(locationId: string): PlotThread[];

  /** Set parent thread (create hierarchy) */
  setParent(id: string, parentId: string | undefined): PlotThread | undefined;

  /** Get child threads */
  getChildren(id: string): PlotThread[];

  /** Get thread hierarchy (ancestors) */
  getAncestors(id: string): PlotThread[];

  /** Mark thread as introduced */
  markIntroduced(id: string, contentId: string, chapterNumber?: number): PlotThread | undefined;

  /** Mark thread as resolved */
  markResolved(id: string, contentId: string, chapterNumber?: number): PlotThread | undefined;

  /** Get thread summary for context assembly */
  getSummary(id: string): PlotThreadSummary | undefined;

  /** Get all thread summaries */
  getAllSummaries(): PlotThreadSummary[];
}

/**
 * Create plot thread service
 */
export function createPlotThreadService(
  projectId: string,
  repository: PlotThreadRepository
): PlotThreadService {
  function toSummary(thread: PlotThread): PlotThreadSummary {
    const brief =
      thread.description.split('.')[0]?.trim() ||
      thread.description.substring(0, 100) + (thread.description.length > 100 ? '...' : '');

    return {
      id: thread.id,
      name: thread.name,
      type: thread.type,
      status: thread.status,
      priority: thread.priority,
      brief,
    };
  }

  function generatePromiseId(): string {
    return `promise_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  return {
    get(id: string): PlotThread | undefined {
      return repository.findById(projectId, id);
    },

    getAll(): PlotThread[] {
      return repository.findByProject(projectId);
    },

    getByType(type: PlotThread['type']): PlotThread[] {
      return repository.findByType(projectId, type);
    },

    getByStatus(status: PlotThread['status']): PlotThread[] {
      return repository.findByStatus(projectId, status);
    },

    getByScope(scope: PlotThread['scope']): PlotThread[] {
      return this.getAll().filter((t) => t.scope === scope);
    },

    getActive(): PlotThread[] {
      return repository.findByStatus(projectId, 'active');
    },

    getUnresolved(): PlotThread[] {
      return this.getAll().filter((t) => t.status !== 'resolved' && t.status !== 'abandoned');
    },

    search(query: string): PlotThread[] {
      const lowerQuery = query.toLowerCase();
      return this.getAll().filter(
        (t) =>
          t.name.toLowerCase().includes(lowerQuery) ||
          t.description.toLowerCase().includes(lowerQuery)
      );
    },

    findByName(name: string): PlotThread | undefined {
      return repository.findByName(projectId, name);
    },

    create(data: CreatePlotThreadData): PlotThread {
      return repository.create(projectId, data);
    },

    update(id: string, data: UpdatePlotThreadData): PlotThread | undefined {
      return repository.update(projectId, id, data);
    },

    delete(id: string): boolean {
      // Update child threads to remove parent reference
      const children = this.getChildren(id);
      for (const child of children) {
        this.setParent(child.id, undefined);
      }
      return repository.delete(projectId, id);
    },

    setStatus(id: string, status: PlotThread['status']): PlotThread | undefined {
      return this.update(id, { status });
    },

    setPriority(id: string, priority: number): PlotThread | undefined {
      const clampedPriority = Math.max(0, Math.min(100, priority));
      return this.update(id, { priority: clampedPriority });
    },

    getByPriority(): PlotThread[] {
      return [...this.getAll()].sort((a, b) => b.priority - a.priority);
    },

    addTouch(id: string, touch: ThreadTouch): PlotThread | undefined {
      const thread = this.get(id);
      if (!thread) return undefined;

      const touches = [...thread.touches, touch];
      return this.update(id, { touches });
    },

    removeTouch(id: string, touchIndex: number): PlotThread | undefined {
      const thread = this.get(id);
      if (!thread) return undefined;

      const touches = thread.touches.filter((_, i) => i !== touchIndex);
      return this.update(id, { touches });
    },

    addPromise(id: string, promise: Omit<NarrativePromise, 'id'>): PlotThread | undefined {
      const thread = this.get(id);
      if (!thread) return undefined;

      const fullPromise: NarrativePromise = {
        ...promise,
        id: generatePromiseId(),
      };

      const promises = [...thread.promises, fullPromise];
      return this.update(id, { promises });
    },

    updatePromise(
      id: string,
      promiseId: string,
      updates: Partial<NarrativePromise>
    ): PlotThread | undefined {
      const thread = this.get(id);
      if (!thread) return undefined;

      const promises = thread.promises.map((p) =>
        p.id === promiseId ? { ...p, ...updates } : p
      );
      return this.update(id, { promises });
    },

    fulfillPromise(
      id: string,
      promiseId: string,
      fulfilledAt: { contentId: string; chapterNumber?: number }
    ): PlotThread | undefined {
      return this.updatePromise(id, promiseId, {
        status: 'fulfilled',
        fulfilledAt,
      });
    },

    getUnfulfilledPromises(id: string): NarrativePromise[] {
      const thread = this.get(id);
      if (!thread) return [];
      return thread.promises.filter((p) => p.status === 'pending');
    },

    getAllUnfulfilledPromises(): Array<{ thread: PlotThread; promise: NarrativePromise }> {
      const result: Array<{ thread: PlotThread; promise: NarrativePromise }> = [];

      for (const thread of this.getAll()) {
        for (const promise of thread.promises) {
          if (promise.status === 'pending') {
            result.push({ thread, promise });
          }
        }
      }

      return result;
    },

    addInvolvedCharacter(id: string, characterId: string): PlotThread | undefined {
      const thread = this.get(id);
      if (!thread) return undefined;

      if (thread.involvedCharacters.includes(characterId)) {
        return thread;
      }

      const involvedCharacters = [...thread.involvedCharacters, characterId];
      return this.update(id, { involvedCharacters });
    },

    removeInvolvedCharacter(id: string, characterId: string): PlotThread | undefined {
      const thread = this.get(id);
      if (!thread) return undefined;

      const involvedCharacters = thread.involvedCharacters.filter((c) => c !== characterId);
      return this.update(id, { involvedCharacters });
    },

    getByCharacter(characterId: string): PlotThread[] {
      return this.getAll().filter((t) => t.involvedCharacters.includes(characterId));
    },

    addRelatedLocation(id: string, locationId: string): PlotThread | undefined {
      const thread = this.get(id);
      if (!thread) return undefined;

      if (thread.relatedLocations.includes(locationId)) {
        return thread;
      }

      const relatedLocations = [...thread.relatedLocations, locationId];
      return this.update(id, { relatedLocations });
    },

    removeRelatedLocation(id: string, locationId: string): PlotThread | undefined {
      const thread = this.get(id);
      if (!thread) return undefined;

      const relatedLocations = thread.relatedLocations.filter((l) => l !== locationId);
      return this.update(id, { relatedLocations });
    },

    getByLocation(locationId: string): PlotThread[] {
      return this.getAll().filter((t) => t.relatedLocations.includes(locationId));
    },

    setParent(id: string, parentId: string | undefined): PlotThread | undefined {
      const thread = this.get(id);
      if (!thread) return undefined;

      // Prevent circular references
      if (parentId) {
        const ancestors = this.getAncestors(parentId);
        if (ancestors.some((a) => a.id === id)) {
          return undefined;
        }

        // Update parent's childThreads
        const parent = this.get(parentId);
        if (parent && !parent.childThreads.includes(id)) {
          this.update(parentId, { childThreads: [...parent.childThreads, id] });
        }
      }

      // Remove from old parent's childThreads
      if (thread.parentThreadId && thread.parentThreadId !== parentId) {
        const oldParent = this.get(thread.parentThreadId);
        if (oldParent) {
          this.update(thread.parentThreadId, {
            childThreads: oldParent.childThreads.filter((c) => c !== id),
          });
        }
      }

      return this.update(id, { parentThreadId: parentId });
    },

    getChildren(id: string): PlotThread[] {
      const thread = this.get(id);
      if (!thread) return [];

      return thread.childThreads
        .map((childId) => this.get(childId))
        .filter((t): t is PlotThread => t !== undefined);
    },

    getAncestors(id: string): PlotThread[] {
      const ancestors: PlotThread[] = [];
      let current = this.get(id);

      while (current?.parentThreadId) {
        const parent = this.get(current.parentThreadId);
        if (parent) {
          ancestors.push(parent);
          current = parent;
        } else {
          break;
        }
      }

      return ancestors;
    },

    markIntroduced(id: string, contentId: string, chapterNumber?: number): PlotThread | undefined {
      return this.update(id, {
        introducedAt: { contentId, chapterNumber },
        status: 'active',
      });
    },

    markResolved(id: string, contentId: string, chapterNumber?: number): PlotThread | undefined {
      return this.update(id, {
        resolvedAt: { contentId, chapterNumber },
        status: 'resolved',
      });
    },

    getSummary(id: string): PlotThreadSummary | undefined {
      const thread = this.get(id);
      return thread ? toSummary(thread) : undefined;
    },

    getAllSummaries(): PlotThreadSummary[] {
      return this.getAll().map(toSummary);
    },
  };
}
