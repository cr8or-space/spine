/**
 * Database integrity checking
 *
 * Performs various integrity checks on the database to detect
 * corruption or inconsistencies.
 */

import type Database from 'libsql';

import type {
  HealthCheckResult,
  HealthStatus,
  IntegrityCheckResult,
} from './types';

export interface IntegrityService {
  /** Run all integrity checks */
  runAllChecks(): IntegrityCheckResult;

  /** Check SQLite database integrity */
  checkDatabaseIntegrity(): HealthCheckResult;

  /** Check foreign key consistency */
  checkForeignKeys(): HealthCheckResult;

  /** Check for orphaned content (no structure) */
  checkOrphanedContent(): HealthCheckResult;

  /** Check for orphaned versions (no content) */
  checkOrphanedVersions(): HealthCheckResult;

  /** Check content version consistency */
  checkVersionConsistency(): HealthCheckResult;

  /** Check structure hierarchy consistency */
  checkStructureHierarchy(): HealthCheckResult;

  /** Check for duplicate IDs */
  checkDuplicateIds(): HealthCheckResult;

  /** Record a health check result */
  recordHealthCheck(result: HealthCheckResult): void;

  /** Get recent health check results */
  getRecentChecks(limit?: number): HealthCheckResult[];

  /** Attempt to repair detected issues */
  repair(issues: HealthCheckResult[]): { repaired: number; failed: number };
}

/**
 * Create integrity service
 */
