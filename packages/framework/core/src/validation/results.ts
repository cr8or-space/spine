/**
 * Validation Results - Storage and aggregation of validation results.
 *
 * Stores validation results in the database for history and reporting.
 */

import type Database from 'libsql';

import type { ValidationResult, ValidationPhase, SpinePosition } from '@repo/framework-types';

import { generateId, nowTimestamp } from '../storage/repository';

/**
 * Database row for a validation result.
 */
interface ValidationResultRow {
  id: string;
  project_id: string;
  content_id: string | null;
  constraint_id: string | null;
  validator_name: string;
  phase: string;
  status: string;
  message: string;
  location_node: string | null;
  location_order: number | null;
  fix_suggestion: string | null;
  created_at: string;
}

/**
 * Stored validation result with metadata.
 */
export interface StoredValidationResult extends ValidationResult {
  id: string;
  projectId: string;
  contentId?: string;
  constraintId?: string;
  validatorName: string;
  phase: ValidationPhase;
  createdAt: string;
}

/**
 * Summary of validation results.
 */
export interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  byPhase: Record<ValidationPhase, { passed: number; failed: number; warnings: number }>;
  byValidator: Record<string, { passed: number; failed: number; warnings: number }>;
}

/**
 * Validation results repository.
 */
export interface ValidationResultsRepository {
  /**
   * Save validation results.
   */
  saveResults(
    projectId: string,
    validatorName: string,
    phase: ValidationPhase,
    results: ValidationResult[],
    contentId?: string,
    constraintId?: string
  ): StoredValidationResult[];

  /**
   * Get results for a project.
   */
  getByProject(projectId: string): StoredValidationResult[];

  /**
   * Get results for content.
   */
  getByContent(projectId: string, contentId: string): StoredValidationResult[];

  /**
   * Get failed results for a project.
   */
  getFailures(projectId: string): StoredValidationResult[];

  /**
   * Get a summary of results for a project.
   */
  getSummary(projectId: string): ValidationSummary;

  /**
   * Clear results for a project.
   */
  clearByProject(projectId: string): number;

  /**
   * Clear results for content.
   */
  clearByContent(projectId: string, contentId: string): number;

  /**
   * Clear old results.
   */
  clearOlderThan(projectId: string, olderThan: Date): number;
}

/**
 * Create a validation results repository.
 *
 * @param db - Database connection
 */
