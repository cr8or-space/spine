/**
 * Tests for output fixture comparison
 */

import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ExpectedOutput } from '@repo/techbook-types';

import {
  compareJson,
  compareRegex,
  compareText,
  createJsonFixture,
  createTextDiff,
  createTextFixture,
  formatOutputResults,
  getSupportedComparators,
  isValidComparator,
  normalizeText,
  readFixture,
  runCommand,
  validateOutput,
  validateOutputs,
} from './output';

// Helper to create a unique temp directory
async function createTempDir(): Promise<string> {
  const dir = path.join(
    tmpdir(),
    `output-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

// Helper to clean up temp directory
async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// Helper to create expected output for testing
function createExpectedOutput(overrides: Partial<ExpectedOutput>): ExpectedOutput {
  const now = new Date().toISOString();
  return {
    id: 'test-output-1',
    entityType: 'expected-output',
    name: 'Test Output',
    description: '',
    type: 'text',
    comparator: 'text',
    checkpointId: 'checkpoint-1',
    fixturePath: 'fixture.txt',
    command: 'echo "test"',
    workingDir: '.',
    outputPath: 'stdout',
    env: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('normalizeText', () => {
  it('should trim leading/trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('should normalize CRLF to LF', () => {
    expect(normalizeText('line1\r\nline2\r\n')).toBe('line1\nline2');
  });

  it('should remove trailing whitespace from lines', () => {
    expect(normalizeText('line1   \nline2  ')).toBe('line1\nline2');
  });

  it('should handle empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('should handle multi-line text', () => {
    const input = '  first line  \r\n  second line\t\r\n  third line  ';
    const expected = 'first line\n  second line\n  third line';
    expect(normalizeText(input)).toBe(expected);
  });
});

describe('compareText', () => {
  describe('exact mode', () => {
    it('should match identical strings', () => {
      const result = compareText('hello world', 'hello world', 'exact');
      expect(result.matches).toBe(true);
      expect(result.diff).toBeUndefined();
    });

    it('should not match different strings', () => {
      const result = compareText('hello', 'world', 'exact');
      expect(result.matches).toBe(false);
      expect(result.diff).toBeDefined();
    });

    it('should distinguish whitespace differences', () => {
      const result = compareText('hello ', 'hello', 'exact');
      expect(result.matches).toBe(false);
    });
  });

  describe('text mode', () => {
    it('should match identical strings', () => {
      const result = compareText('hello world', 'hello world', 'text');
      expect(result.matches).toBe(true);
    });

    it('should ignore trailing whitespace', () => {
      const result = compareText('hello   ', 'hello', 'text');
      expect(result.matches).toBe(true);
    });

    it('should ignore CRLF vs LF differences', () => {
      const result = compareText('line1\r\nline2', 'line1\nline2', 'text');
      expect(result.matches).toBe(true);
    });

    it('should detect content differences', () => {
      const result = compareText('hello', 'world', 'text');
      expect(result.matches).toBe(false);
      expect(result.diff).toBeDefined();
    });
  });
});

describe('createTextDiff', () => {
  it('should return empty string for identical inputs', () => {
    const diff = createTextDiff('hello', 'hello');
    expect(diff).toBe('');
  });

  it('should show line differences', () => {
    const diff = createTextDiff('line1\nline2', 'line1\nchanged');
    expect(diff).toContain('line2');
    expect(diff).toContain('changed');
  });

  it('should limit output for large diffs', () => {
    const expected = Array.from({ length: 50 }, (_, i) => `line${i}`).join('\n');
    const actual = Array.from({ length: 50 }, (_, i) => `different${i}`).join('\n');
    const diff = createTextDiff(expected, actual);
    expect(diff).toContain('more differences');
  });
});

describe('compareJson', () => {
  it('should match identical objects', () => {
    const result = compareJson('{"a": 1, "b": 2}', '{"a": 1, "b": 2}');
    expect(result.matches).toBe(true);
  });

  it('should match regardless of key order', () => {
    const result = compareJson('{"b": 2, "a": 1}', '{"a": 1, "b": 2}');
    expect(result.matches).toBe(true);
  });

  it('should detect value differences', () => {
    const result = compareJson('{"a": 1}', '{"a": 2}');
    expect(result.matches).toBe(false);
  });

  it('should detect missing keys', () => {
    const result = compareJson('{"a": 1}', '{"a": 1, "b": 2}');
    expect(result.matches).toBe(false);
  });

  it('should handle arrays', () => {
    const result = compareJson('[1, 2, 3]', '[1, 2, 3]');
    expect(result.matches).toBe(true);
  });

  it('should detect array order differences', () => {
    const result = compareJson('[1, 2, 3]', '[3, 2, 1]');
    expect(result.matches).toBe(false);
  });

  it('should handle nested objects', () => {
    const obj1 = JSON.stringify({ a: { b: { c: 1 } } });
    const obj2 = JSON.stringify({ a: { b: { c: 1 } } });
    const result = compareJson(obj1, obj2);
    expect(result.matches).toBe(true);
  });

  it('should handle invalid JSON', () => {
    const result = compareJson('not json', '{"a": 1}');
    expect(result.matches).toBe(false);
    expect(result.diff).toContain('parse error');
  });

  it('should handle null values', () => {
    const result = compareJson('null', 'null');
    expect(result.matches).toBe(true);
  });
});

describe('compareRegex', () => {
  it('should match when pattern matches', () => {
    const result = compareRegex('hello world 123', 'hello.*\\d+');
    expect(result.matches).toBe(true);
  });

  it('should not match when pattern fails', () => {
    const result = compareRegex('hello world', '\\d+');
    expect(result.matches).toBe(false);
  });

  it('should handle multiline with dotall', () => {
    const result = compareRegex('line1\nline2', 'line1.*line2');
    expect(result.matches).toBe(true);
  });

  it('should handle invalid regex', () => {
    const result = compareRegex('test', '[invalid');
    expect(result.matches).toBe(false);
    expect(result.diff).toContain('Invalid regex');
  });
});

describe('readFixture', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should read existing fixture file', async () => {
    const fixturePath = path.join(tempDir, 'test.txt');
    await fs.writeFile(fixturePath, 'fixture content');

    const content = await readFixture(fixturePath);
    expect(content).toBe('fixture content');
  });

  it('should return null for missing file', async () => {
    const content = await readFixture(path.join(tempDir, 'nonexistent.txt'));
    expect(content).toBeNull();
  });
});

describe('runCommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should run command and capture stdout', async () => {
    const result = await runCommand('echo "hello"', { workingDir: tempDir });
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('hello');
    expect(result.exitCode).toBe(0);
  });

  it('should capture failed command', async () => {
    const result = await runCommand('exit 1', { workingDir: tempDir });
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('should pass environment variables', async () => {
    const result = await runCommand('echo $MY_VAR', {
      workingDir: tempDir,
      env: { MY_VAR: 'test_value' },
    });
    expect(result.stdout).toContain('test_value');
  });

  it('should handle timeout', async () => {
    const result = await runCommand('sleep 10', {
      workingDir: tempDir,
      timeout: 100,
    });
    expect(result.success).toBe(false);
    expect(result.durationMs).toBeLessThan(5000);
  });

  it('should read from output file when specified', async () => {
    const outputFile = path.join(tempDir, 'output.txt');
    await fs.writeFile(outputFile, 'file content');

    const result = await runCommand('echo "ignored"', {
      workingDir: tempDir,
      outputPath: 'output.txt',
    });
    expect(result.stdout).toBe('file content');
  });

  it('should return error when output file missing', async () => {
    const result = await runCommand('echo "test"', {
      workingDir: tempDir,
      outputPath: 'nonexistent.txt',
    });
    expect(result.success).toBe(false);
    expect(result.stderr).toContain('Failed to read output file');
  });
});

describe('validateOutput', () => {
  let tempDir: string;
  let fixturesDir: string;
  let buildDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    fixturesDir = path.join(tempDir, 'fixtures');
    buildDir = path.join(tempDir, 'build');
    await fs.mkdir(fixturesDir, { recursive: true });
    await fs.mkdir(buildDir, { recursive: true });
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should validate matching text output', async () => {
    await fs.writeFile(path.join(fixturesDir, 'expected.txt'), 'hello\n');

    const expectedOutput = createExpectedOutput({
      fixturePath: 'expected.txt',
      command: 'echo "hello"',
      comparator: 'text',
    });

    const result = await validateOutput(expectedOutput, { buildDir, fixturesDir });

    expect(result.matches).toBe(true);
    expect(result.expectedOutputId).toBe('test-output-1');
  });

  it('should detect mismatched output', async () => {
    await fs.writeFile(path.join(fixturesDir, 'expected.txt'), 'hello');

    const expectedOutput = createExpectedOutput({
      fixturePath: 'expected.txt',
      command: 'echo "world"',
      comparator: 'text',
    });

    const result = await validateOutput(expectedOutput, { buildDir, fixturesDir });

    expect(result.matches).toBe(false);
    expect(result.diff).toBeDefined();
  });

  it('should handle missing fixture', async () => {
    const expectedOutput = createExpectedOutput({
      fixturePath: 'nonexistent.txt',
      command: 'echo "test"',
    });

    const result = await validateOutput(expectedOutput, { buildDir, fixturesDir });

    expect(result.matches).toBe(false);
    expect(result.error).toContain('Fixture file not found');
  });

  it('should handle command failure', async () => {
    await fs.writeFile(path.join(fixturesDir, 'expected.txt'), 'test');

    const expectedOutput = createExpectedOutput({
      fixturePath: 'expected.txt',
      command: 'exit 1',
    });

    const result = await validateOutput(expectedOutput, { buildDir, fixturesDir });

    expect(result.matches).toBe(false);
    expect(result.error).toContain('Command failed');
  });

  it('should use exact comparator', async () => {
    await fs.writeFile(path.join(fixturesDir, 'expected.txt'), 'hello ');

    const expectedOutput = createExpectedOutput({
      fixturePath: 'expected.txt',
      command: 'printf "hello "', // No newline
      comparator: 'exact',
    });

    const result = await validateOutput(expectedOutput, { buildDir, fixturesDir });

    expect(result.matches).toBe(true);
  });

  it('should use json-deep comparator', async () => {
    await fs.writeFile(path.join(fixturesDir, 'expected.json'), '{"b": 2, "a": 1}');

    const expectedOutput = createExpectedOutput({
      fixturePath: 'expected.json',
      command: 'echo \'{"a": 1, "b": 2}\'',
      type: 'json',
      comparator: 'json-deep',
    });

    const result = await validateOutput(expectedOutput, { buildDir, fixturesDir });

    expect(result.matches).toBe(true);
  });

  it('should use regex comparator', async () => {
    await fs.writeFile(path.join(fixturesDir, 'expected.txt'), 'unused');

    const expectedOutput = createExpectedOutput({
      fixturePath: 'expected.txt',
      command: 'echo "version 1.2.3"',
      comparator: 'regex',
      pattern: 'version \\d+\\.\\d+\\.\\d+',
    });

    const result = await validateOutput(expectedOutput, { buildDir, fixturesDir });

    expect(result.matches).toBe(true);
  });

  it('should handle missing regex pattern', async () => {
    await fs.writeFile(path.join(fixturesDir, 'expected.txt'), 'test');

    const expectedOutput = createExpectedOutput({
      fixturePath: 'expected.txt',
      command: 'echo "test"',
      comparator: 'regex',
      // pattern is missing
    });

    const result = await validateOutput(expectedOutput, { buildDir, fixturesDir });

    expect(result.matches).toBe(false);
    expect(result.diff).toContain('pattern not specified');
  });
});

describe('validateOutputs', () => {
  let tempDir: string;
  let fixturesDir: string;
  let buildDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    fixturesDir = path.join(tempDir, 'fixtures');
    buildDir = path.join(tempDir, 'build');
    await fs.mkdir(fixturesDir, { recursive: true });
    await fs.mkdir(buildDir, { recursive: true });
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should validate multiple outputs', async () => {
    await fs.writeFile(path.join(fixturesDir, 'a.txt'), 'a\n');
    await fs.writeFile(path.join(fixturesDir, 'b.txt'), 'b\n');

    const outputs = [
      createExpectedOutput({ id: 'out-1', name: 'A', fixturePath: 'a.txt', command: 'echo "a"' }),
      createExpectedOutput({ id: 'out-2', name: 'B', fixturePath: 'b.txt', command: 'echo "b"' }),
    ];

    const result = await validateOutputs(outputs, 'checkpoint-1', { buildDir, fixturesDir });

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.comparisons).toHaveLength(2);
  });

  it('should handle partial failures', async () => {
    await fs.writeFile(path.join(fixturesDir, 'a.txt'), 'a\n');
    await fs.writeFile(path.join(fixturesDir, 'b.txt'), 'expected');

    const outputs = [
      createExpectedOutput({ id: 'out-1', name: 'A', fixturePath: 'a.txt', command: 'echo "a"' }),
      createExpectedOutput({
        id: 'out-2',
        name: 'B',
        fixturePath: 'b.txt',
        command: 'echo "actual"',
      }),
    ];

    const result = await validateOutputs(outputs, 'checkpoint-1', { buildDir, fixturesDir });

    expect(result.success).toBe(false);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('should stop on first failure when continueOnFailure is false', async () => {
    await fs.writeFile(path.join(fixturesDir, 'a.txt'), 'wrong');
    await fs.writeFile(path.join(fixturesDir, 'b.txt'), 'b\n');

    const outputs = [
      createExpectedOutput({
        id: 'out-1',
        name: 'A',
        fixturePath: 'a.txt',
        command: 'echo "actual"',
      }),
      createExpectedOutput({ id: 'out-2', name: 'B', fixturePath: 'b.txt', command: 'echo "b"' }),
    ];

    const result = await validateOutputs(outputs, 'checkpoint-1', {
      buildDir,
      fixturesDir,
      continueOnFailure: false,
    });

    expect(result.success).toBe(false);
    expect(result.comparisons).toHaveLength(1); // Only first one was run
  });
});

describe('createTextFixture', () => {
  it('should create text fixture with defaults', () => {
    const fixture = createTextFixture({
      name: 'test',
      checkpointId: 'cp-1',
      fixturePath: 'test.txt',
      command: 'echo test',
      description: '',
      workingDir: '.',
      outputPath: 'stdout',
      env: {},
    });

    expect(fixture.type).toBe('text');
    expect(fixture.comparator).toBe('text');
    expect(fixture.entityType).toBe('expected-output');
  });
});

describe('createJsonFixture', () => {
  it('should create json fixture with defaults', () => {
    const fixture = createJsonFixture({
      name: 'test',
      checkpointId: 'cp-1',
      fixturePath: 'test.json',
      command: 'echo {}',
      description: '',
      workingDir: '.',
      outputPath: 'stdout',
      env: {},
    });

    expect(fixture.type).toBe('json');
    expect(fixture.comparator).toBe('json-deep');
  });
});

describe('formatOutputResults', () => {
  it('should format successful results', () => {
    const result = {
      checkpointId: 'cp-1',
      success: true,
      total: 3,
      passed: 3,
      failed: 0,
      comparisons: [],
      validatedAt: new Date().toISOString(),
    };

    const formatted = formatOutputResults(result);

    expect(formatted).toContain('PASSED');
    expect(formatted).toContain('3/3');
  });

  it('should format failed results with diffs', () => {
    const result = {
      checkpointId: 'cp-1',
      success: false,
      total: 2,
      passed: 1,
      failed: 1,
      comparisons: [
        {
          expectedOutputId: 'out-1',
          expectedOutputName: 'Test A',
          matches: true,
        },
        {
          expectedOutputId: 'out-2',
          expectedOutputName: 'Test B',
          matches: false,
          diff: 'Expected: x\nActual: y',
        },
      ],
      validatedAt: new Date().toISOString(),
    };

    const formatted = formatOutputResults(result);

    expect(formatted).toContain('FAILED');
    expect(formatted).toContain('1/2');
    expect(formatted).toContain('Test B');
    expect(formatted).toContain('Expected: x');
  });

  it('should show errors when present', () => {
    const result = {
      checkpointId: 'cp-1',
      success: false,
      total: 1,
      passed: 0,
      failed: 1,
      comparisons: [
        {
          expectedOutputId: 'out-1',
          expectedOutputName: 'Test',
          matches: false,
          error: 'Command timed out',
        },
      ],
      validatedAt: new Date().toISOString(),
    };

    const formatted = formatOutputResults(result);

    expect(formatted).toContain('Error: Command timed out');
  });

  it('should limit diff lines', () => {
    const longDiff = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n');
    const result = {
      checkpointId: 'cp-1',
      success: false,
      total: 1,
      passed: 0,
      failed: 1,
      comparisons: [
        {
          expectedOutputId: 'out-1',
          expectedOutputName: 'Test',
          matches: false,
          diff: longDiff,
        },
      ],
      validatedAt: new Date().toISOString(),
    };

    const formatted = formatOutputResults(result, { maxDiffLines: 5 });

    expect(formatted).toContain('and 45 more lines');
  });
});

describe('isValidComparator', () => {
  it('should accept valid comparators', () => {
    expect(isValidComparator('exact')).toBe(true);
    expect(isValidComparator('text')).toBe(true);
    expect(isValidComparator('json-deep')).toBe(true);
    expect(isValidComparator('regex')).toBe(true);
    expect(isValidComparator('image-diff')).toBe(true);
    expect(isValidComparator('custom')).toBe(true);
  });

  it('should reject invalid comparators', () => {
    expect(isValidComparator('invalid')).toBe(false);
    expect(isValidComparator('')).toBe(false);
  });
});

describe('getSupportedComparators', () => {
  it('should return text comparators', () => {
    const comparators = getSupportedComparators('text');
    expect(comparators).toContain('exact');
    expect(comparators).toContain('text');
    expect(comparators).toContain('regex');
  });

  it('should return json comparators', () => {
    const comparators = getSupportedComparators('json');
    expect(comparators).toContain('json-deep');
    expect(comparators).toContain('exact');
  });

  it('should return image comparators', () => {
    const comparators = getSupportedComparators('image');
    expect(comparators).toContain('image-diff');
  });
});
