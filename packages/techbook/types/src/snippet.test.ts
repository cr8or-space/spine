import { describe, expect, it } from 'vitest';

import {
  FileEvolutionSchema,
  FilePartSchema,
  SnippetHistoryEntrySchema,
  SnippetOperationSchema,
  SnippetSchema,
  SnippetSummarySchema,
  TangledFileSchema,
  TangleResultSchema,
} from './snippet';

describe('SnippetOperationSchema', () => {
  it('validates all operations', () => {
    const operations = ['introduce', 'replace', 'append', 'prepend', 'delete'];
    for (const op of operations) {
      const result = SnippetOperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid operations', () => {
    const result = SnippetOperationSchema.safeParse('insert');
    expect(result.success).toBe(false);
  });
});

describe('FilePartSchema', () => {
  it('validates a complete file part', () => {
    const part = {
      name: 'parseExpression',
      file: 'src/parser.ts',
      parentPart: 'Parser',
      startLine: 10,
      endLine: 50,
    };
    const result = FilePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('validates minimal file part', () => {
    const part = {
      name: 'main',
      file: 'src/main.ts',
    };
    const result = FilePartSchema.safeParse(part);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const part = {
      name: '',
      file: 'src/main.ts',
    };
    const result = FilePartSchema.safeParse(part);
    expect(result.success).toBe(false);
  });

  it('rejects empty file', () => {
    const part = {
      name: 'main',
      file: '',
    };
    const result = FilePartSchema.safeParse(part);
    expect(result.success).toBe(false);
  });
});

describe('SnippetSchema', () => {
  const validSnippet = {
    id: 'snippet-001',
    entityType: 'snippet' as const,
    name: 'Initial parseExpression',
    file: 'src/parser.ts',
    part: 'parseExpression',
    operation: 'introduce' as const,
    language: 'typescript',
    code: 'function parseExpression(): Expr {\n  return parsePrimary();\n}',
    chapterId: 'chapter-03',
    order: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete snippet', () => {
    const result = SnippetSchema.safeParse(validSnippet);
    expect(result.success).toBe(true);
  });

  it('applies default entityType', () => {
    const snippetWithoutType = {
      id: validSnippet.id,
      name: validSnippet.name,
      file: validSnippet.file,
      operation: validSnippet.operation,
      language: validSnippet.language,
      code: validSnippet.code,
      chapterId: validSnippet.chapterId,
      order: validSnippet.order,
      createdAt: validSnippet.createdAt,
      updatedAt: validSnippet.updatedAt,
    };
    const result = SnippetSchema.safeParse(snippetWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('snippet');
    }
  });

  it('allows snippet without part (whole file)', () => {
    const wholeFileSnippet = {
      ...validSnippet,
      part: undefined,
    };
    const result = SnippetSchema.safeParse(wholeFileSnippet);
    expect(result.success).toBe(true);
  });

  it('validates snippet with explanationId', () => {
    const snippetWithExplanation = {
      ...validSnippet,
      explanationId: 'prose-001',
    };
    const result = SnippetSchema.safeParse(snippetWithExplanation);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.explanationId).toBe('prose-001');
    }
  });

  it('allows empty code (for delete operation)', () => {
    const deleteSnippet = {
      ...validSnippet,
      operation: 'delete' as const,
      code: '',
    };
    const result = SnippetSchema.safeParse(deleteSnippet);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalidSnippet = {
      ...validSnippet,
      name: '',
    };
    const result = SnippetSchema.safeParse(invalidSnippet);
    expect(result.success).toBe(false);
  });

  it('rejects empty file', () => {
    const invalidSnippet = {
      ...validSnippet,
      file: '',
    };
    const result = SnippetSchema.safeParse(invalidSnippet);
    expect(result.success).toBe(false);
  });

  it('rejects empty language', () => {
    const invalidSnippet = {
      ...validSnippet,
      language: '',
    };
    const result = SnippetSchema.safeParse(invalidSnippet);
    expect(result.success).toBe(false);
  });

  it('rejects negative order', () => {
    const invalidSnippet = {
      ...validSnippet,
      order: -1,
    };
    const result = SnippetSchema.safeParse(invalidSnippet);
    expect(result.success).toBe(false);
  });
});

