/**
 * Concept registry for managing glossary entries.
 *
 * Provides CRUD operations for concepts (terms, types, algorithms, patterns, principles).
 * Uses in-memory storage with the ability to persist and load from external sources.
 */

import { nanoid } from 'nanoid';

import type { Concept, ConceptSummary, ConceptType } from '@repo/techbook-types';

/**
 * Data required to create a concept.
 * Only name, type, and definition are required; other fields have defaults.
 */
export type CreateConceptData = Pick<Concept, 'name' | 'type' | 'definition'> &
  Partial<Pick<Concept, 'introducedAt' | 'prerequisites' | 'relatedSymbols' | 'examples'>>;

/**
 * Data for updating a concept
 */
export type UpdateConceptData = Partial<Omit<Concept, 'id' | 'entityType' | 'createdAt' | 'updatedAt'>>;

/**
 * Concept registry interface
 */
export interface ConceptRegistry {
  /** Get a concept by ID */
  get(id: string): Concept | undefined;

  /** Get all concepts */
  getAll(): Concept[];

  /** Get concepts by type */
  getByType(type: ConceptType): Concept[];

  /** Get concepts introduced in a specific chapter */
  getByChapter(chapterId: string): Concept[];

  /** Find concept by exact name (case-insensitive) */
  findByName(name: string): Concept | undefined;

  /** Search concepts by name or definition */
  search(query: string): Concept[];

  /** Create a new concept */
  create(data: CreateConceptData): Concept;

  /** Update a concept */
  update(id: string, data: UpdateConceptData): Concept | undefined;

  /** Delete a concept */
  delete(id: string): boolean;

  /** Check if a concept exists */
  has(id: string): boolean;

  /** Get concept summary for context assembly */
  getSummary(id: string): ConceptSummary | undefined;

  /** Get all concept summaries */
  getAllSummaries(): ConceptSummary[];

  /** Get all concepts that have this concept as a prerequisite */
  getDependents(id: string): Concept[];

  /** Get all prerequisite concepts for a concept */
  getPrerequisites(id: string): Concept[];

  /** Add a prerequisite to a concept */
  addPrerequisite(id: string, prerequisiteId: string): Concept | undefined;

  /** Remove a prerequisite from a concept */
  removePrerequisite(id: string, prerequisiteId: string): Concept | undefined;

  /** Add a related symbol to a concept */
  addSymbol(id: string, symbol: string): Concept | undefined;

  /** Remove a related symbol from a concept */
  removeSymbol(id: string, symbol: string): Concept | undefined;

  /** Clear all concepts */
  clear(): void;

  /** Get the number of concepts */
  size(): number;
}

/**
 * Generate a timestamp string
 */
function nowTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return nanoid();
}

/**
 * Convert a concept to a summary
 */
function toSummary(concept: Concept): ConceptSummary {
  // Create a brief description (first sentence or truncated)
  const brief =
    concept.definition.split('.')[0]?.trim() ||
    concept.definition.substring(0, 100) + (concept.definition.length > 100 ? '...' : '');

  return {
    id: concept.id,
    name: concept.name,
    type: concept.type,
    brief,
    prerequisiteCount: concept.prerequisites.length,
  };
}

/**
 * Create an in-memory concept registry
 */
export function createConceptRegistry(): ConceptRegistry {
  const concepts = new Map<string, Concept>();

  return {
    get(id: string): Concept | undefined {
      return concepts.get(id);
    },

    getAll(): Concept[] {
      return Array.from(concepts.values());
    },

    getByType(type: ConceptType): Concept[] {
      return this.getAll().filter((c) => c.type === type);
    },

    getByChapter(chapterId: string): Concept[] {
      return this.getAll().filter((c) => c.introducedAt === chapterId);
    },

    findByName(name: string): Concept | undefined {
      const lowerName = name.toLowerCase();
      return this.getAll().find((c) => c.name.toLowerCase() === lowerName);
    },

    search(query: string): Concept[] {
      const lowerQuery = query.toLowerCase();
      return this.getAll().filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.definition.toLowerCase().includes(lowerQuery)
      );
    },

    create(data: CreateConceptData): Concept {
      const now = nowTimestamp();
      const concept: Concept = {
        id: generateId(),
        entityType: 'concept',
        name: data.name,
        type: data.type,
        definition: data.definition,
        introducedAt: data.introducedAt,
        prerequisites: data.prerequisites ?? [],
        relatedSymbols: data.relatedSymbols ?? [],
        examples: data.examples ?? [],
        createdAt: now,
        updatedAt: now,
      };

      concepts.set(concept.id, concept);
      return concept;
    },

    update(id: string, data: UpdateConceptData): Concept | undefined {
      const existing = concepts.get(id);
      if (!existing) return undefined;

      const updated: Concept = {
        ...existing,
        ...data,
        id: existing.id, // Ensure ID cannot be changed
        entityType: 'concept', // Ensure entityType cannot be changed
        createdAt: existing.createdAt, // Ensure createdAt cannot be changed
        updatedAt: nowTimestamp(),
      };

      concepts.set(id, updated);
      return updated;
    },

    delete(id: string): boolean {
      return concepts.delete(id);
    },

    has(id: string): boolean {
      return concepts.has(id);
    },

    getSummary(id: string): ConceptSummary | undefined {
      const concept = this.get(id);
      return concept ? toSummary(concept) : undefined;
    },

    getAllSummaries(): ConceptSummary[] {
      return this.getAll().map(toSummary);
    },

    getDependents(id: string): Concept[] {
      return this.getAll().filter((c) => c.prerequisites.includes(id));
    },

    getPrerequisites(id: string): Concept[] {
      const concept = this.get(id);
      if (!concept) return [];

      return concept.prerequisites
        .map((prereqId) => this.get(prereqId))
        .filter((c): c is Concept => c !== undefined);
    },

    addPrerequisite(id: string, prerequisiteId: string): Concept | undefined {
      const concept = this.get(id);
      if (!concept) return undefined;

      // Don't add if already present
      if (concept.prerequisites.includes(prerequisiteId)) {
        return concept;
      }

      // Don't allow self-reference
      if (id === prerequisiteId) {
        return concept;
      }

      return this.update(id, {
        prerequisites: [...concept.prerequisites, prerequisiteId],
      });
    },

    removePrerequisite(id: string, prerequisiteId: string): Concept | undefined {
      const concept = this.get(id);
      if (!concept) return undefined;

      return this.update(id, {
        prerequisites: concept.prerequisites.filter((p) => p !== prerequisiteId),
      });
    },

    addSymbol(id: string, symbol: string): Concept | undefined {
      const concept = this.get(id);
      if (!concept) return undefined;

      // Don't add if already present
      if (concept.relatedSymbols.includes(symbol)) {
        return concept;
      }

      return this.update(id, {
        relatedSymbols: [...concept.relatedSymbols, symbol],
      });
    },

    removeSymbol(id: string, symbol: string): Concept | undefined {
      const concept = this.get(id);
      if (!concept) return undefined;

      return this.update(id, {
        relatedSymbols: concept.relatedSymbols.filter((s) => s !== symbol),
      });
    },

    clear(): void {
      concepts.clear();
    },

    size(): number {
      return concepts.size;
    },
  };
}
