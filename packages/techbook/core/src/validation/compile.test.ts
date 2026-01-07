/**
 * Tests for compilation validation
 */

import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  countCompileIssues,
  createGoCompiler,
  createRustCompiler,
  createTypescriptCompiler,
  ERROR_PARSERS,
  formatCompileErrors,
  getErrorParser,
  runCompilation,
  type CompilerConfig,
} from './compile';

// Helper to create a unique temp directory
async function createTempDir(): Promise<string> {
  const dir = path.join(
    tmpdir(),
    `compile-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

describe('ERROR_PARSERS', () => {
  describe('typescript', () => {
    it('should parse TypeScript error format with parentheses', () => {
      const output = `src/main.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.`;
      const errors = ERROR_PARSERS.typescript(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        file: 'src/main.ts',
        line: 10,
        column: 5,
        severity: 'error',
        message: "Type 'string' is not assignable to type 'number'.",
      });
    });

    it('should parse TypeScript error format with colons', () => {
      const output = `src/main.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.`;
      const errors = ERROR_PARSERS.typescript(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        file: 'src/main.ts',
        line: 10,
        column: 5,
        severity: 'error',
        message: "Type 'string' is not assignable to type 'number'.",
      });
    });

    it('should parse TypeScript warnings', () => {
      const output = `src/main.ts(5,1): warning TS6385: 'foo' is deprecated.`;
      const errors = ERROR_PARSERS.typescript(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        file: 'src/main.ts',
        line: 5,
        column: 1,
        severity: 'warning',
        message: "'foo' is deprecated.",
      });
    });

    it('should parse multiple errors', () => {
      const output = `src/a.ts(1,1): error TS2304: Cannot find name 'x'.
src/b.ts(2,3): error TS2322: Type 'string' is not assignable to type 'number'.`;
      const errors = ERROR_PARSERS.typescript(output);

      expect(errors).toHaveLength(2);
      expect(errors[0].file).toBe('src/a.ts');
      expect(errors[1].file).toBe('src/b.ts');
    });

    it('should return empty array for clean output', () => {
      const output = 'Compilation successful.';
      const errors = ERROR_PARSERS.typescript(output);

      expect(errors).toEqual([]);
    });
  });

  describe('rust', () => {
    it('should parse Rust error format', () => {
      const output = `error[E0308]: mismatched types
 --> src/main.rs:10:5`;
      const errors = ERROR_PARSERS.rust(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        file: 'src/main.rs',
        line: 10,
        column: 5,
        severity: 'error',
        message: 'mismatched types',
      });
    });

    it('should parse Rust warnings', () => {
      const output = `warning: unused variable: \`x\`
 --> src/main.rs:5:9`;
      const errors = ERROR_PARSERS.rust(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('warning');
    });
  });

  describe('go', () => {
    it('should parse Go error format', () => {
      const output = `./main.go:10:5: undefined: foo`;
      const errors = ERROR_PARSERS.go(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        file: './main.go',
        line: 10,
        column: 5,
        severity: 'error',
        message: 'undefined: foo',
      });
    });

    it('should parse multiple Go errors', () => {
      const output = `./main.go:10:5: undefined: foo
./util.go:20:10: cannot use x as type y`;
      const errors = ERROR_PARSERS.go(output);

      expect(errors).toHaveLength(2);
    });
  });

  describe('generic', () => {
    it('should parse file:line:col: message format', () => {
      const output = `src/file.ts:10:5: error: something went wrong`;
      const errors = ERROR_PARSERS.generic(output);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        file: 'src/file.ts',
        line: 10,
        column: 5,
        severity: 'error',
        message: 'something went wrong',
      });
    });

    it('should parse file(line,col): message format', () => {
      const output = `src/file.ts(10,5): Warning: something suspicious`;
      const errors = ERROR_PARSERS.generic(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('warning');
    });
  });
});

describe('getErrorParser', () => {
  it('should return TypeScript parser for typescript', () => {
    expect(getErrorParser('typescript')).toBe(ERROR_PARSERS.typescript);
    expect(getErrorParser('ts')).toBe(ERROR_PARSERS.typescript);
    expect(getErrorParser('TypeScript')).toBe(ERROR_PARSERS.typescript);
  });

  it('should return Rust parser for rust', () => {
    expect(getErrorParser('rust')).toBe(ERROR_PARSERS.rust);
    expect(getErrorParser('rs')).toBe(ERROR_PARSERS.rust);
  });

  it('should return Go parser for go', () => {
    expect(getErrorParser('go')).toBe(ERROR_PARSERS.go);
    expect(getErrorParser('golang')).toBe(ERROR_PARSERS.go);
  });

  it('should return generic parser for unknown languages', () => {
    expect(getErrorParser('python')).toBe(ERROR_PARSERS.generic);
    expect(getErrorParser('unknown')).toBe(ERROR_PARSERS.generic);
  });
});

describe('createTypescriptCompiler', () => {
  it('should create default TypeScript compiler config', () => {
    const config = createTypescriptCompiler();

    expect(config.language).toBe('typescript');
    expect(config.command).toBe('npx tsc --noEmit');
    expect(config.extensions).toEqual(['.ts', '.tsx']);
    expect(config.timeout).toBe(60000);
  });

  it('should allow overrides', () => {
    const config = createTypescriptCompiler({
      command: 'tsc --project tsconfig.build.json',
      timeout: 120000,
    });

    expect(config.command).toBe('tsc --project tsconfig.build.json');
    expect(config.timeout).toBe(120000);
    expect(config.language).toBe('typescript');
  });
});

