/**
 * Structure service for managing the story outline hierarchy
 *
 * Provides high-level operations for managing the structure tree:
 * Book -> Arc -> Chapter -> Scene
 *
 * Handles beat management, hook specification, tension targets,
 * reordering, and tree traversal operations.
 */

import type {
  Beat,
  ChapterType,
  Hook,
  Structure,
  StructureRef,
  StructureType,
} from '@repo/serial-types';

import type {
  CreateStructureData,
  StructureRepository,
  UpdateStructureData,
} from '../storage/repositories';

import { generateId } from '../storage/repository';

/**
 * Summary information about a structure node
 */
export interface StructureSummary {
  id: string;
  type: StructureType;
  title: string;
  summary: string;
  tensionTarget?: number;
  chapterType?: ChapterType;
  hasHook: boolean;
  beatCount: number;
  childCount: number;
  completedBeats: number;
  order: number;
}

/**
 * Statistics about the structure tree
 */
export interface StructureStats {
  bookCount: number;
  arcCount: number;
  chapterCount: number;
  sceneCount: number;
  totalBeats: number;
  completedBeats: number;
  totalTargetWordCount: number;
  chaptersWithHooks: number;
  chaptersWithTensionTargets: number;
}

/**
 * Valid child types for each structure type
 */
const VALID_CHILD_TYPES: Record<StructureType, StructureType[]> = {
  book: ['arc', 'chapter'], // Books can contain arcs or chapters directly
  arc: ['chapter'],
  chapter: ['scene'],
  scene: [], // Scenes are leaf nodes
};

/**
 * Structure service interface
 */
export interface StructureService {
  // Basic CRUD
  /** Get a structure by ID */
  get(id: string): Structure | undefined;

  /** Get a structure with all its children loaded recursively */
  getWithChildren(id: string): Structure | undefined;

  /** Get all structures in the project (flat list) */
  getAll(): Structure[];

  /** Get structures by type */
  getByType(type: StructureType): Structure[];

  /** Create a new structure */
  create(data: CreateStructureData): Structure;

  /** Update a structure */
  update(id: string, data: UpdateStructureData): Structure | undefined;

  /** Delete a structure and all its descendants */
  delete(id: string): boolean;

  // Tree operations
  /** Get the root structure (usually a book) */
  getRoot(): Structure | undefined;

  /** Get the full structure tree with all children loaded */
  getFullTree(): Structure | undefined;

  /** Get direct children of a structure */
  getChildren(parentId: string | null): Structure[];

  /** Get ancestors of a structure (from parent to root) */
  getAncestors(id: string): Structure[];

  /** Get all descendants of a structure */
  getDescendants(id: string): Structure[];

  /** Move a structure to a new parent at a specific position */
  move(id: string, newParentId: string | null, position: number): Structure | undefined;

  /** Reorder children within a parent */
  reorder(parentId: string | null, orderedIds: string[]): void;

  // Beat management
  /** Add a beat to a structure */
  addBeat(structureId: string, description: string, targetWordCount?: number): Structure | undefined;

  /** Update a beat */
  updateBeat(structureId: string, beatId: string, updates: Partial<Beat>): Structure | undefined;

  /** Remove a beat */
  removeBeat(structureId: string, beatId: string): Structure | undefined;

  /** Mark a beat as completed */
  markBeatCompleted(structureId: string, beatId: string, completed: boolean): Structure | undefined;

  /** Reorder beats within a structure */
  reorderBeats(structureId: string, orderedBeatIds: string[]): Structure | undefined;

  // Hook management
  /** Set the hook for a structure */
  setHook(id: string, hook: Hook | undefined): Structure | undefined;

  /** Get all structures that need hooks (chapters without hooks) */
  getStructuresNeedingHooks(): Structure[];

  // Tension management
  /** Set tension target for a structure */
  setTensionTarget(id: string, target: number | undefined): Structure | undefined;

  /** Get tension targets for all structures in order */
  getTensionCurve(): Array<{ structure: StructureSummary; tensionTarget?: number }>;