describe('SnippetSummarySchema', () => {
  it('validates a summary', () => {
    const summary = {
      id: 'snippet-001',
      name: 'Initial parseExpression',
      file: 'src/parser.ts',
      part: 'parseExpression',
      operation: 'introduce' as const,
      language: 'typescript',
      lineCount: 3,
      chapterId: 'chapter-03',
    };
    const result = SnippetSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('allows missing part', () => {
    const summary = {
      id: 'snippet-001',
      name: 'Main file',
      file: 'src/main.ts',
      operation: 'introduce' as const,
      language: 'typescript',
      lineCount: 10,
      chapterId: 'chapter-01',
    };
    const result = SnippetSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});

describe('TangledFileSchema', () => {
  it('validates a tangled file', () => {
    const tangledFile = {
      path: 'src/parser.ts',
      content: 'function parseExpression(): Expr {\n  return parsePrimary();\n}',
      parts: [
        {
          name: 'parseExpression',
          file: 'src/parser.ts',
          startLine: 1,
          endLine: 3,
        },
      ],
      sourceSnippetIds: ['snippet-001', 'snippet-002'],
      contentHash: 'abc123',
    };
    const result = TangledFileSchema.safeParse(tangledFile);
    expect(result.success).toBe(true);
  });

  it('validates tangled file without hash', () => {
    const tangledFile = {
      path: 'src/main.ts',
      content: 'console.log("Hello");',
      parts: [],
      sourceSnippetIds: ['snippet-003'],
    };
    const result = TangledFileSchema.safeParse(tangledFile);
    expect(result.success).toBe(true);
  });
});

describe('TangleResultSchema', () => {
  it('validates a successful tangle result', () => {
    const result = {
      success: true,
      files: [
        {
          path: 'src/parser.ts',
          content: 'code here',
          parts: [],
          sourceSnippetIds: ['snippet-001'],
        },
      ],
      errors: [],
      tangledAt: '2024-01-01T00:00:00Z',
    };
    const parsed = TangleResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('validates a failed tangle result', () => {
    const result = {
      success: false,
      files: [],
      errors: [
        {
          snippetId: 'snippet-001',
          file: 'src/parser.ts',
          message: 'Part not found: parseExpression',
        },
      ],
      tangledAt: '2024-01-01T00:00:00Z',
    };
    const parsed = TangleResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('SnippetHistoryEntrySchema', () => {
  it('validates a history entry', () => {
    const entry = {
      snippetId: 'snippet-001',
      chapterId: 'chapter-03',
      operation: 'introduce' as const,
      description: 'Initial implementation',
    };
    const result = SnippetHistoryEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  it('allows entry without description', () => {
    const entry = {
      snippetId: 'snippet-002',
      chapterId: 'chapter-07',
      operation: 'replace' as const,
    };
    const result = SnippetHistoryEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });
});

describe('FileEvolutionSchema', () => {
  it('validates file evolution', () => {
    const evolution = {
      file: 'src/parser.ts',
      part: 'parseExpression',
      history: [
        {
          snippetId: 'snippet-001',
          chapterId: 'chapter-03',
          operation: 'introduce' as const,
          description: 'Initial implementation',
        },
        {
          snippetId: 'snippet-005',
          chapterId: 'chapter-07',
          operation: 'replace' as const,
          description: 'Add precedence handling',
        },
      ],
    };
    const result = FileEvolutionSchema.safeParse(evolution);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history).toHaveLength(2);
    }
  });

  it('validates evolution for whole file (no part)', () => {
    const evolution = {
      file: 'src/main.ts',
      history: [],
    };
    const result = FileEvolutionSchema.safeParse(evolution);
    expect(result.success).toBe(true);
  });
});
