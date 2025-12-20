/**
 * Backup and restore service
 *
 * Handles database backups with verification.
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, statSync, copyFileSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { dirname, join, basename } from 'path';
import { nanoid } from 'nanoid';
import Database from 'libsql';

import type { BackupRecord, BackupType, BackupStatus } from './types';

export interface BackupService {
  /** Create a full database backup */
  createBackup(outputPath: string, type?: BackupType): BackupRecord;

  /** Verify a backup file */
  verifyBackup(backupPath: string): { valid: boolean; checksum: string; error?: string };

  /** List all backups in a directory */
  listBackups(directory: string): BackupRecord[];

  /** Get backup by ID */
  getBackup(id: string): BackupRecord | undefined;

  /** Get all backup records */
  getAllBackupRecords(): BackupRecord[];

  /** Restore from a backup file */
  restoreFromBackup(backupPath: string, targetPath: string): { success: boolean; error?: string };

  /** Delete a backup file and record */
  deleteBackup(id: string): boolean;

  /** Clean up old backups, keeping the N most recent */
  cleanupOldBackups(directory: string, keepCount: number): number;

  /** Calculate checksum for a file */
  calculateChecksum(filePath: string): string;

  /** Export project data to JSON */
  exportProjectData(projectId: string): Record<string, unknown> | undefined;
}

export interface BackupOptions {
  /** Directory for backups */
  backupDir: string;
  /** Source database path */
  databasePath: string;
}

/**
 * Create backup service
 */
