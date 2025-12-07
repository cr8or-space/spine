/**
 * Content repository for database operations
 */

import type Database from 'better-sqlite3';

import type { Content, ContentAnalysis, ContentStatus, ContentVersion, GenerationRecord, Review, VersionMetadata, VersionSource } from '@repo/types';

import { boolToInt, createProjectScopedRepository, generateId, intToBool, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

/**
 * Database row representation of content
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
 * Database row representation of a content version
 */
interface ContentVersionRow {
  id: number;
  content_id: string;
  version: number;
  text: string;
  word_count: number;
  source: VersionSource;
  previous_version: number | null;
  metadata_json: string | null;
  created_at: string;
}

function rowToContent(row: ContentRow, versions: ContentVersion[]): Content {
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
    locked: intToBool(row.locked),
    lockReason: row.lock_reason ?? undefined,
    chapterNumber: row.chapter_number ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

function versionRowToVersion(row: ContentVersionRow): ContentVersion {
  return {
    version: row.version,
    text: row.text,
    wordCount: row.word_count,
    source: row.source,
    previousVersion: row.previous_version ?? undefined,
    metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as VersionMetadata) : undefined,
    createdAt: row.created_at,
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
  setAnalysis(projectId: string, id: string, analysis: ContentAnalysis | undefined): Content | undefined;

  // Reviews
  addReview(projectId: string, id: string, review: Review): Content | undefined;
  addGenerationRecord(projectId: string, id: string, record: GenerationRecord): Content | undefined;
}

export function createContentRepository(db: Database.Database): ContentRepository {
  const base = createProjectScopedRepository<ContentRow>(db, 'contents');

  const insertContentStmt = db.prepare(`
    INSERT INTO contents (
      id, project_id, structure_id, current_version, text, status,
      analysis_json, reviews_json, generation_history_json, locked,
      lock_reason, chapter_number, created_at, updated_at, published_at
    ) VALUES (
      @id, @project_id, @structure_id, @current_version, @text, @status,
      @analysis_json, @reviews_json, @generation_history_json, @locked,
      @lock_reason, @chapter_number, @created_at, @updated_at, @published_at
    )
  `);

  const insertVersionStmt = db.prepare(`
    INSERT INTO content_versions (
      content_id, version, text, word_count, source, previous_version, metadata_json, created_at
    ) VALUES (
      @content_id, @version, @text, @word_count, @source, @previous_version, @metadata_json, @created_at
    )
  `);

  const updateContentStmt = db.prepare(`
    UPDATE contents SET
      structure_id = @structure_id,
      current_version = @current_version,
      text = @text,
      status = @status,
      analysis_json = @analysis_json,
      reviews_json = @reviews_json,
      generation_history_json = @generation_history_json,
      locked = @locked,
      lock_reason = @lock_reason,
      chapter_number = @chapter_number,
      updated_at = @updated_at,
      published_at = @published_at
    WHERE project_id = @project_id AND id = @id
  `);

  const findByStructureStmt = db.prepare(`SELECT * FROM contents WHERE project_id = ? AND structure_id = ?`);
  const findByStatusStmt = db.prepare(`SELECT * FROM contents WHERE project_id = ? AND status = ?`);
  const findByChapterStmt = db.prepare(`SELECT * FROM contents WHERE project_id = ? AND chapter_number = ?`);
  const findLockedStmt = db.prepare(`SELECT * FROM contents WHERE project_id = ? AND locked = 1`);
  const findPublishedStmt = db.prepare(`SELECT * FROM contents WHERE project_id = ? AND published_at IS NOT NULL ORDER BY chapter_number`);
  const searchStmt = db.prepare(`
    SELECT c.* FROM contents c
    JOIN contents_fts fts ON c.id = fts.id
    WHERE c.project_id = ? AND contents_fts MATCH ?
  `);

  const getVersionsStmt = db.prepare(`SELECT * FROM content_versions WHERE content_id = ? ORDER BY version`);
  const getVersionStmt = db.prepare(`SELECT * FROM content_versions WHERE content_id = ? AND version = ?`);
  const getVersionCountStmt = db.prepare(`SELECT COUNT(*) as count FROM content_versions WHERE content_id = ?`);
  const getLatestVersionsStmt = db.prepare(
    `SELECT * FROM content_versions WHERE content_id = ? ORDER BY version DESC LIMIT ?`
  );

  function loadVersions(contentId: string): ContentVersion[] {
    const rows = getVersionsStmt.all(contentId) as ContentVersionRow[];
    return rows.map(versionRowToVersion);
  }

  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }

  return {
    findById(projectId: string, id: string): Content | undefined {
      const row = base.findById(projectId, id);
      if (!row) return undefined;
      return rowToContent(row, loadVersions(id));
    },

    findByProject(projectId: string): Content[] {
      return base.findByProject(projectId).map((row) => rowToContent(row, loadVersions(row.id)));
    },

    create(projectId: string, data: CreateContentData): Content {
      const now = nowTimestamp();
      const id = generateId();
      const text = data.initialText ?? data.text ?? '';
      const wordCount = countWords(text);

      // Create content row
      const contentRow: ContentRow = {
        id,
        project_id: projectId,
        structure_id: data.structureId,
        current_version: 1,
        text,
        status: data.status ?? 'draft',
        analysis_json: data.analysis ? JSON.stringify(data.analysis) : null,
        reviews_json: JSON.stringify(data.reviews ?? []),
        generation_history_json: JSON.stringify(data.generationHistory ?? []),
        locked: boolToInt(data.locked ?? false),
        lock_reason: data.lockReason ?? null,
        chapter_number: data.chapterNumber ?? null,
        created_at: now,
        updated_at: now,
        published_at: data.publishedAt ?? null,
      };

      // Create initial version row
      const versionRow: Omit<ContentVersionRow, 'id'> = {
        content_id: id,
        version: 1,
        text,
        word_count: wordCount,
        source: data.source ?? 'generated',
        previous_version: null,
        metadata_json: data.metadata ? JSON.stringify(data.metadata) : null,
        created_at: now,
      };

      const createTx = db.transaction(() => {
        insertContentStmt.run(contentRow);
        insertVersionStmt.run(versionRow);
      });
      createTx();

      return rowToContent(contentRow, [
        {
          version: 1,
          text,
          wordCount,
          source: data.source ?? 'generated',
          metadata: data.metadata,
          createdAt: now,
        },
      ]);
    },

    update(projectId: string, id: string, data: UpdateContentData): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updated: ContentRow = {
        id,
        project_id: projectId,
        structure_id: data.structureId ?? existing.structureId,
        current_version: existing.currentVersion,
        text: data.text ?? existing.text,
        status: data.status ?? existing.status,
        analysis_json:
          data.analysis !== undefined
            ? data.analysis
              ? JSON.stringify(data.analysis)
              : null
            : existing.analysis
              ? JSON.stringify(existing.analysis)
              : null,
        reviews_json: data.reviews ? JSON.stringify(data.reviews) : JSON.stringify(existing.reviews),
        generation_history_json: data.generationHistory
          ? JSON.stringify(data.generationHistory)
          : JSON.stringify(existing.generationHistory),
        locked: data.locked !== undefined ? boolToInt(data.locked) : boolToInt(existing.locked),
        lock_reason: data.lockReason !== undefined ? (data.lockReason ?? null) : (existing.lockReason ?? null),
        chapter_number: data.chapterNumber !== undefined ? (data.chapterNumber ?? null) : (existing.chapterNumber ?? null),
        created_at: existing.createdAt,
        updated_at: now,
        published_at: data.publishedAt !== undefined ? (data.publishedAt ?? null) : (existing.publishedAt ?? null),
      };

      updateContentStmt.run(updated);
      return rowToContent(updated, loadVersions(id));
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    findByStructure(projectId: string, structureId: string): Content | undefined {
      const row = findByStructureStmt.get(projectId, structureId) as ContentRow | undefined;
      if (!row) return undefined;
      return rowToContent(row, loadVersions(row.id));
    },

    findByStatus(projectId: string, status: ContentStatus): Content[] {
      const rows = findByStatusStmt.all(projectId, status) as ContentRow[];
      return rows.map((row) => rowToContent(row, loadVersions(row.id)));
    },

    findByChapterNumber(projectId: string, chapterNumber: number): Content | undefined {
      const row = findByChapterStmt.get(projectId, chapterNumber) as ContentRow | undefined;
      if (!row) return undefined;
      return rowToContent(row, loadVersions(row.id));
    },

    findLocked(projectId: string): Content[] {
      const rows = findLockedStmt.all(projectId) as ContentRow[];
      return rows.map((row) => rowToContent(row, loadVersions(row.id)));
    },

    findPublished(projectId: string): Content[] {
      const rows = findPublishedStmt.all(projectId) as ContentRow[];
      return rows.map((row) => rowToContent(row, loadVersions(row.id)));
    },

    search(projectId: string, query: string): Content[] {
      const escapedQuery = query.replace(/"/g, '""');
      const rows = searchStmt.all(projectId, `"${escapedQuery}"*`) as ContentRow[];
      return rows.map((row) => rowToContent(row, loadVersions(row.id)));
    },

    getVersion(projectId: string, id: string, version: number): ContentVersion | undefined {
      const content = this.findById(projectId, id);
      if (!content) return undefined;

      const row = getVersionStmt.get(id, version) as ContentVersionRow | undefined;
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

      const versionRow: Omit<ContentVersionRow, 'id'> = {
        content_id: id,
        version: newVersion,
        text,
        word_count: wordCount,
        source,
        previous_version: existing.currentVersion,
        metadata_json: metadata ? JSON.stringify(metadata) : null,
        created_at: now,
      };

      const addVersionTx = db.transaction(() => {
        insertVersionStmt.run(versionRow);
        updateContentStmt.run({
          id,
          project_id: projectId,
          structure_id: existing.structureId,
          current_version: newVersion,
          text,
          status: existing.status,
          analysis_json: null, // Clear analysis for new version
          reviews_json: JSON.stringify(existing.reviews),
          generation_history_json: JSON.stringify(existing.generationHistory),
          locked: boolToInt(existing.locked),
          lock_reason: existing.lockReason ?? null,
          chapter_number: existing.chapterNumber ?? null,
          created_at: existing.createdAt,
          updated_at: now,
          published_at: existing.publishedAt ?? null,
        });
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

      const row = getVersionCountStmt.get(id) as { count: number } | undefined;
      return row?.count ?? 0;
    },

    getLatestVersions(projectId: string, id: string, limit: number): ContentVersion[] {
      const content = this.findById(projectId, id);
      if (!content) return [];

      const rows = getLatestVersionsStmt.all(id, limit) as ContentVersionRow[];
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

    setAnalysis(projectId: string, id: string, analysis: ContentAnalysis | undefined): Content | undefined {
      return this.update(projectId, id, { analysis });
    },

    addReview(projectId: string, id: string, review: Review): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const reviews = [...existing.reviews, review];
      return this.update(projectId, id, { reviews });
    },

    addGenerationRecord(projectId: string, id: string, record: GenerationRecord): Content | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const generationHistory = [...existing.generationHistory, record];
      return this.update(projectId, id, { generationHistory });
    },
  };
}
