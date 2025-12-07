/**
 * Timeline service for bible management
 *
 * Provides high-level CRUD operations for timeline events and spans
 * with causal relationship tracking and chronological ordering.
 */

import type {
  CausalLink,
  TimelineEvent,
  TimelineEventSummary,
  TimelinePosition,
  TimelineSpan,
} from '@repo/types';

import type {
  CreateTimelineEventData,
  CreateTimelineSpanData,
  TimelineEventRepository,
  TimelineSpanRepository,
  UpdateTimelineEventData,
  UpdateTimelineSpanData,
} from '../storage/repositories';

/**
 * Timeline service interface
 */
export interface TimelineService {
  // ==================== Events ====================

  /** Get an event by ID */
  getEvent(id: string): TimelineEvent | undefined;

  /** Get all events */
  getAllEvents(): TimelineEvent[];

  /** Get events by type */
  getEventsByType(type: TimelineEvent['type']): TimelineEvent[];

  /** Get events by significance */
  getEventsBySignificance(significance: TimelineEvent['significance']): TimelineEvent[];

  /** Get revealed events only */
  getRevealedEvents(): TimelineEvent[];

  /** Get hidden/unrevealed events */
  getHiddenEvents(): TimelineEvent[];

  /** Get events involving a character */
  getEventsByCharacter(characterId: string): TimelineEvent[];

  /** Get events at a location */
  getEventsByLocation(locationId: string): TimelineEvent[];

  /** Get events related to a plot thread */
  getEventsByThread(threadId: string): TimelineEvent[];

  /** Search events by name or description */
  searchEvents(query: string): TimelineEvent[];

  /** Create a new event */
  createEvent(data: CreateTimelineEventData): TimelineEvent;

  /** Update an event */
  updateEvent(id: string, data: UpdateTimelineEventData): TimelineEvent | undefined;

  /** Delete an event */
  deleteEvent(id: string): boolean;

  /** Update event position */
  setEventPosition(id: string, position: TimelinePosition): TimelineEvent | undefined;

  /** Add a causal link */
  addCause(id: string, cause: CausalLink): TimelineEvent | undefined;

  /** Remove a causal link */
  removeCause(id: string, causeEventId: string): TimelineEvent | undefined;

  /** Add an effect (event caused by this one) */
  addEffect(id: string, effectId: string): TimelineEvent | undefined;

  /** Remove an effect */
  removeEffect(id: string, effectId: string): TimelineEvent | undefined;

  /** Get events that cause this event */
  getCauses(id: string): TimelineEvent[];

  /** Get events caused by this event */
  getEffects(id: string): TimelineEvent[];

  /** Mark event as revealed in content */
  markRevealed(id: string, contentId: string): TimelineEvent | undefined;

  /** Add character to event */
  addCharacterToEvent(id: string, characterId: string): TimelineEvent | undefined;

  /** Remove character from event */
  removeCharacterFromEvent(id: string, characterId: string): TimelineEvent | undefined;

  /** Add location to event */
  addLocationToEvent(id: string, locationId: string): TimelineEvent | undefined;

  /** Remove location from event */
  removeLocationFromEvent(id: string, locationId: string): TimelineEvent | undefined;

  /** Add related thread */
  addThreadToEvent(id: string, threadId: string): TimelineEvent | undefined;

  /** Remove related thread */
  removeThreadFromEvent(id: string, threadId: string): TimelineEvent | undefined;

  /** Get event summary for context assembly */
  getEventSummary(id: string): TimelineEventSummary | undefined;

  /** Get all event summaries */
  getAllEventSummaries(): TimelineEventSummary[];

  // ==================== Spans ====================

  /** Get a span by ID */
  getSpan(id: string): TimelineSpan | undefined;

  /** Get all spans */
  getAllSpans(): TimelineSpan[];

  /** Search spans by name or description */
  searchSpans(query: string): TimelineSpan[];

  /** Create a new span */
  createSpan(data: CreateTimelineSpanData): TimelineSpan;

