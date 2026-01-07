/**
 * Tests for concept dependency graph
 */

import { describe, expect, it } from 'vitest';

import type { Concept } from '@repo/techbook-types';

import {
  createConceptGraph,
  wouldCreateCycle,
  getValidPrerequisites,
} from './dependencies';

/**
 * Create a test concept with minimal required fields
 */
function createConcept(
  id: string,
  name: string,
  prerequisites: string[] = [],
  introducedAt?: string
): Concept {
  return {
    id,
    entityType: 'concept',
    name,
    type: 'term',
    definition: `Definition of ${name}`,
    introducedAt,
    prerequisites,
    relatedSymbols: [],
    examples: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('ConceptGraph', () => {
  describe('Basic structure', () => {
    it('should create a graph from concepts', () => {
      const concepts = [
        createConcept('a', 'A'),
        createConcept('b', 'B', ['a']),
        createConcept('c', 'C', ['a', 'b']),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.concepts).toHaveLength(3);
      // b->a, c->a, c->b = 3 edges
      expect(graph.edges).toHaveLength(3);
    });

    it('should handle empty concept list', () => {
      const graph = createConceptGraph([]);

      expect(graph.concepts).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
      expect(graph.hasCycles()).toBe(false);
    });

    it('should handle concepts with no prerequisites', () => {
      const concepts = [
        createConcept('a', 'A'),
        createConcept('b', 'B'),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.edges).toHaveLength(0);
      expect(graph.getPrerequisites('a')).toEqual([]);
      expect(graph.getDependents('a')).toEqual([]);
    });
  });

  describe('Prerequisites and dependents', () => {
    it('should get direct prerequisites', () => {
      const concepts = [
        createConcept('token', 'Token'),
        createConcept('lexer', 'Lexer', ['token']),
        createConcept('parser', 'Parser', ['token', 'lexer']),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.getPrerequisites('parser').sort()).toEqual(['lexer', 'token']);
      expect(graph.getPrerequisites('lexer')).toEqual(['token']);
      expect(graph.getPrerequisites('token')).toEqual([]);
    });

    it('should get direct dependents', () => {
      const concepts = [
        createConcept('token', 'Token'),
        createConcept('lexer', 'Lexer', ['token']),
        createConcept('parser', 'Parser', ['token', 'lexer']),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.getDependents('token').sort()).toEqual(['lexer', 'parser']);
      expect(graph.getDependents('lexer')).toEqual(['parser']);
      expect(graph.getDependents('parser')).toEqual([]);
    });

    it('should get all transitive prerequisites', () => {
      const concepts = [
        createConcept('a', 'A'),
        createConcept('b', 'B', ['a']),
        createConcept('c', 'C', ['b']),
        createConcept('d', 'D', ['c']),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.getAllPrerequisites('d').sort()).toEqual(['a', 'b', 'c']);
      expect(graph.getAllPrerequisites('c').sort()).toEqual(['a', 'b']);
      expect(graph.getAllPrerequisites('b')).toEqual(['a']);
      expect(graph.getAllPrerequisites('a')).toEqual([]);
    });

    it('should get all transitive dependents', () => {
      const concepts = [
        createConcept('a', 'A'),
        createConcept('b', 'B', ['a']),
        createConcept('c', 'C', ['b']),
        createConcept('d', 'D', ['c']),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.getAllDependents('a').sort()).toEqual(['b', 'c', 'd']);
      expect(graph.getAllDependents('b').sort()).toEqual(['c', 'd']);
      expect(graph.getAllDependents('c')).toEqual(['d']);
      expect(graph.getAllDependents('d')).toEqual([]);
    });
  });

  describe('Cycle detection', () => {
    it('should detect no cycles in a DAG', () => {
      const concepts = [
        createConcept('a', 'A'),
        createConcept('b', 'B', ['a']),
        createConcept('c', 'C', ['a', 'b']),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.hasCycles()).toBe(false);
      expect(graph.findCycles()).toEqual([]);
    });

    it('should detect a simple cycle', () => {
      const concepts = [
        createConcept('a', 'A', ['b']),
        createConcept('b', 'B', ['a']),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.hasCycles()).toBe(true);
      const cycles = graph.findCycles();
      expect(cycles).toHaveLength(1);
      expect(cycles[0]?.sort()).toEqual(['a', 'b']);
    });

    it('should detect a longer cycle', () => {
      const concepts = [
        createConcept('a', 'A', ['c']),
        createConcept('b', 'B', ['a']),
        createConcept('c', 'C', ['b']),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.hasCycles()).toBe(true);
      const cycles = graph.findCycles();
      expect(cycles).toHaveLength(1);
      expect(cycles[0]?.sort()).toEqual(['a', 'b', 'c']);
    });

    it('should detect multiple cycles', () => {
      const concepts = [
        createConcept('a', 'A', ['b']),
        createConcept('b', 'B', ['a']),
        createConcept('c', 'C', ['d']),
        createConcept('d', 'D', ['c']),
      ];

      const graph = createConceptGraph(concepts);

      expect(graph.hasCycles()).toBe(true);
      const cycles = graph.findCycles();
      expect(cycles).toHaveLength(2);
    });
  });

  describe('Topological sort', () => {
    it('should return topological order for a DAG', () => {
      const concepts = [
        createConcept('a', 'A'),
        createConcept('b', 'B', ['a']),
        createConcept('c', 'C', ['a']),
        createConcept('d', 'D', ['b', 'c']),
      ];

      const graph = createConceptGraph(concepts);
      const order = graph.getTopologicalOrder();

      expect(order).not.toBeNull();
      expect(order).toHaveLength(4);

      // a must come before b, c, d
      expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('b'));
      expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('c'));
      expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('d'));

      // b and c must come before d
      expect(order!.indexOf('b')).toBeLessThan(order!.indexOf('d'));
      expect(order!.indexOf('c')).toBeLessThan(order!.indexOf('d'));
    });

    it('should return null for a graph with cycles', () => {
      const concepts = [
        createConcept('a', 'A', ['b']),
        createConcept('b', 'B', ['a']),
      ];

      const graph = createConceptGraph(concepts);
      const order = graph.getTopologicalOrder();

      expect(order).toBeNull();
    });

    it('should handle disconnected components', () => {
      const concepts = [
        createConcept('a', 'A'),
        createConcept('b', 'B', ['a']),
        createConcept('c', 'C'),
        createConcept('d', 'D', ['c']),
      ];

      const graph = createConceptGraph(concepts);
      const order = graph.getTopologicalOrder();

      expect(order).not.toBeNull();
      expect(order).toHaveLength(4);

      // a before b
      expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('b'));
      // c before d
      expect(order!.indexOf('c')).toBeLessThan(order!.indexOf('d'));
    });
  });

  describe('Introduction order validation', () => {
    it('should detect violations when prerequisite introduced after dependent', () => {
      const concepts = [
        createConcept('token', 'Token', [], 'ch2'),
        createConcept('lexer', 'Lexer', ['token'], 'ch1'),
      ];

      const graph = createConceptGraph(concepts);
      const violations = graph.validateIntroductionOrder(['ch1', 'ch2', 'ch3']);

      expect(violations).toHaveLength(1);
      expect(violations[0]?.conceptId).toBe('token');
      expect(violations[0]?.usedInChapterId).toBe('ch1');
      expect(violations[0]?.introducedInChapterId).toBe('ch2');
    });

    it('should allow prerequisite in same chapter', () => {
      const concepts = [
        createConcept('token', 'Token', [], 'ch1'),
        createConcept('lexer', 'Lexer', ['token'], 'ch1'),
      ];

      const graph = createConceptGraph(concepts);
      const violations = graph.validateIntroductionOrder(['ch1', 'ch2']);

      expect(violations).toEqual([]);
    });

    it('should allow prerequisite in earlier chapter', () => {
      const concepts = [
        createConcept('token', 'Token', [], 'ch1'),
        createConcept('lexer', 'Lexer', ['token'], 'ch2'),
      ];

      const graph = createConceptGraph(concepts);
      const violations = graph.validateIntroductionOrder(['ch1', 'ch2']);

      expect(violations).toEqual([]);
    });

    it('should skip concepts without introducedAt', () => {
      const concepts = [
        createConcept('token', 'Token'),
        createConcept('lexer', 'Lexer', ['token'], 'ch1'),
      ];

      const graph = createConceptGraph(concepts);
      const violations = graph.validateIntroductionOrder(['ch1']);

      expect(violations).toEqual([]);
    });
  });

  describe('Full validation', () => {
    it('should return valid result for a well-formed graph', () => {
      const concepts = [
        createConcept('a', 'A', [], 'ch1'),
        createConcept('b', 'B', ['a'], 'ch2'),
        createConcept('c', 'C', ['a', 'b'], 'ch3'),
      ];

      const graph = createConceptGraph(concepts);
      const result = graph.validate(['ch1', 'ch2', 'ch3']);

      expect(result.valid).toBe(true);
      expect(result.cycles).toEqual([]);
      expect(result.violations).toEqual([]);
      expect(result.suggestedOrder).toBeDefined();
    });

    it('should return invalid result for graph with cycles', () => {
      const concepts = [
        createConcept('a', 'A', ['b']),
        createConcept('b', 'B', ['a']),
      ];

      const graph = createConceptGraph(concepts);
      const result = graph.validate([]);

      expect(result.valid).toBe(false);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should return invalid result for introduction order violations', () => {
      const concepts = [
        createConcept('token', 'Token', [], 'ch2'),
        createConcept('lexer', 'Lexer', ['token'], 'ch1'),
      ];

      const graph = createConceptGraph(concepts);
      const result = graph.validate(['ch1', 'ch2']);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });
});

