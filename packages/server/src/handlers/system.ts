/**
 * System handlers for error handling, health checks, and backup management.
 */

import type { Router } from '../router';
import type { Services } from '../services';
import type {
  HealthStatus,
  OperationStatus,
} from '@repo/core';

// Parameter interfaces
type EmptyParams = Record<string, never>;

interface LimitParams {
  limit?: number;
}

interface ProjectOperationsParams {
  projectId: string;
  status?: OperationStatus;
}

interface OperationIdParams {
  operationId: string;
}

interface BackupNameParams {
  name?: string;
}

interface BackupIdParams {
  backupId: string;
}

interface ProjectIdParams {
  projectId: string;
}

// Result interfaces
interface HealthSummary {
  isHealthy: boolean;
  pendingOperations: number;
  recentErrors: number;
  lastBackup: string | null;
  lastIntegrityCheck: string | null;
}

interface HealthCheckResult {
  id?: number;
  checkType: string;
  status: HealthStatus;
  details?: Record<string, unknown>;
  createdAt: string;
}

interface IntegrityCheckResult {
  isValid: boolean;
  checks: HealthCheckResult[];
  errors: string[];
  warnings: string[];
}

interface RepairResult {
  repaired: number;
  failed: number;
}

interface OperationJournalEntry {
  id: string;
  projectId: string;
  operationType: string;
  status: OperationStatus;
  state: Record<string, unknown>;
  context?: Record<string, unknown>;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface RecoveryResult {
  success: boolean;
  recoveredOperations: number;
  failedOperations: number;
  details: Array<{
    operationId: string;
    operationType: string;
    recovered: boolean;
    message: string;
  }>;
}

interface BackupRecord {
  id: string;
  backupType: string;
  filePath: string;
  fileSize?: number;
  checksum?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

interface VerifyResult {
  valid: boolean;
  error?: string;
}

interface DeleteResult {
  success: boolean;
}

interface CleanupResult {
  journalEntries: number;
  backups: number;
}

/**
 * Register system handlers on the router.
 */
export function registerSystemHandlers(router: Router, services: Services): void {
  // =========================================================================
  // Health & Integrity
  // =========================================================================

  // system.health - Get system health summary
  router.register<EmptyParams, HealthSummary>(
    'system.health',
    () => {
      return services.errorHandling.getHealthSummary();
    }
  );

  // system.integrityCheck - Run full integrity check
  router.register<EmptyParams, IntegrityCheckResult>(
    'system.integrityCheck',
    () => {
      return services.errorHandling.runHealthCheck();
    }
  );

  // system.healthChecks - Get recent health check results
  router.register<LimitParams, HealthCheckResult[]>(
    'system.healthChecks',
    (params) => {
      const limit = params.limit ?? 50;
      return services.errorHandling.integrity.getRecentChecks(limit);
    }
  );

  // system.repair - Attempt to repair detected issues
  router.register<EmptyParams, RepairResult>(
    'system.repair',
    () => {
      return services.errorHandling.repairIssues();
    }
  );

  // =========================================================================
  // Operation Recovery
  // =========================================================================

  // system.recoverableOperations - Get recoverable operations
  router.register<EmptyParams, OperationJournalEntry[]>(
    'system.recoverableOperations',
    () => {
      return services.errorHandling.getRecoverableOperations();
    }
  );

  // system.operations - Get operations for a project
  router.register<ProjectOperationsParams, OperationJournalEntry[]>(
    'system.operations',
    (params) => {
      return services.errorHandling.journal.getByProject(params.projectId, params.status);
    }
  );

  // system.recover - Attempt to recover operations
  router.register<EmptyParams, RecoveryResult>(
    'system.recover',
    () => {
      return services.errorHandling.recoverOperations();
    }
  );

  // system.cancelOperation - Cancel an operation
  router.register<OperationIdParams, OperationJournalEntry | undefined>(
    'system.cancelOperation',
    (params) => {
      return services.errorHandling.journal.updateStatus(params.operationId, 'cancelled');
    }
  );

  // =========================================================================
  // Backup Management
  // =========================================================================

  // system.createBackup - Create a backup
  router.register<BackupNameParams, BackupRecord>(
    'system.createBackup',
    (params) => {
      return services.errorHandling.createBackup(params.name);
    }
  );

  // system.listBackups - List all backups
  router.register<EmptyParams, BackupRecord[]>(
    'system.listBackups',
    () => {
      return services.errorHandling.listBackups();
    }
  );

  // system.verifyBackup - Verify a backup
  router.register<BackupIdParams, VerifyResult>(
    'system.verifyBackup',
    (params) => {
      return services.errorHandling.verifyBackup(params.backupId);
    }
  );

  // system.deleteBackup - Delete a backup
  router.register<BackupIdParams, DeleteResult>(
    'system.deleteBackup',
    (params) => {
      const success = services.errorHandling.backup.deleteBackup(params.backupId);
      return { success };
    }
  );

  // system.exportProject - Export project data to JSON
  router.register<ProjectIdParams, Record<string, unknown>>(
    'system.exportProject',
    (params) => {
      const data = services.errorHandling.backup.exportProjectData(params.projectId);
      if (!data) {
        throw new Error('Project not found');
      }
      return data;
    }
  );

  // =========================================================================
  // Cleanup
  // =========================================================================

  // system.cleanup - Clean up old data
  router.register<EmptyParams, CleanupResult>(
    'system.cleanup',
    () => {
      return services.errorHandling.cleanup();
    }
  );
}
