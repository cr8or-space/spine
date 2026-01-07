/**
 * Compilation validation for TechBook domain.
 *
 * Runs compilers (TypeScript, Rust, Go, etc.) on tangled source code
 * and captures results for checkpoint validation.
 */

import { exec, type ExecException } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';

import type { CompileResult } from '@repo/techbook-types';

const execAsync = promisify(exec);

/**
 * Configuration for a compiler
 */
export interface CompilerConfig {
  /** Language identifier (e.g., 'typescript', 'rust', 'go') */
  language: string;
  /** Command to run for compilation (e.g., 'tsc --noEmit') */
  command: string;
  /** Optional working directory (relative to build dir) */
  workingDir?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** File extensions this compiler handles */
  extensions?: string[];
}

/**
 * Options for running compilation
 */
export interface CompileOptions {
  /** Compiler configuration */
  compiler: CompilerConfig;
  /** Build directory containing tangled files */
  buildDir: string;
  /** Whether to capture detailed error parsing (default: true) */
  parseErrors?: boolean;
}

/**
 * Parsed compilation error
 */
export interface ParsedCompileError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Common error parsers for different compilers
 */
export const ERROR_PARSERS: Record<string, (output: string) => ParsedCompileError[]> = {
  /**
   * TypeScript error format:
   * src/main.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
   * or:
   * src/main.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.
   */
  typescript: (output: string): ParsedCompileError[] => {
    const errors: ParsedCompileError[] = [];
    // Match both TS error formats
    const patterns = [
      // Format: file(line,col): error/warning TSxxxx: message
      /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)$/gm,
      // Format: file:line:col - error/warning TSxxxx: message
      /^(.+?):(\d+):(\d+)\s*-\s*(error|warning)\s+TS\d+:\s*(.+)$/gm,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        errors.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          severity: match[4] as 'error' | 'warning',
          message: match[5].trim(),
        });
      }
    }

    return errors;
  },

  /**
   * Rust error format:
   * error[E0308]: mismatched types
   *  --> src/main.rs:10:5
   */
  rust: (output: string): ParsedCompileError[] => {
    const errors: ParsedCompileError[] = [];
    const pattern = /^(error|warning)(?:\[E\d+\])?:\s*(.+?)\n\s*-->\s*(.+?):(\d+):(\d+)/gm;

    let match;
    while ((match = pattern.exec(output)) !== null) {
      errors.push({
        file: match[3],
        line: parseInt(match[4], 10),
        column: parseInt(match[5], 10),
        severity: match[1] as 'error' | 'warning',
        message: match[2].trim(),
      });
    }

    return errors;
  },

  /**
   * Go error format:
   * ./main.go:10:5: undefined: foo
   */
  go: (output: string): ParsedCompileError[] => {
    const errors: ParsedCompileError[] = [];
    const pattern = /^(.+?):(\d+):(\d+):\s*(.+)$/gm;

    let match;
    while ((match = pattern.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: 'error',
        message: match[4].trim(),
      });
    }

    return errors;
  },

  /**
   * Generic fallback parser
   * Looks for common patterns like "file:line:col: message" or "file(line,col): message"
   */
  generic: (output: string): ParsedCompileError[] => {
    const errors: ParsedCompileError[] = [];

    // Pattern 1: file:line:col: message
    const pattern1 = /^(.+?):(\d+):(\d+):\s*(?:(error|warning|Error|Warning):\s*)?(.+)$/gm;
    let match;
    while ((match = pattern1.exec(output)) !== null) {
      const severity = match[4]?.toLowerCase();
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: severity === 'warning' ? 'warning' : 'error',
        message: match[5].trim(),
      });
    }

    // Pattern 2: file(line,col): message
    const pattern2 = /^(.+?)\((\d+),(\d+)\):\s*(?:(error|warning|Error|Warning):\s*)?(.+)$/gm;
    while ((match = pattern2.exec(output)) !== null) {
      const severity = match[4]?.toLowerCase();
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: severity === 'warning' ? 'warning' : 'error',
        message: match[5].trim(),
      });
    }

    return errors;
  },
};

/**
 * Get the appropriate error parser for a language
 */
export function getErrorParser(
  language: string
): (output: string) => ParsedCompileError[] {
  const normalized = language.toLowerCase();

  if (normalized === 'typescript' || normalized === 'ts') {
    return ERROR_PARSERS.typescript;
  }
  if (normalized === 'rust' || normalized === 'rs') {
    return ERROR_PARSERS.rust;
  }
  if (normalized === 'go' || normalized === 'golang') {
    return ERROR_PARSERS.go;
  }

  return ERROR_PARSERS.generic;
}