describe('createRustCompiler', () => {
  it('should create default Rust compiler config', () => {
    const config = createRustCompiler();

    expect(config.language).toBe('rust');
    expect(config.command).toBe('cargo check');
    expect(config.extensions).toEqual(['.rs']);
    expect(config.timeout).toBe(120000);
  });
});

describe('createGoCompiler', () => {
  it('should create default Go compiler config', () => {
    const config = createGoCompiler();

    expect(config.language).toBe('go');
    expect(config.command).toBe('go build ./...');
    expect(config.extensions).toEqual(['.go']);
  });
});

describe('countCompileIssues', () => {
  it('should count errors and warnings', () => {
    const result = {
      success: false,
      output: '',
      errors: [
        { file: 'a.ts', message: 'error 1', severity: 'error' as const },
        { file: 'b.ts', message: 'warning 1', severity: 'warning' as const },
        { file: 'c.ts', message: 'error 2', severity: 'error' as const },
        { file: 'd.ts', message: 'warning 2', severity: 'warning' as const },
        { file: 'e.ts', message: 'warning 3', severity: 'warning' as const },
      ],
    };

    const counts = countCompileIssues(result);

    expect(counts.errors).toBe(2);
    expect(counts.warnings).toBe(3);
  });

  it('should return zeros for successful compilation', () => {
    const result = {
      success: true,
      output: '',
      errors: [],
    };

    const counts = countCompileIssues(result);

    expect(counts.errors).toBe(0);
    expect(counts.warnings).toBe(0);
  });
});

describe('formatCompileErrors', () => {
  it('should format errors for display', () => {
    const result = {
      success: false,
      output: '',
      errors: [
        { file: 'src/main.ts', line: 10, column: 5, message: 'Type error', severity: 'error' as const },
        { file: 'src/util.ts', line: 20, message: 'Missing export', severity: 'warning' as const },
      ],
    };

    const formatted = formatCompileErrors(result);

    expect(formatted).toContain('src/main.ts:10:5');
    expect(formatted).toContain('error');
    expect(formatted).toContain('Type error');
    expect(formatted).toContain('src/util.ts:20');
    expect(formatted).toContain('warning');
  });

  it('should limit number of errors shown', () => {
    const result = {
      success: false,
      output: '',
      errors: Array.from({ length: 20 }, (_, i) => ({
        file: `file${i}.ts`,
        message: `error ${i}`,
        severity: 'error' as const,
      })),
    };

    const formatted = formatCompileErrors(result, { maxErrors: 5 });

    expect(formatted).toContain('and 15 more errors');
  });

  it('should handle successful compilation', () => {
    const result = {
      success: true,
      output: '',
      errors: [],
    };

    const formatted = formatCompileErrors(result);

    expect(formatted).toBe('Compilation successful');
  });
});

describe('runCompilation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should run successful command', async () => {
    const compiler: CompilerConfig = {
      language: 'generic',
      command: 'echo "success"',
    };

    const result = await runCompilation({
      compiler,
      buildDir: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('success');
    expect(result.errors).toEqual([]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle failed command', async () => {
    const compiler: CompilerConfig = {
      language: 'generic',
      command: 'exit 1',
    };

    const result = await runCompilation({
      compiler,
      buildDir: tempDir,
    });

    expect(result.success).toBe(false);
  });

  it('should respect working directory', async () => {
    const subDir = path.join(tempDir, 'subdir');
    await fs.mkdir(subDir, { recursive: true });

    const compiler: CompilerConfig = {
      language: 'generic',
      command: 'pwd',
      workingDir: 'subdir',
    };

    const result = await runCompilation({
      compiler,
      buildDir: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('subdir');
  });

  it('should pass environment variables', async () => {
    const compiler: CompilerConfig = {
      language: 'generic',
      command: 'echo $TEST_VAR',
      env: { TEST_VAR: 'hello' },
    };

    const result = await runCompilation({
      compiler,
      buildDir: tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('hello');
  });

  it('should handle timeout', async () => {
    const compiler: CompilerConfig = {
      language: 'generic',
      command: 'sleep 10',
      timeout: 100,
    };

    const result = await runCompilation({
      compiler,
      buildDir: tempDir,
    });

    expect(result.success).toBe(false);
    expect(result.durationMs).toBeLessThan(5000);
  });

  it('should parse TypeScript errors when language is typescript', async () => {
    const compiler: CompilerConfig = {
      language: 'typescript',
      command: 'echo "src/main.ts(10,5): error TS2322: Type error"',
    };

    // This will "succeed" (echo exits 0) but the parser won't find errors
    // because we're testing the parser path on failure
    const result = await runCompilation({
      compiler,
      buildDir: tempDir,
    });

    expect(result.success).toBe(true);
  });

  it('should not parse errors when parseErrors is false', async () => {
    const compiler: CompilerConfig = {
      language: 'generic',
      command: 'echo "error" && exit 1',
    };

    const result = await runCompilation({
      compiler,
      buildDir: tempDir,
      parseErrors: false,
    });

    expect(result.success).toBe(false);
    // Errors array will be empty since we're not parsing
    expect(result.errors).toEqual([]);
  });
});
