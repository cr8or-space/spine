/**
 * Error handling module
 *
 * Provides operation recovery, database integrity checking,
 * and backup management.
 */

// Types
export type {
  OperationStatus,
  OperationType,
  OperationJournalEntry,
  HealthStatus,
  HealthCheckResult,
  BackupType,
  BackupStatus,
  BackupRecord,
  IntegrityCheckResult,
  RecoveryResult,
} from './types';

// Operation journal
export {
  createOperationJournalRepository,
  type OperationJournalRepository,
} from './operation-journal';

// Integrity checking
export {
  createIntegrityService,
  type IntegrityService,
} from './integrity';

// Backup service
export {
  createBackupService,
  type BackupService,
  type BackupOptions,
} from './backup';

// Main service
export {
  createErrorHandlingService,
  type ErrorHandlingService,
  type ErrorHandlingServiceConfig,
} from './service';