  // Chapter type management
  /** Set chapter type */
  setChapterType(id: string, chapterType: ChapterType | undefined): Structure | undefined;

  /** Get chapter type distribution */
  getChapterTypeDistribution(): Record<ChapterType, number>;

  // Summaries and stats
  /** Get summary for a structure */
  getSummary(id: string): StructureSummary | undefined;

  /** Get flat list of structure references for quick lookups */
  getAllRefs(): StructureRef[];

  /** Get statistics about the structure tree */
  getStats(): StructureStats;

  // Validation
  /** Check if a parent-child relationship is valid */
  isValidParentChild(parentType: StructureType | null, childType: StructureType): boolean;

  /** Validate the structure tree for issues */
  validateTree(): Array<{ structureId: string; issue: string }>;

  // Search
  /** Find structures by title */
  findByTitle(query: string): Structure[];
}

/**
 * Create structure service
 */
export function createStructureService(
  projectId: string,
  repository: StructureRepository
): StructureService {
  function toSummary(structure: Structure): StructureSummary {
    return {
      id: structure.id,
      type: structure.type,
      title: structure.title,
      summary: structure.summary,
      tensionTarget: structure.tensionTarget,
      chapterType: structure.chapterType,
      hasHook: structure.hook !== undefined,
      beatCount: structure.beats.length,
      childCount: structure.children.length,
      completedBeats: structure.beats.filter((b) => b.completed).length,
      order: structure.order,
    };
  }

  function toRef(structure: Structure): StructureRef {
    return {
      id: structure.id,
      type: structure.type,
      title: structure.title,
      parentId: structure.parentId,
      order: structure.order,
    };
  }

  /**
   * Recursively collect descendants
   */
  function collectDescendants(structure: Structure, result: Structure[]): void {
    const children = repository.findChildren(projectId, structure.id);
    for (const child of children) {
      result.push(child);
      collectDescendants(child, result);
    }
  }

  /**
   * Delete a structure and all its descendants
   */
  function deleteWithDescendants(id: string): boolean {
    const structure = repository.findById(projectId, id);
    if (!structure) return false;

    // Delete children first (recursively)
    const children = repository.findChildren(projectId, id);
    for (const child of children) {
      deleteWithDescendants(child.id);
    }

    // Delete the structure itself
    return repository.delete(projectId, id);
  }

  return {
    // Basic CRUD
    get(id: string): Structure | undefined {
      return repository.findById(projectId, id);
    },

    getWithChildren(id: string): Structure | undefined {
      return repository.loadWithChildren(projectId, id);
    },

    getAll(): Structure[] {
      return repository.findByProject(projectId);
    },

    getByType(type: StructureType): Structure[] {
      return repository.findByType(projectId, type);
    },

    create(data: CreateStructureData): Structure {
      return repository.create(projectId, data);
    },

    update(id: string, data: UpdateStructureData): Structure | undefined {
      return repository.update(projectId, id, data);
    },

    delete(id: string): boolean {
      return deleteWithDescendants(id);
    },

    // Tree operations
    getRoot(): Structure | undefined {
      return repository.findRoot(projectId);
    },

    getFullTree(): Structure | undefined {
      return repository.loadFullTree(projectId);
    },

    getChildren(parentId: string | null): Structure[] {
      return repository.findChildren(projectId, parentId);
    },

    getAncestors(id: string): Structure[] {
      const ancestors: Structure[] = [];
      let current = this.get(id);

      while (current?.parentId) {
        const parent = this.get(current.parentId);
        if (parent) {
          ancestors.push(parent);
          current = parent;
        } else {
          break;
        }
      }

      return ancestors;
    },

    getDescendants(id: string): Structure[] {
      const structure = this.get(id);
      if (!structure) return [];

      const descendants: Structure[] = [];
      collectDescendants(structure, descendants);
      return descendants;
    },

    move(id: string, newParentId: string | null, position: number): Structure | undefined {
      const structure = this.get(id);
      if (!structure) return undefined;

      // Validate the move
      if (newParentId !== null) {
        const newParent = this.get(newParentId);
        if (!newParent) return undefined;

        if (!this.isValidParentChild(newParent.type, structure.type)) {
          return undefined;
        }

        // Prevent moving a structure into its own descendant
        const descendants = this.getDescendants(id);
        if (descendants.some((d) => d.id === newParentId)) {
          return undefined;
        }
      }

      return repository.move(projectId, id, newParentId, position);
    },

    reorder(parentId: string | null, orderedIds: string[]): void {
      repository.reorder(projectId, parentId, orderedIds);
    },

    // Beat management
    addBeat(structureId: string, description: string, targetWordCount?: number): Structure | undefined {
      const beat: Beat = {
        id: generateId(),
        description,
        completed: false,
        targetWordCount,
        order: 0, // Will be updated based on existing beats
      };

      const structure = this.get(structureId);
      if (!structure) return undefined;

      // Set order to be after existing beats
      beat.order = structure.beats.length;

      return repository.addBeat(projectId, structureId, beat);
    },

    updateBeat(structureId: string, beatId: string, updates: Partial<Beat>): Structure | undefined {
      return repository.updateBeat(projectId, structureId, beatId, updates);
    },

    removeBeat(structureId: string, beatId: string): Structure | undefined {
      return repository.removeBeat(projectId, structureId, beatId);
    },

    markBeatCompleted(structureId: string, beatId: string, completed: boolean): Structure | undefined {
      return repository.updateBeat(projectId, structureId, beatId, { completed });
    },

    reorderBeats(structureId: string, orderedBeatIds: string[]): Structure | undefined {
      const structure = this.get(structureId);
      if (!structure) return undefined;

      // Reorder beats based on the provided order
      const beatMap = new Map(structure.beats.map((b) => [b.id, b]));
      const reorderedBeats: Beat[] = [];

      for (let i = 0; i < orderedBeatIds.length; i++) {
        const beat = beatMap.get(orderedBeatIds[i]);
        if (beat) {
          reorderedBeats.push({ ...beat, order: i });
        }
      }

      // Add any beats not in the ordered list at the end
      for (const beat of structure.beats) {
        if (!orderedBeatIds.includes(beat.id)) {
          reorderedBeats.push({ ...beat, order: reorderedBeats.length });
        }
      }

      return this.update(structureId, { beats: reorderedBeats });
    },

    // Hook management
    setHook(id: string, hook: Hook | undefined): Structure | undefined {
      return repository.setHook(projectId, id, hook);
    },

    getStructuresNeedingHooks(): Structure[] {
      const chapters = this.getByType('chapter');
      return chapters.filter((c) => !c.hook);
    },

    // Tension management
    setTensionTarget(id: string, target: number | undefined): Structure | undefined {
      return this.update(id, { tensionTarget: target });
    },

    getTensionCurve(): Array<{ structure: StructureSummary; tensionTarget?: number }> {
      // Get all chapters and scenes in order
      const tree = this.getFullTree();
      if (!tree) return [];

      const result: Array<{ structure: StructureSummary; tensionTarget?: number }> = [];

      function traverse(node: Structure): void {
        // For chapters and scenes, add to the curve
        if (node.type === 'chapter' || node.type === 'scene') {
          result.push({
            structure: {
              id: node.id,
              type: node.type,
              title: node.title,
              summary: node.summary,
              tensionTarget: node.tensionTarget,
              chapterType: node.chapterType,
              hasHook: node.hook !== undefined,
              beatCount: node.beats.length,
              childCount: node.children.length,
              completedBeats: node.beats.filter((b) => b.completed).length,
              order: node.order,
            },
            tensionTarget: node.tensionTarget,
          });
        }

        // Traverse children in order
        const sortedChildren = [...node.children].sort((a, b) => a.order - b.order);
        for (const child of sortedChildren) {
          traverse(child);
        }
      }

      traverse(tree);
      return result;
    },

    // Chapter type management
    setChapterType(id: string, chapterType: ChapterType | undefined): Structure | undefined {
      return this.update(id, { chapterType });
    },

    getChapterTypeDistribution(): Record<ChapterType, number> {
      const chapters = this.getByType('chapter');
      const distribution: Record<ChapterType, number> = {
        action: 0,
        character: 0,
        worldbuilding: 0,
        dialogue: 0,
        introspection: 0,
        transition: 0,
        climax: 0,
        resolution: 0,
      };

      for (const chapter of chapters) {
        if (chapter.chapterType) {
          distribution[chapter.chapterType]++;
        }
      }

      return distribution;
    },

    // Summaries and stats
    getSummary(id: string): StructureSummary | undefined {
      const structure = this.getWithChildren(id);
      return structure ? toSummary(structure) : undefined;
    },

    getAllRefs(): StructureRef[] {
      return this.getAll().map(toRef);
    },

    getStats(): StructureStats {
      const all = this.getAll();

      let totalBeats = 0;
      let completedBeats = 0;
      let totalTargetWordCount = 0;
      let chaptersWithHooks = 0;
      let chaptersWithTensionTargets = 0;

      const counts = {
        book: 0,
        arc: 0,
        chapter: 0,
        scene: 0,
      };

      for (const structure of all) {
        counts[structure.type]++;
        totalBeats += structure.beats.length;
        completedBeats += structure.beats.filter((b) => b.completed).length;

        if (structure.targetWordCount) {
          totalTargetWordCount += structure.targetWordCount;
        }

        if (structure.type === 'chapter') {
          if (structure.hook) chaptersWithHooks++;
          if (structure.tensionTarget !== undefined) chaptersWithTensionTargets++;
        }
      }

      return {
        bookCount: counts.book,
        arcCount: counts.arc,
        chapterCount: counts.chapter,
        sceneCount: counts.scene,
        totalBeats,
        completedBeats,
        totalTargetWordCount,
        chaptersWithHooks,
        chaptersWithTensionTargets,
      };
    },

    // Validation
    isValidParentChild(parentType: StructureType | null, childType: StructureType): boolean {
      if (parentType === null) {
        // Root level - only books allowed
        return childType === 'book';
      }

      return VALID_CHILD_TYPES[parentType].includes(childType);
    },

    validateTree(): Array<{ structureId: string; issue: string }> {
      const issues: Array<{ structureId: string; issue: string }> = [];
      const all = this.getAll();

      for (const structure of all) {
        // Check parent-child relationship validity
        if (structure.parentId) {
          const parent = this.get(structure.parentId);
          if (!parent) {
            issues.push({
              structureId: structure.id,
              issue: `Parent ${structure.parentId} not found`,
            });
          } else if (!this.isValidParentChild(parent.type, structure.type)) {
            issues.push({
              structureId: structure.id,
              issue: `Invalid parent-child relationship: ${parent.type} cannot contain ${structure.type}`,
            });
          }
        } else if (structure.type !== 'book') {
          issues.push({
            structureId: structure.id,
            issue: `${structure.type} should have a parent`,
          });
        }

        // Check chapters for missing hooks
        if (structure.type === 'chapter' && !structure.hook) {
          issues.push({
            structureId: structure.id,
            issue: 'Chapter missing hook specification',
          });
        }

        // Check for empty titles
        if (!structure.title.trim()) {
          issues.push({
            structureId: structure.id,
            issue: 'Empty title',
          });
        }

        // Check for orphaned beats (optional - beats should have valid order)
        const orders = structure.beats.map((b) => b.order);
        const uniqueOrders = new Set(orders);
        if (uniqueOrders.size !== orders.length) {
          issues.push({
            structureId: structure.id,
            issue: 'Duplicate beat order values',
          });
        }
      }

      return issues;
    },

    // Search
    findByTitle(query: string): Structure[] {
      const lowerQuery = query.toLowerCase();
      return this.getAll().filter((s) =>
        s.title.toLowerCase().includes(lowerQuery)
      );
    },
  };
}
