/**
 * Timeline event and span repositories for database operations
 */

import type Database from 'better-sqlite3';

import type { CausalLink, TimelineEvent, TimelinePosition, TimelineSpan } from '@repo/types';

import { createProjectScopedRepository, generateId, intToBool, boolToInt, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

// ============================================================================
// Timeline Events
// ============================================================================

interface TimelineEventRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  position_json: string;
  duration: string | null;
  type: TimelineEvent['type'];
  significance: TimelineEvent['significance'];
  involved_characters_json: string;
  locations_json: string;
  related_threads_json: string;
  causes_json: string;
  effects_json: string;
  revealed: number;
  content_refs_json: string;
  created_at: string;
  updated_at: string;
}

function rowToTimelineEvent(row: TimelineEventRow): TimelineEvent {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    position: parseJson<TimelinePosition>(row.position_json, { approximate: false }),
    duration: row.duration ?? undefined,
    type: row.type,
    significance: row.significance,
    involvedCharacters: parseJson<string[]>(row.involved_characters_json, []),
    locations: parseJson<string[]>(row.locations_json, []),
    relatedThreads: parseJson<string[]>(row.related_threads_json, []),
    causes: parseJson<CausalLink[]>(row.causes_json, []),
    effects: parseJson<string[]>(row.effects_json, []),
    revealed: intToBool(row.revealed),
    contentRefs: parseJson<string[]>(row.content_refs_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateTimelineEventData = Omit<TimelineEvent, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTimelineEventData = Partial<Omit<TimelineEvent, 'id' | 'createdAt' | 'updatedAt'>>;

export interface TimelineEventRepository extends ProjectScopedRepository<TimelineEvent, CreateTimelineEventData> {
  findByType(projectId: string, type: TimelineEvent['type']): TimelineEvent[];
  findBySignificance(projectId: string, significance: TimelineEvent['significance']): TimelineEvent[];
  findRevealed(projectId: string): TimelineEvent[];
  findByCharacter(projectId: string, characterId: string): TimelineEvent[];
  findByLocation(projectId: string, locationId: string): TimelineEvent[];
  addCause(projectId: string, id: string, cause: CausalLink): TimelineEvent | undefined;
  addEffect(projectId: string, id: string, effectId: string): TimelineEvent | undefined;
  markRevealed(projectId: string, id: string, contentId: string): TimelineEvent | undefined;
}

export function createTimelineEventRepository(db: Database.Database): TimelineEventRepository {
  const base = createProjectScopedRepository<TimelineEventRow>(db, 'timeline_events');

  const insertStmt = db.prepare(`
    INSERT INTO timeline_events (
      id, project_id, name, description, position_json, duration, type,
      significance, involved_characters_json, locations_json, related_threads_json,
      causes_json, effects_json, revealed, content_refs_json, created_at, updated_at
    ) VALUES (
      @id, @project_id, @name, @description, @position_json, @duration, @type,
      @significance, @involved_characters_json, @locations_json, @related_threads_json,
      @causes_json, @effects_json, @revealed, @content_refs_json, @created_at, @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE timeline_events SET
      name = @name,
      description = @description,
      position_json = @position_json,
      duration = @duration,
      type = @type,
      significance = @significance,
      involved_characters_json = @involved_characters_json,
      locations_json = @locations_json,
      related_threads_json = @related_threads_json,
      causes_json = @causes_json,
      effects_json = @effects_json,
      revealed = @revealed,
      content_refs_json = @content_refs_json,
      updated_at = @updated_at
    WHERE project_id = @project_id AND id = @id
  `);

  const findByTypeStmt = db.prepare(`SELECT * FROM timeline_events WHERE project_id = ? AND type = ?`);
  const findBySignificanceStmt = db.prepare(`SELECT * FROM timeline_events WHERE project_id = ? AND significance = ?`);
  const findRevealedStmt = db.prepare(`SELECT * FROM timeline_events WHERE project_id = ? AND revealed = 1`);

  return {
    findById(projectId: string, id: string): TimelineEvent | undefined {
      const row = base.findById(projectId, id);
      return row ? rowToTimelineEvent(row) : undefined;
    },

    findByProject(projectId: string): TimelineEvent[] {
      return base.findByProject(projectId).map(rowToTimelineEvent);
    },

    create(projectId: string, data: CreateTimelineEventData): TimelineEvent {
      const now = nowTimestamp();
      const id = generateId();

      const row: TimelineEventRow = {
        id,
        project_id: projectId,
        name: data.name,
        description: data.description,
        position_json: JSON.stringify(data.position),
        duration: data.duration ?? null,
        type: data.type,
        significance: data.significance,
        involved_characters_json: JSON.stringify(data.involvedCharacters),
        locations_json: JSON.stringify(data.locations),
        related_threads_json: JSON.stringify(data.relatedThreads),
        causes_json: JSON.stringify(data.causes),
        effects_json: JSON.stringify(data.effects),
        revealed: boolToInt(data.revealed),
        content_refs_json: JSON.stringify(data.contentRefs),
        created_at: now,
        updated_at: now,
      };

      insertStmt.run(row);
      return rowToTimelineEvent(row);
    },

    update(projectId: string, id: string, data: UpdateTimelineEventData): TimelineEvent | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updated: TimelineEventRow = {
        id,
        project_id: projectId,
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        position_json: data.position ? JSON.stringify(data.position) : JSON.stringify(existing.position),
        duration: data.duration !== undefined ? (data.duration ?? null) : (existing.duration ?? null),
        type: data.type ?? existing.type,
        significance: data.significance ?? existing.significance,
        involved_characters_json: data.involvedCharacters
          ? JSON.stringify(data.involvedCharacters)
          : JSON.stringify(existing.involvedCharacters),
        locations_json: data.locations ? JSON.stringify(data.locations) : JSON.stringify(existing.locations),
        related_threads_json: data.relatedThreads
          ? JSON.stringify(data.relatedThreads)
          : JSON.stringify(existing.relatedThreads),
        causes_json: data.causes ? JSON.stringify(data.causes) : JSON.stringify(existing.causes),
        effects_json: data.effects ? JSON.stringify(data.effects) : JSON.stringify(existing.effects),
        revealed: data.revealed !== undefined ? boolToInt(data.revealed) : boolToInt(existing.revealed),
        content_refs_json: data.contentRefs ? JSON.stringify(data.contentRefs) : JSON.stringify(existing.contentRefs),
        created_at: existing.createdAt,
        updated_at: now,
      };

      updateStmt.run(updated);
      return rowToTimelineEvent(updated);
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    findByType(projectId: string, type: TimelineEvent['type']): TimelineEvent[] {
      const rows = findByTypeStmt.all(projectId, type) as TimelineEventRow[];
      return rows.map(rowToTimelineEvent);
    },

    findBySignificance(projectId: string, significance: TimelineEvent['significance']): TimelineEvent[] {
      const rows = findBySignificanceStmt.all(projectId, significance) as TimelineEventRow[];
      return rows.map(rowToTimelineEvent);
    },

    findRevealed(projectId: string): TimelineEvent[] {
      const rows = findRevealedStmt.all(projectId) as TimelineEventRow[];
      return rows.map(rowToTimelineEvent);
    },

    findByCharacter(projectId: string, characterId: string): TimelineEvent[] {
      return this.findByProject(projectId).filter((e) => e.involvedCharacters.includes(characterId));
    },

    findByLocation(projectId: string, locationId: string): TimelineEvent[] {
      return this.findByProject(projectId).filter((e) => e.locations.includes(locationId));
    },

    addCause(projectId: string, id: string, cause: CausalLink): TimelineEvent | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const causes = [...existing.causes.filter((c) => c.causeEventId !== cause.causeEventId), cause];
      return this.update(projectId, id, { causes });
    },

    addEffect(projectId: string, id: string, effectId: string): TimelineEvent | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      if (existing.effects.includes(effectId)) return existing;

      const effects = [...existing.effects, effectId];
      return this.update(projectId, id, { effects });
    },

    markRevealed(projectId: string, id: string, contentId: string): TimelineEvent | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const contentRefs = existing.contentRefs.includes(contentId) ? existing.contentRefs : [...existing.contentRefs, contentId];
      return this.update(projectId, id, { revealed: true, contentRefs });
    },
  };
}

