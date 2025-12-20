/**
 * Error handling service
 *
 * Main service that coordinates operation recovery, integrity checking,
 * and backup management.
 */

import type Database from 'libsql';

import type {
  OperationJournalEntry,
  OperationType,
  IntegrityCheckResult,
  RecoveryResult,
  BackupRecord,
} from './types';

import { createOperationJournalRepository, type OperationJournalRepository } from './operation-journal';
import { createIntegrityService, type IntegrityService } from './integrity';
import { createBackupService, type BackupService, type BackupOptions } from './backup';

export interface ErrorHandlingServiceConfig {
  /** Database instance */
  db: Database.Database;
  /** Backup options */
  backup: BackupOptions;
  /** Auto-cleanup settings */
  cleanup?: {
    /** Days to keep operation journal entries */
    operationJournalDays?: number;
    /** Number of backups to keep */
    backupCount?: number;
  };
}

export interface ErrorHandlingService {
  /** Operation journal repository */
  journal: OperationJournalRepository;

  /** Integrity checking service */
  integrity: IntegrityService;

  /** Backup service */
  backup: BackupService;

  /** Start tracking an operation */
  startOperation(
    projectId: string,
    type: OperationType,
    initialState: Record<string, unknown>,
    context?: Record<string, unknown>
  ): OperationJournalEntry;

  /** Update operation progress */
  updateOperationProgress(
    operationId: string,
    state: Record<string, unknown>
  ): OperationJournalEntry | undefined;

  /** Complete an operation successfully */
  completeOperation(operationId: string): OperationJournalEntry | undefined;

  /** Fail an operation */
  failOperation(operationId: string, error: string): OperationJournalEntry | undefined;

  /** Get operations that can be recovered */
  getRecoverableOperations(): OperationJournalEntry[];

  /** Attempt to recover failed operations */
  recoverOperations(): RecoveryResult;

  /** Run full system health check */
  runHealthCheck(): IntegrityCheckResult;

  /** Attempt to repair detected issues */
  repairIssues(): { repaired: number; failed: number };

  /** Create a backup */
  createBackup(name?: string): BackupRecord;

  /** List available backups */
  listBackups(): BackupRecord[];

  /** Verify a backup */
  verifyBackup(backupId: string): { valid: boolean; error?: string };

  /** Clean up old data */
  cleanup(): { journalEntries: number; backups: number };

  /** Get system health summary */
  getHealthSummary(): {
    isHealthy: boolean;
    pendingOperations: number;
    recentErrors: number;
    lastBackup: string | null;
    lastIntegrityCheck: string | null;
  };
}

/**
 * Create error handling service
 */
