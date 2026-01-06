/**
 * System API - Error handling, health checks, and backup management
 */

import type { SpineClient } from '../client';

export interface HealthSummary {
  isHealthy: boolean;
  pendingOperations: number;
  recentErrors: number;
  lastBackup: string | null;
  lastIntegrityCheck: string | null;
}

export interface HealthCheckResult {
  id?: number;
  checkType: string;
  status: 'ok' | 'warning' | 'error';
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface IntegrityCheckResult {
  isValid: boolean;
  checks: HealthCheckResult[];
  errors: string[];
  warnings: string[];
}

export interface RepairResult {
  repaired: number;
  failed: number;
}

export type OperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type OperationType = 'generation' | 'analysis' | 'import' | 'export' | 'backup' | 'restore' | 'cascade';

export interface OperationJournalEntry {
  id: string;
  projectId: string;
  operationType: OperationType;
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

export interface RecoveryResult {
  success: boolean;
  recoveredOperations: number;
  failedOperations: number;
  details: Array<{
    operationId: string;
    operationType: OperationType;
    recovered: boolean;
    message: string;
  }>;
}

export interface BackupRecord {
  id: string;
  backupType: 'full' | 'incremental' | 'content-only';
  filePath: string;
  fileSize?: number;
  checksum?: string;
  status: 'in_progress' | 'completed' | 'failed' | 'verified';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BackupVerifyResult {
  valid: boolean;
  error?: string;
}

export interface CleanupResult {
  journalEntries: number;
  backups: number;
}

export interface SystemApi {
  /** Get system health summary */
  health(): Promise<HealthSummary>;

  /** Run full integrity check */
  integrityCheck(): Promise<IntegrityCheckResult>;

  /** Get recent health check results */
  healthChecks(limit?: number): Promise<HealthCheckResult[]>;

  /** Attempt to repair detected issues */
  repair(): Promise<RepairResult>;

  /** Get recoverable operations */
  recoverableOperations(): Promise<OperationJournalEntry[]>;

  /** Get operations for a project */
  operations(projectId: string, status?: OperationStatus): Promise<OperationJournalEntry[]>;

  /** Attempt to recover operations */
  recover(): Promise<RecoveryResult>;

  /** Cancel an operation */
  cancelOperation(operationId: string): Promise<OperationJournalEntry | undefined>;

  /** Create a backup */
  createBackup(name?: string): Promise<BackupRecord>;

  /** List all backups */
  listBackups(): Promise<BackupRecord[]>;

  /** Verify a backup */
  verifyBackup(backupId: string): Promise<BackupVerifyResult>;

  /** Delete a backup */
  deleteBackup(backupId: string): Promise<{ success: boolean }>;

  /** Export project data to JSON */
  exportProject(projectId: string): Promise<Record<string, unknown>>;

  /** Clean up old data */
  cleanup(): Promise<CleanupResult>;
}

/**
 * Create system API
 */
export function createSystemApi(client: SpineClient): SystemApi {
  return {
    health() {
      return client.request<HealthSummary>('system.health', {});
    },

    integrityCheck() {
      return client.request<IntegrityCheckResult>('system.integrityCheck', {});
    },

    healthChecks(limit = 50) {
      return client.request<HealthCheckResult[]>('system.healthChecks', { limit });
    },

    repair() {
      return client.request<RepairResult>('system.repair', {});
    },

    recoverableOperations() {
      return client.request<OperationJournalEntry[]>('system.recoverableOperations', {});
    },

    operations(projectId: string, status?: OperationStatus) {
      return client.request<OperationJournalEntry[]>('system.operations', { projectId, status });
    },

    recover() {
      return client.request<RecoveryResult>('system.recover', {});
    },

    cancelOperation(operationId: string) {
      return client.request<OperationJournalEntry | undefined>('system.cancelOperation', { operationId });
    },

    createBackup(name?: string) {
      return client.request<BackupRecord>('system.createBackup', { name });
    },

    listBackups() {
      return client.request<BackupRecord[]>('system.listBackups', {});
    },

    verifyBackup(backupId: string) {
      return client.request<BackupVerifyResult>('system.verifyBackup', { backupId });
    },

    deleteBackup(backupId: string) {
      return client.request<{ success: boolean }>('system.deleteBackup', { backupId });
    },

    exportProject(projectId: string) {
      return client.request<Record<string, unknown>>('system.exportProject', { projectId });
    },

    cleanup() {
      return client.request<CleanupResult>('system.cleanup', {});
    },
  };
}
