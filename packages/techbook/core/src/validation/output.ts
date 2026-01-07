/**
 * Output fixture comparison for TechBook domain.
 *
 * Compares actual output from running tangled code against expected
 * fixtures for checkpoint validation.
 */

import { exec, type ExecException } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

import type {
  ComparatorType,
  ExpectedOutput,
  OutputComparison,
  OutputValidationResult,
} from '@repo/techbook-types';

const execAsync = promisify(exec);

/**
 * Options for running output validation
 */
export interface OutputValidationOptions {
  /** Directory containing tangled/built files */
  buildDir: string;
  /** Directory containing fixture files */
  fixturesDir: string;
  /** Timeout for running commands in milliseconds (default: 30000) */
  timeout?: number;
  /** Whether to continue after first failure (default: true) */
  continueOnFailure?: boolean;
}

/**
 * Result of running a single output command
 */
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

/**
 * Run a command and capture its output.
 */
export async function runCommand(
  command: string,
  options: {
    workingDir: string;
    env?: Record<string, string>;
    timeout?: number;
    outputPath?: string;
  }
): Promise<CommandResult> {
  const startTime = Date.now();
  const { workingDir, env, timeout = 30000, outputPath } = options;

  const execEnv = {
    ...process.env,
    ...env,
  };

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      env: execEnv,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const durationMs = Date.now() - startTime;

    // If outputPath is specified and not stdout, read from file
    let actualOutput = stdout;
    if (outputPath && outputPath !== 'stdout') {
      const outputFile = path.resolve(workingDir, outputPath);
      try {
        actualOutput = await fs.readFile(outputFile, 'utf-8');
      } catch {
        return {
          success: false,
          stdout: '',
          stderr: `Failed to read output file: ${outputFile}`,
          exitCode: 1,
          durationMs,
        };
      }
    }

    return {
      success: true,
      stdout: actualOutput,
      stderr,
      exitCode: 0,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const execError = error as ExecException & {
      stdout?: string;
      stderr?: string;
      code?: number;
    };

    return {
      success: false,
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? execError.message,
      exitCode: execError.code ?? 1,
      durationMs,
    };
  }
}

/**
 * Read expected output from a fixture file.
 */
