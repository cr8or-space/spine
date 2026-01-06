/**
 * Validation Handlers
 *
 * Framework-level handlers for validation operations.
 * Provides endpoints to trigger validation and retrieve results.
 */

import { z } from 'zod';

import type { ValidationPhase, ValidationResult } from '@repo/framework-types';
import type { ValidationSummary } from '@repo/framework-core';

import type { Router } from '../router';
import { ApiError } from '../router';
import type { BaseServices, ValidationService, ValidationContext } from '../types';
import type { SessionManager } from '../session';
import { createSessionContext } from '../session';

// ============================================================================
// Parameter Schemas
// ============================================================================

const ValidationRunParamsSchema = z.object({
  projectId: z.string().optional(),
  phases: z.array(z.enum(['structural', 'automated', 'computed'])).optional(),
  stopOnFail: z.boolean().optional().default(false),
});

const ValidationResultsParamsSchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['pass', 'fail', 'warn']).optional(),
  limit: z.number().optional().default(100),
  offset: z.number().optional().default(0),
});

const ValidationSummaryParamsSchema = z.object({
  projectId: z.string().optional(),
});

const ValidationClearParamsSchema = z.object({
  projectId: z.string().optional(),
});

// ============================================================================
// Result Types
// ============================================================================

interface ValidationRunResult {
  passed: boolean;
  failCount: number;
  warnCount: number;
  passCount: number;
  durationMs: number;
  results: ValidationResult[];
}

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register validation handlers.
 *
 * These handlers work with any domain's validation service.
 * The domain must provide a ValidationService that implements the interface.
 *
 * @param router - Router to register handlers on
 * @param services - Base services
 * @param sessionManager - Session manager
 * @param validationService - Domain-provided validation service (optional)
 */
export function registerValidationHandlers(
  router: Router,
  services: BaseServices,
  sessionManager: SessionManager,
  validationService?: ValidationService
): void {
  // validation.run - Run validation
  router.register(
    'validation.run',
    async (params, context): Promise<ValidationRunResult> => {
      const validated = ValidationRunParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      if (!validationService) {
        throw ApiError.validationError('Validation service not configured for this domain');
      }

      // Build validation context
      const entities = services.entities.findByProject(projectId);
      const content = services.content.findByProject(projectId);

      const validationContext: ValidationContext = {
        projectId,
        entities: entities.map((e) => e.entity),
        content: content.map((c) => c.content),
      };

      // Run validation
      const startTime = Date.now();
      let results: ValidationResult[];

      if (validated.phases && validated.phases.length > 0) {
        // Run specific phases
        results = [];
        for (const phase of validated.phases) {
          const phaseResults = await validationService.validatePhase(
            phase as ValidationPhase,
            validationContext
          );
          results.push(...phaseResults);

          if (validated.stopOnFail && phaseResults.some((r) => r.status === 'fail')) {
            break;
          }
        }
      } else {
        // Run all validators
        results = await validationService.validate(validationContext);
      }

      const durationMs = Date.now() - startTime;

      // Store results
      if (results.length > 0) {
        services.validationResults.saveResults(
          projectId,
          'validation.run',
          'automated',
          results
        );
      }

      // Count results
      const failCount = results.filter((r) => r.status === 'fail').length;
      const warnCount = results.filter((r) => r.status === 'warn').length;
      const passCount = results.filter((r) => r.status === 'pass').length;

      return {
        passed: failCount === 0,
        failCount,
        warnCount,
        passCount,
        durationMs,
        results,
      };
    },
    ValidationRunParamsSchema
  );

  // validation.results - Get stored validation results
  router.register(
    'validation.results',
    (params, context) => {
      const validated = ValidationResultsParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      let results = services.validationResults.getByProject(projectId);

      // Filter by status if specified
      if (validated.status) {
        results = results.filter((r) => r.status === validated.status);
      }

      // Apply pagination
      return results.slice(validated.offset, validated.offset + validated.limit);
    },
    ValidationResultsParamsSchema
  );

  // validation.summary - Get validation summary
  router.register(
    'validation.summary',
    (params, context): ValidationSummary => {
      const validated = ValidationSummaryParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      return services.validationResults.getSummary(projectId);
    },
    ValidationSummaryParamsSchema
  );

  // validation.clear - Clear stored validation results
  router.register(
    'validation.clear',
    (params, context) => {
      const validated = ValidationClearParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      const deleted = services.validationResults.clearByProject(projectId);
      return { cleared: deleted };
    },
    ValidationClearParamsSchema
  );

  // validation.phases - List available validation phases
  router.register('validation.phases', () => {
    if (!validationService) {
      return {
        phases: [],
        validators: [],
      };
    }

    const registry = validationService.getRegistry();
    const validators = registry.getAll();

    return {
      phases: ['structural', 'automated', 'computed'] as ValidationPhase[],
      validators: validators.map((v) => ({
        name: v.name,
        phase: v.phase,
      })),
    };
  });
}
