import { describe, it, expect } from 'vitest';
import {
  buildCrossReferenceIndex,
  validateCrossReferences,
  generateGlossary,
  generateIndex,
  generateLinks,
  getFileHistory,
  getConceptChain,
} from './crossrefs';
import type { Concept, Snippet, Checkpoint, SymbolLink } from '@repo/techbook-types';
import type { CrossReferenceIndex, ChapterInfo } from './crossrefs';

// Create an empty cross-reference index for tests that don't need a populated one
const emptyIndex: CrossReferenceIndex = {
  concepts: new Map(),
  conceptUsages: new Map(),
  symbols: new Map(),
  symbolRefs: new Map(),
  files: new Map(),
  checkpoints: new Map(),
  chapterSnippets: new Map(),
  chapterConcepts: new Map(),
};

// Helper functions for creating test data
function makeConcept(
  id: string,
  name: string,
  type: Concept['type'] = 'term',
  introducedAt?: string,
  prerequisites: string[] = []
): Concept {
  return {
    id,
    entityType: 'concept',
    name,
    type,
    definition: `Definition of ${name}`,
    introducedAt,
    prerequisites,
    relatedSymbols: [],
    examples: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeSnippet(
  id: string,
  file: string,
  chapterId: string,
  order = 0
): Snippet {
  return {
    id,
    entityType: 'snippet',
    name: `Snippet ${id}`,
    file,
    operation: 'introduce',
    language: 'typescript',
    code: 'const x = 1;',
    chapterId,
    order,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeCheckpoint(id: string, name: string, chapterId: string): Checkpoint {
  return {
    id,
    entityType: 'checkpoint',
    name,
    description: `Checkpoint ${name}`,
    chapterId,
    status: 'validated',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeChapter(id: string, title: string, order: number): ChapterInfo {
  return { id, title, order };
}

describe('buildCrossReferenceIndex', () => {
  it('should index concept introductions', () => {
    const concepts = [makeConcept('c1', 'Parser', 'term', 'ch-1')];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];

    const index = buildCrossReferenceIndex(concepts, [], [], [], [], { chapters });

    expect(index.concepts.get('c1')).toBeDefined();
    expect(index.concepts.get('c1')?.conceptName).toBe('Parser');
    expect(index.concepts.get('c1')?.chapterId).toBe('ch-1');
  });

  it('should track concepts by chapter', () => {
    const concepts = [
      makeConcept('c1', 'Lexer', 'term', 'ch-1'),
      makeConcept('c2', 'Parser', 'term', 'ch-1'),
      makeConcept('c3', 'AST', 'term', 'ch-2'),
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0), makeChapter('ch-2', 'Chapter 2', 1)];

    const index = buildCrossReferenceIndex(concepts, [], [], [], [], { chapters });

    expect(index.chapterConcepts.get('ch-1')).toContain('c1');
    expect(index.chapterConcepts.get('ch-1')).toContain('c2');
    expect(index.chapterConcepts.get('ch-2')).toContain('c3');
  });

  it('should index snippets by chapter', () => {
    const snippets = [
      makeSnippet('s1', 'lexer.ts', 'ch-1'),
      makeSnippet('s2', 'parser.ts', 'ch-2'),
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0), makeChapter('ch-2', 'Chapter 2', 1)];

    const index = buildCrossReferenceIndex([], snippets, [], [], [], { chapters });

    expect(index.chapterSnippets.get('ch-1')).toContain('s1');
    expect(index.chapterSnippets.get('ch-2')).toContain('s2');
  });

  it('should index files', () => {
    const snippets = [
      makeSnippet('s1', 'lexer.ts', 'ch-1'),
      makeSnippet('s2', 'lexer.ts', 'ch-2'),
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0), makeChapter('ch-2', 'Chapter 2', 1)];

    const index = buildCrossReferenceIndex([], snippets, [], [], [], { chapters });

    const fileEntry = index.files.get('lexer.ts');
    expect(fileEntry).toBeDefined();
    expect(fileEntry?.snippetIds).toContain('s1');
    expect(fileEntry?.snippetIds).toContain('s2');
    expect(fileEntry?.chapterIds).toContain('ch-1');
    expect(fileEntry?.chapterIds).toContain('ch-2');
  });

  it('should index symbol links', () => {
    const concepts = [makeConcept('c1', 'Parser', 'type', 'ch-1')];
    const snippets = [makeSnippet('s1', 'parser.ts', 'ch-1')];
    const symbolLinks: SymbolLink[] = [
      { symbol: 'Parser', conceptId: 'c1', snippetId: 's1' },
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];

    const index = buildCrossReferenceIndex(concepts, snippets, symbolLinks, [], [], { chapters });

    expect(index.symbols.get('Parser')).toBeDefined();
    expect(index.symbols.get('Parser')?.[0].conceptId).toBe('c1');
  });

  it('should index checkpoints', () => {
    const snippets = [makeSnippet('s1', 'file.ts', 'ch-1')];
    const checkpoints = [makeCheckpoint('cp-1', 'Checkpoint 1', 'ch-1')];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];

    const index = buildCrossReferenceIndex([], snippets, [], checkpoints, [], { chapters });

    const cpEntry = index.checkpoints.get('cp-1');
    expect(cpEntry).toBeDefined();
    expect(cpEntry?.snippetIds).toContain('s1');
  });
});

describe('validateCrossReferences', () => {
  it('should detect missing concept introductions', () => {
    const concepts = [makeConcept('c1', 'Parser', 'term')]; // No introducedAt
    const chapters: ChapterInfo[] = [];

    const issues = validateCrossReferences(emptyIndex, concepts, [], [], chapters);

    expect(issues.some((i) => i.type === 'missing-concept-introduction')).toBe(true);
  });

  it('should detect premature symbol use', () => {
    const concepts = [makeConcept('c1', 'Parser', 'type', 'ch-2')];
    const snippets = [makeSnippet('s1', 'file.ts', 'ch-1')];
    const symbolLinks: SymbolLink[] = [
      { symbol: 'Parser', conceptId: 'c1', snippetId: 's1' },
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0), makeChapter('ch-2', 'Chapter 2', 1)];

    const issues = validateCrossReferences(emptyIndex, concepts, snippets, symbolLinks, chapters);

    expect(issues.some((i) => i.type === 'premature-symbol-use')).toBe(true);
  });

  it('should detect orphaned symbol links', () => {
    const symbolLinks: SymbolLink[] = [
      { symbol: 'Unknown', conceptId: 'missing', snippetId: 'missing' },
    ];
    const chapters: ChapterInfo[] = [];

    const issues = validateCrossReferences(emptyIndex, [], [], symbolLinks, chapters);

    expect(issues.some((i) => i.type === 'orphaned-symbol-link')).toBe(true);
  });

  it('should detect circular prerequisites', () => {
    const concepts = [
      { ...makeConcept('c1', 'A', 'term', 'ch-1'), prerequisites: ['c2'] },
      { ...makeConcept('c2', 'B', 'term', 'ch-1'), prerequisites: ['c1'] },
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];

    const issues = validateCrossReferences(emptyIndex, concepts, [], [], chapters);

    expect(issues.some((i) => i.type === 'circular-prerequisite')).toBe(true);
  });

  it('should pass for valid references', () => {
    const concepts = [
      makeConcept('c1', 'Lexer', 'term', 'ch-1'),
      makeConcept('c2', 'Parser', 'term', 'ch-2'),
    ];
    const snippets = [makeSnippet('s1', 'file.ts', 'ch-2')];
    const symbolLinks: SymbolLink[] = [
      { symbol: 'Parser', conceptId: 'c2', snippetId: 's1' },
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0), makeChapter('ch-2', 'Chapter 2', 1)];

    const issues = validateCrossReferences(emptyIndex, concepts, snippets, symbolLinks, chapters);

    expect(issues.some((i) => i.type === 'premature-symbol-use')).toBe(false);
  });
});

