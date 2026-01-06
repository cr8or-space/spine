/**
 * Tests for validation pipeline.
 */

import { describe, it, expect } from 'vitest';

import type { Validator, ValidationResult } from '@repo/framework-types';

import { createValidatorRegistry, createValidationPipeline } from './pipeline';

interface TestContext {
  value: number;
}

const passingValidator: Validator<TestContext> = {
  name: 'passing',
  phase: 'structural',
  async validate(): Promise<ValidationResult[]> {
    return [{ status: 'pass', message: 'All good' }];
  },
};

const failingValidator: Validator<TestContext> = {
  name: 'failing',
  phase: 'structural',
  async validate(): Promise<ValidationResult[]> {
    return [{ status: 'fail', message: 'Something wrong' }];
  },
};

const warningValidator: Validator<TestContext> = {
  name: 'warning',
  phase: 'automated',
  async validate(): Promise<ValidationResult[]> {
    return [{ status: 'warn', message: 'Watch out' }];
  },
};

const computedValidator: Validator<TestContext> = {
  name: 'computed',
  phase: 'computed',
  async validate(ctx): Promise<ValidationResult[]> {
    return ctx.value > 0
      ? [{ status: 'pass', message: 'Value is positive' }]
      : [{ status: 'fail', message: 'Value must be positive' }];
  },
};

const throwingValidator: Validator<TestContext> = {
  name: 'throwing',
  phase: 'structural',
  async validate(): Promise<ValidationResult[]> {
    throw new Error('Validator exploded');
  },
};

describe('createValidatorRegistry', () => {
  it('registers validators', () => {
    const registry = createValidatorRegistry<TestContext>();
    registry.register(passingValidator);
    registry.register(failingValidator);

    expect(registry.getAll()).toHaveLength(2);
  });

  it('throws on duplicate registration', () => {
    const registry = createValidatorRegistry<TestContext>();
    registry.register(passingValidator);

    expect(() => registry.register(passingValidator)).toThrow(
      "Validator 'passing' is already registered"
    );
  });

  it('filters by phase', () => {
    const registry = createValidatorRegistry<TestContext>();
    registry.register(passingValidator);
    registry.register(warningValidator);
    registry.register(computedValidator);

    expect(registry.getByPhase('structural')).toHaveLength(1);
    expect(registry.getByPhase('automated')).toHaveLength(1);
    expect(registry.getByPhase('computed')).toHaveLength(1);
  });

  describe('runAll', () => {
    it('runs all validators', async () => {
      const registry = createValidatorRegistry<TestContext>();
      registry.register(passingValidator);
      registry.register(warningValidator);

      const results = await registry.runAll({ value: 1 });
      expect(results).toHaveLength(2);
    });
  });

  describe('runPhase', () => {
    it('runs only validators in specified phase', async () => {
      const registry = createValidatorRegistry<TestContext>();
      registry.register(passingValidator);
      registry.register(warningValidator);

      const results = await registry.runPhase('structural', { value: 1 });
      expect(results).toHaveLength(1);
      expect(results[0].message).toBe('All good');
    });
  });
});

describe('createValidationPipeline', () => {
  describe('run', () => {
    it('runs all phases in order', async () => {
      const registry = createValidatorRegistry<TestContext>();
      registry.register(passingValidator);
      registry.register(warningValidator);
      registry.register(computedValidator);

      const pipeline = createValidationPipeline(registry);
      const result = await pipeline.run({ value: 1 });

      expect(result.results).toHaveLength(3);
      expect(result.byPhase.structural).toHaveLength(1);
      expect(result.byPhase.automated).toHaveLength(1);
      expect(result.byPhase.computed).toHaveLength(1);
    });

    it('reports passed status when no failures', async () => {
      const registry = createValidatorRegistry<TestContext>();
      registry.register(passingValidator);
      registry.register(warningValidator);

      const pipeline = createValidationPipeline(registry);
      const result = await pipeline.run({ value: 1 });

      expect(result.passed).toBe(true);
      expect(result.failCount).toBe(0);
      expect(result.warnCount).toBe(1);
    });

    it('reports failed status when has failures', async () => {
      const registry = createValidatorRegistry<TestContext>();
      registry.register(passingValidator);
      registry.register(failingValidator);

      const pipeline = createValidationPipeline(registry);
      const result = await pipeline.run({ value: 1 });

      expect(result.passed).toBe(false);
      expect(result.failCount).toBe(1);
    });

    it('tracks duration', async () => {
      const registry = createValidatorRegistry<TestContext>();
      registry.register(passingValidator);

      const pipeline = createValidationPipeline(registry);
      const result = await pipeline.run({ value: 1 });

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('runs only specified phases', async () => {
      const registry = createValidatorRegistry<TestContext>();
      registry.register(passingValidator);
      registry.register(warningValidator);
      registry.register(computedValidator);

      const pipeline = createValidationPipeline(registry);
      const result = await pipeline.run({ value: 1 }, { phases: ['structural'] });

      expect(result.results).toHaveLength(1);
      expect(result.byPhase.structural).toHaveLength(1);
      expect(result.byPhase.automated).toHaveLength(0);
      expect(result.byPhase.computed).toHaveLength(0);
    });

    it('stops on failure when configured', async () => {
      const registry = createValidatorRegistry<TestContext>();
      registry.register(failingValidator);
      registry.register(warningValidator);

      const pipeline = createValidationPipeline(registry);
      const result = await pipeline.run({ value: 1 }, { stopOnFail: true });

      // Should stop after structural phase
      expect(result.byPhase.structural).toHaveLength(1);
      expect(result.byPhase.automated).toHaveLength(0);
    });

    it('handles validator errors gracefully', async () => {
      const registry = createValidatorRegistry<TestContext>();
      registry.register(throwingValidator);

      const pipeline = createValidationPipeline(registry);
      const result = await pipeline.run({ value: 1 });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('fail');
      expect(result.results[0].message).toContain('Validator exploded');
    });
  });
});
