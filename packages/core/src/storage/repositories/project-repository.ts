/**
 * Project repository for database operations
 */

import type Database from 'libsql';

import type {
  ProjectFormat,
  ProjectMetadata,
  ProjectSettings,
  ProjectStats,
  ProjectSummary,
} from '@repo/types';

import { createBaseRepository, generateId, nowTimestamp, parseJson, type Repository } from '../repository';

/**
 * Database row representation of a project
 */
interface ProjectRow {
  id: string;
  title: string;
  format: ProjectFormat;
  settings_json: string;
  metadata_json: string;
  stats_json: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProjectSummary(row: ProjectRow, stats?: ProjectStats): ProjectSummary {
  const metadata = parseJson<ProjectMetadata>(row.metadata_json, { genres: [] });
  return {
    id: row.id,
    title: row.title,
    format: row.format,
    wordCount: stats?.totalWordCount ?? 0,
    chapterCount: stats?.totalChapters ?? 0,
    lastModified: row.updated_at,
    coverImage: metadata.coverImage,
  };
}

export type CreateProjectData = {
  title: string;
  format: ProjectFormat;
  settings: ProjectSettings;
  metadata: ProjectMetadata;
};

export type UpdateProjectData = Partial<{
  title: string;
  format: ProjectFormat;
  settings: ProjectSettings;
  metadata: ProjectMetadata;
  stats: ProjectStats;
}>;

/**
 * Project repository interface
 *
 * Note: Projects are stored with metadata in the projects table,
 * but bible, structure, and content are in separate tables.
 * Use the full Project load/save operations to work with complete projects.
 */
export interface ProjectRepository extends Repository<ProjectSummary, CreateProjectData> {
  listAll(): ProjectSummary[];
  getSettings(id: string): ProjectSettings | undefined;
  getMetadata(id: string): ProjectMetadata | undefined;
  getStats(id: string): ProjectStats | undefined;
  updateSettings(id: string, settings: ProjectSettings): boolean;
  updateMetadata(id: string, metadata: ProjectMetadata): boolean;
  updateStats(id: string, stats: ProjectStats): boolean;
  touch(id: string): boolean;
}

export function createProjectRepository(db: Database.Database): ProjectRepository {
  const base = createBaseRepository<ProjectRow>(db, 'projects');

  const insertStmt = db.prepare(`
    INSERT INTO projects (
      id, title, format, settings_json, metadata_json, stats_json, created_at, updated_at
    ) VALUES (
      @id, @title, @format, @settings_json, @metadata_json, @stats_json, @created_at, @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE projects SET
      title = @title,
      format = @format,
      settings_json = @settings_json,
      metadata_json = @metadata_json,
      stats_json = @stats_json,
      updated_at = @updated_at
    WHERE id = @id
  `);

  const touchStmt = db.prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`);

  return {
    findById(id: string): ProjectSummary | undefined {
      const row = base.findById(id);
      if (!row) return undefined;
      const stats = row.stats_json ? (JSON.parse(row.stats_json) as ProjectStats) : undefined;
      return rowToProjectSummary(row, stats);
    },

    findAll(): ProjectSummary[] {
      return this.listAll();
    },

    listAll(): ProjectSummary[] {
      const rows = base.findAll() as ProjectRow[];
      return rows.map((row) => {
        const stats = row.stats_json ? (JSON.parse(row.stats_json) as ProjectStats) : undefined;
        return rowToProjectSummary(row, stats);
      });
    },

    create(data: CreateProjectData): ProjectSummary {
      const now = nowTimestamp();
      const id = generateId();

      const row: ProjectRow = {
        id,
        title: data.title,
        format: data.format,
        settings_json: JSON.stringify(data.settings),
        metadata_json: JSON.stringify(data.metadata),
        stats_json: null,
        created_at: now,
        updated_at: now,
      };

      insertStmt.run(row);
      return rowToProjectSummary(row);
    },

    update(id: string, data: Partial<ProjectSummary>): ProjectSummary | undefined {
      const existing = base.findById(id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const existingMetadata = parseJson<ProjectMetadata>(existing.metadata_json, { genres: [] });

      const updated: ProjectRow = {
        id,
        title: data.title ?? existing.title,
        format: data.format ?? existing.format,
        settings_json: existing.settings_json,
        metadata_json: data.coverImage !== undefined
          ? JSON.stringify({ ...existingMetadata, coverImage: data.coverImage })
          : existing.metadata_json,
        stats_json: existing.stats_json,
        created_at: existing.created_at,
        updated_at: now,
      };

      updateStmt.run(updated);
      const stats = updated.stats_json ? (JSON.parse(updated.stats_json) as ProjectStats) : undefined;
      return rowToProjectSummary(updated, stats);
    },

    delete(id: string): boolean {
      return base.deleteById(id);
    },

    getSettings(id: string): ProjectSettings | undefined {
      const row = base.findById(id);
      if (!row) return undefined;
      return JSON.parse(row.settings_json) as ProjectSettings;
    },

    getMetadata(id: string): ProjectMetadata | undefined {
      const row = base.findById(id);
      if (!row) return undefined;
      return JSON.parse(row.metadata_json) as ProjectMetadata;
    },

    getStats(id: string): ProjectStats | undefined {
      const row = base.findById(id);
      if (!row || !row.stats_json) return undefined;
      return JSON.parse(row.stats_json) as ProjectStats;
    },

    updateSettings(id: string, settings: ProjectSettings): boolean {
      const existing = base.findById(id);
      if (!existing) return false;

      const now = nowTimestamp();
      const updated: ProjectRow = {
        ...existing,
        settings_json: JSON.stringify(settings),
        updated_at: now,
      };

      updateStmt.run(updated);
      return true;
    },

    updateMetadata(id: string, metadata: ProjectMetadata): boolean {
      const existing = base.findById(id);
      if (!existing) return false;

      const now = nowTimestamp();
      const updated: ProjectRow = {
        ...existing,
        metadata_json: JSON.stringify(metadata),
        updated_at: now,
      };

      updateStmt.run(updated);
      return true;
    },

    updateStats(id: string, stats: ProjectStats): boolean {
      const existing = base.findById(id);
      if (!existing) return false;

      const now = nowTimestamp();
      const updated: ProjectRow = {
        ...existing,
        stats_json: JSON.stringify(stats),
        updated_at: now,
      };

      updateStmt.run(updated);
      return true;
    },

    touch(id: string): boolean {
      const result = touchStmt.run(nowTimestamp(), id);
      return result.changes > 0;
    },
  };
}