export function createIntegrityService(db: Database.Database): IntegrityService {
  function recordCheck(result: HealthCheckResult): void {
    db.prepare(`
      INSERT INTO health_checks (check_type, status, details_json, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      result.checkType,
      result.status,
      result.details ? JSON.stringify(result.details) : null,
      result.createdAt
    );
  }

  return {
    runAllChecks(): IntegrityCheckResult {
      const checks: HealthCheckResult[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Run all individual checks
      const checkFunctions = [
        () => this.checkDatabaseIntegrity(),
        () => this.checkForeignKeys(),
        () => this.checkOrphanedContent(),
        () => this.checkOrphanedVersions(),
        () => this.checkVersionConsistency(),
        () => this.checkStructureHierarchy(),
        () => this.checkDuplicateIds(),
      ];

      for (const checkFn of checkFunctions) {
        try {
          const result = checkFn();
          checks.push(result);
          this.recordHealthCheck(result);

          if (result.status === 'error') {
            errors.push(`${result.checkType}: ${result.details?.message || 'Error detected'}`);
          } else if (result.status === 'warning') {
            warnings.push(`${result.checkType}: ${result.details?.message || 'Warning detected'}`);
          }
        } catch (error) {
          const errorResult: HealthCheckResult = {
            checkType: 'check_execution',
            status: 'error',
            details: { error: error instanceof Error ? error.message : String(error) },
            createdAt: new Date().toISOString(),
          };
          checks.push(errorResult);
          errors.push(`Check execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        isValid: errors.length === 0,
        checks,
        errors,
        warnings,
      };
    },

    checkDatabaseIntegrity(): HealthCheckResult {
      const now = new Date().toISOString();

      try {
        const result = db.prepare('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>;
        const isOk = result.length === 1 && result[0].integrity_check === 'ok';

        return {
          checkType: 'database_integrity',
          status: isOk ? 'ok' : 'error',
          details: {
            message: isOk ? 'Database integrity check passed' : 'Database integrity issues detected',
            results: result.map(r => r.integrity_check),
          },
          createdAt: now,
        };
      } catch (error) {
        return {
          checkType: 'database_integrity',
          status: 'error',
          details: {
            message: 'Failed to run integrity check',
            error: error instanceof Error ? error.message : String(error),
          },
          createdAt: now,
        };
      }
    },

    checkForeignKeys(): HealthCheckResult {
      const now = new Date().toISOString();

      try {
        const violations = db.prepare('PRAGMA foreign_key_check').all() as Array<{
          table: string;
          rowid: number;
          parent: string;
          fkid: number;
        }>;

        if (violations.length === 0) {
          return {
            checkType: 'foreign_keys',
            status: 'ok',
            details: { message: 'No foreign key violations' },
            createdAt: now,
          };
        }

        return {
          checkType: 'foreign_keys',
          status: 'error',
          details: {
            message: `Found ${violations.length} foreign key violations`,
            violations: violations.slice(0, 10), // Limit to first 10
          },
          createdAt: now,
        };
      } catch (error) {
        return {
          checkType: 'foreign_keys',
          status: 'error',
          details: {
            message: 'Failed to check foreign keys',
            error: error instanceof Error ? error.message : String(error),
          },
          createdAt: now,
        };
      }
    },

    checkOrphanedContent(): HealthCheckResult {
      const now = new Date().toISOString();

      try {
        const orphaned = db.prepare(`
          SELECT c.id, c.structure_id
          FROM contents c
          LEFT JOIN structures s ON c.structure_id = s.id
          WHERE s.id IS NULL
        `).all() as Array<{ id: string; structure_id: string }>;

        if (orphaned.length === 0) {
          return {
            checkType: 'orphaned_content',
            status: 'ok',
            details: { message: 'No orphaned content found' },
            createdAt: now,
          };
        }

        return {
          checkType: 'orphaned_content',
          status: 'warning',
          details: {
            message: `Found ${orphaned.length} orphaned content entries`,
            orphanedIds: orphaned.map(o => o.id),
          },
          createdAt: now,
        };
      } catch (error) {
        return {
          checkType: 'orphaned_content',
          status: 'error',
          details: {
            message: 'Failed to check for orphaned content',
            error: error instanceof Error ? error.message : String(error),
          },
          createdAt: now,
        };
      }
    },

    checkOrphanedVersions(): HealthCheckResult {
      const now = new Date().toISOString();

      try {
        const orphaned = db.prepare(`
          SELECT cv.id, cv.content_id
          FROM content_versions cv
          LEFT JOIN contents c ON cv.content_id = c.id
          WHERE c.id IS NULL
        `).all() as Array<{ id: number; content_id: string }>;

        if (orphaned.length === 0) {
          return {
            checkType: 'orphaned_versions',
            status: 'ok',
            details: { message: 'No orphaned versions found' },
            createdAt: now,
          };
        }

        return {
          checkType: 'orphaned_versions',
          status: 'warning',
          details: {
            message: `Found ${orphaned.length} orphaned version entries`,
            count: orphaned.length,
          },
          createdAt: now,
        };
      } catch (error) {
        return {
          checkType: 'orphaned_versions',
          status: 'error',
          details: {
            message: 'Failed to check for orphaned versions',
            error: error instanceof Error ? error.message : String(error),
          },
          createdAt: now,
        };
      }
    },

    checkVersionConsistency(): HealthCheckResult {
      const now = new Date().toISOString();

      try {
        // Check that current_version matches actual versions
        const inconsistent = db.prepare(`
          SELECT c.id, c.current_version,
            (SELECT MAX(version) FROM content_versions WHERE content_id = c.id) as max_version
          FROM contents c
          WHERE c.current_version != (SELECT MAX(version) FROM content_versions WHERE content_id = c.id)
            OR (SELECT COUNT(*) FROM content_versions WHERE content_id = c.id) = 0
        `).all() as Array<{ id: string; current_version: number; max_version: number | null }>;

        if (inconsistent.length === 0) {
          return {
            checkType: 'version_consistency',
            status: 'ok',
            details: { message: 'All content versions are consistent' },
            createdAt: now,
          };
        }

        return {
          checkType: 'version_consistency',
          status: 'error',
          details: {
            message: `Found ${inconsistent.length} content entries with version inconsistencies`,
            inconsistencies: inconsistent.slice(0, 10),
          },
          createdAt: now,
        };
      } catch (error) {
        return {
          checkType: 'version_consistency',
          status: 'error',
          details: {
            message: 'Failed to check version consistency',
            error: error instanceof Error ? error.message : String(error),
          },
          createdAt: now,
        };
      }
    },

    checkStructureHierarchy(): HealthCheckResult {
      const now = new Date().toISOString();

      try {
        // Check for circular references in structure hierarchy
        // This is a simplified check - deep circular refs would need recursive CTE
        const selfRef = db.prepare(`
          SELECT id, parent_id FROM structures WHERE id = parent_id
        `).all() as Array<{ id: string; parent_id: string }>;

        // Check for orphaned structures (parent doesn't exist)
        const orphaned = db.prepare(`
          SELECT s1.id, s1.parent_id
          FROM structures s1
          LEFT JOIN structures s2 ON s1.parent_id = s2.id
          WHERE s1.parent_id IS NOT NULL AND s2.id IS NULL
        `).all() as Array<{ id: string; parent_id: string }>;

        const issues: string[] = [];

        if (selfRef.length > 0) {
          issues.push(`${selfRef.length} structures reference themselves`);
        }
        if (orphaned.length > 0) {
          issues.push(`${orphaned.length} structures have missing parents`);
        }

        if (issues.length === 0) {
          return {
            checkType: 'structure_hierarchy',
            status: 'ok',
            details: { message: 'Structure hierarchy is consistent' },
            createdAt: now,
          };
        }

        return {
          checkType: 'structure_hierarchy',
          status: 'error',
          details: {
            message: issues.join('; '),
            selfReferences: selfRef.map(s => s.id),
            orphanedStructures: orphaned.map(s => s.id),
          },
          createdAt: now,
        };
      } catch (error) {
        return {
          checkType: 'structure_hierarchy',
          status: 'error',
          details: {
            message: 'Failed to check structure hierarchy',
            error: error instanceof Error ? error.message : String(error),
          },
          createdAt: now,
        };
      }
    },

    checkDuplicateIds(): HealthCheckResult {
      const now = new Date().toISOString();

      try {
        // Check each table for duplicate IDs
        const tables = ['projects', 'characters', 'locations', 'factions', 'world_rules',
          'plot_threads', 'timeline_events', 'structures', 'contents', 'lock_points'];

        const duplicates: Array<{ table: string; count: number }> = [];

        for (const table of tables) {
          const result = db.prepare(`
            SELECT id, COUNT(*) as cnt FROM ${table} GROUP BY id HAVING cnt > 1
          `).all() as Array<{ id: string; cnt: number }>;

          if (result.length > 0) {
            duplicates.push({ table, count: result.length });
          }
        }

        if (duplicates.length === 0) {
          return {
            checkType: 'duplicate_ids',
            status: 'ok',
            details: { message: 'No duplicate IDs found' },
            createdAt: now,
          };
        }

        return {
          checkType: 'duplicate_ids',
          status: 'error',
          details: {
            message: `Found duplicate IDs in ${duplicates.length} tables`,
            duplicates,
          },
          createdAt: now,
        };
      } catch (error) {
        return {
          checkType: 'duplicate_ids',
          status: 'error',
          details: {
            message: 'Failed to check for duplicate IDs',
            error: error instanceof Error ? error.message : String(error),
          },
          createdAt: now,
        };
      }
    },

    recordHealthCheck(result: HealthCheckResult): void {
      recordCheck(result);
    },

    getRecentChecks(limit = 50): HealthCheckResult[] {
      const rows = db.prepare(`
        SELECT * FROM health_checks
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit) as Array<{
        id: number;
        check_type: string;
        status: HealthStatus;
        details_json: string | null;
        created_at: string;
      }>;

      return rows.map(row => ({
        id: row.id,
        checkType: row.check_type,
        status: row.status,
        details: row.details_json ? JSON.parse(row.details_json) : undefined,
        createdAt: row.created_at,
      }));
    },

    repair(issues: HealthCheckResult[]): { repaired: number; failed: number } {
      let repaired = 0;
      let failed = 0;

      for (const issue of issues) {
        try {
          switch (issue.checkType) {
            case 'orphaned_content': {
              // Delete orphaned content
              const orphanedIds = (issue.details as { orphanedIds?: string[] })?.orphanedIds || [];
              for (const id of orphanedIds) {
                db.prepare('DELETE FROM contents WHERE id = ?').run(id);
                repaired++;
              }
              break;
            }

            case 'orphaned_versions': {
              // Delete orphaned versions (cascade should handle this, but just in case)
              const result = db.prepare(`
                DELETE FROM content_versions
                WHERE content_id NOT IN (SELECT id FROM contents)
              `).run();
              repaired += result.changes;
              break;
            }

            case 'version_consistency': {
              // Fix version pointers
              const inconsistencies = (issue.details as { inconsistencies?: Array<{ id: string }> })?.inconsistencies || [];
              for (const item of inconsistencies) {
                const maxVersion = db.prepare(`
                  SELECT MAX(version) as max FROM content_versions WHERE content_id = ?
                `).get(item.id) as { max: number | null } | undefined;

                if (maxVersion?.max) {
                  db.prepare(`
                    UPDATE contents SET current_version = ? WHERE id = ?
                  `).run(maxVersion.max, item.id);
                  repaired++;
                }
              }
              break;
            }

            case 'structure_hierarchy': {
              // Clear invalid parent references
              const orphanedStructures = (issue.details as { orphanedStructures?: string[] })?.orphanedStructures || [];
              for (const id of orphanedStructures) {
                db.prepare('UPDATE structures SET parent_id = NULL WHERE id = ?').run(id);
                repaired++;
              }

              // Clear self-references
              const selfReferences = (issue.details as { selfReferences?: string[] })?.selfReferences || [];
              for (const id of selfReferences) {
                db.prepare('UPDATE structures SET parent_id = NULL WHERE id = ?').run(id);
                repaired++;
              }
              break;
            }

            default:
              // Cannot auto-repair this type of issue
              failed++;
              break;
          }
        } catch {
          failed++;
        }
      }

      return { repaired, failed };
    },
  };
}