describe('generateGlossary', () => {
  it('should generate sorted glossary entries', () => {
    const concepts = [
      makeConcept('c1', 'Zebra', 'term', 'ch-1'),
      makeConcept('c2', 'Apple', 'term', 'ch-1'),
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];
    const index = buildCrossReferenceIndex(concepts, [], [], [], [], { chapters });

    const glossary = generateGlossary(concepts, index, chapters);

    expect(glossary[0].name).toBe('Apple');
    expect(glossary[1].name).toBe('Zebra');
  });

  it('should include prerequisite names', () => {
    const concepts = [
      { ...makeConcept('c1', 'Parser', 'type', 'ch-2'), prerequisites: ['c2'] },
      makeConcept('c2', 'Lexer', 'term', 'ch-1'),
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0), makeChapter('ch-2', 'Chapter 2', 1)];
    const index = buildCrossReferenceIndex(concepts, [], [], [], [], { chapters });

    const glossary = generateGlossary(concepts, index, chapters);
    const parserEntry = glossary.find((e) => e.name === 'Parser');

    expect(parserEntry?.prerequisites).toHaveLength(1);
    expect(parserEntry?.prerequisites[0].name).toBe('Lexer');
  });

  it('should include chapter information', () => {
    const concepts = [makeConcept('c1', 'Parser', 'type', 'ch-1')];
    const chapters = [makeChapter('ch-1', 'Getting Started', 0)];
    const index = buildCrossReferenceIndex(concepts, [], [], [], [], { chapters });

    const glossary = generateGlossary(concepts, index, chapters);

    expect(glossary[0].introducedChapter?.title).toBe('Getting Started');
    expect(glossary[0].introducedChapter?.number).toBe(1);
  });
});

