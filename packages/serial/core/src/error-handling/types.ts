/**
 * Error handling types
 *
 * Types for operation recovery, integrity checking, and backup management.
 */

export type OperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type OperationType =
  | 'generation'
  | 'analysis'
  | 'import'
  | 'export'
  | 'backup'
  | 'restore'
  | 'cascade';

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

export type HealthStatus = 'ok' | 'warning' | 'error';

export interface HealthCheckResult {
  id?: number;
  checkType: string;
  status: HealthStatus;
  details?: Record<string, unknown>;
  createdAt: string;
}

export type BackupType = 'full' | 'incremental' | 'content-only';
export type BackupStatus = 'in_progress' | 'completed' | 'failed' | 'verified';

export interface BackupRecord {
  id: string;
  backupType: BackupType;
  filePath: string;
  fileSize?: number;
  checksum?: string;
  status: BackupStatus;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface IntegrityCheckResult {
  isValid: boolean;
  checks: HealthCheckResult[];
  errors: string[];
  warnings: string[];
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
