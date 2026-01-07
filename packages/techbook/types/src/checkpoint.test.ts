import { describe, expect, it } from 'vitest';

import {
  CheckpointSchema,
  CheckpointSnapshotSchema,
  CheckpointStatusSchema,
  CheckpointSummarySchema,
  CheckpointValidationResultSchema,
  CompileResultSchema,
  TestResultSchema,
} from './checkpoint';

describe('CheckpointStatusSchema', () => {
  it('validates all statuses', () => {
    const statuses = ['pending', 'validated', 'failed', 'released'];
    for (const status of statuses) {
      const result = CheckpointStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = CheckpointStatusSchema.safeParse('complete');
    expect(result.success).toBe(false);
  });
});

describe('CompileResultSchema', () => {
  it('validates a successful compile', () => {
    const result = {
      success: true,
      output: 'Compilation successful',
      errors: [],
      durationMs: 1500,
    };
    const parsed = CompileResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('validates a failed compile with errors', () => {
    const result = {
      success: false,
      output: 'Compilation failed',
      errors: [
        {
          file: 'src/parser.ts',
          line: 42,
          column: 10,
          message: "Cannot find name 'Expr'",
          severity: 'error' as const,
        },
        {
          file: 'src/parser.ts',
          line: 50,
          message: 'Missing semicolon',
          severity: 'warning' as const,
        },
      ],
    };
    const parsed = CompileResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('applies default for errors', () => {
    const result = {
      success: true,
      output: 'OK',
    };
    const parsed = CompileResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.errors).toEqual([]);
    }
  });
});

describe('TestResultSchema', () => {
  it('validates successful test result', () => {
    const result = {
      success: true,
      passed: 42,
      failed: 0,
      skipped: 2,
      output: 'All tests passed',
      failures: [],
      durationMs: 5000,
    };
    const parsed = TestResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('validates failed test result', () => {
    const result = {
      success: false,
      passed: 40,
      failed: 2,
      skipped: 0,
      output: 'Some tests failed',
      failures: [
        {
          testName: 'parseExpression handles precedence',
          file: 'tests/parser.test.ts',
          message: 'Expected 6, got 7',
          expected: '6',
          actual: '7',
        },
        {
          testName: 'parsePrimary handles literals',
          message: 'Assertion failed',
        },
      ],
    };
    const parsed = TestResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.failures).toHaveLength(2);
    }
  });

  it('applies defaults', () => {
    const result = {
      success: true,
      passed: 10,
      failed: 0,
      output: 'OK',
    };
    const parsed = TestResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.skipped).toBe(0);
      expect(parsed.data.failures).toEqual([]);
    }
  });
});

describe('CheckpointSchema', () => {
  const validCheckpoint = {
    id: 'checkpoint-001',
    entityType: 'checkpoint' as const,
    name: 'chapter-03-complete',
    description: 'After completing the lexer implementation',
    chapterId: 'chapter-03',
    status: 'pending' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete checkpoint', () => {
    const result = CheckpointSchema.safeParse(validCheckpoint);
    expect(result.success).toBe(true);
  });

  it('applies default entityType', () => {
    const checkpointWithoutType = {
      id: validCheckpoint.id,
      name: validCheckpoint.name,
      chapterId: validCheckpoint.chapterId,
      createdAt: validCheckpoint.createdAt,
      updatedAt: validCheckpoint.updatedAt,
    };
    const result = CheckpointSchema.safeParse(checkpointWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('checkpoint');
    }
  });

  it('applies default status', () => {
    const checkpointWithoutStatus = {
      id: validCheckpoint.id,
      name: validCheckpoint.name,
      chapterId: validCheckpoint.chapterId,
      createdAt: validCheckpoint.createdAt,
      updatedAt: validCheckpoint.updatedAt,
    };
    const result = CheckpointSchema.safeParse(checkpointWithoutStatus);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('pending');
    }
  });

  it('validates checkpoint with validation results', () => {
    const checkpointWithResults = {
      ...validCheckpoint,
      status: 'validated' as const,
      validatedAt: '2024-01-02T00:00:00Z',
      compileResult: {
        success: true,
        output: 'OK',
        errors: [],
      },
      testResult: {
        success: true,
        passed: 25,
        failed: 0,
        output: 'All tests passed',
      },
    };
    const result = CheckpointSchema.safeParse(checkpointWithResults);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalidCheckpoint = {
      ...validCheckpoint,
      name: '',
    };
    const result = CheckpointSchema.safeParse(invalidCheckpoint);
    expect(result.success).toBe(false);
  });
});

describe('CheckpointSummarySchema', () => {
  it('validates a summary', () => {
    const summary = {
      id: 'checkpoint-001',
      name: 'chapter-03-complete',
      chapterId: 'chapter-03',
      status: 'validated' as const,
      compilePassed: true,
      testsPassed: true,
    };
    const result = CheckpointSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('allows missing compile/test passed', () => {
    const summary = {
      id: 'checkpoint-001',
      name: 'chapter-03-complete',
      chapterId: 'chapter-03',
      status: 'pending' as const,
    };
    const result = CheckpointSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});

describe('CheckpointSnapshotSchema', () => {
  it('validates a snapshot', () => {
    const snapshot = {
      checkpointId: 'checkpoint-001',
      createdAt: '2024-01-02T00:00:00Z',
      contentHash: 'sha256-abc123def456',
      fileHashes: {
        'src/parser.ts': 'sha256-111',
        'src/lexer.ts': 'sha256-222',
      },
      storagePath: '.snapshots/checkpoint-001',
    };
    const result = CheckpointSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
  });

  it('allows missing storagePath', () => {
    const snapshot = {
      checkpointId: 'checkpoint-001',
      createdAt: '2024-01-02T00:00:00Z',
      contentHash: 'sha256-abc123',
      fileHashes: {},
    };
    const result = CheckpointSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
  });
});

describe('CheckpointValidationResultSchema', () => {
  it('validates a successful result', () => {
    const result = {
      checkpointId: 'checkpoint-001',
      success: true,
      validatedAt: '2024-01-02T00:00:00Z',
      tangleResult: {
        success: true,
        fileCount: 5,
        errors: [],
      },
      compileResult: {
        success: true,
        output: 'OK',
        errors: [],
      },
      testResult: {
        success: true,
        passed: 25,
        failed: 0,
        output: 'All passed',
      },
      totalDurationMs: 10000,
    };
    const parsed = CheckpointValidationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('validates a failed result', () => {
    const result = {
      checkpointId: 'checkpoint-001',
      success: false,
      validatedAt: '2024-01-02T00:00:00Z',
      tangleResult: {
        success: false,
        fileCount: 0,
        errors: ['Missing snippet for file src/parser.ts'],
      },
      totalDurationMs: 100,
    };
    const parsed = CheckpointValidationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});
