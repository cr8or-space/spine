/**
 * Tests for test runner
 */

import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createCargoTestFramework,
  createJestFramework,
  createPytestFramework,
  createVitestFramework,
  formatTestResults,
  getTestParser,
  runTests,
  TEST_PARSERS,
  type TestFrameworkConfig,
} from './test';

// Helper to create a unique temp directory
async function createTempDir(): Promise<string> {
  const dir = path.join(
    tmpdir(),
    `test-runner-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

describe('TEST_PARSERS', () => {
  describe('vitest', () => {
    describe('parseSummary', () => {
      it('should parse passed/failed/skipped summary', () => {
        const output = `
 ✓ src/test.spec.ts (2 tests)
Tests  5 passed | 2 failed | 1 skipped (8)
`;
        const summary = TEST_PARSERS.vitest.parseSummary(output);

        expect(summary).toEqual({
          passed: 5,
          failed: 2,
          skipped: 1,
          total: 8,
        });
      });

      it('should parse passed only summary', () => {
        const output = `Tests  10 passed (10)`;
        const summary = TEST_PARSERS.vitest.parseSummary(output);

        expect(summary).toEqual({
          passed: 10,
          failed: 0,
          skipped: 0,
          total: 10,
        });
      });

      it('should return null for non-matching output', () => {
        const output = `Some random output`;
        const summary = TEST_PARSERS.vitest.parseSummary(output);

        expect(summary).toBeNull();
      });
    });

    describe('parseFailures', () => {
      it('should parse test failures with checkmark', () => {
        const output = `
 ✕ test name here
   Error: assertion failed
`;
        const failures = TEST_PARSERS.vitest.parseFailures(output);

        expect(failures.length).toBeGreaterThanOrEqual(1);
        expect(failures[0].testName).toBe('test name here');
      });

      it('should parse test failures with x symbol', () => {
        const output = `
 × another failing test
`;
        const failures = TEST_PARSERS.vitest.parseFailures(output);

        expect(failures.length).toBeGreaterThanOrEqual(1);
        expect(failures[0].testName).toBe('another failing test');
      });
    });
  });

  describe('jest', () => {
    describe('parseSummary', () => {
      it('should parse Jest summary format', () => {
        const output = `
Tests:       2 failed, 1 skipped, 5 passed, 8 total
`;
        const summary = TEST_PARSERS.jest.parseSummary(output);

        expect(summary).toEqual({
          passed: 5,
          failed: 2,
          skipped: 1,
          total: 8,
        });
      });

      it('should parse Jest summary with only passed', () => {
        const output = `Tests:       10 passed, 10 total`;
        const summary = TEST_PARSERS.jest.parseSummary(output);

        expect(summary).toEqual({
          passed: 10,
          failed: 0,
          skipped: 0,
          total: 10,
        });
      });
    });

    describe('parseFailures', () => {
      it('should parse Jest failure blocks', () => {
        const output = `
  ● Test Suite › test case name

    expect(received).toBe(expected)

    Expected: 2
    Received: 1

      at Object.<anonymous>
`;
        const failures = TEST_PARSERS.jest.parseFailures(output);

        expect(failures.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('pytest', () => {
    describe('parseSummary', () => {
      it('should parse pytest summary', () => {
        const output = `
===== 5 passed, 2 failed, 1 skipped in 0.12s =====
`;
        const summary = TEST_PARSERS.pytest.parseSummary(output);

        expect(summary).toEqual({
          passed: 5,
          failed: 2,
          skipped: 1,
          total: 8,
        });
      });

      it('should parse pytest summary with only passed', () => {
        const output = `= 10 passed in 0.05s =`;
        const summary = TEST_PARSERS.pytest.parseSummary(output);

        expect(summary).toEqual({
          passed: 10,
          failed: 0,
          skipped: 0,
          total: 10,
        });
      });
    });

    describe('parseFailures', () => {
      it('should parse pytest failure format', () => {
        const output = `
FAILED tests/test_main.py::test_foo - AssertionError: assert 1 == 2
FAILED tests/test_util.py::test_bar - ValueError: invalid
`;
        const failures = TEST_PARSERS.pytest.parseFailures(output);

        expect(failures).toHaveLength(2);
        expect(failures[0]).toEqual({
          testName: 'test_foo',
          file: 'tests/test_main.py',
          message: 'AssertionError: assert 1 == 2',
        });
        expect(failures[1]).toEqual({
          testName: 'test_bar',
          file: 'tests/test_util.py',
          message: 'ValueError: invalid',
        });
      });
    });
  });

  describe('cargo', () => {
    describe('parseSummary', () => {
      it('should parse cargo test summary - ok', () => {
        const output = `
test result: ok. 10 passed; 0 failed; 2 ignored; 0 measured; 0 filtered out
`;
        const summary = TEST_PARSERS.cargo.parseSummary(output);

        expect(summary).toEqual({
          passed: 10,
          failed: 0,
          skipped: 2,
          total: 12,
        });
      });

      it('should parse cargo test summary - failed', () => {
        const output = `
test result: FAILED. 8 passed; 2 failed; 1 ignored; 0 measured; 0 filtered out
`;
        const summary = TEST_PARSERS.cargo.parseSummary(output);

        expect(summary).toEqual({
          passed: 8,
          failed: 2,
          skipped: 1,
          total: 11,
        });
      });
    });

    describe('parseFailures', () => {
      it('should parse cargo test failures', () => {
        const output = `
---- test_something stdout ----
thread 'test_something' panicked at 'assertion failed: left == right'

failures:
    test_something

test result: FAILED. 5 passed; 1 failed; 0 ignored
`;
        const failures = TEST_PARSERS.cargo.parseFailures(output);

        expect(failures.length).toBeGreaterThanOrEqual(1);
        expect(failures[0].testName).toBe('test_something');
      });
    });
  });

  describe('generic', () => {
    describe('parseSummary', () => {
      it('should parse generic passed/failed/skipped', () => {
        const output = `5 passed, 2 failed, 1 skipped`;
        const summary = TEST_PARSERS.generic.parseSummary(output);

        expect(summary).toEqual({
          passed: 5,
          failed: 2,
          skipped: 1,
          total: 8,
        });
      });

      it('should return null when no numbers found', () => {
        const output = `All tests completed`;
        const summary = TEST_PARSERS.generic.parseSummary(output);

        expect(summary).toBeNull();
      });
    });

    describe('parseFailures', () => {
      it('should parse generic failure patterns', () => {
        const output = `FAIL some_test - error message`;
        const failures = TEST_PARSERS.generic.parseFailures(output);

        expect(failures.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});

describe('getTestParser', () => {
  it('should return vitest parser', () => {
    expect(getTestParser('vitest')).toBe(TEST_PARSERS.vitest);
  });

  it('should return jest parser', () => {
    expect(getTestParser('jest')).toBe(TEST_PARSERS.jest);
  });

  it('should return pytest parser', () => {
    expect(getTestParser('pytest')).toBe(TEST_PARSERS.pytest);
    expect(getTestParser('python')).toBe(TEST_PARSERS.pytest);
  });

  it('should return cargo parser', () => {
    expect(getTestParser('cargo')).toBe(TEST_PARSERS.cargo);
    expect(getTestParser('rust')).toBe(TEST_PARSERS.cargo);
  });

  it('should return generic parser for unknown', () => {
    expect(getTestParser('unknown')).toBe(TEST_PARSERS.generic);
  });
});

describe('createVitestFramework', () => {
  it('should create default config', () => {
    const config = createVitestFramework();

    expect(config.framework).toBe('vitest');
    expect(config.command).toBe('npx vitest run');
    expect(config.timeout).toBe(120000);
  });

  it('should allow overrides', () => {
    const config = createVitestFramework({
      command: 'npm test',
      timeout: 60000,
    });

    expect(config.command).toBe('npm test');
    expect(config.timeout).toBe(60000);
    expect(config.framework).toBe('vitest');
  });
});

describe('createJestFramework', () => {
  it('should create default config', () => {
    const config = createJestFramework();

    expect(config.framework).toBe('jest');
    expect(config.command).toBe('npx jest --ci');
  });
});

describe('createPytestFramework', () => {
  it('should create default config', () => {
    const config = createPytestFramework();

    expect(config.framework).toBe('pytest');
    expect(config.command).toBe('pytest -v');
  });
});

describe('createCargoTestFramework', () => {
  it('should create default config', () => {
    const config = createCargoTestFramework();

    expect(config.framework).toBe('cargo');
    expect(config.command).toBe('cargo test');
    expect(config.timeout).toBe(180000);
  });
});

describe('formatTestResults', () => {
  it('should format passing results', () => {
    const result = {
      success: true,
      passed: 10,
      failed: 0,
      skipped: 2,
      output: '',
      failures: [],
      durationMs: 1500,
    };

    const formatted = formatTestResults(result);

    expect(formatted).toContain('PASSED');
    expect(formatted).toContain('10 passed');
    expect(formatted).toContain('0 failed');
    expect(formatted).toContain('2 skipped');
    expect(formatted).toContain('1.50s');
  });

  it('should format failing results with failures', () => {
    const result = {
      success: false,
      passed: 5,
      failed: 2,
      skipped: 0,
      output: '',
      failures: [
        { testName: 'test1', message: 'assertion failed' },
        { testName: 'test2', file: 'test.ts', message: 'error' },
      ],
      durationMs: 2000,
    };

    const formatted = formatTestResults(result, { showFailures: true });

    expect(formatted).toContain('FAILED');
    expect(formatted).toContain('Failures:');
    expect(formatted).toContain('test1');
    expect(formatted).toContain('assertion failed');
    expect(formatted).toContain('test.ts');
  });

  it('should limit failures shown', () => {
    const result = {
      success: false,
      passed: 0,
      failed: 10,
      skipped: 0,
      output: '',
      failures: Array.from({ length: 10 }, (_, i) => ({
        testName: `test${i}`,
        message: `error ${i}`,
      })),
    };

    const formatted = formatTestResults(result, { maxFailures: 3 });

    expect(formatted).toContain('and 7 more failures');
  });

  it('should show expected/actual when available', () => {
    const result = {
      success: false,
      passed: 0,
      failed: 1,
      skipped: 0,
      output: '',
      failures: [
        {
          testName: 'test1',
          message: 'assertion failed',
          expected: '2',
          actual: '1',
        },
      ],
    };

    const formatted = formatTestResults(result, { showFailures: true });

    expect(formatted).toContain('Expected: 2');
    expect(formatted).toContain('Actual: 1');
  });

  it('should hide failures when showFailures is false', () => {
    const result = {
      success: false,
      passed: 0,
      failed: 1,
      skipped: 0,
      output: '',
      failures: [{ testName: 'test1', message: 'error' }],
    };

    const formatted = formatTestResults(result, { showFailures: false });

    expect(formatted).not.toContain('Failures:');
    expect(formatted).not.toContain('test1');
  });
});

describe('runTests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should run successful tests', async () => {
    const framework: TestFrameworkConfig = {
      framework: 'generic',
      command: 'echo "5 passed, 0 failed"',
    };

    const result = await runTests({
      framework,
      buildDir: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle test failures', async () => {
    const framework: TestFrameworkConfig = {
      framework: 'generic',
      command: 'echo "2 passed, 1 failed" && exit 1',
    };

    const result = await runTests({
      framework,
      buildDir: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('should respect working directory', async () => {
    const subDir = path.join(tempDir, 'tests');
    await fs.mkdir(subDir, { recursive: true });

    const framework: TestFrameworkConfig = {
      framework: 'generic',
      command: 'pwd',
      workingDir: 'tests',
    };

    const result = await runTests({
      framework,
      buildDir: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('tests');
  });

  it('should pass environment variables', async () => {
    const framework: TestFrameworkConfig = {
      framework: 'generic',
      command: 'echo $MY_VAR',
      env: { MY_VAR: 'test_value' },
    };

    const result = await runTests({
      framework,
      buildDir: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('test_value');
  });

  it('should handle timeout', async () => {
    const framework: TestFrameworkConfig = {
      framework: 'generic',
      command: 'sleep 10',
      timeout: 100,
    };

    const result = await runTests({
      framework,
      buildDir: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.durationMs).toBeLessThan(5000);
  });

  it('should set CI and FORCE_COLOR env vars', async () => {
    const framework: TestFrameworkConfig = {
      framework: 'generic',
      command: 'echo "CI=$CI FORCE_COLOR=$FORCE_COLOR"',
    };

    const result = await runTests({
      framework,
      buildDir: tempDir,
    });

    expect(result.output).toContain('CI=true');
    expect(result.output).toContain('FORCE_COLOR=0');
  });
});
