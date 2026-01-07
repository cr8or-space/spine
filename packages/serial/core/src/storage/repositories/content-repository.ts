/**
 * Content repository for database operations
 *
 * Uses Drizzle ORM for type-safe queries while maintaining
 * raw SQL for FTS5 search and transactions.
 */

import type Database from 'libsql';
import { and, asc, desc, eq, isNotNull } from 'drizzle-orm';

import type { Content, ContentAnalysis, ContentStatus, ContentVersion, GenerationRecord, Review, VersionMetadata, VersionSource } from '@repo/serial-types';

import type { DrizzleDB } from '../database';
import { contents, contentVersions } from '../drizzle-schema';
import { appendToArray } from '../relation-helpers';
import {
  generateId,
  nowTimestamp,
  parseJson,
  updateOptionalJson,
  updateOptionalValue,
  updateRequiredJson,
  type ProjectScopedRepository,
} from '../repository';
import { countWords, formatFts5PrefixQuery } from '../../utils/text';

/**
 * Database row representation of content (for raw SQL FTS5 queries)
 */
interface ContentRow {
  id: string;
  project_id: string;
  structure_id: string;
  current_version: number;
  text: string;
  status: ContentStatus;
  analysis_json: string | null;
  reviews_json: string;
  generation_history_json: string;
  locked: number;
  lock_reason: string | null;
  chapter_number: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/**
 * Convert Drizzle row to Content entity
 */
function rowToContent(row: typeof contents.$inferSelect, versions: ContentVersion[]): Content {
  return {
    id: row.id,
    structureId: row.structureId,
    currentVersion: row.currentVersion,
    versions,
    text: row.text,
    status: row.status,
    analysis: row.analysisJson ? (JSON.parse(row.analysisJson) as ContentAnalysis) : undefined,
    reviews: parseJson<Review[]>(row.reviewsJson, []),
    generationHistory: parseJson<GenerationRecord[]>(row.generationHistoryJson, []),
    locked: row.locked,
    lockReason: row.lockReason ?? undefined,
    chapterNumber: row.chapterNumber ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt ?? undefined,
  };
}

/**
 * Convert raw SQL row to Content entity (for FTS5 queries)
 */
function rawRowToContent(row: ContentRow, versions: ContentVersion[]): Content {
  return {
    id: row.id,
    structureId: row.structure_id,
    currentVersion: row.current_version,
    versions,
    text: row.text,
    status: row.status,
    analysis: row.analysis_json ? (JSON.parse(row.analysis_json) as ContentAnalysis) : undefined,
    reviews: parseJson<Review[]>(row.reviews_json, []),
    generationHistory: parseJson<GenerationRecord[]>(row.generation_history_json, []),
    locked: row.locked === 1,
    lockReason: row.lock_reason ?? undefined,
    chapterNumber: row.chapter_number ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

/**
 * Convert Drizzle version row to ContentVersion entity
 */
function versionRowToVersion(row: typeof contentVersions.$inferSelect): ContentVersion {
  return {
    version: row.version,
    text: row.text,
    wordCount: row.wordCount,
    source: row.source,
    previousVersion: row.previousVersion ?? undefined,
    metadata: row.metadataJson ? (JSON.parse(row.metadataJson) as VersionMetadata) : undefined,
    createdAt: row.createdAt,
  };
}

export type CreateContentData = Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'versions' | 'currentVersion'> & {
  initialText?: string;
  source?: VersionSource;
  metadata?: VersionMetadata;
};

export type UpdateContentData = Partial<Omit<Content, 'id' | 'createdAt' | 'updatedAt' | 'versions' | 'currentVersion'>>;

export interface ContentRepository extends ProjectScopedRepository<Content, CreateContentData> {
  findByStructure(projectId: string, structureId: string): Content | undefined;
  findByStatus(projectId: string, status: ContentStatus): Content[];
  findByChapterNumber(projectId: string, chapterNumber: number): Content | undefined;
  findLocked(projectId: string): Content[];
  findPublished(projectId: string): Content[];
  search(projectId: string, query: string): Content[];

  // Version management
  getVersion(projectId: string, id: string, version: number): ContentVersion | undefined;
  getAllVersions(projectId: string, id: string): ContentVersion[];
  addVersion(
    projectId: string,
    id: string,
    text: string,
    source: VersionSource,
    metadata?: VersionMetadata
  ): Content | undefined;
  rollbackToVersion(projectId: string, id: string, targetVersion: number): Content | undefined;
  getVersionCount(projectId: string, id: string): number;
  getLatestVersions(projectId: string, id: string, limit: number): ContentVersion[];

  // Status management
  setStatus(projectId: string, id: string, status: ContentStatus): Content | undefined;
  publish(projectId: string, id: string): Content | undefined;

  // Locking
  lock(projectId: string, id: string, reason: string): Content | undefined;
  unlock(projectId: string, id: string): Content | undefined;

  // Analysis
  setAnalysis(projectId: string, id: string, analysis: ContentAnalysis | null | undefined): Content | undefined;

  // Reviews
  addReview(projectId: string, id: string, review: Review): Content | undefined;
  addGenerationRecord(projectId: string, id: string, record: GenerationRecord): Content | undefined;
}

export function createContentRepository(db: Database.Database, drizzleDb: DrizzleDB): ContentRepository {
  // FTS5 search requires raw SQL (Drizzle doesn't support virtual tables)
  const searchStmt = db.prepare(`
    SELECT c.* FROM contents c
    JOIN contents_fts fts ON c.id = fts.id
    WHERE c.project_id = ? AND contents_fts MATCH ?
  `);

  function loadVersions(contentId: string): ContentVersion[] {
    const rows = drizzleDb
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.contentId, contentId))
      .orderBy(asc(contentVersions.version))
      .all();
    return rows.map(versionRowToVersion);
  }

  return {
    findById(projectId: string, id: string): Content | undefined {
      const row = drizzleDb
        .select()
        .from(contents)
        .where(and(eq(contents.projectId, projectId), eq(contents.id, id)))
        .get();
      if (!row) return undefined;
      return rowToContent(row, loadVersions(id));
    },

    findByProject(projectId: string): Content[] {
      const rows = drizzleDb.select().from(contents).where(eq(contents.projectId, projectId)).all();
      return rows.map((row) => rowToContent(row, loadVersions(row.id)));
    },

    create(projectId: string, data: CreateContentData): Content {
      const now = nowTimestamp();
      const id = generateId();
      const text = data.initialText ?? data.text ?? '';
      const wordCount = countWords(text);

      // Create content row
      const contentRow = {
        id,
        projectId,
        structureId: data.structureId,
        currentVersion: 1,
        text,
        status: data.status ?? ('draft' as ContentStatus),
        analysisJson: data.analysis ? JSON.stringify(data.analysis) : null,
        reviewsJson: JSON.stringify(data.reviews ?? []),
        generationHistoryJson: JSON.stringify(data.generationHistory ?? []),
        locked: data.locked ?? false,
        lockReason: data.lockReason ?? null,
        chapterNumber: data.chapterNumber ?? null,
        createdAt: now,
        updatedAt: now,
        publishedAt: data.publishedAt ?? null,
      };

      // Create initial version row
      const versionRow = {
        contentId: id,
        version: 1,
        text,
        wordCount,
        source: data.source ?? ('generated' as VersionSource),
        previousVersion: null,
        metadataJson: data.metadata ? JSON.stringify(data.metadata) : null,
        createdAt: now,
      };

      const createTx = db.transaction(() => {
        drizzleDb.insert(contents).values(contentRow).run();
        drizzleDb.insert(contentVersions).values(versionRow).run();
      });
      createTx();

      return {
        id,
        structureId: data.structureId,
        currentVersion: 1,
        versions: [
          {
            version: 1,
            text,
            wordCount,
            source: data.source ?? 'generated',
            metadata: data.metadata,
            createdAt: now,
          },
        ],
        text,
        status: data.status ?? 'draft',
        analysis: data.analysis,
        reviews: data.reviews ?? [],
        generationHistory: data.generationHistory ?? [],
        locked: data.locked ?? false,
        lockReason: data.lockReason,
        chapterNumber: data.chapterNumber,
        createdAt: now,
        updatedAt: now,
        publishedAt: data.publishedAt,
      };
    },

    update(projectId: string, id: string, data: UpdateContentData): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updateData = {
        structureId: data.structureId ?? existing.structureId,
        text: data.text ?? existing.text,
        status: data.status ?? existing.status,
        analysisJson: updateOptionalJson(data.analysis, existing.analysis),
        reviewsJson: updateRequiredJson(data.reviews, existing.reviews),
        generationHistoryJson: updateRequiredJson(data.generationHistory, existing.generationHistory),
        locked: data.locked !== undefined ? data.locked : existing.locked,
        lockReason: updateOptionalValue(data.lockReason, existing.lockReason),
        chapterNumber: updateOptionalValue(data.chapterNumber, existing.chapterNumber),
        updatedAt: now,
        publishedAt: updateOptionalValue(data.publishedAt, existing.publishedAt),
      };

      drizzleDb
        .update(contents)
        .set(updateData)
        .where(and(eq(contents.projectId, projectId), eq(contents.id, id)))
        .run();

      return this.findById(projectId, id);
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(contents)
        .where(and(eq(contents.projectId, projectId), eq(contents.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(contents).where(eq(contents.projectId, projectId)).run();
      return result.changes;
    },

    findByStructure(projectId: string, structureId: string): Content | undefined {
      const row = drizzleDb
        .select()
        .from(contents)
        .where(and(eq(contents.projectId, projectId), eq(contents.structureId, structureId)))
        .get();
      if (!row) return undefined;
      return rowToContent(row, loadVersions(row.id));
    },

    findByStatus(projectId: string, status: ContentStatus): Content[] {
      const rows = drizzleDb
        .select()
        .from(contents)
        .where(and(eq(contents.projectId, projectId), eq(contents.status, status)))
        .all();
      return rows.map((row) => rowToContent(row, loadVersions(row.id)));
    },

    findByChapterNumber(projectId: string, chapterNumber: number): Content | undefined {
      const row = drizzleDb
        .select()
        .from(contents)
        .where(and(eq(contents.projectId, projectId), eq(contents.chapterNumber, chapterNumber)))
        .get();
      if (!row) return undefined;
      return rowToContent(row, loadVersions(row.id));
    },

    findLocked(projectId: string): Content[] {
      const rows = drizzleDb
        .select()
        .from(contents)
        .where(and(eq(contents.projectId, projectId), eq(contents.locked, true)))
        .all();
      return rows.map((row) => rowToContent(row, loadVersions(row.id)));
    },

    findPublished(projectId: string): Content[] {
      const rows = drizzleDb
        .select()
        .from(contents)
        .where(and(eq(contents.projectId, projectId), isNotNull(contents.publishedAt)))
        .orderBy(asc(contents.chapterNumber))
        .all();
      return rows.map((row) => rowToContent(row, loadVersions(row.id)));
    },

    search(projectId: string, query: string): Content[] {
      const rows = searchStmt.all(projectId, formatFts5PrefixQuery(query)) as ContentRow[];
      return rows.map((row) => rawRowToContent(row, loadVersions(row.id)));
    },

    getVersion(projectId: string, id: string, version: number): ContentVersion | undefined {
      const content = this.findById(projectId, id);
      if (!content) return undefined;

      const row = drizzleDb
        .select()
        .from(contentVersions)
        .where(and(eq(contentVersions.contentId, id), eq(contentVersions.version, version)))
        .get();
      return row ? versionRowToVersion(row) : undefined;
    },

    getAllVersions(projectId: string, id: string): ContentVersion[] {
      const content = this.findById(projectId, id);
      if (!content) return [];
      return loadVersions(id);
    },

    addVersion(
      projectId: string,
      id: string,
      text: string,
      source: VersionSource,
      metadata?: VersionMetadata
    ): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      // Don't allow changes to published content
      if (existing.status === 'published') return undefined;

      const now = nowTimestamp();
      const newVersion = existing.currentVersion + 1;
      const wordCount = countWords(text);

      const versionRow = {
        contentId: id,
        version: newVersion,
        text,
        wordCount,
        source,
        previousVersion: existing.currentVersion,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
        createdAt: now,
      };

      const addVersionTx = db.transaction(() => {
        drizzleDb.insert(contentVersions).values(versionRow).run();
        drizzleDb
          .update(contents)
          .set({
            currentVersion: newVersion,
            text,
            analysisJson: null, // Clear analysis for new version
            updatedAt: now,
          })
          .where(and(eq(contents.projectId, projectId), eq(contents.id, id)))
          .run();
      });
      addVersionTx();

      return this.findById(projectId, id);
    },

    rollbackToVersion(projectId: string, id: string, targetVersion: number): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      // Don't allow rollback on published content
      if (existing.status === 'published') return undefined;

      // Get the target version
      const targetVersionData = this.getVersion(projectId, id, targetVersion);
      if (!targetVersionData) return undefined;

      // Can't rollback to current version
      if (targetVersion === existing.currentVersion) return undefined;

      // Create a new version as a rollback
      return this.addVersion(projectId, id, targetVersionData.text, 'rollback', {
        rolledBackFrom: existing.currentVersion,
        editDescription: `Rolled back to version ${targetVersion}`,
      });
    },

    getVersionCount(projectId: string, id: string): number {
      const content = this.findById(projectId, id);
      if (!content) return 0;

      const rows = drizzleDb
        .select()
        .from(contentVersions)
        .where(eq(contentVersions.contentId, id))
        .all();
      return rows.length;
    },

    getLatestVersions(projectId: string, id: string, limit: number): ContentVersion[] {
      const content = this.findById(projectId, id);
      if (!content) return [];

      const rows = drizzleDb
        .select()
        .from(contentVersions)
        .where(eq(contentVersions.contentId, id))
        .orderBy(desc(contentVersions.version))
        .limit(limit)
        .all();
      return rows.map(versionRowToVersion);
    },

    setStatus(projectId: string, id: string, status: ContentStatus): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      // Can't change published content
      if (existing.status === 'published' && status !== 'published') return undefined;

      return this.update(projectId, id, { status });
    },

    publish(projectId: string, id: string): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      // Can only publish approved content
      if (existing.status !== 'approved') return undefined;

      return this.update(projectId, id, {
        status: 'published',
        publishedAt: nowTimestamp(),
        locked: true,
        lockReason: 'Published content is immutable',
      });
    },

    lock(projectId: string, id: string, reason: string): Content | undefined {
      return this.update(projectId, id, { locked: true, lockReason: reason });
    },

    unlock(projectId: string, id: string): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      // Can't unlock published content
      if (existing.status === 'published') return undefined;

      return this.update(projectId, id, { locked: false, lockReason: undefined });
    },

    setAnalysis(projectId: string, id: string, analysis: ContentAnalysis | null | undefined): Content | undefined {
      // Pass null explicitly to clear analysis (undefined means "don't change")
      return this.update(projectId, id, { analysis: analysis ?? null } as UpdateContentData);
    },

    addReview(projectId: string, id: string, review: Review): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      return appendToArray({
        entity: existing,
        field: 'reviews',
        item: review,
        update: (data) => this.update(projectId, id, data),
      });
    },

    addGenerationRecord(projectId: string, id: string, record: GenerationRecord): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      return appendToArray({
        entity: existing,
        field: 'generationHistory',
        item: record,
        update: (data) => this.update(projectId, id, data),
      });
    },
  };
}