export function createErrorHandlingService(config: ErrorHandlingServiceConfig): ErrorHandlingService {
  const { db, backup: backupOptions, cleanup: cleanupConfig } = config;

  const journal = createOperationJournalRepository(db);
  const integrity = createIntegrityService(db);
  const backup = createBackupService(db, backupOptions);

  const operationJournalDays = cleanupConfig?.operationJournalDays ?? 30;
  const backupCount = cleanupConfig?.backupCount ?? 10;

  return {
    journal,
    integrity,
    backup,

    startOperation(
      projectId: string,
      type: OperationType,
      initialState: Record<string, unknown>,
      context?: Record<string, unknown>
    ): OperationJournalEntry {
      const entry = journal.create(projectId, type, initialState, context);
      journal.updateStatus(entry.id, 'in_progress');
      return journal.get(entry.id)!;
    },

    updateOperationProgress(
      operationId: string,
      state: Record<string, unknown>
    ): OperationJournalEntry | undefined {
      return journal.updateState(operationId, state);
    },

    completeOperation(operationId: string): OperationJournalEntry | undefined {
      return journal.complete(operationId);
    },

    failOperation(operationId: string, error: string): OperationJournalEntry | undefined {
      return journal.fail(operationId, error);
    },

    getRecoverableOperations(): OperationJournalEntry[] {
      return journal.getRecoverable();
    },

    recoverOperations(): RecoveryResult {
      const recoverable = journal.getRecoverable();
      const details: RecoveryResult['details'] = [];
      let recoveredCount = 0;
      let failedCount = 0;

      for (const operation of recoverable) {
        // Check if we've exceeded retry limit
        if (operation.retryCount >= operation.maxRetries) {
          journal.fail(operation.id, 'Max retries exceeded');
          failedCount++;
          details.push({
            operationId: operation.id,
            operationType: operation.operationType,
            recovered: false,
            message: 'Max retries exceeded',
          });
          continue;
        }

        // Increment retry count
        journal.incrementRetry(operation.id);

        // For now, mark operations as failed if they were abandoned
        // In a full implementation, this would attempt to resume the operation
        const ageMs = Date.now() - new Date(operation.updatedAt).getTime();
        const staleThresholdMs = 5 * 60 * 1000; // 5 minutes

        if (ageMs > staleThresholdMs) {
          journal.fail(operation.id, 'Operation was abandoned');
          failedCount++;
          details.push({
            operationId: operation.id,
            operationType: operation.operationType,
            recovered: false,
            message: 'Operation was abandoned (stale for >5 minutes)',
          });
        } else {
          // Operation is recent, leave it for the original handler
          details.push({
            operationId: operation.id,
            operationType: operation.operationType,
            recovered: true,
            message: 'Operation is still active',
          });
          recoveredCount++;
        }
      }

      return {
        success: failedCount === 0,
        recoveredOperations: recoveredCount,
        failedOperations: failedCount,
        details,
      };
    },

    runHealthCheck(): IntegrityCheckResult {
      return integrity.runAllChecks();
    },

    repairIssues(): { repaired: number; failed: number } {
      const healthCheck = integrity.runAllChecks();
      const issuesWithErrors = healthCheck.checks.filter(
        c => c.status === 'error' || c.status === 'warning'
      );
      return integrity.repair(issuesWithErrors);
    },

    createBackup(name?: string): BackupRecord {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = name ? `${name}-${timestamp}.db` : `backup-${timestamp}.db`;
      const outputPath = `${backupOptions.backupDir}/${filename}`;
      return backup.createBackup(outputPath, 'full');
    },

    listBackups(): BackupRecord[] {
      return backup.getAllBackupRecords();
    },

    verifyBackup(backupId: string): { valid: boolean; error?: string } {
      const record = backup.getBackup(backupId);
      if (!record) {
        return { valid: false, error: 'Backup not found' };
      }
      const result = backup.verifyBackup(record.filePath);
      return { valid: result.valid, error: result.error };
    },

    cleanup(): { journalEntries: number; backups: number } {
      const journalEntries = journal.cleanup(operationJournalDays);
      const backups = backup.cleanupOldBackups(backupOptions.backupDir, backupCount);
      return { journalEntries, backups };
    },

    getHealthSummary(): {
      isHealthy: boolean;
      pendingOperations: number;
      recentErrors: number;
      lastBackup: string | null;
      lastIntegrityCheck: string | null;
    } {
      const pendingOperations = journal.getRecoverable().length;
      const recentChecks = integrity.getRecentChecks(10);
      const recentErrors = recentChecks.filter(c => c.status === 'error').length;

      const allBackups = backup.getAllBackupRecords();
      const lastBackup = allBackups.length > 0 ? allBackups[0].createdAt : null;

      const integrityChecks = recentChecks.filter(c => c.checkType === 'database_integrity');
      const lastIntegrityCheck = integrityChecks.length > 0 ? integrityChecks[0].createdAt : null;

      return {
        isHealthy: pendingOperations === 0 && recentErrors === 0,
        pendingOperations,
        recentErrors,
        lastBackup,
        lastIntegrityCheck,
      };
    },
  };
}
