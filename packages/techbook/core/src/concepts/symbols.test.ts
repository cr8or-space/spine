/**
 * Tests for symbol-to-concept linking
 */

import { describe, expect, it, beforeEach } from 'vitest';

import type { Concept } from '@repo/techbook-types';

import {
  createSymbolRegistry,
  validateSymbols,
  extractSymbolsFromCode,
  suggestConceptsForSymbol,
  type SymbolRegistry,
  type SnippetInfo,
} from './symbols';

/**
 * Create a test concept with minimal required fields
 */
function createConcept(
  id: string,
  name: string,
  relatedSymbols: string[] = [],
  introducedAt?: string
): Concept {
  return {
    id,
    entityType: 'concept',
    name,
    type: 'term',
    definition: `Definition of ${name}`,
    introducedAt,
    prerequisites: [],
    relatedSymbols,
    examples: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('SymbolRegistry', () => {
  let registry: SymbolRegistry;

  beforeEach(() => {
    registry = createSymbolRegistry();
  });

  describe('Basic operations', () => {
    it('should link a symbol to a concept', () => {
      const link = registry.link('Token', 'concept-1', 'snippet-1');

      expect(link.symbol).toBe('Token');
      expect(link.conceptId).toBe('concept-1');
      expect(link.snippetId).toBe('snippet-1');
    });

    it('should retrieve link by symbol', () => {
      registry.link('Token', 'concept-1', 'snippet-1');

      const link = registry.getLink('Token');

      expect(link).toBeDefined();
      expect(link?.conceptId).toBe('concept-1');
    });

    it('should return undefined for non-existent symbol', () => {
      expect(registry.getLink('NonExistent')).toBeUndefined();
    });

    it('should get concept for symbol', () => {
      registry.link('Token', 'concept-1', 'snippet-1');

      expect(registry.getConceptForSymbol('Token')).toBe('concept-1');
      expect(registry.getConceptForSymbol('Other')).toBeUndefined();
    });

    it('should get all symbols for a concept', () => {
      registry.link('Token', 'concept-1', 'snippet-1');
      registry.link('TokenType', 'concept-1', 'snippet-2');
      registry.link('Parser', 'concept-2', 'snippet-3');

      const symbols = registry.getSymbolsForConcept('concept-1');

      expect(symbols.sort()).toEqual(['Token', 'TokenType']);
    });

    it('should overwrite link when same symbol is linked again', () => {
      registry.link('Token', 'concept-1', 'snippet-1');
      registry.link('Token', 'concept-2', 'snippet-2');

      expect(registry.getConceptForSymbol('Token')).toBe('concept-2');
    });

    it('should unlink a symbol', () => {
      registry.link('Token', 'concept-1', 'snippet-1');

      const result = registry.unlink('Token');

      expect(result).toBe(true);
      expect(registry.getLink('Token')).toBeUndefined();
    });

    it('should return false when unlinking non-existent symbol', () => {
      expect(registry.unlink('NonExistent')).toBe(false);
    });

    it('should check if symbol is linked', () => {
      registry.link('Token', 'concept-1', 'snippet-1');

      expect(registry.hasLink('Token')).toBe(true);
      expect(registry.hasLink('Other')).toBe(false);
    });

    it('should get all symbols', () => {
      registry.link('Token', 'concept-1', 'snippet-1');
      registry.link('Parser', 'concept-2', 'snippet-2');

      expect(registry.getAllSymbols().sort()).toEqual(['Parser', 'Token']);
    });

    it('should get all links', () => {
      registry.link('Token', 'concept-1', 'snippet-1');
      registry.link('Parser', 'concept-2', 'snippet-2');

      const all = registry.getAll();

      expect(all).toHaveLength(2);
    });

    it('should report correct size', () => {
      expect(registry.size()).toBe(0);

      registry.link('Token', 'concept-1', 'snippet-1');
      expect(registry.size()).toBe(1);

      registry.link('Parser', 'concept-2', 'snippet-2');
      expect(registry.size()).toBe(2);
    });

    it('should clear all links', () => {
      registry.link('Token', 'concept-1', 'snippet-1');
      registry.link('Parser', 'concept-2', 'snippet-2');

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });
  });
});

describe('validateSymbols', () => {
  it('should detect premature symbol use', () => {
    const concepts = [
      createConcept('c1', 'Token', ['Token', 'TokenType'], 'ch2'),
    ];

    const snippets: SnippetInfo[] = [
      { id: 's1', chapterId: 'ch1', symbols: ['Token'] },
    ];

    const result = validateSymbols(concepts, snippets, ['ch1', 'ch2']);

    expect(result.valid).toBe(false);
    expect(result.prematureUses).toHaveLength(1);
    expect(result.prematureUses[0]?.symbol).toBe('Token');
    expect(result.prematureUses[0]?.usedInChapterId).toBe('ch1');
    expect(result.prematureUses[0]?.introducedInChapterId).toBe('ch2');
  });

  it('should allow symbol use in same chapter as introduction', () => {
    const concepts = [
      createConcept('c1', 'Token', ['Token'], 'ch1'),
    ];

    const snippets: SnippetInfo[] = [
      { id: 's1', chapterId: 'ch1', symbols: ['Token'] },
    ];

    const result = validateSymbols(concepts, snippets, ['ch1', 'ch2']);

    expect(result.prematureUses).toEqual([]);
  });

  it('should allow symbol use after introduction', () => {
    const concepts = [
      createConcept('c1', 'Token', ['Token'], 'ch1'),
    ];

    const snippets: SnippetInfo[] = [
      { id: 's1', chapterId: 'ch2', symbols: ['Token'] },
    ];

    const result = validateSymbols(concepts, snippets, ['ch1', 'ch2']);

    expect(result.prematureUses).toEqual([]);
  });

  it('should detect unexplained symbols', () => {
    const concepts = [
      createConcept('c1', 'Token', ['Token'], 'ch1'),
    ];

    const snippets: SnippetInfo[] = [
      { id: 's1', chapterId: 'ch1', symbols: ['Token', 'UnknownSymbol'] },
    ];

    const result = validateSymbols(concepts, snippets, ['ch1']);

    expect(result.valid).toBe(false);
    expect(result.unexplainedSymbols).toHaveLength(1);
    expect(result.unexplainedSymbols[0]?.symbol).toBe('UnknownSymbol');
    expect(result.unexplainedSymbols[0]?.snippetIds).toEqual(['s1']);
    expect(result.unexplainedSymbols[0]?.chapterIds).toEqual(['ch1']);
  });

  it('should detect orphaned links', () => {
    const concepts = [
      createConcept('c1', 'Token', ['Token', 'OrphanedSymbol'], 'ch1'),
    ];

    const snippets: SnippetInfo[] = [
      { id: 's1', chapterId: 'ch1', symbols: ['Token'] },
    ];

    const result = validateSymbols(concepts, snippets, ['ch1']);

    expect(result.orphanedLinks).toHaveLength(1);
    expect(result.orphanedLinks[0]?.symbol).toBe('OrphanedSymbol');
    expect(result.orphanedLinks[0]?.conceptId).toBe('c1');
  });

  it('should return valid result when everything is correct', () => {
    const concepts = [
      createConcept('c1', 'Token', ['Token'], 'ch1'),
      createConcept('c2', 'Parser', ['parse'], 'ch2'),
    ];

    const snippets: SnippetInfo[] = [
      { id: 's1', chapterId: 'ch1', symbols: ['Token'] },
      { id: 's2', chapterId: 'ch2', symbols: ['Token', 'parse'] },
    ];

    const result = validateSymbols(concepts, snippets, ['ch1', 'ch2']);

    expect(result.valid).toBe(true);
    expect(result.prematureUses).toEqual([]);
    expect(result.unexplainedSymbols).toEqual([]);
  });

  it('should aggregate symbol usage across multiple snippets', () => {
    const concepts: Concept[] = [];
    const snippets: SnippetInfo[] = [
      { id: 's1', chapterId: 'ch1', symbols: ['Token'] },
      { id: 's2', chapterId: 'ch2', symbols: ['Token'] },
    ];

    const result = validateSymbols(concepts, snippets, ['ch1', 'ch2']);

    expect(result.unexplainedSymbols).toHaveLength(1);
    expect(result.unexplainedSymbols[0]?.snippetIds.sort()).toEqual(['s1', 's2']);
    expect(result.unexplainedSymbols[0]?.chapterIds.sort()).toEqual(['ch1', 'ch2']);
  });
});

describe('extractSymbolsFromCode', () => {
  it('should extract function declarations', () => {
    const code = `
      function parseExpression() {
        return null;
      }
    `;

    const symbols = extractSymbolsFromCode(code);

    expect(symbols).toContain('parseExpression');
  });

  it('should extract arrow functions', () => {
    const code = `
      const parse = () => {};
      const scan = async (input) => {};
    `;

    const symbols = extractSymbolsFromCode(code);

    expect(symbols).toContain('parse');
    expect(symbols).toContain('scan');
  });

  it('should extract class declarations', () => {
    const code = `
      class Token {
        constructor() {}
      }
      class Parser extends Base {}
    `;

    const symbols = extractSymbolsFromCode(code);

    expect(symbols).toContain('Token');
    expect(symbols).toContain('Parser');
  });

  it('should extract interface declarations', () => {
    const code = `
      interface Node {
        type: string;
      }
      interface Expression extends Node {}
    `;

    const symbols = extractSymbolsFromCode(code);

    expect(symbols).toContain('Node');
    expect(symbols).toContain('Expression');
  });

  it('should extract type declarations', () => {
    const code = `
      type TokenType = 'number' | 'string';
      type Expr = BinaryExpr | UnaryExpr;
    `;

    const symbols = extractSymbolsFromCode(code);

    expect(symbols).toContain('TokenType');
    expect(symbols).toContain('Expr');
  });

  it('should extract enum declarations', () => {
    const code = `
      enum TokenType {
        Number,
        String,
      }
    `;

    const symbols = extractSymbolsFromCode(code);

    expect(symbols).toContain('TokenType');
  });

  it('should extract method definitions', () => {
    const code = `
      class Lexer {
        scan() {}
        advance(n: number) {}
      }
    `;

    const symbols = extractSymbolsFromCode(code);

    expect(symbols).toContain('scan');
    expect(symbols).toContain('advance');
  });

  it('should not extract keywords as symbols', () => {
    const code = `
      if (true) {}
      for (;;) {}
      while (true) {}
      function test() {}
    `;

    const symbols = extractSymbolsFromCode(code);

    expect(symbols).not.toContain('if');
    expect(symbols).not.toContain('for');
    expect(symbols).not.toContain('while');
    expect(symbols).toContain('test');
  });

  it('should return unique symbols', () => {
    const code = `
      function parse() {}
      function parse() {} // duplicate
    `;

    const symbols = extractSymbolsFromCode(code);
    const parseCount = symbols.filter((s) => s === 'parse').length;

    expect(parseCount).toBe(1);
  });
});

describe('suggestConceptsForSymbol', () => {
  it('should suggest exact name matches with highest score', () => {
    const concepts = [
      createConcept('c1', 'Token', [], 'ch1'),
      createConcept('c2', 'TokenType', [], 'ch1'),
      createConcept('c3', 'Parser', [], 'ch1'),
    ];

    const suggestions = suggestConceptsForSymbol('Token', concepts);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]?.concept.name).toBe('Token');
    expect(suggestions[0]?.score).toBe(100);
  });

  it('should suggest partial matches', () => {
    const concepts = [
      createConcept('c1', 'TokenType', [], 'ch1'),
      createConcept('c2', 'Parser', [], 'ch1'),
    ];

    const suggestions = suggestConceptsForSymbol('Token', concepts);

    expect(suggestions.length).toBe(1);
    expect(suggestions[0]?.concept.name).toBe('TokenType');
    expect(suggestions[0]?.score).toBe(75);
  });

  it('should suggest concepts with symbol in definition', () => {
    const concepts = [
      createConcept('c1', 'Lexer', [], 'ch1'),
    ];
    concepts[0]!.definition = 'The lexer produces Token objects';

    const suggestions = suggestConceptsForSymbol('Token', concepts);

    expect(suggestions.length).toBe(1);
    expect(suggestions[0]?.score).toBe(50);
  });

  it('should sort suggestions by score descending', () => {
    const concepts = [
      createConcept('c1', 'Lexer', [], 'ch1'),
      createConcept('c2', 'Token', [], 'ch1'),
      createConcept('c3', 'TokenType', [], 'ch1'),
    ];
    concepts[0]!.definition = 'Produces Token objects';

    const suggestions = suggestConceptsForSymbol('Token', concepts);

    expect(suggestions.map((s) => s.score)).toEqual([100, 75, 50]);
  });

  it('should return empty array for no matches', () => {
    const concepts = [
      createConcept('c1', 'Parser', [], 'ch1'),
      createConcept('c2', 'Lexer', [], 'ch1'),
    ];

    const suggestions = suggestConceptsForSymbol('XyzUnknown', concepts);

    expect(suggestions).toEqual([]);
  });

  it('should be case-insensitive', () => {
    const concepts = [
      createConcept('c1', 'Token', [], 'ch1'),
    ];

    const suggestions = suggestConceptsForSymbol('TOKEN', concepts);

    expect(suggestions.length).toBe(1);
    expect(suggestions[0]?.score).toBe(100);
  });
});
