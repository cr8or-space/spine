import { describe, expect, it } from 'vitest';

import {
  ConceptDependencySchema,
  ConceptExampleSchema,
  ConceptSchema,
  ConceptSummarySchema,
  ConceptTypeSchema,
  ConceptValidationResultSchema,
  ConceptViolationSchema,
  SymbolLinkSchema,
} from './concept';

describe('ConceptTypeSchema', () => {
  it('validates all concept types', () => {
    const types = ['term', 'type', 'algorithm', 'pattern', 'principle'];
    for (const type of types) {
      const result = ConceptTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid types', () => {
    const result = ConceptTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});

describe('ConceptExampleSchema', () => {
  it('validates a complete example', () => {
    const example = {
      content: 'const x: number = 42;',
      language: 'typescript',
      explanation: 'Declares a typed constant',
    };
    const result = ConceptExampleSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('validates minimal example', () => {
    const example = {
      content: 'example code',
    };
    const result = ConceptExampleSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const example = {
      content: '',
      language: 'typescript',
    };
    const result = ConceptExampleSchema.safeParse(example);
    expect(result.success).toBe(false);
  });
});

describe('SymbolLinkSchema', () => {
  it('validates a valid symbol link', () => {
    const link = {
      symbol: 'parseExpression',
      conceptId: 'concept-123',
      snippetId: 'snippet-456',
    };
    const result = SymbolLinkSchema.safeParse(link);
    expect(result.success).toBe(true);
  });

  it('rejects empty symbol', () => {
    const link = {
      symbol: '',
      conceptId: 'concept-123',
      snippetId: 'snippet-456',
    };
    const result = SymbolLinkSchema.safeParse(link);
    expect(result.success).toBe(false);
  });
});

describe('ConceptSchema', () => {
  const validConcept = {
    id: 'concept-001',
    entityType: 'concept' as const,
    name: 'Token',
    type: 'type' as const,
    definition: 'A token represents a single unit of syntax in a source file.',
    prerequisites: [],
    relatedSymbols: ['Token', 'TokenType'],
    examples: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete concept', () => {
    const result = ConceptSchema.safeParse(validConcept);
    expect(result.success).toBe(true);
  });

  it('applies default entityType', () => {
    const conceptWithoutType = {
      id: validConcept.id,
      name: validConcept.name,
      type: validConcept.type,
      definition: validConcept.definition,
      createdAt: validConcept.createdAt,
      updatedAt: validConcept.updatedAt,
    };
    const result = ConceptSchema.safeParse(conceptWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('concept');
    }
  });

  it('applies default for prerequisites', () => {
    const conceptWithoutPrereqs = {
      id: validConcept.id,
      name: validConcept.name,
      type: validConcept.type,
      definition: validConcept.definition,
      createdAt: validConcept.createdAt,
      updatedAt: validConcept.updatedAt,
    };
    const result = ConceptSchema.safeParse(conceptWithoutPrereqs);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prerequisites).toEqual([]);
    }
  });

  it('validates concept with prerequisites', () => {
    const conceptWithPrereqs = {
      ...validConcept,
      prerequisites: ['concept-prereq-1', 'concept-prereq-2'],
    };
    const result = ConceptSchema.safeParse(conceptWithPrereqs);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prerequisites).toHaveLength(2);
    }
  });

  it('validates concept with examples', () => {
    const conceptWithExamples = {
      ...validConcept,
      examples: [
        {
          content: 'const token: Token = scanner.scanToken();',
          language: 'typescript',
          explanation: 'Scanning produces a token',
        },
      ],
    };
    const result = ConceptSchema.safeParse(conceptWithExamples);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.examples).toHaveLength(1);
    }
  });

  it('allows optional introducedAt', () => {
    const conceptWithIntro = {
      ...validConcept,
      introducedAt: 'chapter-03',
    };
    const result = ConceptSchema.safeParse(conceptWithIntro);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.introducedAt).toBe('chapter-03');
    }
  });

  it('rejects empty name', () => {
    const invalidConcept = {
      ...validConcept,
      name: '',
    };
    const result = ConceptSchema.safeParse(invalidConcept);
    expect(result.success).toBe(false);
  });

  it('rejects empty definition', () => {
    const invalidConcept = {
      ...validConcept,
      definition: '',
    };
    const result = ConceptSchema.safeParse(invalidConcept);
    expect(result.success).toBe(false);
  });
});

describe('ConceptSummarySchema', () => {
  it('validates a valid summary', () => {
    const summary = {
      id: 'concept-001',
      name: 'Token',
      type: 'type' as const,
      brief: 'A single unit of syntax',
      prerequisiteCount: 2,
    };
    const result = ConceptSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('rejects negative prerequisiteCount', () => {
    const summary = {
      id: 'concept-001',
      name: 'Token',
      type: 'type' as const,
      brief: 'A single unit of syntax',
      prerequisiteCount: -1,
    };
    const result = ConceptSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });
});

describe('ConceptViolationSchema', () => {
  it('validates a violation', () => {
    const violation = {
      conceptId: 'concept-001',
      conceptName: 'Token',
      usedInChapterId: 'chapter-01',
      usedInChapterTitle: 'The Beginning',
      introducedInChapterId: 'chapter-03',
      introducedInChapterTitle: 'Tokens and Scanning',
    };
    const result = ConceptViolationSchema.safeParse(violation);
    expect(result.success).toBe(true);
  });

  it('allows minimal violation (no titles)', () => {
    const violation = {
      conceptId: 'concept-001',
      conceptName: 'Token',
      usedInChapterId: 'chapter-01',
    };
    const result = ConceptViolationSchema.safeParse(violation);
    expect(result.success).toBe(true);
  });
});

describe('ConceptDependencySchema', () => {
  it('validates a dependency edge', () => {
    const dep = {
      fromId: 'concept-parser',
      toId: 'concept-token',
    };
    const result = ConceptDependencySchema.safeParse(dep);
    expect(result.success).toBe(true);
  });
});

describe('ConceptValidationResultSchema', () => {
  it('validates a passing result', () => {
    const result = {
      valid: true,
      cycles: [],
      violations: [],
      suggestedOrder: ['concept-1', 'concept-2', 'concept-3'],
    };
    const parsed = ConceptValidationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('validates a failing result with cycles', () => {
    const result = {
      valid: false,
      cycles: [['concept-a', 'concept-b', 'concept-a']],
      violations: [],
    };
    const parsed = ConceptValidationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('validates a failing result with violations', () => {
    const result = {
      valid: false,
      cycles: [],
      violations: [
        {
          conceptId: 'concept-001',
          conceptName: 'Token',
          usedInChapterId: 'chapter-01',
        },
      ],
    };
    const parsed = ConceptValidationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});
