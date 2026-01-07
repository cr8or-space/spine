/**
 * Repository for entity suggestions
 */

import type Database from 'libsql';
import { nanoid } from 'nanoid';
import {
  type EntitySuggestion,
  type SuggestionSummary,
  type SuggestionStatus,
  type ExtractableEntityType,
  type SuggestionType,
  type ConfidenceLevel,
  ExtractionEvidenceSchema,
  FieldUpdateSchema,
} from '@repo/serial-types';
import { z } from 'zod';

import { parseJsonWithSchema } from '../storage/repository';

// Schemas for JSON fields
const ExtractionEvidenceArraySchema = z.array(ExtractionEvidenceSchema);
const FieldUpdateArraySchema = z.array(FieldUpdateSchema).optional();
const SuggestedDataSchema = z.record(z.unknown());

export interface SuggestionRepository {
  /** Create a new suggestion */
  create(
    projectId: string,
    data: Omit<EntitySuggestion, 'id' | 'projectId' | 'status' | 'createdAt' | 'reviewedAt'>
  ): EntitySuggestion;

  /** Get a suggestion by ID */
  get(id: string): EntitySuggestion | undefined;

  /** Get all suggestions for a project */
  getAll(projectId: string, status?: SuggestionStatus): EntitySuggestion[];

  /** Get suggestion summaries */
  getSummaries(projectId: string, status?: SuggestionStatus): SuggestionSummary[];

  /** Get suggestions by entity type */
  getByEntityType(projectId: string, entityType: ExtractableEntityType): EntitySuggestion[];

  /** Get pending suggestion count */
  getPendingCount(projectId: string): number;

  /** Update suggestion status */
  updateStatus(
    id: string,
    status: SuggestionStatus,
    reviewNotes?: string
  ): EntitySuggestion | undefined;

  /** Delete a suggestion */
  delete(id: string): boolean;

  /** Delete all suggestions for a project */
  deleteAll(projectId: string): number;

  /** Clear reviewed suggestions older than days */
  cleanup(projectId: string, days: number): number;
}

interface SuggestionRow {
  id: string;
  project_id: string;
  suggestion_type: SuggestionType;
  entity_type: ExtractableEntityType;
  existing_entity_id: string | null;
  name: string;
  suggested_data_json: string;
  field_updates_json: string | null;
  evidence_json: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  status: SuggestionStatus;
  review_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

function rowToSuggestion(row: SuggestionRow): EntitySuggestion {
  return {
    id: row.id,
    projectId: row.project_id,
    suggestionType: row.suggestion_type,
    entityType: row.entity_type,
    existingEntityId: row.existing_entity_id || undefined,
    name: row.name,
    suggestedData: parseJsonWithSchema(row.suggested_data_json, SuggestedDataSchema, {}, 'suggestion.suggestedData'),
    fieldUpdates: parseJsonWithSchema(row.field_updates_json, FieldUpdateArraySchema, undefined, 'suggestion.fieldUpdates'),
    evidence: parseJsonWithSchema(row.evidence_json, ExtractionEvidenceArraySchema, [], 'suggestion.evidence'),
    confidence: row.confidence,
    reasoning: row.reasoning,
    status: row.status,
    reviewNotes: row.review_notes || undefined,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || undefined,
  };
}

function rowToSummary(row: SuggestionRow): SuggestionSummary {
  const evidence = parseJsonWithSchema(row.evidence_json, ExtractionEvidenceArraySchema, [], 'suggestionSummary.evidence');
  return {
    id: row.id,
    suggestionType: row.suggestion_type,
    entityType: row.entity_type,
    name: row.name,
    confidence: row.confidence,
    status: row.status,
    evidenceCount: evidence.length,
    createdAt: row.created_at,
  };
}

export function createSuggestionRepository(db: Database.Database): SuggestionRepository {
  return {
    create(
      projectId: string,
      data: Omit<EntitySuggestion, 'id' | 'projectId' | 'status' | 'createdAt' | 'reviewedAt'>
    ): EntitySuggestion {
      const id = nanoid();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO entity_suggestions (
          id, project_id, suggestion_type, entity_type, existing_entity_id,
          name, suggested_data_json, field_updates_json, evidence_json,
          confidence, reasoning, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        projectId,
        data.suggestionType,
        data.entityType,
        data.existingEntityId || null,
        data.name,
        JSON.stringify(data.suggestedData),
        data.fieldUpdates ? JSON.stringify(data.fieldUpdates) : null,
        JSON.stringify(data.evidence),
        data.confidence,
        data.reasoning,
        'pending',
        now
      );

      return this.get(id)!;
    },

    get(id: string): EntitySuggestion | undefined {
      const row = db.prepare('SELECT * FROM entity_suggestions WHERE id = ?').get(id) as
        | SuggestionRow
        | undefined;
      return row ? rowToSuggestion(row) : undefined;
    },

    getAll(projectId: string, status?: SuggestionStatus): EntitySuggestion[] {
      let query = 'SELECT * FROM entity_suggestions WHERE project_id = ?';
      const params: (string | undefined)[] = [projectId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const rows = db.prepare(query).all(...params) as SuggestionRow[];
      return rows.map(rowToSuggestion);
    },

    getSummaries(projectId: string, status?: SuggestionStatus): SuggestionSummary[] {
      let query = 'SELECT * FROM entity_suggestions WHERE project_id = ?';
      const params: (string | undefined)[] = [projectId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const rows = db.prepare(query).all(...params) as SuggestionRow[];
      return rows.map(rowToSummary);
    },

    getByEntityType(projectId: string, entityType: ExtractableEntityType): EntitySuggestion[] {
      const rows = db
        .prepare(
          'SELECT * FROM entity_suggestions WHERE project_id = ? AND entity_type = ? ORDER BY created_at DESC'
        )
        .all(projectId, entityType) as SuggestionRow[];
      return rows.map(rowToSuggestion);
    },

    getPendingCount(projectId: string): number {
      const row = db
        .prepare('SELECT COUNT(*) as count FROM entity_suggestions WHERE project_id = ? AND status = ?')
        .get(projectId, 'pending') as { count: number };
      return row.count;
    },

    updateStatus(
      id: string,
      status: SuggestionStatus,
      reviewNotes?: string
    ): EntitySuggestion | undefined {
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE entity_suggestions
        SET status = ?, review_notes = ?, reviewed_at = ?
        WHERE id = ?
      `).run(status, reviewNotes || null, now, id);

      return this.get(id);
    },

    delete(id: string): boolean {
      const result = db.prepare('DELETE FROM entity_suggestions WHERE id = ?').run(id);
      return result.changes > 0;
    },

    deleteAll(projectId: string): number {
      const result = db.prepare('DELETE FROM entity_suggestions WHERE project_id = ?').run(projectId);
      return result.changes;
    },

    cleanup(projectId: string, days: number): number {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const result = db
        .prepare(
          `DELETE FROM entity_suggestions
           WHERE project_id = ?
           AND status IN ('accepted', 'rejected', 'merged')
           AND reviewed_at < ?`
        )
        .run(projectId, cutoff.toISOString());

      return result.changes;
    },
  };
}