// ============================================================================
// Timeline Spans
// ============================================================================

interface TimelineSpanRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  start_json: string;
  end_json: string | null;
  events_json: string;
  created_at: string;
  updated_at: string;
}

function rowToTimelineSpan(row: TimelineSpanRow): TimelineSpan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    start: parseJson<TimelinePosition>(row.start_json, { approximate: false }),
    end: row.end_json ? (JSON.parse(row.end_json) as TimelinePosition) : undefined,
    events: parseJson<string[]>(row.events_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateTimelineSpanData = Omit<TimelineSpan, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTimelineSpanData = Partial<Omit<TimelineSpan, 'id' | 'createdAt' | 'updatedAt'>>;

export interface TimelineSpanRepository extends ProjectScopedRepository<TimelineSpan, CreateTimelineSpanData> {
  addEvent(projectId: string, id: string, eventId: string): TimelineSpan | undefined;
  removeEvent(projectId: string, id: string, eventId: string): TimelineSpan | undefined;
}

export function createTimelineSpanRepository(db: Database.Database): TimelineSpanRepository {
  const base = createProjectScopedRepository<TimelineSpanRow>(db, 'timeline_spans');

  const insertStmt = db.prepare(`
    INSERT INTO timeline_spans (
      id, project_id, name, description, start_json, end_json, events_json, created_at, updated_at
    ) VALUES (
      @id, @project_id, @name, @description, @start_json, @end_json, @events_json, @created_at, @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE timeline_spans SET
      name = @name,
      description = @description,
      start_json = @start_json,
      end_json = @end_json,
      events_json = @events_json,
      updated_at = @updated_at
    WHERE project_id = @project_id AND id = @id
  `);

  return {
    findById(projectId: string, id: string): TimelineSpan | undefined {
      const row = base.findById(projectId, id);
      return row ? rowToTimelineSpan(row) : undefined;
    },

    findByProject(projectId: string): TimelineSpan[] {
      return base.findByProject(projectId).map(rowToTimelineSpan);
    },

    create(projectId: string, data: CreateTimelineSpanData): TimelineSpan {
      const now = nowTimestamp();
      const id = generateId();

      const row: TimelineSpanRow = {
        id,
        project_id: projectId,
        name: data.name,
        description: data.description,
        start_json: JSON.stringify(data.start),
        end_json: data.end ? JSON.stringify(data.end) : null,
        events_json: JSON.stringify(data.events),
        created_at: now,
        updated_at: now,
      };

      insertStmt.run(row);
      return rowToTimelineSpan(row);
    },

    update(projectId: string, id: string, data: UpdateTimelineSpanData): TimelineSpan | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updated: TimelineSpanRow = {
        id,
        project_id: projectId,
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        start_json: data.start ? JSON.stringify(data.start) : JSON.stringify(existing.start),
        end_json: data.end !== undefined ? (data.end ? JSON.stringify(data.end) : null) : (existing.end ? JSON.stringify(existing.end) : null),
        events_json: data.events ? JSON.stringify(data.events) : JSON.stringify(existing.events),
        created_at: existing.createdAt,
        updated_at: now,
      };

      updateStmt.run(updated);
      return rowToTimelineSpan(updated);
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    addEvent(projectId: string, id: string, eventId: string): TimelineSpan | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      if (existing.events.includes(eventId)) return existing;

      const events = [...existing.events, eventId];
      return this.update(projectId, id, { events });
    },

    removeEvent(projectId: string, id: string, eventId: string): TimelineSpan | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const events = existing.events.filter((e) => e !== eventId);
      return this.update(projectId, id, { events });
    },
  };
}
