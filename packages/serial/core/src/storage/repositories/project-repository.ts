/**
 * Project repository for database operations
 *
 * Uses Drizzle ORM for type-safe queries.
 */

import type Database from 'libsql';
import { eq } from 'drizzle-orm';

import type {
  ProjectFormat,
  ProjectMetadata,
  ProjectSettings,
  ProjectStats,
  ProjectSummary,
} from '@repo/serial-types';

import type { DrizzleDB } from '../database';
import { projects } from '../drizzle-schema';
import { generateId, nowTimestamp, parseJson, type Repository } from '../repository';

/**
 * Convert Drizzle row to ProjectSummary
 */
function rowToProjectSummary(row: typeof projects.$inferSelect, stats?: ProjectStats): ProjectSummary {
  const metadata = parseJson<ProjectMetadata>(row.metadataJson, { genres: [] });
  return {
    id: row.id,
    title: row.title,
    format: row.format,
    wordCount: stats?.totalWordCount ?? 0,
    chapterCount: stats?.totalChapters ?? 0,
    lastModified: row.updatedAt,
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

export function createProjectRepository(_db: Database.Database, drizzleDb: DrizzleDB): ProjectRepository {
  return {
    findById(id: string): ProjectSummary | undefined {
      const row = drizzleDb.select().from(projects).where(eq(projects.id, id)).get();
      if (!row) return undefined;
      const stats = row.statsJson ? (JSON.parse(row.statsJson) as ProjectStats) : undefined;
      return rowToProjectSummary(row, stats);
    },

    findAll(): ProjectSummary[] {
      return this.listAll();
    },

    listAll(): ProjectSummary[] {
      const rows = drizzleDb.select().from(projects).all();
      return rows.map((row) => {
        const stats = row.statsJson ? (JSON.parse(row.statsJson) as ProjectStats) : undefined;
        return rowToProjectSummary(row, stats);
      });
    },

    create(data: CreateProjectData): ProjectSummary {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        title: data.title,
        format: data.format,
        settingsJson: JSON.stringify(data.settings),
        metadataJson: JSON.stringify(data.metadata),
        statsJson: null,
        createdAt: now,
        updatedAt: now,
      };

      drizzleDb.insert(projects).values(newRow).run();

      return {
        id,
        title: data.title,
        format: data.format,
        wordCount: 0,
        chapterCount: 0,
        lastModified: now,
        coverImage: data.metadata.coverImage,
      };
    },

    update(id: string, data: Partial<ProjectSummary>): ProjectSummary | undefined {
      const existing = drizzleDb.select().from(projects).where(eq(projects.id, id)).get();
      if (!existing) return undefined;

      const now = nowTimestamp();
      const existingMetadata = parseJson<ProjectMetadata>(existing.metadataJson, { genres: [] });

      const updateData = {
        title: data.title ?? existing.title,
        format: data.format ?? existing.format,
        metadataJson: data.coverImage !== undefined
          ? JSON.stringify({ ...existingMetadata, coverImage: data.coverImage })
          : existing.metadataJson,
        updatedAt: now,
      };

      drizzleDb.update(projects).set(updateData).where(eq(projects.id, id)).run();

      const updated = drizzleDb.select().from(projects).where(eq(projects.id, id)).get();
      if (!updated) return undefined;
      const stats = updated.statsJson ? (JSON.parse(updated.statsJson) as ProjectStats) : undefined;
      return rowToProjectSummary(updated, stats);
    },

    delete(id: string): boolean {
      const result = drizzleDb.delete(projects).where(eq(projects.id, id)).run();
      return result.changes > 0;
    },

    getSettings(id: string): ProjectSettings | undefined {
      const row = drizzleDb.select().from(projects).where(eq(projects.id, id)).get();
      if (!row) return undefined;
      return JSON.parse(row.settingsJson) as ProjectSettings;
    },

    getMetadata(id: string): ProjectMetadata | undefined {
      const row = drizzleDb.select().from(projects).where(eq(projects.id, id)).get();
      if (!row) return undefined;
      return JSON.parse(row.metadataJson) as ProjectMetadata;
    },

    getStats(id: string): ProjectStats | undefined {
      const row = drizzleDb.select().from(projects).where(eq(projects.id, id)).get();
      if (!row || !row.statsJson) return undefined;
      return JSON.parse(row.statsJson) as ProjectStats;
    },

    updateSettings(id: string, settings: ProjectSettings): boolean {
      const existing = drizzleDb.select().from(projects).where(eq(projects.id, id)).get();
      if (!existing) return false;

      const now = nowTimestamp();
      drizzleDb
        .update(projects)
        .set({ settingsJson: JSON.stringify(settings), updatedAt: now })
        .where(eq(projects.id, id))
        .run();

      return true;
    },

    updateMetadata(id: string, metadata: ProjectMetadata): boolean {
      const existing = drizzleDb.select().from(projects).where(eq(projects.id, id)).get();
      if (!existing) return false;

      const now = nowTimestamp();
      drizzleDb
        .update(projects)
        .set({ metadataJson: JSON.stringify(metadata), updatedAt: now })
        .where(eq(projects.id, id))
        .run();

      return true;
    },

    updateStats(id: string, stats: ProjectStats): boolean {
      const existing = drizzleDb.select().from(projects).where(eq(projects.id, id)).get();
      if (!existing) return false;

      const now = nowTimestamp();
      drizzleDb
        .update(projects)
        .set({ statsJson: JSON.stringify(stats), updatedAt: now })
        .where(eq(projects.id, id))
        .run();

      return true;
    },

    touch(id: string): boolean {
      const result = drizzleDb
        .update(projects)
        .set({ updatedAt: nowTimestamp() })
        .where(eq(projects.id, id))
        .run();
      return result.changes > 0;
    },
  };
}
