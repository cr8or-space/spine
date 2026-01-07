/**
 * Concept dependency graph for tracking prerequisite relationships.
 *
 * Provides topological sorting, cycle detection, and validation of
 * concept introduction order against chapter ordering.
 */

import type {
  Concept,
  ConceptDependency,
  ConceptValidationResult,
  ConceptViolation,
} from '@repo/techbook-types';

/**
 * Concept graph interface for dependency analysis
 */
export interface ConceptGraph {
  /** All concepts in the graph */
  readonly concepts: Concept[];

  /** All dependency edges */
  readonly edges: ConceptDependency[];

  /** Get direct prerequisites for a concept */
  getPrerequisites(conceptId: string): string[];

  /** Get all concepts that depend on this concept (direct) */
  getDependents(conceptId: string): string[];

  /** Get all transitive prerequisites (deep) */
  getAllPrerequisites(conceptId: string): string[];

  /** Get all transitive dependents (deep) */
  getAllDependents(conceptId: string): string[];

  /** Find cycles in the dependency graph */
  findCycles(): string[][];

  /** Check if the graph has cycles */
  hasCycles(): boolean;

  /** Get a valid topological order (concepts sorted by dependencies) */
  getTopologicalOrder(): string[] | null;

  /** Validate concept introduction order against chapter order */
  validateIntroductionOrder(chapterOrder: string[]): ConceptViolation[];

  /** Get full validation result */
  validate(chapterOrder: string[]): ConceptValidationResult;
}

/**
 * Create a concept graph from a list of concepts
 */