export async function readFixture(fixturePath: string): Promise<string | null> {
  try {
    return await fs.readFile(fixturePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Compare two text outputs.
 *
 * @param actual - The actual output
 * @param expected - The expected output
 * @param mode - Comparison mode: 'exact' for byte-by-byte, 'text' for normalized comparison
 */
export function compareText(
  actual: string,
  expected: string,
  mode: 'exact' | 'text'
): { matches: boolean; diff?: string } {
  if (mode === 'exact') {
    if (actual === expected) {
      return { matches: true };
    }
    return {
      matches: false,
      diff: createTextDiff(expected, actual),
    };
  }

  // Text mode: normalize whitespace
  const normalizedActual = normalizeText(actual);
  const normalizedExpected = normalizeText(expected);

  if (normalizedActual === normalizedExpected) {
    return { matches: true };
  }

  return {
    matches: false,
    diff: createTextDiff(normalizedExpected, normalizedActual),
  };
}

/**
 * Normalize text for comparison.
 * - Trim leading/trailing whitespace
 * - Normalize line endings to \n
 * - Remove trailing whitespace from each line
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Create a simple text diff for display.
 */
export function createTextDiff(expected: string, actual: string): string {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const diffLines: string[] = [];

  const maxLines = Math.max(expectedLines.length, actualLines.length);
  const contextBefore = 2;
  const contextAfter = 2;

  // Find changed line ranges
  const changes: { line: number; expected?: string; actual?: string }[] = [];

  for (let i = 0; i < maxLines; i++) {
    const exp = expectedLines[i];
    const act = actualLines[i];

    if (exp !== act) {
      changes.push({
        line: i,
        expected: exp,
        actual: act,
      });
    }
  }

  if (changes.length === 0) {
    return '';
  }

  // Show limited context around changes
  let lastShown = -1;
  for (const change of changes.slice(0, 10)) {
    const startLine = Math.max(0, change.line - contextBefore);
    const endLine = Math.min(maxLines - 1, change.line + contextAfter);

    if (startLine > lastShown + 1) {
      diffLines.push(`... (${startLine - lastShown - 1} lines omitted)`);
    }

    for (let i = startLine; i <= endLine; i++) {
      if (i < lastShown) continue;

      const exp = expectedLines[i];
      const act = actualLines[i];

      if (i === change.line) {
        if (exp !== undefined) {
          diffLines.push(`- ${i + 1}: ${exp}`);
        }
        if (act !== undefined) {
          diffLines.push(`+ ${i + 1}: ${act}`);
        }
      } else {
        diffLines.push(`  ${i + 1}: ${expectedLines[i] ?? actualLines[i]}`);
      }

      lastShown = i;
    }
  }

  if (changes.length > 10) {
    diffLines.push(`... and ${changes.length - 10} more differences`);
  }

  return diffLines.join('\n');
}

/**
 * Compare two JSON outputs using deep equality.
 */
export function compareJson(
  actual: string,
  expected: string
): { matches: boolean; diff?: string } {
  try {
    const actualObj = JSON.parse(actual) as unknown;
    const expectedObj = JSON.parse(expected) as unknown;

    if (deepEqual(actualObj, expectedObj)) {
      return { matches: true };
    }

    // Create a diff showing the differences
    return {
      matches: false,
      diff: `Expected: ${JSON.stringify(expectedObj, null, 2)}\nActual: ${JSON.stringify(actualObj, null, 2)}`,
    };
  } catch (error) {
    return {
      matches: false,
      diff: `JSON parse error: ${(error as Error).message}`,
    };
  }
}

/**
 * Deep equality check for JSON values.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }

  return true;
}

/**
 * Compare using regex pattern matching.
 */
export function compareRegex(
  actual: string,
  pattern: string
): { matches: boolean; diff?: string } {
  try {
    const regex = new RegExp(pattern, 's'); // 's' flag for dotall mode
    if (regex.test(actual)) {
      return { matches: true };
    }
    return {
      matches: false,
      diff: `Pattern /${pattern}/ did not match output:\n${actual.slice(0, 500)}${actual.length > 500 ? '...' : ''}`,
    };
  } catch (error) {
    return {
      matches: false,
      diff: `Invalid regex pattern: ${(error as Error).message}`,
    };
  }
}

/**
 * Run a custom comparison command.
 *
 * The command should exit with 0 for match, non-zero for mismatch.
 * The expected and actual paths are passed as arguments.
 */
export async function compareCustom(
  actualPath: string,
  expectedPath: string,
  command: string,
  workingDir: string
): Promise<{ matches: boolean; diff?: string }> {
  // Substitute placeholders in command
  const fullCommand = command
    .replace(/\$ACTUAL/g, actualPath)
    .replace(/\$EXPECTED/g, expectedPath);

  const result = await runCommand(fullCommand, { workingDir });

  if (result.success && result.exitCode === 0) {
    return { matches: true };
  }

  return {
    matches: false,
    diff: result.stdout || result.stderr || 'Custom comparison failed',
  };
}

/**
 * Validate a single expected output against actual results.
 */
export async function validateOutput(
  expectedOutput: ExpectedOutput,
  options: OutputValidationOptions
): Promise<OutputComparison> {
  const { buildDir, fixturesDir, timeout = 30000 } = options;
  const startTime = Date.now();

  const workingDir = path.resolve(buildDir, expectedOutput.workingDir);
  const fixturePath = path.resolve(fixturesDir, expectedOutput.fixturePath);

  // Read expected fixture
  const expected = await readFixture(fixturePath);
  if (expected === null) {
    return {
      expectedOutputId: expectedOutput.id,
      expectedOutputName: expectedOutput.name,
      matches: false,
      error: `Fixture file not found: ${fixturePath}`,
      durationMs: Date.now() - startTime,
    };
  }

  // Run the command to generate actual output
  const commandResult = await runCommand(expectedOutput.command, {
    workingDir,
    env: expectedOutput.env,
    timeout,
    outputPath: expectedOutput.outputPath,
  });

  if (!commandResult.success) {
    return {
      expectedOutputId: expectedOutput.id,
      expectedOutputName: expectedOutput.name,
      matches: false,
      actualOutput: commandResult.stdout,
      error: `Command failed: ${commandResult.stderr}`,
      durationMs: Date.now() - startTime,
    };
  }

  const actual = commandResult.stdout;
  const durationMs = Date.now() - startTime;

  // Compare based on comparator type
  let comparison: { matches: boolean; diff?: string };

  switch (expectedOutput.comparator) {
    case 'exact':
      comparison = compareText(actual, expected, 'exact');
      break;

    case 'text':
      comparison = compareText(actual, expected, 'text');
      break;

    case 'json-deep':
      comparison = compareJson(actual, expected);
      break;

    case 'regex':
      if (!expectedOutput.pattern) {
        comparison = {
          matches: false,
          diff: 'Regex pattern not specified',
        };
      } else {
        comparison = compareRegex(actual, expectedOutput.pattern);
      }
      break;

    case 'image-diff':
      // Image comparison requires external tools and is more complex
      // For now, return a placeholder indicating it's not supported
      comparison = {
        matches: false,
        diff: 'Image comparison not yet implemented - requires external image diff tool',
      };
      break;

    case 'custom':
      if (!expectedOutput.customComparator) {
        comparison = {
          matches: false,
          diff: 'Custom comparator command not specified',
        };
      } else {
        // Write actual output to temp file for comparison
        const tempActualPath = path.join(workingDir, '.actual-output.tmp');
        await fs.writeFile(tempActualPath, actual);
        comparison = await compareCustom(
          tempActualPath,
          fixturePath,
          expectedOutput.customComparator,
          workingDir
        );
        // Clean up temp file
        await fs.unlink(tempActualPath).catch(() => {});
      }
      break;

    default:
      comparison = {
        matches: false,
        diff: `Unknown comparator type: ${expectedOutput.comparator}`,
      };
  }

  return {
    expectedOutputId: expectedOutput.id,
    expectedOutputName: expectedOutput.name,
    matches: comparison.matches,
    actualOutput: actual,
    diff: comparison.diff,
    durationMs,
  };
}

/**
 * Validate all expected outputs for a checkpoint.
 *
 * @example
 * ```typescript
 * const result = await validateOutputs(expectedOutputs, {
 *   buildDir: 'build',
 *   fixturesDir: 'fixtures',
 * });
 *
 * if (!result.success) {
 *   console.log(`${result.failed} outputs did not match`);
 *   for (const comparison of result.comparisons) {
 *     if (!comparison.matches) {
 *       console.log(`  ${comparison.expectedOutputName}: ${comparison.diff}`);
 *     }
 *   }
 * }
 * ```
 */
export async function validateOutputs(
  expectedOutputs: ExpectedOutput[],
  checkpointId: string,
  options: OutputValidationOptions
): Promise<OutputValidationResult> {
  const { continueOnFailure = true } = options;
  const comparisons: OutputComparison[] = [];

  for (const expectedOutput of expectedOutputs) {
    const comparison = await validateOutput(expectedOutput, options);
    comparisons.push(comparison);

    // Stop on first failure if configured
    if (!continueOnFailure && !comparison.matches) {
      break;
    }
  }

  const passed = comparisons.filter((c) => c.matches).length;
  const failed = comparisons.filter((c) => !c.matches).length;

  return {
    checkpointId,
    success: failed === 0,
    total: expectedOutputs.length,
    passed,
    failed,
    comparisons,
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Create an expected output fixture for text comparison.
 */
export function createTextFixture(
  data: Omit<ExpectedOutput, 'id' | 'entityType' | 'type' | 'comparator' | 'createdAt' | 'updatedAt'>
): Omit<ExpectedOutput, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    entityType: 'expected-output',
    type: 'text',
    comparator: 'text',
    ...data,
  };
}

/**
 * Create an expected output fixture for JSON comparison.
 */
export function createJsonFixture(
  data: Omit<ExpectedOutput, 'id' | 'entityType' | 'type' | 'comparator' | 'createdAt' | 'updatedAt'>
): Omit<ExpectedOutput, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    entityType: 'expected-output',
    type: 'json',
    comparator: 'json-deep',
    ...data,
  };
}

/**
 * Format output validation results for display.
 */
export function formatOutputResults(
  result: OutputValidationResult,
  options?: { showDiffs?: boolean; maxDiffLines?: number; colorize?: boolean }
): string {
  const { showDiffs = true, maxDiffLines = 10, colorize = false } = options ?? {};

  const lines: string[] = [];

  // Summary
  const statusText = result.success ? 'PASSED' : 'FAILED';
  const status = colorize
    ? result.success
      ? `\x1b[32m${statusText}\x1b[0m`
      : `\x1b[31m${statusText}\x1b[0m`
    : statusText;

  lines.push(`Output validation: ${status}`);
  lines.push(`  ${result.passed}/${result.total} fixtures matched`);

  // Show failures
  if (showDiffs) {
    const failures = result.comparisons.filter((c) => !c.matches);
    for (const failure of failures) {
      lines.push('');
      lines.push(`  ${failure.expectedOutputName}:`);

      if (failure.error) {
        lines.push(`    Error: ${failure.error}`);
      } else if (failure.diff) {
        const diffLines = failure.diff.split('\n').slice(0, maxDiffLines);
        for (const line of diffLines) {
          lines.push(`    ${line}`);
        }
        const totalDiffLines = failure.diff.split('\n').length;
        if (totalDiffLines > maxDiffLines) {
          lines.push(`    ... and ${totalDiffLines - maxDiffLines} more lines`);
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * Check if a comparator type is valid.
 */
export function isValidComparator(comparator: string): comparator is ComparatorType {
  const valid: ComparatorType[] = ['exact', 'text', 'image-diff', 'json-deep', 'regex', 'custom'];
  return valid.includes(comparator as ComparatorType);
}

/**
 * Get supported comparator types for a given output type.
 */
export function getSupportedComparators(outputType: string): ComparatorType[] {
  switch (outputType) {
    case 'text':
      return ['exact', 'text', 'regex', 'custom'];
    case 'json':
      return ['json-deep', 'exact', 'custom'];
    case 'image':
      return ['image-diff', 'custom'];
    case 'custom':
      return ['custom', 'exact', 'text', 'regex'];
    default:
      return ['exact', 'text', 'custom'];
  }
}
