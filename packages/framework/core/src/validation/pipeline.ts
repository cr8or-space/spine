/**
 * Validation Pipeline - Orchestrates validator execution.
 *
 * The pipeline runs validators in phases:
 * 1. structural - Fast, schema-based checks
 * 2. automated - Rule-based validation
 * 3. computed - AI-assisted or expensive validation
 *
 * Within each phase, validators run in parallel.
 */

import type { Validator, ValidationResult, ValidationPhase, ValidatorRegistry } from '@repo/framework-types';

/**
 * Pipeline execution options.
 */
export interface PipelineOptions {
  /** Run only specific phases */
  phases?: ValidationPhase[];
  /** Stop on first failure */
  stopOnFail?: boolean;
  /** Timeout per validator in milliseconds */
  validatorTimeout?: number;
}

/**
 * Pipeline execution result.
 */
export interface PipelineResult {
  /** All validation results */
  results: ValidationResult[];
  /** Results grouped by phase */
  byPhase: Record<ValidationPhase, ValidationResult[]>;
  /** Whether all validations passed */
  passed: boolean;
  /** Number of failures */
  failCount: number;
  /** Number of warnings */
  warnCount: number;
  /** Execution time in milliseconds */
  durationMs: number;
}

/**
 * Create a validator registry.
 */
export function createValidatorRegistry<Context>(): ValidatorRegistry<Context> {
  const validators: Validator<Context>[] = [];

  return {
    register(validator: Validator<Context>): void {
      // Check for duplicate names
      if (validators.some((v) => v.name === validator.name)) {
        throw new Error(`Validator '${validator.name}' is already registered`);
      }
      validators.push(validator);
    },

    getByPhase(phase: ValidationPhase): Validator<Context>[] {
      return validators.filter((v) => v.phase === phase);
    },

    getAll(): Validator<Context>[] {
      return [...validators];
    },

    async runAll(context: Context): Promise<ValidationResult[]> {
      const pipeline = createValidationPipeline(this);
      const result = await pipeline.run(context);
      return result.results;
    },

    async runPhase(phase: ValidationPhase, context: Context): Promise<ValidationResult[]> {
      const pipeline = createValidationPipeline(this);
      const result = await pipeline.run(context, { phases: [phase] });
      return result.results;
    },
  };
}

/**
 * Validation pipeline for running validators.
 */
export interface ValidationPipeline<Context> {
  /**
   * Run the validation pipeline.
   */
  run(context: Context, options?: PipelineOptions): Promise<PipelineResult>;
}

/**
 * Create a validation pipeline.
 */
export function createValidationPipeline<Context>(
  registry: ValidatorRegistry<Context>
): ValidationPipeline<Context> {
  return {
    async run(context: Context, options: PipelineOptions = {}): Promise<PipelineResult> {
      const startTime = Date.now();
      const phases: ValidationPhase[] = options.phases ?? ['structural', 'automated', 'computed'];
      const results: ValidationResult[] = [];
      const byPhase: Record<ValidationPhase, ValidationResult[]> = {
        structural: [],
        automated: [],
        computed: [],
      };

      for (const phase of phases) {
        const validators = registry.getByPhase(phase);
        const phaseResults = await runPhaseValidators(validators, context, options);

        results.push(...phaseResults);
        byPhase[phase] = phaseResults;

        // Check for early termination
        if (options.stopOnFail && phaseResults.some((r) => r.status === 'fail')) {
          break;
        }
      }

      const failCount = results.filter((r) => r.status === 'fail').length;
      const warnCount = results.filter((r) => r.status === 'warn').length;

      return {
        results,
        byPhase,
        passed: failCount === 0,
        failCount,
        warnCount,
        durationMs: Date.now() - startTime,
      };
    },
  };
}

/**
 * Run validators for a single phase in parallel.
 */
async function runPhaseValidators<Context>(
  validators: Validator<Context>[],
  context: Context,
  options: PipelineOptions
): Promise<ValidationResult[]> {
  if (validators.length === 0) {
    return [];
  }

  const timeout = options.validatorTimeout ?? 30000;

  const promises = validators.map(async (validator) => {
    try {
      return await runWithTimeout(validator.validate(context), timeout, validator.name);
    } catch (error) {
      // Return an error result if validator throws
      const message = error instanceof Error ? error.message : String(error);
      return [
        {
          status: 'fail' as const,
          message: `Validator '${validator.name}' failed: ${message}`,
        },
      ];
    }
  });

  const resultArrays = await Promise.all(promises);
  return resultArrays.flat();
}

/**
 * Run a promise with a timeout.
 */
async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Validator '${name}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