export function createConceptGraph(concepts: Concept[]): ConceptGraph {
  // Build lookup maps
  const conceptMap = new Map<string, Concept>();
  for (const concept of concepts) {
    conceptMap.set(concept.id, concept);
  }

  // Build edge list
  const edges: ConceptDependency[] = [];
  for (const concept of concepts) {
    for (const prereqId of concept.prerequisites) {
      edges.push({ fromId: concept.id, toId: prereqId });
    }
  }

  // Build adjacency lists
  const prerequisites = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  for (const concept of concepts) {
    prerequisites.set(concept.id, new Set(concept.prerequisites));
    if (!dependents.has(concept.id)) {
      dependents.set(concept.id, new Set());
    }
  }

  for (const edge of edges) {
    const depSet = dependents.get(edge.toId);
    if (depSet) {
      depSet.add(edge.fromId);
    } else {
      dependents.set(edge.toId, new Set([edge.fromId]));
    }
  }

  /**
   * Get all transitive nodes using BFS
   */
  function getTransitive(
    startId: string,
    adjacencyMap: Map<string, Set<string>>
  ): string[] {
    const visited = new Set<string>();
    const queue = [startId];
    const result: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacencyMap.get(current);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          result.push(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Find all cycles using Tarjan's algorithm for SCCs
   */
  function findCyclesImpl(): string[][] {
    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];
    let currentIndex = 0;

    function strongConnect(nodeId: string): void {
      index.set(nodeId, currentIndex);
      lowlink.set(nodeId, currentIndex);
      currentIndex++;
      stack.push(nodeId);
      onStack.add(nodeId);

      const prereqs = prerequisites.get(nodeId);
      if (prereqs) {
        for (const prereqId of prereqs) {
          if (!index.has(prereqId)) {
            // Not visited yet
            strongConnect(prereqId);
            lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, lowlink.get(prereqId)!));
          } else if (onStack.has(prereqId)) {
            // On stack, part of current SCC
            lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, index.get(prereqId)!));
          }
        }
      }

      // Root of an SCC
      if (lowlink.get(nodeId) === index.get(nodeId)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== nodeId);

        // Only keep SCCs with more than one node (actual cycles)
        if (scc.length > 1) {
          sccs.push(scc.reverse());
        }
      }
    }

    for (const concept of concepts) {
      if (!index.has(concept.id)) {
        strongConnect(concept.id);
      }
    }

    return sccs;
  }

  /**
   * Kahn's algorithm for topological sort
   */
  function getTopologicalOrderImpl(): string[] | null {
    const inDegree = new Map<string, number>();

    // Initialize in-degrees
    for (const concept of concepts) {
      inDegree.set(concept.id, 0);
    }

    // Count incoming edges (each prerequisite is an incoming edge)
    for (const concept of concepts) {
      const prereqCount = concept.prerequisites.length;
      if (prereqCount > 0) {
        inDegree.set(concept.id, prereqCount);
      }
    }

    // Find all nodes with no incoming edges
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const result: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      // Decrease in-degree of dependents
      const deps = dependents.get(nodeId);
      if (deps) {
        for (const depId of deps) {
          const newDegree = (inDegree.get(depId) ?? 0) - 1;
          inDegree.set(depId, newDegree);
          if (newDegree === 0) {
            queue.push(depId);
          }
        }
      }
    }

    // If we didn't process all nodes, there's a cycle
    if (result.length !== concepts.length) {
      return null;
    }

    return result;
  }

  return {
    concepts,
    edges,

    getPrerequisites(conceptId: string): string[] {
      return Array.from(prerequisites.get(conceptId) ?? []);
    },

    getDependents(conceptId: string): string[] {
      return Array.from(dependents.get(conceptId) ?? []);
    },

    getAllPrerequisites(conceptId: string): string[] {
      return getTransitive(conceptId, prerequisites);
    },

    getAllDependents(conceptId: string): string[] {
      return getTransitive(conceptId, dependents);
    },

    findCycles(): string[][] {
      return findCyclesImpl();
    },

    hasCycles(): boolean {
      return findCyclesImpl().length > 0;
    },

    getTopologicalOrder(): string[] | null {
      return getTopologicalOrderImpl();
    },

    validateIntroductionOrder(chapterOrder: string[]): ConceptViolation[] {
      const violations: ConceptViolation[] = [];
      const chapterIndex = new Map<string, number>();

      // Build chapter position lookup
      for (let i = 0; i < chapterOrder.length; i++) {
        chapterIndex.set(chapterOrder[i], i);
      }

      // Check each concept's prerequisites
      for (const concept of concepts) {
        if (!concept.introducedAt) continue;

        const conceptChapterPos = chapterIndex.get(concept.introducedAt);
        if (conceptChapterPos === undefined) continue;

        for (const prereqId of concept.prerequisites) {
          const prereq = conceptMap.get(prereqId);
          if (!prereq || !prereq.introducedAt) continue;

          const prereqChapterPos = chapterIndex.get(prereq.introducedAt);
          if (prereqChapterPos === undefined) continue;

          // Prerequisite should be introduced before or in the same chapter
          if (prereqChapterPos > conceptChapterPos) {
            violations.push({
              conceptId: prereq.id,
              conceptName: prereq.name,
              usedInChapterId: concept.introducedAt,
              introducedInChapterId: prereq.introducedAt,
            });
          }
        }
      }

      return violations;
    },

    validate(chapterOrder: string[]): ConceptValidationResult {
      const cycles = findCyclesImpl();
      const violations = this.validateIntroductionOrder(chapterOrder);
      const suggestedOrder = getTopologicalOrderImpl();

      return {
        valid: cycles.length === 0 && violations.length === 0,
        cycles,
        violations,
        suggestedOrder: suggestedOrder ?? undefined,
      };
    },
  };
}

/**
 * Check if adding a prerequisite would create a cycle
 */
export function wouldCreateCycle(
  concepts: Concept[],
  conceptId: string,
  newPrerequisiteId: string
): boolean {
  // Build a temporary concept list with the new edge
  const tempConcepts = concepts.map((c) => {
    if (c.id === conceptId) {
      return {
        ...c,
        prerequisites: [...c.prerequisites, newPrerequisiteId],
      };
    }
    return c;
  });

  const graph = createConceptGraph(tempConcepts);
  return graph.hasCycles();
}

/**
 * Get concepts that can be added as prerequisites without creating cycles
 */
export function getValidPrerequisites(concepts: Concept[], conceptId: string): Concept[] {
  const concept = concepts.find((c) => c.id === conceptId);
  if (!concept) return [];

  const graph = createConceptGraph(concepts);

  // Can't be a prerequisite of itself
  const invalid = new Set<string>([conceptId]);

  // Can't add anything that would create a cycle (anything that depends on this concept)
  for (const depId of graph.getAllDependents(conceptId)) {
    invalid.add(depId);
  }

  // Already a prerequisite
  for (const prereqId of concept.prerequisites) {
    invalid.add(prereqId);
  }

  return concepts.filter((c) => !invalid.has(c.id));
}