export function createValidationResultsRepository(db: Database.Database): ValidationResultsRepository {
  // Prepared statements
  const insertStmt = db.prepare(`
    INSERT INTO validation_results (
      id, project_id, content_id, constraint_id, validator_name, phase,
      status, message, location_node, location_order, fix_suggestion, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const getByProjectStmt = db.prepare(`
    SELECT * FROM validation_results WHERE project_id = ?
    ORDER BY created_at DESC
  `);

  const getByContentStmt = db.prepare(`
    SELECT * FROM validation_results WHERE project_id = ? AND content_id = ?
    ORDER BY created_at DESC
  `);

  const getFailuresStmt = db.prepare(`
    SELECT * FROM validation_results WHERE project_id = ? AND status = 'fail'
    ORDER BY created_at DESC
  `);

  const getSummaryStmt = db.prepare(`
    SELECT
      validator_name,
      phase,
      status,
      COUNT(*) as count
    FROM validation_results
    WHERE project_id = ?
    GROUP BY validator_name, phase, status
  `);

  const clearByProjectStmt = db.prepare(`
    DELETE FROM validation_results WHERE project_id = ?
  `);

  const clearByContentStmt = db.prepare(`
    DELETE FROM validation_results WHERE project_id = ? AND content_id = ?
  `);

  const clearOlderThanStmt = db.prepare(`
    DELETE FROM validation_results WHERE project_id = ? AND created_at < ?
  `);

  /**
   * Convert row to stored result.
   */
  function rowToResult(row: ValidationResultRow): StoredValidationResult {
    const result: StoredValidationResult = {
      id: row.id,
      projectId: row.project_id,
      validatorName: row.validator_name,
      phase: row.phase as ValidationPhase,
      status: row.status as 'pass' | 'fail' | 'warn',
      message: row.message,
      createdAt: row.created_at,
    };

    if (row.content_id) {
      result.contentId = row.content_id;
    }

    if (row.constraint_id) {
      result.constraintId = row.constraint_id;
    }

    if (row.location_node) {
      result.location = {
        nodeId: row.location_node,
        order: row.location_order ?? 0,
      };
    }

    if (row.fix_suggestion) {
      result.fix = row.fix_suggestion;
    }

    return result;
  }

  return {
    saveResults(
      projectId: string,
      validatorName: string,
      phase: ValidationPhase,
      results: ValidationResult[],
      contentId?: string,
      constraintId?: string
    ): StoredValidationResult[] {
      const now = nowTimestamp();
      const stored: StoredValidationResult[] = [];

      for (const result of results) {
        const id = generateId();
        insertStmt.run(
          id,
          projectId,
          contentId ?? null,
          constraintId ?? null,
          validatorName,
          phase,
          result.status,
          result.message,
          result.location?.nodeId ?? null,
          result.location?.order ?? null,
          result.fix ?? null,
          now
        );

        stored.push({
          id,
          projectId,
          contentId,
          constraintId,
          validatorName,
          phase,
          ...result,
          createdAt: now,
        });
      }

      return stored;
    },

    getByProject(projectId: string): StoredValidationResult[] {
      const rows = getByProjectStmt.all(projectId) as ValidationResultRow[];
      return rows.map(rowToResult);
    },

    getByContent(projectId: string, contentId: string): StoredValidationResult[] {
      const rows = getByContentStmt.all(projectId, contentId) as ValidationResultRow[];
      return rows.map(rowToResult);
    },

    getFailures(projectId: string): StoredValidationResult[] {
      const rows = getFailuresStmt.all(projectId) as ValidationResultRow[];
      return rows.map(rowToResult);
    },

    getSummary(projectId: string): ValidationSummary {
      interface SummaryRow {
        validator_name: string;
        phase: string;
        status: string;
        count: number;
      }

      const rows = getSummaryStmt.all(projectId) as SummaryRow[];

      const summary: ValidationSummary = {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        byPhase: {
          structural: { passed: 0, failed: 0, warnings: 0 },
          automated: { passed: 0, failed: 0, warnings: 0 },
          computed: { passed: 0, failed: 0, warnings: 0 },
        },
        byValidator: {},
      };

      for (const row of rows) {
        const count = row.count;
        summary.total += count;

        // Update totals
        if (row.status === 'pass') summary.passed += count;
        else if (row.status === 'fail') summary.failed += count;
        else if (row.status === 'warn') summary.warnings += count;

        // Update by phase
        const phase = row.phase as ValidationPhase;
        if (summary.byPhase[phase]) {
          if (row.status === 'pass') summary.byPhase[phase].passed += count;
          else if (row.status === 'fail') summary.byPhase[phase].failed += count;
          else if (row.status === 'warn') summary.byPhase[phase].warnings += count;
        }

        // Update by validator
        if (!summary.byValidator[row.validator_name]) {
          summary.byValidator[row.validator_name] = { passed: 0, failed: 0, warnings: 0 };
        }
        if (row.status === 'pass') summary.byValidator[row.validator_name].passed += count;
        else if (row.status === 'fail') summary.byValidator[row.validator_name].failed += count;
        else if (row.status === 'warn') summary.byValidator[row.validator_name].warnings += count;
      }

      return summary;
    },

    clearByProject(projectId: string): number {
      const result = clearByProjectStmt.run(projectId);
      return result.changes;
    },

    clearByContent(projectId: string, contentId: string): number {
      const result = clearByContentStmt.run(projectId, contentId);
      return result.changes;
    },

    clearOlderThan(projectId: string, olderThan: Date): number {
      const result = clearOlderThanStmt.run(projectId, olderThan.toISOString());
      return result.changes;
    },
  };
}

/**
 * Aggregate validation results from multiple sources.
 */
export function aggregateResults(resultSets: ValidationResult[][]): ValidationResult[] {
  return resultSets.flat();
}

/**
 * Filter results by status.
 */
export function filterByStatus(
  results: ValidationResult[],
  status: 'pass' | 'fail' | 'warn'
): ValidationResult[] {
  return results.filter((r) => r.status === status);
}

/**
 * Filter results by location.
 */
export function filterByLocation(
  results: ValidationResult[],
  location: SpinePosition
): ValidationResult[] {
  return results.filter(
    (r) => r.location?.nodeId === location.nodeId && r.location?.order === location.order
  );
}