describe('wouldCreateCycle', () => {
  it('should return false for valid addition', () => {
    const concepts = [
      createConcept('a', 'A'),
      createConcept('b', 'B'),
    ];

    expect(wouldCreateCycle(concepts, 'b', 'a')).toBe(false);
  });

  it('should return true for addition that creates cycle', () => {
    const concepts = [
      createConcept('a', 'A', ['b']),
      createConcept('b', 'B'),
    ];

    expect(wouldCreateCycle(concepts, 'b', 'a')).toBe(true);
  });

  it('should return true for transitive cycle', () => {
    const concepts = [
      createConcept('a', 'A', ['b']),
      createConcept('b', 'B', ['c']),
      createConcept('c', 'C'),
    ];

    expect(wouldCreateCycle(concepts, 'c', 'a')).toBe(true);
  });
});

describe('getValidPrerequisites', () => {
  it('should return concepts that can be prerequisites', () => {
    const concepts = [
      createConcept('a', 'A'),
      createConcept('b', 'B', ['a']),
      createConcept('c', 'C'),
    ];

    const valid = getValidPrerequisites(concepts, 'b');

    // c can be added as prerequisite
    // a is already a prerequisite
    // b is self
    expect(valid.map((c) => c.id)).toEqual(['c']);
  });

  it('should exclude concepts that would create cycles', () => {
    const concepts = [
      createConcept('a', 'A'),
      createConcept('b', 'B', ['a']),
      createConcept('c', 'C', ['b']),
    ];

    // c depends on b depends on a
    // Adding c as prereq of a would create cycle
    const valid = getValidPrerequisites(concepts, 'a');

    expect(valid.map((c) => c.id)).toEqual([]);
  });

  it('should return empty array for non-existent concept', () => {
    const concepts = [createConcept('a', 'A')];

    const valid = getValidPrerequisites(concepts, 'non-existent');

    expect(valid).toEqual([]);
  });
});
