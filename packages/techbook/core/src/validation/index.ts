/**
 * Validation module for TechBook domain.
 *
 * Provides validation infrastructure for checkpoints:
 * - **Compile**: Run compilers on tangled code
 * - **Test**: Run test frameworks
 * - **Output**: Compare actual vs expected fixtures
 *
 * @example Validating a checkpoint
 * ```typescript
 * import {
 *   runCompilation,
 *   runTests,
 *   validateOutputs,
 *   createTypescriptCompiler,
 *   createVitestFramework,
 * } from '@repo/techbook-core';
 *
 * // First, compile the code
 * const compileResult = await runCompilation({
 *   compiler: createTypescriptCompiler(),
 *   buildDir: 'build/src',
 * });
 *
 * if (!compileResult.success) {
 *   console.log('Compilation failed:', formatCompileErrors(compileResult));
 *   return;
 * }
 *
 * // Then run tests
 * const testResult = await runTests({
 *   framework: createVitestFramework(),
 *   buildDir: 'build',
 * });
 *
 * if (!testResult.success) {
 *   console.log('Tests failed:', formatTestResults(testResult));
 *   return;
 * }
 *
 * // Finally, check output fixtures
 * const outputResult = await validateOutputs(expectedOutputs, checkpointId, {
 *   buildDir: 'build',
 *   fixturesDir: 'fixtures',
 * });
 *
 * if (!outputResult.success) {
 *   console.log('Outputs mismatch:', formatOutputResults(outputResult));
 * }
 * ```
 *
 * @example Creating compiler configurations
 * ```typescript
 * import {
 *   createTypescriptCompiler,
 *   createRustCompiler,
 *   createGoCompiler,
 * } from '@repo/techbook-core';
 *
 * // TypeScript project
 * const tsCompiler = createTypescriptCompiler({
 *   command: 'npx tsc --project tsconfig.build.json --noEmit',
 * });
 *
 * // Rust project
 * const rustCompiler = createRustCompiler({
 *   workingDir: 'crate',
 * });
 *
 * // Go project
 * const goCompiler = createGoCompiler({
 *   command: 'go build -o /dev/null ./...',
 * });
 * ```
 *
 * @example Creating test framework configurations
 * ```typescript
 * import {
 *   createVitestFramework,
 *   createJestFramework,
 *   createPytestFramework,
 *   createCargoTestFramework,
 * } from '@repo/techbook-core';
 *
 * // Vitest for TypeScript
 * const vitest = createVitestFramework({
 *   command: 'npm run test:unit',
 * });
 *
 * // Jest for JavaScript
 * const jest = createJestFramework();
 *
 * // pytest for Python
 * const pytest = createPytestFramework({
 *   command: 'pytest tests/ -v',
 * });
 *
 * // Cargo test for Rust
 * const cargo = createCargoTestFramework();
 * ```
 *
 * @example Creating output fixtures
 * ```typescript
 * import { createTextFixture, createJsonFixture } from '@repo/techbook-core';
 *
 * const textFixture = createTextFixture({
 *   name: 'help-output',
 *   description: 'Verify help text output',
 *   checkpointId: 'chapter-03',
 *   command: 'node dist/cli.js --help',
 *   fixturePath: 'cli-help.txt',
 * });
 *
 * const jsonFixture = createJsonFixture({
 *   name: 'config-output',
 *   description: 'Verify config file parsing',
 *   checkpointId: 'chapter-05',
 *   command: 'node dist/cli.js config --json',
 *   fixturePath: 'config-output.json',
 * });
 * ```
 */

// Compilation exports
export {
  countCompileIssues,
  createGoCompiler,
  createRustCompiler,
  createTypescriptCompiler,
  ERROR_PARSERS,
  formatCompileErrors,
  getErrorParser,
  isCompilerAvailable,
  runCompilation,
  type CompileOptions,
  type CompilerConfig,
  type ParsedCompileError,
} from './compile';

// Test runner exports
export {
  createCargoTestFramework,
  createJestFramework,
  createPytestFramework,
  createVitestFramework,
  formatTestResults,
  getTestParser,
  isTestFrameworkAvailable,
  runTests,
  TEST_PARSERS,
  type ParsedTestFailure,
  type TestFrameworkConfig,
  type TestOptions,
  type TestSummary,
} from './test';

// Output comparison exports
export {
  compareCustom,
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
  type CommandResult,
  type OutputValidationOptions,
} from './output';
