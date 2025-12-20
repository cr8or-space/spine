/**
 * Operation journal for recovery
 *
 * Persists operation state to enable recovery after failures.
 */

import { nanoid } from 'nanoid';
import type Database from 'libsql';

import type {
  OperationJournalEntry,
  OperationStatus,
  OperationType,
} from './types';

export interface OperationJournalRepository {
  /** Create a new operation entry */
  create(
    projectId: string,
    operationType: OperationType,
    state: Record<string, unknown>,
    context?: Record<string, unknown>,
    maxRetries?: number
  ): OperationJournalEntry;

  /** Get an operation by ID */
  get(id: string): OperationJournalEntry | undefined;

  /** Get all operations for a project */
  getByProject(projectId: string, status?: OperationStatus): OperationJournalEntry[];

  /** Get pending or in-progress operations that may need recovery */
  getRecoverable(): OperationJournalEntry[];

  /** Update operation status */
  updateStatus(id: string, status: OperationStatus, errorMessage?: string): OperationJournalEntry | undefined;

  /** Update operation state */
  updateState(id: string, state: Record<string, unknown>): OperationJournalEntry | undefined;

  /** Increment retry count */
  incrementRetry(id: string): OperationJournalEntry | undefined;

  /** Mark operation as completed */
  complete(id: string): OperationJournalEntry | undefined;

  /** Mark operation as failed */
  fail(id: string, errorMessage: string): OperationJournalEntry | undefined;

  /** Delete old completed operations (cleanup) */
  cleanup(olderThanDays: number): number;

  /** Delete an operation */
  delete(id: string): boolean;
}

/**
 * Create operation journal repository
 */
export function createOperationJournalRepository(db: Database.Database): OperationJournalRepository {
  function parseRow(row: Record<string, unknown>): OperationJournalEntry {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      operationType: row.operation_type as OperationType,
      status: row.status as OperationStatus,
      state: JSON.parse(row.state_json as string),
      context: row.context_json ? JSON.parse(row.context_json as string) : undefined,
      errorMessage: row.error_message as string | undefined,
      retryCount: row.retry_count as number,
      maxRetries: row.max_retries as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      completedAt: row.completed_at as string | undefined,
    };
  }

  return {
    create(
      projectId: string,
      operationType: OperationType,
      state: Record<string, unknown>,
      context?: Record<string, unknown>,
      maxRetries = 3
    ): OperationJournalEntry {
      const id = nanoid();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO operation_journal (id, project_id, operation_type, status, state_json, context_json, max_retries, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
      `).run(
        id,
        projectId,
        operationType,
        JSON.stringify(state),
        context ? JSON.stringify(context) : null,
        maxRetries,
        now,
        now
      );

      return {
        id,
        projectId,
        operationType,
        status: 'pending',
        state,
        context,
        retryCount: 0,
        maxRetries,
        createdAt: now,
        updatedAt: now,
      };
    },

    get(id: string): OperationJournalEntry | undefined {
      const row = db.prepare(`
        SELECT * FROM operation_journal WHERE id = ?
      `).get(id) as Record<string, unknown> | undefined;

      return row ? parseRow(row) : undefined;
    },

    getByProject(projectId: string, status?: OperationStatus): OperationJournalEntry[] {
      let query = 'SELECT * FROM operation_journal WHERE project_id = ?';
      const params: (string | undefined)[] = [projectId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
      return rows.map(parseRow);
    },

    getRecoverable(): OperationJournalEntry[] {
      const rows = db.prepare(`
        SELECT * FROM operation_journal
        WHERE status IN ('pending', 'in_progress')
          AND retry_count < max_retries
        ORDER BY created_at ASC
      `).all() as Record<string, unknown>[];

      return rows.map(parseRow);
    },

    updateStatus(id: string, status: OperationStatus, errorMessage?: string): OperationJournalEntry | undefined {
      const now = new Date().toISOString();
      const completedAt = status === 'completed' || status === 'failed' ? now : null;

      db.prepare(`
        UPDATE operation_journal
        SET status = ?, error_message = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
        WHERE id = ?
      `).run(status, errorMessage || null, now, completedAt, id);

      return this.get(id);
    },

    updateState(id: string, state: Record<string, unknown>): OperationJournalEntry | undefined {
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE operation_journal
        SET state_json = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(state), now, id);

      return this.get(id);
    },

    incrementRetry(id: string): OperationJournalEntry | undefined {
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE operation_journal
        SET retry_count = retry_count + 1, updated_at = ?
        WHERE id = ?
      `).run(now, id);

      return this.get(id);
    },

    complete(id: string): OperationJournalEntry | undefined {
      return this.updateStatus(id, 'completed');
    },

    fail(id: string, errorMessage: string): OperationJournalEntry | undefined {
      return this.updateStatus(id, 'failed', errorMessage);
    },

    cleanup(olderThanDays: number): number {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);

      const result = db.prepare(`
        DELETE FROM operation_journal
        WHERE status IN ('completed', 'failed', 'cancelled')
          AND completed_at < ?
      `).run(cutoff.toISOString());

      return result.changes;
    },

    delete(id: string): boolean {
      const result = db.prepare(`
        DELETE FROM operation_journal WHERE id = ?
      `).run(id);

      return result.changes > 0;
    },
  };
}
