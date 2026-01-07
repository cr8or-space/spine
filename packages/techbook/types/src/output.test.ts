import { describe, expect, it } from 'vitest';

import {
  ComparatorTypeSchema,
  ExpectedOutputSchema,
  ExpectedOutputSummarySchema,
  OutputComparisonSchema,
  OutputTypeSchema,
  OutputValidationResultSchema,
} from './output';

describe('OutputTypeSchema', () => {
  it('validates all output types', () => {
    const types = ['text', 'image', 'json', 'custom'];
    for (const type of types) {
      const result = OutputTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = OutputTypeSchema.safeParse('binary');
    expect(result.success).toBe(false);
  });
});

describe('ComparatorTypeSchema', () => {
  it('validates all comparator types', () => {
    const types = ['exact', 'text', 'image-diff', 'json-deep', 'regex', 'custom'];
    for (const type of types) {
      const result = ComparatorTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid comparator', () => {
    const result = ComparatorTypeSchema.safeParse('fuzzy');
    expect(result.success).toBe(false);
  });
});

describe('ExpectedOutputSchema', () => {
  const validOutput = {
    id: 'output-001',
    entityType: 'expected-output' as const,
    name: 'REPL addition test',
    description: 'Tests that 1 + 2 = 3 in the REPL',
    type: 'text' as const,
    comparator: 'text' as const,
    checkpointId: 'checkpoint-001',
    fixturePath: 'fixtures/repl-addition.txt',
    command: 'echo "1 + 2" | ./build/repl',
    workingDir: '.',
    outputPath: 'stdout',
    env: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete expected output', () => {
    const result = ExpectedOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it('applies default entityType', () => {
    const outputWithoutType = {
      id: validOutput.id,
      name: validOutput.name,
      type: validOutput.type,
      comparator: validOutput.comparator,
      checkpointId: validOutput.checkpointId,
      fixturePath: validOutput.fixturePath,
      command: validOutput.command,
      createdAt: validOutput.createdAt,
      updatedAt: validOutput.updatedAt,
    };
    const result = ExpectedOutputSchema.safeParse(outputWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('expected-output');
    }
  });

  it('applies defaults for workingDir, outputPath, env', () => {
    const minimalOutput = {
      id: validOutput.id,
      name: validOutput.name,
      type: validOutput.type,
      comparator: validOutput.comparator,
      checkpointId: validOutput.checkpointId,
      fixturePath: validOutput.fixturePath,
      command: validOutput.command,
      createdAt: validOutput.createdAt,
      updatedAt: validOutput.updatedAt,
    };
    const result = ExpectedOutputSchema.safeParse(minimalOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workingDir).toBe('.');
      expect(result.data.outputPath).toBe('stdout');
      expect(result.data.env).toEqual({});
    }
  });

  it('validates image output with tolerance', () => {
    const imageOutput = {
      ...validOutput,
      type: 'image' as const,
      comparator: 'image-diff' as const,
      tolerance: 0.05,
      fixturePath: 'fixtures/screenshot.png',
      command: './build/app --screenshot output.png',
      outputPath: 'output.png',
    };
    const result = ExpectedOutputSchema.safeParse(imageOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tolerance).toBe(0.05);
    }
  });

  it('validates output with environment variables', () => {
    const outputWithEnv = {
      ...validOutput,
      env: {
        NODE_ENV: 'test',
        DEBUG: 'true',
      },
    };
    const result = ExpectedOutputSchema.safeParse(outputWithEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.env).toEqual({ NODE_ENV: 'test', DEBUG: 'true' });
    }
  });

  it('validates regex comparator with pattern', () => {
    const regexOutput = {
      ...validOutput,
      comparator: 'regex' as const,
      pattern: 'Result: \\d+',
    };
    const result = ExpectedOutputSchema.safeParse(regexOutput);
    expect(result.success).toBe(true);
  });

  it('validates custom comparator with command', () => {
    const customOutput = {
      ...validOutput,
      comparator: 'custom' as const,
      customComparator: './compare-outputs.sh',
    };
    const result = ExpectedOutputSchema.safeParse(customOutput);
    expect(result.success).toBe(true);
  });

  it('rejects tolerance out of range', () => {
    const invalidOutput = {
      ...validOutput,
      tolerance: 1.5,
    };
    const result = ExpectedOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const invalidOutput = {
      ...validOutput,
      name: '',
    };
    const result = ExpectedOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
  });

  it('rejects empty fixturePath', () => {
    const invalidOutput = {
      ...validOutput,
      fixturePath: '',
    };
    const result = ExpectedOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
  });

  it('rejects empty command', () => {
    const invalidOutput = {
      ...validOutput,
      command: '',
    };
    const result = ExpectedOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
  });
});

describe('OutputComparisonSchema', () => {
  it('validates a matching comparison', () => {
    const comparison = {
      expectedOutputId: 'output-001',
      expectedOutputName: 'REPL addition test',
      matches: true,
      actualOutput: '3\n',
      durationMs: 150,
    };
    const result = OutputComparisonSchema.safeParse(comparison);
    expect(result.success).toBe(true);
  });

  it('validates a non-matching comparison', () => {
    const comparison = {
      expectedOutputId: 'output-001',
      expectedOutputName: 'REPL addition test',
      matches: false,
      actualOutput: '4\n',
      diff: '- 3\n+ 4',
    };
    const result = OutputComparisonSchema.safeParse(comparison);
    expect(result.success).toBe(true);
  });

  it('validates comparison with error', () => {
    const comparison = {
      expectedOutputId: 'output-001',
      expectedOutputName: 'REPL addition test',
      matches: false,
      error: 'Command failed with exit code 1',
    };
    const result = OutputComparisonSchema.safeParse(comparison);
    expect(result.success).toBe(true);
  });

  it('validates image comparison with diff image path', () => {
    const comparison = {
      expectedOutputId: 'output-002',
      expectedOutputName: 'Screenshot test',
      matches: false,
      diff: '5.2% pixel difference',
      diffImagePath: '.diffs/output-002-diff.png',
    };
    const result = OutputComparisonSchema.safeParse(comparison);
    expect(result.success).toBe(true);
  });
});

describe('OutputValidationResultSchema', () => {
  it('validates a passing result', () => {
    const result = {
      checkpointId: 'checkpoint-001',
      success: true,
      total: 5,
      passed: 5,
      failed: 0,
      comparisons: [
        {
          expectedOutputId: 'output-001',
          expectedOutputName: 'Test 1',
          matches: true,
        },
      ],
      validatedAt: '2024-01-02T00:00:00Z',
    };
    const parsed = OutputValidationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('validates a failing result', () => {
    const result = {
      checkpointId: 'checkpoint-001',
      success: false,
      total: 5,
      passed: 3,
      failed: 2,
      comparisons: [
        {
          expectedOutputId: 'output-001',
          expectedOutputName: 'Test 1',
          matches: true,
        },
        {
          expectedOutputId: 'output-002',
          expectedOutputName: 'Test 2',
          matches: false,
          diff: 'Expected X, got Y',
        },
      ],
      validatedAt: '2024-01-02T00:00:00Z',
    };
    const parsed = OutputValidationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('ExpectedOutputSummarySchema', () => {
  it('validates a summary', () => {
    const summary = {
      id: 'output-001',
      name: 'REPL addition test',
      type: 'text' as const,
      comparator: 'text' as const,
      checkpointId: 'checkpoint-001',
    };
    const result = ExpectedOutputSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});
