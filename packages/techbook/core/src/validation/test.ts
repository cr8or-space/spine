/**
 * Test runner for TechBook domain.
 *
 * Runs test frameworks (Vitest, Jest, pytest, cargo test, etc.) on tangled code
 * and captures results for checkpoint validation.
 */

import { exec, type ExecException } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';

import type { TestResult } from '@repo/techbook-types';

const execAsync = promisify(exec);

/**
 * Configuration for a test framework
 */
export interface TestFrameworkConfig {
  /** Framework identifier (e.g., 'vitest', 'jest', 'pytest', 'cargo') */
  framework: string;
  /** Command to run tests (e.g., 'npm test', 'pytest') */
  command: string;
  /** Optional working directory (relative to build dir) */
  workingDir?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Timeout in milliseconds (default: 120000) */
  timeout?: number;
  /** Pattern to filter tests (passed to test framework) */
  testPattern?: string;
}

/**
 * Options for running tests
 */
export interface TestOptions {
  /** Test framework configuration */
  framework: TestFrameworkConfig;
  /** Build directory containing tangled files */
  buildDir: string;
  /** Whether to capture detailed test failures (default: true) */
  parseFailures?: boolean;
}

/**
 * Parsed test failure
 */
export interface ParsedTestFailure {
  testName: string;
  file?: string;
  message: string;
  expected?: string;
  actual?: string;
}

/**
 * Test summary extracted from output
 */