describe('generateIndex', () => {
  it('should generate concept index entries', () => {
    const concepts = [makeConcept('c1', 'Parser', 'type', 'ch-1')];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];
    const index = buildCrossReferenceIndex(concepts, [], [], [], [], { chapters });

    const indexEntries = generateIndex(index, concepts, chapters);

    const parserEntry = indexEntries.find((e) => e.term === 'Parser');
    expect(parserEntry).toBeDefined();
    expect(parserEntry?.type).toBe('concept');
    expect(parserEntry?.references[0].isPrimary).toBe(true);
  });

  it('should generate file index entries', () => {
    const snippets = [makeSnippet('s1', 'lexer.ts', 'ch-1')];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];
    const index = buildCrossReferenceIndex([], snippets, [], [], [], { chapters });

    const indexEntries = generateIndex(index, [], chapters);

    const fileEntry = indexEntries.find((e) => e.term === 'lexer.ts');
    expect(fileEntry).toBeDefined();
    expect(fileEntry?.type).toBe('file');
  });

  it('should sort entries alphabetically', () => {
    const concepts = [
      makeConcept('c1', 'Zebra', 'term', 'ch-1'),
      makeConcept('c2', 'Apple', 'term', 'ch-1'),
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];
    const index = buildCrossReferenceIndex(concepts, [], [], [], [], { chapters });

    const indexEntries = generateIndex(index, concepts, chapters);

    expect(indexEntries[0].term).toBe('Apple');
  });
});

describe('generateLinks', () => {
  it('should find concept names in content', () => {
    const concepts = [makeConcept('c1', 'Parser', 'type', 'ch-1')];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];
    const index = buildCrossReferenceIndex(concepts, [], [], [], [], { chapters });

    const links = generateLinks('The Parser handles syntax analysis.', index, concepts);

    expect(links.some((l) => l.text === 'Parser')).toBe(true);
    expect(links[0].targetType).toBe('concept');
  });

  it('should find symbol names in content', () => {
    const concepts = [makeConcept('c1', 'Parser', 'type', 'ch-1')];
    const snippets = [makeSnippet('s1', 'parser.ts', 'ch-1')];
    const symbolLinks: SymbolLink[] = [
      { symbol: 'parseExpression', conceptId: 'c1', snippetId: 's1' },
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];
    const index = buildCrossReferenceIndex(concepts, snippets, symbolLinks, [], [], { chapters });

    const links = generateLinks('Call parseExpression to parse.', index, concepts);

    expect(links.some((l) => l.text === 'parseExpression')).toBe(true);
  });

  it('should include tooltips', () => {
    const concepts = [makeConcept('c1', 'Parser', 'type', 'ch-1')];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];
    const index = buildCrossReferenceIndex(concepts, [], [], [], [], { chapters });

    const links = generateLinks('The Parser is important.', index, concepts);

    expect(links[0].tooltip).toContain('Parser');
  });
});