  /** Update a span */
  updateSpan(id: string, data: UpdateTimelineSpanData): TimelineSpan | undefined;

  /** Delete a span */
  deleteSpan(id: string): boolean;

  /** Add event to span */
  addEventToSpan(spanId: string, eventId: string): TimelineSpan | undefined;

  /** Remove event from span */
  removeEventFromSpan(spanId: string, eventId: string): TimelineSpan | undefined;

  /** Get events in a span */
  getEventsInSpan(spanId: string): TimelineEvent[];

  /** Get spans containing an event */
  getSpansForEvent(eventId: string): TimelineSpan[];

  // ==================== Analysis ====================

  /** Get chronologically sorted events (by chapter number if available) */
  getChronologicalEvents(): TimelineEvent[];

  /** Find potential timeline conflicts (same character in multiple locations at same time) */
  findConflicts(): Array<{
    event1: TimelineEvent;
    event2: TimelineEvent;
    character: string;
    reason: string;
  }>;

  /** Get causal chain starting from an event */
  getCausalChain(eventId: string): TimelineEvent[];
}

/**
 * Create timeline service
 */
export function createTimelineService(
  projectId: string,
  eventRepository: TimelineEventRepository,
  spanRepository: TimelineSpanRepository
): TimelineService {
  function toEventSummary(event: TimelineEvent): TimelineEventSummary {
    return {
      id: event.id,
      name: event.name,
      position: event.position,
      type: event.type,
      significance: event.significance,
      revealed: event.revealed,
    };
  }

  return {
    // ==================== Events ====================

    getEvent(id: string): TimelineEvent | undefined {
      return eventRepository.findById(projectId, id);
    },

    getAllEvents(): TimelineEvent[] {
      return eventRepository.findByProject(projectId);
    },

    getEventsByType(type: TimelineEvent['type']): TimelineEvent[] {
      return eventRepository.findByType(projectId, type);
    },

    getEventsBySignificance(significance: TimelineEvent['significance']): TimelineEvent[] {
      return eventRepository.findBySignificance(projectId, significance);
    },

    getRevealedEvents(): TimelineEvent[] {
      return eventRepository.findRevealed(projectId);
    },

    getHiddenEvents(): TimelineEvent[] {
      return this.getAllEvents().filter((e) => !e.revealed);
    },

    getEventsByCharacter(characterId: string): TimelineEvent[] {
      return eventRepository.findByCharacter(projectId, characterId);
    },

    getEventsByLocation(locationId: string): TimelineEvent[] {
      return eventRepository.findByLocation(projectId, locationId);
    },

    getEventsByThread(threadId: string): TimelineEvent[] {
      return this.getAllEvents().filter((e) => e.relatedThreads.includes(threadId));
    },

    searchEvents(query: string): TimelineEvent[] {
      const lowerQuery = query.toLowerCase();
      return this.getAllEvents().filter(
        (e) =>
          e.name.toLowerCase().includes(lowerQuery) ||
          e.description.toLowerCase().includes(lowerQuery)
      );
    },

    createEvent(data: CreateTimelineEventData): TimelineEvent {
      return eventRepository.create(projectId, data);
    },

    updateEvent(id: string, data: UpdateTimelineEventData): TimelineEvent | undefined {
      return eventRepository.update(projectId, id, data);
    },

    deleteEvent(id: string): boolean {
      // Also remove from spans
      const spans = this.getSpansForEvent(id);
      for (const span of spans) {
        this.removeEventFromSpan(span.id, id);
      }

      // Remove as cause/effect from other events
      const allEvents = this.getAllEvents();
      for (const event of allEvents) {
        if (event.causes.some((c) => c.causeEventId === id)) {
          this.removeCause(event.id, id);
        }
        if (event.effects.includes(id)) {
          this.removeEffect(event.id, id);
        }
      }

      return eventRepository.delete(projectId, id);
    },

    setEventPosition(id: string, position: TimelinePosition): TimelineEvent | undefined {
      return this.updateEvent(id, { position });
    },

    addCause(id: string, cause: CausalLink): TimelineEvent | undefined {
      return eventRepository.addCause(projectId, id, cause);
    },

    removeCause(id: string, causeEventId: string): TimelineEvent | undefined {
      const event = this.getEvent(id);
      if (!event) return undefined;

      const causes = event.causes.filter((c) => c.causeEventId !== causeEventId);
      return this.updateEvent(id, { causes });
    },

    addEffect(id: string, effectId: string): TimelineEvent | undefined {
      return eventRepository.addEffect(projectId, id, effectId);
    },

    removeEffect(id: string, effectId: string): TimelineEvent | undefined {
      const event = this.getEvent(id);
      if (!event) return undefined;

      const effects = event.effects.filter((e) => e !== effectId);
      return this.updateEvent(id, { effects });
    },

    getCauses(id: string): TimelineEvent[] {
      const event = this.getEvent(id);
      if (!event) return [];

      return event.causes
        .map((c) => this.getEvent(c.causeEventId))
        .filter((e): e is TimelineEvent => e !== undefined);
    },

    getEffects(id: string): TimelineEvent[] {
      const event = this.getEvent(id);
      if (!event) return [];

      return event.effects
        .map((effectId) => this.getEvent(effectId))
        .filter((e): e is TimelineEvent => e !== undefined);
    },

    markRevealed(id: string, contentId: string): TimelineEvent | undefined {
      return eventRepository.markRevealed(projectId, id, contentId);
    },

    addCharacterToEvent(id: string, characterId: string): TimelineEvent | undefined {
      const event = this.getEvent(id);
      if (!event) return undefined;

      if (event.involvedCharacters.includes(characterId)) {
        return event;
      }

      const involvedCharacters = [...event.involvedCharacters, characterId];
      return this.updateEvent(id, { involvedCharacters });
    },

    removeCharacterFromEvent(id: string, characterId: string): TimelineEvent | undefined {
      const event = this.getEvent(id);
      if (!event) return undefined;

      const involvedCharacters = event.involvedCharacters.filter((c) => c !== characterId);
      return this.updateEvent(id, { involvedCharacters });
    },

    addLocationToEvent(id: string, locationId: string): TimelineEvent | undefined {
      const event = this.getEvent(id);
      if (!event) return undefined;

      if (event.locations.includes(locationId)) {
        return event;
      }

      const locations = [...event.locations, locationId];
      return this.updateEvent(id, { locations });
    },

    removeLocationFromEvent(id: string, locationId: string): TimelineEvent | undefined {
      const event = this.getEvent(id);
      if (!event) return undefined;

      const locations = event.locations.filter((l) => l !== locationId);
      return this.updateEvent(id, { locations });
    },

    addThreadToEvent(id: string, threadId: string): TimelineEvent | undefined {
      const event = this.getEvent(id);
      if (!event) return undefined;

      if (event.relatedThreads.includes(threadId)) {
        return event;
      }

      const relatedThreads = [...event.relatedThreads, threadId];
      return this.updateEvent(id, { relatedThreads });
    },

    removeThreadFromEvent(id: string, threadId: string): TimelineEvent | undefined {
      const event = this.getEvent(id);
      if (!event) return undefined;

      const relatedThreads = event.relatedThreads.filter((t) => t !== threadId);
      return this.updateEvent(id, { relatedThreads });
    },

    getEventSummary(id: string): TimelineEventSummary | undefined {
      const event = this.getEvent(id);
      return event ? toEventSummary(event) : undefined;
    },

    getAllEventSummaries(): TimelineEventSummary[] {
      return this.getAllEvents().map(toEventSummary);
    },

    // ==================== Spans ====================

    getSpan(id: string): TimelineSpan | undefined {
      return spanRepository.findById(projectId, id);
    },

    getAllSpans(): TimelineSpan[] {
      return spanRepository.findByProject(projectId);
    },

    searchSpans(query: string): TimelineSpan[] {
      const lowerQuery = query.toLowerCase();
      return this.getAllSpans().filter(
        (s) =>
          s.name.toLowerCase().includes(lowerQuery) ||
          s.description.toLowerCase().includes(lowerQuery)
      );
    },

    createSpan(data: CreateTimelineSpanData): TimelineSpan {
      return spanRepository.create(projectId, data);
    },

    updateSpan(id: string, data: UpdateTimelineSpanData): TimelineSpan | undefined {
      return spanRepository.update(projectId, id, data);
    },

    deleteSpan(id: string): boolean {
      return spanRepository.delete(projectId, id);
    },

    addEventToSpan(spanId: string, eventId: string): TimelineSpan | undefined {
      return spanRepository.addEvent(projectId, spanId, eventId);
    },

    removeEventFromSpan(spanId: string, eventId: string): TimelineSpan | undefined {
      return spanRepository.removeEvent(projectId, spanId, eventId);
    },

    getEventsInSpan(spanId: string): TimelineEvent[] {
      const span = this.getSpan(spanId);
      if (!span) return [];

      return span.events
        .map((eventId) => this.getEvent(eventId))
        .filter((e): e is TimelineEvent => e !== undefined);
    },

    getSpansForEvent(eventId: string): TimelineSpan[] {
      return this.getAllSpans().filter((s) => s.events.includes(eventId));
    },

    // ==================== Analysis ====================

    getChronologicalEvents(): TimelineEvent[] {
      return [...this.getAllEvents()].sort((a, b) => {
        // Sort by chapter number if available
        const aChapter = a.position.chapterNumber ?? Infinity;
        const bChapter = b.position.chapterNumber ?? Infinity;

        if (aChapter !== bChapter) {
          return aChapter - bChapter;
        }

        // Fall back to story time string comparison
        const aTime = a.position.storyTime ?? '';
        const bTime = b.position.storyTime ?? '';
        return aTime.localeCompare(bTime);
      });
    },

    findConflicts(): Array<{
      event1: TimelineEvent;
      event2: TimelineEvent;
      character: string;
      reason: string;
    }> {
      const conflicts: Array<{
        event1: TimelineEvent;
        event2: TimelineEvent;
        character: string;
        reason: string;
      }> = [];

      const events = this.getAllEvents();

      // Check for characters being in multiple locations at the same time
      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const e1 = events[i];
          const e2 = events[j];

          // Check if events are at the same time
          const sameTime =
            (e1.position.chapterNumber !== undefined &&
              e1.position.chapterNumber === e2.position.chapterNumber) ||
            (e1.position.storyTime && e1.position.storyTime === e2.position.storyTime) ||
            (e1.position.date && e1.position.date === e2.position.date);

          if (!sameTime) continue;

          // Check for shared characters in different locations
          const sharedCharacters = e1.involvedCharacters.filter((c) =>
            e2.involvedCharacters.includes(c)
          );

          if (sharedCharacters.length === 0) continue;

          // Check if locations are different
          const locationsDiffer =
            e1.locations.length > 0 &&
            e2.locations.length > 0 &&
            !e1.locations.some((l) => e2.locations.includes(l));

          if (locationsDiffer) {
            for (const char of sharedCharacters) {
              conflicts.push({
                event1: e1,
                event2: e2,
                character: char,
                reason: `Character appears in two different locations at the same time`,
              });
            }
          }
        }
      }

      return conflicts;
    },

    getCausalChain(eventId: string): TimelineEvent[] {
      const visited = new Set<string>();
      const chain: TimelineEvent[] = [];

      const traverse = (id: string) => {
        if (visited.has(id)) return;
        visited.add(id);

        const event = this.getEvent(id);
        if (!event) return;

        chain.push(event);

        for (const effectId of event.effects) {
          traverse(effectId);
        }
      };

      traverse(eventId);
      return chain;
    },
  };
}