export interface TestSummary {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

/**
 * Common test result parsers for different frameworks
 */
export const TEST_PARSERS: Record<
  string,
  {
    parseFailures: (output: string) => ParsedTestFailure[];
    parseSummary: (output: string) => TestSummary | null;
  }
> = {
  /**
   * Vitest output parser
   * Example:
   * ❯ src/test.spec.ts (2 tests | 1 failed)
   *   ✓ test passes
   *   ✕ test fails
   *
   * Test Files  1 passed | 1 failed
   * Tests  5 passed | 2 failed | 1 skipped
   */
  vitest: {
    parseFailures: (output: string): ParsedTestFailure[] => {
      const failures: ParsedTestFailure[] = [];

      // Match test failure blocks
      // Pattern: ✕ test name (captures to end of line)
      const failPattern = /[✕×]\s+([^\n]+)/g;
      let match;

      while ((match = failPattern.exec(output)) !== null) {
        const testName = match[1].trim();
        // Look for error message on the following lines
        const afterMatch = output.slice(match.index + match[0].length);
        const errorMatch = /^\s*(?:Error|AssertionError):\s*([^\n]+)/m.exec(afterMatch);

        failures.push({
          testName,
          message: errorMatch?.[1]?.trim() ?? 'Test failed',
        });
      }

      // Also look for explicit failure blocks with file info
      const blockPattern = /FAIL\s+([^\n]+)\n[\s\S]*?[✕×]\s+([^\n]+)/g;
      while ((match = blockPattern.exec(output)) !== null) {
        const testName = match[2].trim();
        // Avoid duplicates
        const existing = failures.find((f) => f.testName === testName);
        if (!existing) {
          // Look for error message
          const afterMatch = output.slice(match.index + match[0].length);
          const errorMatch = /^\s*Error:\s*([^\n]+)/m.exec(afterMatch);

          failures.push({
            testName,
            file: match[1].trim(),
            message: errorMatch?.[1]?.trim() ?? 'Test failed',
          });
        }
      }

      return failures;
    },

    parseSummary: (output: string): TestSummary | null => {
      // Pattern: Tests  X passed | Y failed | Z skipped (X tests)
      const pattern =
        /Tests\s+(?:(\d+)\s+passed)?(?:\s*\|\s*)?(?:(\d+)\s+failed)?(?:\s*\|\s*)?(?:(\d+)\s+skipped)?/i;
      const match = pattern.exec(output);

      if (match) {
        const passed = parseInt(match[1] ?? '0', 10);
        const failed = parseInt(match[2] ?? '0', 10);
        const skipped = parseInt(match[3] ?? '0', 10);

        return {
          passed,
          failed,
          skipped,
          total: passed + failed + skipped,
        };
      }

      return null;
    },
  },

  /**
   * Jest output parser
   * Similar to Vitest but with some differences
   */
  jest: {
    parseFailures: (output: string): ParsedTestFailure[] => {
      const failures: ParsedTestFailure[] = [];

      // Match Jest failure pattern: ● Test Suite › test name
      // followed by error details
      const pattern = /●\s+([^\n]+)\n\s*\n\s*([^\n]+)/g;
      let match;

      while ((match = pattern.exec(output)) !== null) {
        failures.push({
          testName: match[1].trim(),
          message: match[2].trim(),
        });
      }

      // Also match expect assertions
      const expectPattern =
        /expect\(received\)\.(\w+)\(expected\)\n\s*Expected:\s*(.+?)\n\s*Received:\s*(.+)/g;
      while ((match = expectPattern.exec(output)) !== null) {
        // Find the most recent failure and add expected/actual
        if (failures.length > 0) {
          const last = failures[failures.length - 1];
          last.expected = match[2].trim();
          last.actual = match[3].trim();
        }
      }

      return failures;
    },

    parseSummary: (output: string): TestSummary | null => {
      // Pattern: Tests:       X failed, Y passed, Z total
      const pattern =
        /Tests:\s+(?:(\d+)\s+failed,?\s*)?(?:(\d+)\s+skipped,?\s*)?(?:(\d+)\s+passed,?\s*)?(\d+)\s+total/i;
      const match = pattern.exec(output);

      if (match) {
        const failed = parseInt(match[1] ?? '0', 10);
        const skipped = parseInt(match[2] ?? '0', 10);
        const passed = parseInt(match[3] ?? '0', 10);
        const total = parseInt(match[4] ?? '0', 10);

        return {
          passed,
          failed,
          skipped,
          total,
        };
      }

      return null;
    },
  },

  /**
   * pytest output parser
   * Example:
   * FAILED tests/test_main.py::test_foo - AssertionError: assert 1 == 2
   * === 1 passed, 2 failed, 1 skipped in 0.12s ===
   */
  pytest: {
    parseFailures: (output: string): ParsedTestFailure[] => {
      const failures: ParsedTestFailure[] = [];

      // Pattern: FAILED path::test_name - error message
      const pattern = /FAILED\s+(.+?)::(\S+)\s+-\s*(.+)/g;
      let match;

      while ((match = pattern.exec(output)) !== null) {
        failures.push({
          testName: match[2],
          file: match[1],
          message: match[3].trim(),
        });
      }

      return failures;
    },

    parseSummary: (output: string): TestSummary | null => {
      // Pattern: = X passed, Y failed, Z skipped in N.NNs =
      const pattern =
        /=+\s+(?:(\d+)\s+passed)?(?:,\s*)?(?:(\d+)\s+failed)?(?:,\s*)?(?:(\d+)\s+skipped)?.*=+/i;
      const match = pattern.exec(output);

      if (match) {
        const passed = parseInt(match[1] ?? '0', 10);
        const failed = parseInt(match[2] ?? '0', 10);
        const skipped = parseInt(match[3] ?? '0', 10);

        return {
          passed,
          failed,
          skipped,
          total: passed + failed + skipped,
        };
      }

      return null;
    },
  },

  /**
   * Cargo test output parser
   * Example:
   * test result: FAILED. 2 passed; 1 failed; 0 ignored
   */
  cargo: {
    parseFailures: (output: string): ParsedTestFailure[] => {
      const failures: ParsedTestFailure[] = [];

      // Pattern: ---- test_name stdout ----
      // followed by error details
      const pattern =
        /----\s+(\S+)\s+stdout\s+----\n([\s\S]*?)(?=(?:----|\nfailures:|\ntest result:))/g;
      let match;

      while ((match = pattern.exec(output)) !== null) {
        // Extract assertion message
        const body = match[2];
        const assertMatch = /assertion.*failed[\s\S]*?left:\s*`?(.+?)`?\s*right:\s*`?(.+?)`?/i.exec(
          body
        );

        failures.push({
          testName: match[1],
          message: assertMatch
            ? `assertion failed: ${assertMatch[1]} != ${assertMatch[2]}`
            : body.trim().split('\n')[0] ?? 'Test failed',
          expected: assertMatch?.[1],
          actual: assertMatch?.[2],
        });
      }

      return failures;
    },

    parseSummary: (output: string): TestSummary | null => {
      // Pattern: test result: ok/FAILED. X passed; Y failed; Z ignored
      const pattern = /test\s+result:\s+\S+\.\s+(\d+)\s+passed;\s+(\d+)\s+failed;\s+(\d+)\s+ignored/i;
      const match = pattern.exec(output);

      if (match) {
        const passed = parseInt(match[1], 10);
        const failed = parseInt(match[2], 10);
        const skipped = parseInt(match[3], 10);

        return {
          passed,
          failed,
          skipped,
          total: passed + failed + skipped,
        };
      }

      return null;
    },
  },

  /**
   * Generic fallback parser
   */
  generic: {
    parseFailures: (output: string): ParsedTestFailure[] => {
      const failures: ParsedTestFailure[] = [];

      // Look for common failure patterns
      const patterns = [
        /(?:FAIL|FAILED|✕|×)\s+(.+?)\s*(?:[-:]\s*(.+))?$/gm,
        /(?:Error|AssertionError):\s*(.+)/gm,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(output)) !== null) {
          failures.push({
            testName: match[1]?.trim() ?? 'unknown',
            message: match[2]?.trim() ?? match[1]?.trim() ?? 'Test failed',
          });
        }
      }

      return failures;
    },