describe('getFileHistory', () => {
  it('should return null for non-existent files', () => {
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];
    const result = getFileHistory('missing.ts', [], chapters);

    expect(result).toBeNull();
  });

  it('should track file introduction', () => {
    const snippets = [makeSnippet('s1', 'lexer.ts', 'ch-1')];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0)];

    const history = getFileHistory('lexer.ts', snippets, chapters);

    expect(history?.chapters[0].operation).toBe('introduced');
    expect(history?.chapters[0].chapterNumber).toBe(1);
  });

  it('should track file modifications', () => {
    const snippets = [
      makeSnippet('s1', 'lexer.ts', 'ch-1'),
      makeSnippet('s2', 'lexer.ts', 'ch-2'),
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0), makeChapter('ch-2', 'Chapter 2', 1)];

    const history = getFileHistory('lexer.ts', snippets, chapters);

    expect(history?.chapters).toHaveLength(2);
    expect(history?.chapters[0].operation).toBe('introduced');
    expect(history?.chapters[1].operation).toBe('modified');
  });

  it('should order by chapter', () => {
    const snippets = [
      makeSnippet('s2', 'lexer.ts', 'ch-2'),
      makeSnippet('s1', 'lexer.ts', 'ch-1'),
    ];
    const chapters = [makeChapter('ch-1', 'Chapter 1', 0), makeChapter('ch-2', 'Chapter 2', 1)];

    const history = getFileHistory('lexer.ts', snippets, chapters);

    expect(history?.chapters[0].chapterNumber).toBe(1);
    expect(history?.chapters[1].chapterNumber).toBe(2);
  });
});

describe('getConceptChain', () => {
  it('should return null for non-existent concept', () => {
    const result = getConceptChain('missing', []);
    expect(result).toBeNull();
  });

  it('should return empty prerequisites for concept with none', () => {
    const concepts = [makeConcept('c1', 'Parser', 'type')];

    const chain = getConceptChain('c1', concepts);

    expect(chain?.prerequisites).toHaveLength(0);
  });

  it('should collect direct prerequisites', () => {
    const concepts = [
      { ...makeConcept('c1', 'Parser', 'type'), prerequisites: ['c2'] },
      makeConcept('c2', 'Lexer', 'term'),
    ];

    const chain = getConceptChain('c1', concepts);

    expect(chain?.prerequisites).toHaveLength(1);
    expect(chain?.prerequisites[0].conceptName).toBe('Lexer');
  });

  it('should collect transitive prerequisites', () => {
    const concepts = [
      { ...makeConcept('c1', 'Parser', 'type'), prerequisites: ['c2'] },
      { ...makeConcept('c2', 'Lexer', 'term'), prerequisites: ['c3'] },
      makeConcept('c3', 'Token', 'term'),
    ];

    const chain = getConceptChain('c1', concepts);

    expect(chain?.prerequisites).toHaveLength(2);
    expect(chain?.prerequisites.map((p) => p.conceptName)).toContain('Lexer');
    expect(chain?.prerequisites.map((p) => p.conceptName)).toContain('Token');
  });

  it('should track depth', () => {
    const concepts = [
      { ...makeConcept('c1', 'Parser', 'type'), prerequisites: ['c2'] },
      { ...makeConcept('c2', 'Lexer', 'term'), prerequisites: ['c3'] },
      makeConcept('c3', 'Token', 'term'),
    ];

    const chain = getConceptChain('c1', concepts);

    const lexer = chain?.prerequisites.find((p) => p.conceptName === 'Lexer');
    const token = chain?.prerequisites.find((p) => p.conceptName === 'Token');

    expect(lexer?.depth).toBe(1);
    expect(token?.depth).toBe(2);
  });
});