/**
 * Run compilation and return results.
 *
 * @example
 * ```typescript
 * const result = await runCompilation({
 *   compiler: {
 *     language: 'typescript',
 *     command: 'npx tsc --noEmit',
 *   },
 *   buildDir: 'build/src',
 * });
 *
 * if (!result.success) {
 *   console.log('Compilation failed:', result.errors);
 * }
 * ```
 */
export async function runCompilation(options: CompileOptions): Promise<CompileResult> {
  const { compiler, buildDir, parseErrors = true } = options;
  const startTime = Date.now();

  const workingDir = compiler.workingDir
    ? path.resolve(buildDir, compiler.workingDir)
    : buildDir;

  const env = {
    ...process.env,
    ...compiler.env,
  };

  try {
    const { stdout, stderr } = await execAsync(compiler.command, {
      cwd: workingDir,
      env,
      timeout: compiler.timeout ?? 60000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const output = stdout + stderr;
    const durationMs = Date.now() - startTime;

    // Successful compilation (exit code 0)
    return {
      success: true,
      output,
      errors: [],
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const execError = error as ExecException & { stdout?: string; stderr?: string };
    const output = (execError.stdout ?? '') + (execError.stderr ?? '');

    // Parse errors if requested
    let errors: CompileResult['errors'] = [];
    if (parseErrors) {
      const parser = getErrorParser(compiler.language);
      const parsed = parser(output);
      errors = parsed.map((e) => ({
        file: e.file,
        line: e.line,
        column: e.column,
        message: e.message,
        severity: e.severity,
      }));
    }

    // If no errors were parsed but compilation failed, add a generic error
    // (only if parseErrors was requested)
    if (parseErrors && errors.length === 0 && output.trim()) {
      errors = [
        {
          file: 'unknown',
          message: output.trim().split('\n')[0] ?? 'Compilation failed',
          severity: 'error',
        },
      ];
    }

    return {
      success: false,
      output,
      errors,
      durationMs,
    };
  }
}

/**
 * Create a compiler configuration for TypeScript projects.
 */
export function createTypescriptCompiler(overrides?: Partial<CompilerConfig>): CompilerConfig {
  return {
    language: 'typescript',
    command: 'npx tsc --noEmit',
    extensions: ['.ts', '.tsx'],
    timeout: 60000,
    ...overrides,
  };
}

/**
 * Create a compiler configuration for Rust projects.
 */
export function createRustCompiler(overrides?: Partial<CompilerConfig>): CompilerConfig {
  return {
    language: 'rust',
    command: 'cargo check',
    extensions: ['.rs'],
    timeout: 120000,
    ...overrides,
  };
}

/**
 * Create a compiler configuration for Go projects.
 */
export function createGoCompiler(overrides?: Partial<CompilerConfig>): CompilerConfig {
  return {
    language: 'go',
    command: 'go build ./...',
    extensions: ['.go'],
    timeout: 60000,
    ...overrides,
  };
}

/**
 * Validate that a compiler is available on the system.
 *
 * @returns true if the compiler can be executed, false otherwise
 */
export async function isCompilerAvailable(
  compiler: CompilerConfig,
  buildDir: string
): Promise<boolean> {
  // Extract the base command (first word)
  const baseCommand = compiler.command.split(/\s+/)[0];
  if (!baseCommand) {
    return false;
  }

  try {
    // Try to run --version or --help to check if command exists
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
 * Count errors and warnings from compile result
 */
export function countCompileIssues(result: CompileResult): {
  errors: number;
  warnings: number;
} {
  let errors = 0;
  let warnings = 0;

  for (const error of result.errors) {
    if (error.severity === 'warning') {
      warnings++;
    } else {
      errors++;
    }
  }

  return { errors, warnings };
}

/**
 * Format compile errors for display
 */
export function formatCompileErrors(
  result: CompileResult,
  options?: { maxErrors?: number; colorize?: boolean }
): string {
  const { maxErrors = 10, colorize = false } = options ?? {};

  if (result.errors.length === 0) {
    return result.success ? 'Compilation successful' : 'Compilation failed (no errors parsed)';
  }

  const lines: string[] = [];
  const displayed = result.errors.slice(0, maxErrors);

  for (const error of displayed) {
    const location =
      error.line !== undefined
        ? `${error.file}:${error.line}${error.column ? `:${error.column}` : ''}`
        : error.file;

    const prefix = error.severity === 'warning' ? 'warning' : 'error';
    const prefixDisplay = colorize
      ? error.severity === 'warning'
        ? `\x1b[33m${prefix}\x1b[0m`
        : `\x1b[31m${prefix}\x1b[0m`
      : prefix;

    lines.push(`${location}: ${prefixDisplay}: ${error.message}`);
  }

  if (result.errors.length > maxErrors) {
    lines.push(`... and ${result.errors.length - maxErrors} more errors`);
  }

  return lines.join('\n');
}