export function createBackupService(db: Database.Database, options: BackupOptions): BackupService {
  const { backupDir } = options;

  // Ensure backup directory exists
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  function recordBackup(record: BackupRecord): void {
    db.prepare(`
      INSERT INTO backup_history (id, backup_type, file_path, file_size, checksum, status, error_message, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.backupType,
      record.filePath,
      record.fileSize || null,
      record.checksum || null,
      record.status,
      record.errorMessage || null,
      record.createdAt,
      record.completedAt || null
    );
  }

  function updateBackupRecord(id: string, updates: Partial<BackupRecord>): void {
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.fileSize !== undefined) {
      setClauses.push('file_size = ?');
      values.push(updates.fileSize);
    }
    if (updates.checksum !== undefined) {
      setClauses.push('checksum = ?');
      values.push(updates.checksum);
    }
    if (updates.errorMessage !== undefined) {
      setClauses.push('error_message = ?');
      values.push(updates.errorMessage);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt);
    }

    if (setClauses.length > 0) {
      values.push(id);
      db.prepare(`
        UPDATE backup_history SET ${setClauses.join(', ')} WHERE id = ?
      `).run(...values);
    }
  }

  function parseBackupRow(row: Record<string, unknown>): BackupRecord {
    return {
      id: row.id as string,
      backupType: row.backup_type as BackupType,
      filePath: row.file_path as string,
      fileSize: row.file_size as number | undefined,
      checksum: row.checksum as string | undefined,
      status: row.status as BackupStatus,
      errorMessage: row.error_message as string | undefined,
      createdAt: row.created_at as string,
      completedAt: row.completed_at as string | undefined,
    };
  }

  return {
    createBackup(outputPath: string, type: BackupType = 'full'): BackupRecord {
      const id = nanoid();
      const now = new Date().toISOString();

      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const record: BackupRecord = {
        id,
        backupType: type,
        filePath: outputPath,
        status: 'in_progress',
        createdAt: now,
      };

      recordBackup(record);

      try {
        // Use SQLite's backup API via VACUUM INTO for a consistent copy
        // This is safer than file copy as it ensures consistency
        db.exec(`VACUUM INTO '${outputPath}'`);

        const stats = statSync(outputPath);
        const checksum = this.calculateChecksum(outputPath);

        updateBackupRecord(id, {
          status: 'completed',
          fileSize: stats.size,
          checksum,
          completedAt: new Date().toISOString(),
        });

        return {
          ...record,
          status: 'completed',
          fileSize: stats.size,
          checksum,
          completedAt: new Date().toISOString(),
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        updateBackupRecord(id, {
          status: 'failed',
          errorMessage,
          completedAt: new Date().toISOString(),
        });

        return {
          ...record,
          status: 'failed',
          errorMessage,
          completedAt: new Date().toISOString(),
        };
      }
    },

    verifyBackup(backupPath: string): { valid: boolean; checksum: string; error?: string } {
      try {
        if (!existsSync(backupPath)) {
          return { valid: false, checksum: '', error: 'Backup file does not exist' };
        }

        // Calculate checksum
        const checksum = this.calculateChecksum(backupPath);

        // Try to open the database to verify it's valid SQLite
        const testDb = new Database(backupPath, { readonly: true });

        // Run integrity check
        const result = testDb.prepare('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>;
        const isValid = result.length === 1 && result[0].integrity_check === 'ok';

        testDb.close();

        if (!isValid) {
          return { valid: false, checksum, error: 'Database integrity check failed' };
        }

        return { valid: true, checksum };
      } catch (error) {
        return {
          valid: false,
          checksum: '',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    listBackups(directory: string): BackupRecord[] {
      if (!existsSync(directory)) {
        return [];
      }

      const files = readdirSync(directory).filter(f => f.endsWith('.db') || f.endsWith('.sqlite'));
      const records: BackupRecord[] = [];

      for (const file of files) {
        const filePath = join(directory, file);
        const stats = statSync(filePath);

        records.push({
          id: basename(file, '.db').replace('.sqlite', ''),
          backupType: 'full',
          filePath,
          fileSize: stats.size,
          status: 'completed',
          createdAt: stats.mtime.toISOString(),
          completedAt: stats.mtime.toISOString(),
        });
      }

      return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    getBackup(id: string): BackupRecord | undefined {
      const row = db.prepare(`
        SELECT * FROM backup_history WHERE id = ?
      `).get(id) as Record<string, unknown> | undefined;

      return row ? parseBackupRow(row) : undefined;
    },

    getAllBackupRecords(): BackupRecord[] {
      const rows = db.prepare(`
        SELECT * FROM backup_history ORDER BY created_at DESC
      `).all() as Record<string, unknown>[];

      return rows.map(parseBackupRow);
    },

    restoreFromBackup(backupPath: string, targetPath: string): { success: boolean; error?: string } {
      try {
        // Verify the backup first
        const verification = this.verifyBackup(backupPath);
        if (!verification.valid) {
          return { success: false, error: verification.error };
        }

        // Ensure target directory exists
        const targetDir = dirname(targetPath);
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }

        // Copy the backup file
        copyFileSync(backupPath, targetPath);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    deleteBackup(id: string): boolean {
      const backup = this.getBackup(id);
      if (!backup) {
        return false;
      }

      try {
        // Delete the file if it exists
        if (existsSync(backup.filePath)) {
          unlinkSync(backup.filePath);
        }

        // Delete the record
        db.prepare('DELETE FROM backup_history WHERE id = ?').run(id);

        return true;
      } catch {
        return false;
      }
    },

    cleanupOldBackups(directory: string, keepCount: number): number {
      const backups = this.listBackups(directory);

      if (backups.length <= keepCount) {
        return 0;
      }

      // Sort by date descending and remove oldest
      const toDelete = backups.slice(keepCount);
      let deleted = 0;

      for (const backup of toDelete) {
        try {
          if (existsSync(backup.filePath)) {
            unlinkSync(backup.filePath);
            deleted++;
          }
        } catch {
          // Continue with other files
        }
      }

      return deleted;
    },

    calculateChecksum(filePath: string): string {
      const content = readFileSync(filePath);
      return createHash('sha256').update(content).digest('hex');
    },

    exportProjectData(projectId: string): Record<string, unknown> | undefined {
      try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Record<string, unknown> | undefined;
        if (!project) {
          return undefined;
        }

        const characters = db.prepare('SELECT * FROM characters WHERE project_id = ?').all(projectId);
        const locations = db.prepare('SELECT * FROM locations WHERE project_id = ?').all(projectId);
        const factions = db.prepare('SELECT * FROM factions WHERE project_id = ?').all(projectId);
        const worldRules = db.prepare('SELECT * FROM world_rules WHERE project_id = ?').all(projectId);
        const plotThreads = db.prepare('SELECT * FROM plot_threads WHERE project_id = ?').all(projectId);
        const timelineEvents = db.prepare('SELECT * FROM timeline_events WHERE project_id = ?').all(projectId);
        const structures = db.prepare('SELECT * FROM structures WHERE project_id = ?').all(projectId);
        const contents = db.prepare('SELECT * FROM contents WHERE project_id = ?').all(projectId);

        // Get content versions for each content
        const contentVersions: Record<string, unknown[]> = {};
        for (const content of contents as Array<{ id: string }>) {
          contentVersions[content.id] = db.prepare(`
            SELECT * FROM content_versions WHERE content_id = ?
          `).all(content.id);
        }

        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          project,
          bible: {
            characters,
            locations,
            factions,
            worldRules,
            plotThreads,
            timelineEvents,
          },
          structures,
          contents,
          contentVersions,
        };
      } catch {
        return undefined;
      }
    },
  };
}