    parseSummary: (output: string): TestSummary | null => {
      // Try to find numbers in common patterns
      const patterns = [
        /(\d+)\s+pass(?:ed)?/i,
        /(\d+)\s+fail(?:ed|ure)?/i,
        /(\d+)\s+skip(?:ped)?/i,
      ];

      const passed = parseInt(patterns[0].exec(output)?.[1] ?? '0', 10);
      const failed = parseInt(patterns[1].exec(output)?.[1] ?? '0', 10);
      const skipped = parseInt(patterns[2].exec(output)?.[1] ?? '0', 10);

      if (passed + failed + skipped > 0) {
        return {
          passed,
          failed,
          skipped,
          total: passed + failed + skipped,
        };
      }

      return null;
    },
  },
};

/**
 * Get the appropriate test parser for a framework
 */
export function getTestParser(framework: string): (typeof TEST_PARSERS)['vitest'] {
  const normalized = framework.toLowerCase();

  if (normalized === 'vitest') {
    return TEST_PARSERS.vitest;
  }
  if (normalized === 'jest') {
    return TEST_PARSERS.jest;
  }
  if (normalized === 'pytest' || normalized === 'python') {
    return TEST_PARSERS.pytest;
  }
  if (normalized === 'cargo' || normalized === 'rust') {
    return TEST_PARSERS.cargo;
  }

  return TEST_PARSERS.generic;
}

/**
 * Run tests and return results.
 *
 * @example
 * ```typescript
 * const result = await runTests({
 *   framework: {
 *     framework: 'vitest',
 *     command: 'npm test',
 *   },
 *   buildDir: 'build',
 * });
 *
 * if (!result.success) {
 *   console.log(`${result.failed} tests failed`);
 * }
 * ```
 */
