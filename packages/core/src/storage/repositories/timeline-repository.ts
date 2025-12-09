/**
 * Timeline event and span repositories for database operations
 *
 * Uses Drizzle ORM for type-safe queries.
 */

import type Database from 'libsql';
import { and, eq } from 'drizzle-orm';

import type { CausalLink, TimelineEvent, TimelinePosition, TimelineSpan } from '@repo/types';

import type { DrizzleDB } from '../database';
import { timelineEvents, timelineSpans } from '../drizzle-schema';
import { generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

// ============================================================================
// Timeline Events
// ============================================================================

/**
 * Convert Drizzle row to TimelineEvent entity
 */
function rowToTimelineEvent(row: typeof timelineEvents.$inferSelect): TimelineEvent {
  return {
    id: row.id,
    entityType: 'timeline-event',
    name: row.name,
    description: row.description,
    position: parseJson<TimelinePosition>(row.positionJson, { approximate: false }),
    duration: row.duration ?? undefined,
    type: row.type,
    significance: row.significance,
    involvedCharacters: parseJson<string[]>(row.involvedCharactersJson, []),
    locations: parseJson<string[]>(row.locationsJson, []),
    relatedThreads: parseJson<string[]>(row.relatedThreadsJson, []),
    causes: parseJson<CausalLink[]>(row.causesJson, []),
    effects: parseJson<string[]>(row.effectsJson, []),
    revealed: row.revealed,
    contentRefs: parseJson<string[]>(row.contentRefsJson, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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

export function createTimelineEventRepository(_db: Database.Database, drizzleDb: DrizzleDB): TimelineEventRepository {
  return {
    findById(projectId: string, id: string): TimelineEvent | undefined {
      const row = drizzleDb
        .select()
        .from(timelineEvents)
        .where(and(eq(timelineEvents.projectId, projectId), eq(timelineEvents.id, id)))
        .get();
      return row ? rowToTimelineEvent(row) : undefined;
    },

    findByProject(projectId: string): TimelineEvent[] {
      const rows = drizzleDb.select().from(timelineEvents).where(eq(timelineEvents.projectId, projectId)).all();
      return rows.map(rowToTimelineEvent);
    },

    create(projectId: string, data: CreateTimelineEventData): TimelineEvent {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        projectId,
        name: data.name,
        description: data.description,
        positionJson: JSON.stringify(data.position),
        duration: data.duration ?? null,
        type: data.type,
        significance: data.significance,
        involvedCharactersJson: JSON.stringify(data.involvedCharacters),
        locationsJson: JSON.stringify(data.locations),
        relatedThreadsJson: JSON.stringify(data.relatedThreads),
        causesJson: JSON.stringify(data.causes),
        effectsJson: JSON.stringify(data.effects),
        revealed: data.revealed,
        contentRefsJson: JSON.stringify(data.contentRefs),
        createdAt: now,
        updatedAt: now,
      };

      drizzleDb.insert(timelineEvents).values(newRow).run();

      return {
        id,
        entityType: 'timeline-event',
        name: data.name,
        description: data.description,
        position: data.position,
        duration: data.duration,
        type: data.type,
        significance: data.significance,
        involvedCharacters: data.involvedCharacters,
        locations: data.locations,
        relatedThreads: data.relatedThreads,
        causes: data.causes,
        effects: data.effects,
        revealed: data.revealed,
        contentRefs: data.contentRefs,
        createdAt: now,
        updatedAt: now,
      };
    },

    update(projectId: string, id: string, data: UpdateTimelineEventData): TimelineEvent | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updateData = {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        positionJson: data.position ? JSON.stringify(data.position) : JSON.stringify(existing.position),
        duration: data.duration !== undefined ? (data.duration ?? null) : (existing.duration ?? null),
        type: data.type ?? existing.type,
        significance: data.significance ?? existing.significance,
        involvedCharactersJson: data.involvedCharacters
          ? JSON.stringify(data.involvedCharacters)
          : JSON.stringify(existing.involvedCharacters),
        locationsJson: data.locations ? JSON.stringify(data.locations) : JSON.stringify(existing.locations),
        relatedThreadsJson: data.relatedThreads
          ? JSON.stringify(data.relatedThreads)
          : JSON.stringify(existing.relatedThreads),
        causesJson: data.causes ? JSON.stringify(data.causes) : JSON.stringify(existing.causes),
        effectsJson: data.effects ? JSON.stringify(data.effects) : JSON.stringify(existing.effects),
        revealed: data.revealed !== undefined ? data.revealed : existing.revealed,
        contentRefsJson: data.contentRefs ? JSON.stringify(data.contentRefs) : JSON.stringify(existing.contentRefs),
        updatedAt: now,
      };

      drizzleDb
        .update(timelineEvents)
        .set(updateData)
        .where(and(eq(timelineEvents.projectId, projectId), eq(timelineEvents.id, id)))
        .run();

      return this.findById(projectId, id);
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(timelineEvents)
        .where(and(eq(timelineEvents.projectId, projectId), eq(timelineEvents.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(timelineEvents).where(eq(timelineEvents.projectId, projectId)).run();
      return result.changes;
    },

    findByType(projectId: string, type: TimelineEvent['type']): TimelineEvent[] {
      const rows = drizzleDb
        .select()
        .from(timelineEvents)
        .where(and(eq(timelineEvents.projectId, projectId), eq(timelineEvents.type, type)))
        .all();
      return rows.map(rowToTimelineEvent);
    },

    findBySignificance(projectId: string, significance: TimelineEvent['significance']): TimelineEvent[] {
      const rows = drizzleDb
        .select()
        .from(timelineEvents)
        .where(and(eq(timelineEvents.projectId, projectId), eq(timelineEvents.significance, significance)))
        .all();
      return rows.map(rowToTimelineEvent);
    },

    findRevealed(projectId: string): TimelineEvent[] {
      const rows = drizzleDb
        .select()
        .from(timelineEvents)
        .where(and(eq(timelineEvents.projectId, projectId), eq(timelineEvents.revealed, true)))
        .all();
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

/**
 * Convert Drizzle row to TimelineSpan entity
 */
function rowToTimelineSpan(row: typeof timelineSpans.$inferSelect): TimelineSpan {
  return {
    id: row.id,
    entityType: 'timeline-span',
    name: row.name,
    description: row.description,
    start: parseJson<TimelinePosition>(row.startJson, { approximate: false }),
    end: row.endJson ? (JSON.parse(row.endJson) as TimelinePosition) : undefined,
    events: parseJson<string[]>(row.eventsJson, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type CreateTimelineSpanData = Omit<TimelineSpan, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTimelineSpanData = Partial<Omit<TimelineSpan, 'id' | 'createdAt' | 'updatedAt'>>;

export interface TimelineSpanRepository extends ProjectScopedRepository<TimelineSpan, CreateTimelineSpanData> {
  addEvent(projectId: string, id: string, eventId: string): TimelineSpan | undefined;
  removeEvent(projectId: string, id: string, eventId: string): TimelineSpan | undefined;
}

export function createTimelineSpanRepository(_db: Database.Database, drizzleDb: DrizzleDB): TimelineSpanRepository {
  return {
    findById(projectId: string, id: string): TimelineSpan | undefined {
      const row = drizzleDb
        .select()
        .from(timelineSpans)
        .where(and(eq(timelineSpans.projectId, projectId), eq(timelineSpans.id, id)))
        .get();
      return row ? rowToTimelineSpan(row) : undefined;
    },

    findByProject(projectId: string): TimelineSpan[] {
      const rows = drizzleDb.select().from(timelineSpans).where(eq(timelineSpans.projectId, projectId)).all();
      return rows.map(rowToTimelineSpan);
    },

    create(projectId: string, data: CreateTimelineSpanData): TimelineSpan {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        projectId,
        name: data.name,
        description: data.description,
        startJson: JSON.stringify(data.start),
        endJson: data.end ? JSON.stringify(data.end) : null,
        eventsJson: JSON.stringify(data.events),
        createdAt: now,
        updatedAt: now,
      };

      drizzleDb.insert(timelineSpans).values(newRow).run();

      return {
        id,
        entityType: 'timeline-span',
        name: data.name,
        description: data.description,
        start: data.start,
        end: data.end,
        events: data.events,
        createdAt: now,
        updatedAt: now,
      };
    },

    update(projectId: string, id: string, data: UpdateTimelineSpanData): TimelineSpan | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updateData = {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        startJson: data.start ? JSON.stringify(data.start) : JSON.stringify(existing.start),
        endJson: data.end !== undefined ? (data.end ? JSON.stringify(data.end) : null) : (existing.end ? JSON.stringify(existing.end) : null),
        eventsJson: data.events ? JSON.stringify(data.events) : JSON.stringify(existing.events),
        updatedAt: now,
      };

      drizzleDb
        .update(timelineSpans)
        .set(updateData)
        .where(and(eq(timelineSpans.projectId, projectId), eq(timelineSpans.id, id)))
        .run();

      return this.findById(projectId, id);
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(timelineSpans)
        .where(and(eq(timelineSpans.projectId, projectId), eq(timelineSpans.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(timelineSpans).where(eq(timelineSpans.projectId, projectId)).run();
      return result.changes;
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
