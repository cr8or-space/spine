/**
 * Tests for concept registry
 */

import { describe, expect, it, beforeEach } from 'vitest';

import type { ConceptType } from '@repo/techbook-types';

import { createConceptRegistry, type ConceptRegistry, type CreateConceptData } from './registry';

describe('ConceptRegistry', () => {
  let registry: ConceptRegistry;

  beforeEach(() => {
    registry = createConceptRegistry();
  });

  const createTestConcept = (overrides: Partial<CreateConceptData> = {}): CreateConceptData => ({
    name: 'Test Concept',
    type: 'term',
    definition: 'A concept used for testing.',
    prerequisites: [],
    relatedSymbols: [],
    examples: [],
    ...overrides,
  });

  describe('CRUD operations', () => {
    it('should create a concept', () => {
      const concept = registry.create(createTestConcept({
        name: 'Token',
        type: 'type',
        definition: 'A single unit of syntax.',
      }));

      expect(concept.id).toBeDefined();
      expect(concept.name).toBe('Token');
      expect(concept.type).toBe('type');
      expect(concept.definition).toBe('A single unit of syntax.');
      expect(concept.entityType).toBe('concept');
      expect(concept.createdAt).toBeDefined();
      expect(concept.updatedAt).toBeDefined();
    });

    it('should retrieve a concept by ID', () => {
      const created = registry.create(createTestConcept({ name: 'Parser' }));
      const retrieved = registry.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Parser');
    });

    it('should return undefined for non-existent concept', () => {
      const result = registry.get('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should update a concept', () => {
      const created = registry.create(createTestConcept({ name: 'Lexer' }));
      const updated = registry.update(created.id, {
        name: 'Scanner',
        definition: 'Updated definition.',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Scanner');
      expect(updated?.definition).toBe('Updated definition.');
      // updatedAt may or may not change if update happens in same millisecond
      // Just verify it exists
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should return undefined when updating non-existent concept', () => {
      const result = registry.update('non-existent', { name: 'New Name' });
      expect(result).toBeUndefined();
    });

    it('should not allow changing ID on update', () => {
      const created = registry.create(createTestConcept({ name: 'AST' }));
      const updated = registry.update(created.id, {
        // @ts-expect-error - testing runtime behavior
        id: 'new-id',
        name: 'Abstract Syntax Tree',
      });

      expect(updated?.id).toBe(created.id);
    });

    it('should delete a concept', () => {
      const created = registry.create(createTestConcept({ name: 'ToDelete' }));
      const deleted = registry.delete(created.id);

      expect(deleted).toBe(true);
      expect(registry.get(created.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent concept', () => {
      const result = registry.delete('non-existent');
      expect(result).toBe(false);
    });

    it('should get all concepts', () => {
      registry.create(createTestConcept({ name: 'Concept A' }));
      registry.create(createTestConcept({ name: 'Concept B' }));
      registry.create(createTestConcept({ name: 'Concept C' }));

      const all = registry.getAll();
      expect(all).toHaveLength(3);
      expect(all.map((c) => c.name).sort()).toEqual(['Concept A', 'Concept B', 'Concept C']);
    });

    it('should report correct size', () => {
      expect(registry.size()).toBe(0);

      registry.create(createTestConcept({ name: 'One' }));
      expect(registry.size()).toBe(1);

      registry.create(createTestConcept({ name: 'Two' }));
      expect(registry.size()).toBe(2);
    });

    it('should clear all concepts', () => {
      registry.create(createTestConcept({ name: 'One' }));
      registry.create(createTestConcept({ name: 'Two' }));

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('Querying', () => {
    it('should get concepts by type', () => {
      registry.create(createTestConcept({ name: 'Token', type: 'type' }));
      registry.create(createTestConcept({ name: 'Parser', type: 'algorithm' }));
      registry.create(createTestConcept({ name: 'Expression', type: 'type' }));
      registry.create(createTestConcept({ name: 'Visitor', type: 'pattern' }));

      const types = registry.getByType('type');
      expect(types).toHaveLength(2);
      expect(types.map((c) => c.name).sort()).toEqual(['Expression', 'Token']);
    });

    it('should get concepts by chapter', () => {
      registry.create(createTestConcept({
        name: 'Token',
        introducedAt: 'chapter-1',
      }));
      registry.create(createTestConcept({
        name: 'Lexer',
        introducedAt: 'chapter-1',
      }));
      registry.create(createTestConcept({
        name: 'Parser',
        introducedAt: 'chapter-2',
      }));

      const chapter1 = registry.getByChapter('chapter-1');
      expect(chapter1).toHaveLength(2);
      expect(chapter1.map((c) => c.name).sort()).toEqual(['Lexer', 'Token']);
    });

    it('should find by exact name (case-insensitive)', () => {
      registry.create(createTestConcept({ name: 'Token' }));
      registry.create(createTestConcept({ name: 'Expression' }));

      expect(registry.findByName('Token')?.name).toBe('Token');
      expect(registry.findByName('token')?.name).toBe('Token');
      expect(registry.findByName('TOKEN')?.name).toBe('Token');
      expect(registry.findByName('Tok')).toBeUndefined();
    });

    it('should search by name or definition', () => {
      registry.create(createTestConcept({
        name: 'Token',
        definition: 'A unit of syntax.',
      }));
      registry.create(createTestConcept({
        name: 'Expression',
        definition: 'A tree node representing an operation.',
      }));
      registry.create(createTestConcept({
        name: 'Statement',
        definition: 'Another syntax element.',
      }));

      // Search by name
      const tokenSearch = registry.search('Token');
      expect(tokenSearch).toHaveLength(1);
      expect(tokenSearch[0]?.name).toBe('Token');

      // Search by definition (both Token and Statement have "syntax" in definition)
      const syntaxSearch = registry.search('syntax');
      expect(syntaxSearch).toHaveLength(2);
      expect(syntaxSearch.map((c) => c.name).sort()).toEqual(['Statement', 'Token']);
    });

    it('should check if concept exists', () => {
      const concept = registry.create(createTestConcept({ name: 'Test' }));

      expect(registry.has(concept.id)).toBe(true);
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('Summaries', () => {
    it('should get concept summary', () => {
      const concept = registry.create(createTestConcept({
        name: 'Token',
        type: 'type',
        definition: 'A single unit of syntax. Tokens are produced by the lexer.',
        prerequisites: ['prereq-1', 'prereq-2'],
      }));

      const summary = registry.getSummary(concept.id);

      expect(summary).toBeDefined();
      expect(summary?.id).toBe(concept.id);
      expect(summary?.name).toBe('Token');
      expect(summary?.type).toBe('type');
      expect(summary?.brief).toBe('A single unit of syntax');
      expect(summary?.prerequisiteCount).toBe(2);
    });

    it('should return undefined for non-existent concept summary', () => {
      expect(registry.getSummary('non-existent')).toBeUndefined();
    });

    it('should get all summaries', () => {
      registry.create(createTestConcept({ name: 'A', type: 'term' }));
      registry.create(createTestConcept({ name: 'B', type: 'type' }));

      const summaries = registry.getAllSummaries();
      expect(summaries).toHaveLength(2);
      expect(summaries.map((s) => s.name).sort()).toEqual(['A', 'B']);
    });
  });

  describe('Prerequisites', () => {
    it('should get dependents (concepts that depend on this one)', () => {
      const base = registry.create(createTestConcept({ name: 'Token' }));
      registry.create(createTestConcept({
        name: 'Lexer',
        prerequisites: [base.id],
      }));
      registry.create(createTestConcept({
        name: 'Parser',
        prerequisites: [base.id],
      }));
      registry.create(createTestConcept({ name: 'Other' }));

      const dependents = registry.getDependents(base.id);
      expect(dependents).toHaveLength(2);
      expect(dependents.map((c) => c.name).sort()).toEqual(['Lexer', 'Parser']);
    });

    it('should get prerequisites', () => {
      const token = registry.create(createTestConcept({ name: 'Token' }));
      const lexer = registry.create(createTestConcept({ name: 'Lexer' }));
      const parser = registry.create(createTestConcept({
        name: 'Parser',
        prerequisites: [token.id, lexer.id],
      }));

      const prereqs = registry.getPrerequisites(parser.id);
      expect(prereqs).toHaveLength(2);
      expect(prereqs.map((c) => c.name).sort()).toEqual(['Lexer', 'Token']);
    });

    it('should return empty array for concept with no prerequisites', () => {
      const concept = registry.create(createTestConcept({ name: 'Token' }));
      expect(registry.getPrerequisites(concept.id)).toEqual([]);
    });

    it('should add prerequisite', () => {
      const base = registry.create(createTestConcept({ name: 'Token' }));
      const dependent = registry.create(createTestConcept({ name: 'Lexer' }));

      const updated = registry.addPrerequisite(dependent.id, base.id);

      expect(updated?.prerequisites).toContain(base.id);
    });

    it('should not add duplicate prerequisite', () => {
      const base = registry.create(createTestConcept({ name: 'Token' }));
      const dependent = registry.create(createTestConcept({
        name: 'Lexer',
        prerequisites: [base.id],
      }));

      const updated = registry.addPrerequisite(dependent.id, base.id);

      expect(updated?.prerequisites).toEqual([base.id]);
    });

    it('should not add self as prerequisite', () => {
      const concept = registry.create(createTestConcept({ name: 'Token' }));

      const updated = registry.addPrerequisite(concept.id, concept.id);

      expect(updated?.prerequisites).toEqual([]);
    });

    it('should remove prerequisite', () => {
      const base = registry.create(createTestConcept({ name: 'Token' }));
      const other = registry.create(createTestConcept({ name: 'Other' }));
      const dependent = registry.create(createTestConcept({
        name: 'Lexer',
        prerequisites: [base.id, other.id],
      }));

      const updated = registry.removePrerequisite(dependent.id, base.id);

      expect(updated?.prerequisites).toEqual([other.id]);
    });
  });

  describe('Symbols', () => {
    it('should add symbol', () => {
      const concept = registry.create(createTestConcept({ name: 'Token' }));

      const updated = registry.addSymbol(concept.id, 'TokenType');

      expect(updated?.relatedSymbols).toContain('TokenType');
    });

    it('should not add duplicate symbol', () => {
      const concept = registry.create(createTestConcept({
        name: 'Token',
        relatedSymbols: ['TokenType'],
      }));

      const updated = registry.addSymbol(concept.id, 'TokenType');

      expect(updated?.relatedSymbols).toEqual(['TokenType']);
    });

    it('should remove symbol', () => {
      const concept = registry.create(createTestConcept({
        name: 'Token',
        relatedSymbols: ['TokenType', 'Token'],
      }));

      const updated = registry.removeSymbol(concept.id, 'TokenType');

      expect(updated?.relatedSymbols).toEqual(['Token']);
    });
  });

  describe('Edge cases', () => {
    it('should handle concepts with all optional fields', () => {
      const concept = registry.create({
        name: 'Minimal',
        type: 'term' as ConceptType,
        definition: 'A minimal concept.',
      });

      expect(concept.prerequisites).toEqual([]);
      expect(concept.relatedSymbols).toEqual([]);
      expect(concept.examples).toEqual([]);
      expect(concept.introducedAt).toBeUndefined();
    });

    it('should preserve examples on update', () => {
      const concept = registry.create(createTestConcept({
        name: 'Token',
        examples: [
          { content: 'const token = new Token()', language: 'typescript' },
        ],
      }));

      const updated = registry.update(concept.id, { name: 'Updated Token' });

      expect(updated?.examples).toHaveLength(1);
      expect(updated?.examples[0]?.content).toBe('const token = new Token()');
    });
  });
});