export async function runTests(options: TestOptions): Promise<TestResult> {
  const { framework, buildDir, parseFailures = true } = options;
  const startTime = Date.now();

  const workingDir = framework.workingDir
    ? path.resolve(buildDir, framework.workingDir)
    : buildDir;

  const env = {
    ...process.env,
    ...framework.env,
    // Force non-interactive mode for CI-like output
    CI: 'true',
    FORCE_COLOR: '0',
  };

  try {
    const { stdout, stderr } = await execAsync(framework.command, {
      cwd: workingDir,
      env,
      timeout: framework.timeout ?? 120000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const output = stdout + stderr;
    const durationMs = Date.now() - startTime;

    // Parse results even on success
    const parser = getTestParser(framework.framework);
    const summary = parser.parseSummary(output);

    return {
      success: true,
      passed: summary?.passed ?? 0,
      failed: summary?.failed ?? 0,
      skipped: summary?.skipped ?? 0,
      output,
      failures: [],
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const execError = error as ExecException & { stdout?: string; stderr?: string };
    const output = (execError.stdout ?? '') + (execError.stderr ?? '');

    // Parse failures
    const parser = getTestParser(framework.framework);
    const summary = parser.parseSummary(output);
    const failures = parseFailures ? parser.parseFailures(output) : [];

    // Convert to TestResult failures format
    const testFailures: TestResult['failures'] = failures.map((f) => ({
      testName: f.testName,
      file: f.file,
      message: f.message,
      expected: f.expected,
      actual: f.actual,
    }));

    return {
      success: false,
      passed: summary?.passed ?? 0,
      failed: summary?.failed ?? testFailures.length,
      skipped: summary?.skipped ?? 0,
      output,
      failures: testFailures,
      durationMs,
    };
  }
}

/**
 * Create a test framework configuration for Vitest.
 */
export function createVitestFramework(overrides?: Partial<TestFrameworkConfig>): TestFrameworkConfig {
  return {
    framework: 'vitest',
    command: 'npx vitest run',
    timeout: 120000,
    ...overrides,
  };
}

/**
 * Create a test framework configuration for Jest.
 */
export function createJestFramework(overrides?: Partial<TestFrameworkConfig>): TestFrameworkConfig {
  return {
    framework: 'jest',
    command: 'npx jest --ci',
    timeout: 120000,
    ...overrides,
  };
}

/**
 * Create a test framework configuration for pytest.
 */
export function createPytestFramework(overrides?: Partial<TestFrameworkConfig>): TestFrameworkConfig {
  return {
    framework: 'pytest',
    command: 'pytest -v',
    timeout: 120000,
    ...overrides,
  };
}

/**
 * Create a test framework configuration for Cargo.
 */
export function createCargoTestFramework(
  overrides?: Partial<TestFrameworkConfig>
): TestFrameworkConfig {
  return {
    framework: 'cargo',
    command: 'cargo test',
    timeout: 180000,
    ...overrides,
  };
}

/**
 * Validate that a test framework is available on the system.
 *
 * @returns true if the test command can be executed, false otherwise
 */
export async function isTestFrameworkAvailable(
  framework: TestFrameworkConfig,
  buildDir: string
): Promise<boolean> {
  // Extract the base command (first word)
  const baseCommand = framework.command.split(/\s+/)[0];
  if (!baseCommand) {
    return false;
  }

  try {
    const checkCommand =
      baseCommand === 'npx'
        ? 'npx --version'
        : `${baseCommand} --version || ${baseCommand} --help`;

    await execAsync(checkCommand, {
      cwd: buildDir,
      timeout: 5000,
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Format test results for display
 */
export function formatTestResults(
  result: TestResult,
  options?: { showFailures?: boolean; maxFailures?: number; colorize?: boolean }
): string {
  const { showFailures = true, maxFailures = 5, colorize = false } = options ?? {};

  const lines: string[] = [];

  // Summary line
  const statusText = result.success ? 'PASSED' : 'FAILED';
  const status = colorize
    ? result.success
      ? `\x1b[32m${statusText}\x1b[0m`
      : `\x1b[31m${statusText}\x1b[0m`
    : statusText;

  lines.push(`Tests: ${status}`);
  lines.push(
    `  ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`
  );

  if (result.durationMs !== undefined) {
    lines.push(`  Duration: ${(result.durationMs / 1000).toFixed(2)}s`);
  }

  // Show failures if requested
  if (showFailures && result.failures.length > 0) {
    lines.push('');
    lines.push('Failures:');

    const displayed = result.failures.slice(0, maxFailures);
    for (const failure of displayed) {
      const location = failure.file ? `${failure.file}: ` : '';
      lines.push(`  ${location}${failure.testName}`);
      lines.push(`    ${failure.message}`);

      if (failure.expected !== undefined && failure.actual !== undefined) {
        lines.push(`    Expected: ${failure.expected}`);
        lines.push(`    Actual: ${failure.actual}`);
      }
    }

    if (result.failures.length > maxFailures) {
      lines.push(`  ... and ${result.failures.length - maxFailures} more failures`);
    }
  }

  return lines.join('\n');
}
