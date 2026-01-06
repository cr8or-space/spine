/**
 * Tests for timeline service
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createProjectService } from '../storage/project-service';
import {
  createTimelineEventRepository,
  createTimelineSpanRepository,
  type CreateTimelineEventData,
  type CreateTimelineSpanData,
} from '../storage/repositories';
import { createTimelineService, type TimelineService } from './timeline-service';

describe('TimelineService', () => {
  let db: DatabaseConnection;
  let service: TimelineService;
  let projectId: string;

  beforeEach(() => {
    db = createTestDatabase();
    const projectService = createProjectService(db.db, db.drizzle);
    const project = projectService.createProject('Test Project', 'web-serial');
    projectId = project.id;

    const eventRepository = createTimelineEventRepository(db.db, db.drizzle);
    const spanRepository = createTimelineSpanRepository(db.db, db.drizzle);
    service = createTimelineService(projectId, eventRepository, spanRepository);
  });

  afterEach(() => {
    db.close();
  });

  const createTestEvent = (overrides: Partial<CreateTimelineEventData> = {}): CreateTimelineEventData => ({
    name: 'Test Event',
    description: 'A test timeline event.',
    position: { storyTime: 'Day 1' },
    type: 'current',
    significance: 'minor',
    involvedCharacters: [],
    locations: [],
    relatedThreads: [],
    causes: [],
    effects: [],
    revealed: true,
    contentRefs: [],
    ...overrides,
  });

  const createTestSpan = (overrides: Partial<CreateTimelineSpanData> = {}): CreateTimelineSpanData => ({
    name: 'Test Span',
    description: 'A test timeline span.',
    entityType: 'timeline-span',
    start: { storyTime: 'Day 1' },
    end: { storyTime: 'Day 10' },
    events: [],
    ...overrides,
  });

  describe('Event CRUD operations', () => {
    it('should create an event', () => {
      const event = service.createEvent(createTestEvent({
        name: 'The Discovery',
        type: 'current',
      }));

      expect(event.id).toBeDefined();
      expect(event.name).toBe('The Discovery');
      expect(event.type).toBe('current');
    });

    it('should retrieve an event by ID', () => {
      const created = service.createEvent(createTestEvent({ name: 'Battle' }));
      const retrieved = service.getEvent(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Battle');
    });

    it('should return undefined for non-existent event', () => {
      const result = service.getEvent('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should update an event', () => {
      const created = service.createEvent(createTestEvent({ name: 'Old Event' }));
      const updated = service.updateEvent(created.id, { name: 'New Event', significance: 'critical' });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('New Event');
      expect(updated?.significance).toBe('critical');
    });

    it('should delete an event', () => {
      const created = service.createEvent(createTestEvent({ name: 'ToDelete' }));
      const deleted = service.deleteEvent(created.id);

      expect(deleted).toBe(true);
      expect(service.getEvent(created.id)).toBeUndefined();
    });

    it('should get all events', () => {
      service.createEvent(createTestEvent({ name: 'Event1' }));
      service.createEvent(createTestEvent({ name: 'Event2' }));
      service.createEvent(createTestEvent({ name: 'Event3' }));

      const all = service.getAllEvents();
      expect(all.length).toBe(3);
    });
  });

  describe('Event filtering by type', () => {
    beforeEach(() => {
      service.createEvent(createTestEvent({ name: 'Past', type: 'backstory' }));
      service.createEvent(createTestEvent({ name: 'Current', type: 'current' }));
      service.createEvent(createTestEvent({ name: 'Future', type: 'flashforward' }));
    });

    it('should get backstory events', () => {
      const backstory = service.getEventsByType('backstory');
      expect(backstory.length).toBe(1);
      expect(backstory[0].name).toBe('Past');
    });

    it('should get current events', () => {
      const current = service.getEventsByType('current');
      expect(current.length).toBe(1);
      expect(current[0].name).toBe('Current');
    });

    it('should get future events', () => {
      const future = service.getEventsByType('flashforward');
      expect(future.length).toBe(1);
      expect(future[0].name).toBe('Future');
    });
  });

  describe('Event filtering by significance', () => {
    beforeEach(() => {
      service.createEvent(createTestEvent({ name: 'Minor', significance: 'minor' }));
      service.createEvent(createTestEvent({ name: 'Moderate', significance: 'moderate' }));
      service.createEvent(createTestEvent({ name: 'Major', significance: 'major' }));
      service.createEvent(createTestEvent({ name: 'Critical', significance: 'critical' }));
    });

    it('should get minor events', () => {
      const minor = service.getEventsBySignificance('minor');
      expect(minor.length).toBe(1);
      expect(minor[0].name).toBe('Minor');
    });

    it('should get major events', () => {
      const major = service.getEventsBySignificance('major');
      expect(major.length).toBe(1);
      expect(major[0].name).toBe('Major');
    });

    it('should get critical events', () => {
      const critical = service.getEventsBySignificance('critical');
      expect(critical.length).toBe(1);
      expect(critical[0].name).toBe('Critical');
    });
  });

  describe('Revealed and hidden events', () => {
    beforeEach(() => {
      service.createEvent(createTestEvent({ name: 'Revealed', revealed: true }));
      service.createEvent(createTestEvent({ name: 'Hidden', revealed: false }));
    });

    it('should get revealed events', () => {
      const revealed = service.getRevealedEvents();
      expect(revealed.length).toBe(1);
      expect(revealed[0].name).toBe('Revealed');
    });

    it('should get hidden events', () => {
      const hidden = service.getHiddenEvents();
      expect(hidden.length).toBe(1);
      expect(hidden[0].name).toBe('Hidden');
    });

    it('should mark event as revealed', () => {
      const event = service.createEvent(createTestEvent({ name: 'Secret', revealed: false }));
      const updated = service.markRevealed(event.id, 'chapter-5');

      expect(updated?.revealed).toBe(true);
    });
  });

  describe('Event filtering by associations', () => {
    beforeEach(() => {
      service.createEvent(createTestEvent({
        name: 'Event1',
        involvedCharacters: ['char-123'],
        locations: ['loc-123'],
        relatedThreads: ['thread-123'],
      }));
      service.createEvent(createTestEvent({
        name: 'Event2',
        involvedCharacters: ['char-123', 'char-456'],
        locations: ['loc-456'],
        relatedThreads: ['thread-456'],
      }));
      service.createEvent(createTestEvent({
        name: 'Event3',
        involvedCharacters: ['char-789'],
        locations: ['loc-123'],
        relatedThreads: ['thread-123'],
      }));
    });

    it('should get events by character', () => {
      const events = service.getEventsByCharacter('char-123');
      expect(events.length).toBe(2);
    });

    it('should get events by location', () => {
      const events = service.getEventsByLocation('loc-123');
      expect(events.length).toBe(2);
    });

    it('should get events by thread', () => {
      const events = service.getEventsByThread('thread-123');
      expect(events.length).toBe(2);
    });
  });

  describe('Event search', () => {
    beforeEach(() => {
      service.createEvent(createTestEvent({
        name: 'The Great Battle',
        description: 'An epic confrontation.',
      }));
      service.createEvent(createTestEvent({
        name: 'Discovery',
        description: 'Finding the ancient artifact.',
      }));
    });

    it('should search by name', () => {
      const results = service.searchEvents('Battle');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('The Great Battle');
    });

    it('should search by description', () => {
      const results = service.searchEvents('artifact');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Discovery');
    });
  });

  describe('Event position management', () => {
    it('should set event position', () => {
      const event = service.createEvent(createTestEvent({ name: 'Event' }));
      const updated = service.setEventPosition(event.id, {
        storyTime: 'Year 100, Day 5',
        chapterNumber: 10,
      });

      expect(updated?.position.storyTime).toBe('Year 100, Day 5');
      expect(updated?.position.chapterNumber).toBe(10);
    });
  });

  describe('Character and location management on events', () => {
    it('should add character to event', () => {
      const event = service.createEvent(createTestEvent({ name: 'Event' }));
      const updated = service.addCharacterToEvent(event.id, 'char-123');

      expect(updated?.involvedCharacters).toContain('char-123');
    });

    it('should not duplicate character', () => {
      const event = service.createEvent(createTestEvent({ name: 'Event' }));
      service.addCharacterToEvent(event.id, 'char-123');
      const updated = service.addCharacterToEvent(event.id, 'char-123');

      expect(updated?.involvedCharacters.filter(c => c === 'char-123').length).toBe(1);
    });

    it('should remove character from event', () => {
      const event = service.createEvent(createTestEvent({
        name: 'Event',
        involvedCharacters: ['char-123', 'char-456'],
      }));
      const updated = service.removeCharacterFromEvent(event.id, 'char-123');

      expect(updated?.involvedCharacters).not.toContain('char-123');
      expect(updated?.involvedCharacters).toContain('char-456');
    });

    it('should add location to event', () => {
      const event = service.createEvent(createTestEvent({ name: 'Event' }));
      const updated = service.addLocationToEvent(event.id, 'loc-123');

      expect(updated?.locations).toContain('loc-123');
    });

    it('should remove location from event', () => {
      const event = service.createEvent(createTestEvent({
        name: 'Event',
        locations: ['loc-123', 'loc-456'],
      }));
      const updated = service.removeLocationFromEvent(event.id, 'loc-123');

      expect(updated?.locations).not.toContain('loc-123');
      expect(updated?.locations).toContain('loc-456');
    });

    it('should add thread to event', () => {
      const event = service.createEvent(createTestEvent({ name: 'Event' }));
      const updated = service.addThreadToEvent(event.id, 'thread-123');

      expect(updated?.relatedThreads).toContain('thread-123');
    });

    it('should remove thread from event', () => {
      const event = service.createEvent(createTestEvent({
        name: 'Event',
        relatedThreads: ['thread-123', 'thread-456'],
      }));
      const updated = service.removeThreadFromEvent(event.id, 'thread-123');

      expect(updated?.relatedThreads).not.toContain('thread-123');
      expect(updated?.relatedThreads).toContain('thread-456');
    });
  });

  describe('Causal relationship management', () => {
    it('should add a cause', () => {
      const cause = service.createEvent(createTestEvent({ name: 'Cause' }));
      const effect = service.createEvent(createTestEvent({ name: 'Effect' }));

      const updated = service.addCause(effect.id, {
        causeEventId: cause.id,
        type: 'triggers',
      });

      expect(updated?.causes.length).toBe(1);
      expect(updated?.causes[0].causeEventId).toBe(cause.id);
    });

    it('should remove a cause', () => {
      const cause = service.createEvent(createTestEvent({ name: 'Cause' }));
      const effect = service.createEvent(createTestEvent({ name: 'Effect' }));

      service.addCause(effect.id, { causeEventId: cause.id, type: 'triggers' });
      const updated = service.removeCause(effect.id, cause.id);

      expect(updated?.causes.length).toBe(0);
    });

    it('should add an effect', () => {
      const cause = service.createEvent(createTestEvent({ name: 'Cause' }));
      const effect = service.createEvent(createTestEvent({ name: 'Effect' }));

      const updated = service.addEffect(cause.id, effect.id);

      expect(updated?.effects).toContain(effect.id);
    });

    it('should remove an effect', () => {
      const cause = service.createEvent(createTestEvent({ name: 'Cause' }));
      const effect1 = service.createEvent(createTestEvent({ name: 'Effect1' }));
      const effect2 = service.createEvent(createTestEvent({ name: 'Effect2' }));

      service.addEffect(cause.id, effect1.id);
      service.addEffect(cause.id, effect2.id);
      const updated = service.removeEffect(cause.id, effect1.id);

      expect(updated?.effects).not.toContain(effect1.id);
      expect(updated?.effects).toContain(effect2.id);
    });

    it('should get causes', () => {
      const cause1 = service.createEvent(createTestEvent({ name: 'Cause1' }));
      const cause2 = service.createEvent(createTestEvent({ name: 'Cause2' }));
      const effect = service.createEvent(createTestEvent({ name: 'Effect' }));

      service.addCause(effect.id, { causeEventId: cause1.id, type: 'triggers' });
      service.addCause(effect.id, { causeEventId: cause2.id, type: 'enables' });

      const causes = service.getCauses(effect.id);
      expect(causes.length).toBe(2);
    });

    it('should get effects', () => {
      const cause = service.createEvent(createTestEvent({ name: 'Cause' }));
      const effect1 = service.createEvent(createTestEvent({ name: 'Effect1' }));
      const effect2 = service.createEvent(createTestEvent({ name: 'Effect2' }));

      service.addEffect(cause.id, effect1.id);
      service.addEffect(cause.id, effect2.id);

      const effects = service.getEffects(cause.id);
      expect(effects.length).toBe(2);
    });

    it('should clean up causal references when deleting event', () => {
      const cause = service.createEvent(createTestEvent({ name: 'Cause' }));
      const effect = service.createEvent(createTestEvent({ name: 'Effect' }));

      service.addCause(effect.id, { causeEventId: cause.id, type: 'triggers' });
      service.addEffect(cause.id, effect.id);

      service.deleteEvent(cause.id);

      const effectUpdated = service.getEvent(effect.id);
      expect(effectUpdated?.causes.length).toBe(0);
    });
  });

  describe('Event summaries', () => {
    it('should get an event summary', () => {
      const event = service.createEvent(createTestEvent({
        name: 'The Discovery',
        position: { storyTime: 'Day 5', chapterNumber: 10 },
        type: 'current',
        significance: 'major',
        revealed: true,
      }));

      const summary = service.getEventSummary(event.id);

      expect(summary).toBeDefined();
      expect(summary?.id).toBe(event.id);
      expect(summary?.name).toBe('The Discovery');
      expect(summary?.type).toBe('current');
      expect(summary?.significance).toBe('major');
      expect(summary?.revealed).toBe(true);
    });

    it('should return undefined for non-existent event summary', () => {
      const summary = service.getEventSummary('non-existent');
      expect(summary).toBeUndefined();
    });

    it('should get all event summaries', () => {
      service.createEvent(createTestEvent({ name: 'Event1' }));
      service.createEvent(createTestEvent({ name: 'Event2' }));
      service.createEvent(createTestEvent({ name: 'Event3' }));

      const summaries = service.getAllEventSummaries();
      expect(summaries.length).toBe(3);
    });
  });

  describe('Span CRUD operations', () => {
    it('should create a span', () => {
      const span = service.createSpan(createTestSpan({
        name: 'The Dark Age',
      }));

      expect(span.id).toBeDefined();
      expect(span.name).toBe('The Dark Age');
    });

    it('should retrieve a span by ID', () => {
      const created = service.createSpan(createTestSpan({ name: 'Era' }));
      const retrieved = service.getSpan(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Era');
    });

    it('should update a span', () => {
      const created = service.createSpan(createTestSpan({ name: 'Old Span' }));
      const updated = service.updateSpan(created.id, { name: 'New Span' });

      expect(updated?.name).toBe('New Span');
    });

    it('should delete a span', () => {
      const created = service.createSpan(createTestSpan({ name: 'ToDelete' }));
      const deleted = service.deleteSpan(created.id);

      expect(deleted).toBe(true);
      expect(service.getSpan(created.id)).toBeUndefined();
    });

    it('should get all spans', () => {
      service.createSpan(createTestSpan({ name: 'Span1' }));
      service.createSpan(createTestSpan({ name: 'Span2' }));
      service.createSpan(createTestSpan({ name: 'Span3' }));

      const all = service.getAllSpans();
      expect(all.length).toBe(3);
    });
  });

  describe('Span search', () => {
    beforeEach(() => {
      service.createSpan(createTestSpan({
        name: 'The Great War',
        description: 'A period of conflict.',
      }));
      service.createSpan(createTestSpan({
        name: 'Golden Era',
        description: 'A time of peace.',
      }));
    });

    it('should search by name', () => {
      const results = service.searchSpans('War');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('The Great War');
    });

    it('should search by description', () => {
      const results = service.searchSpans('peace');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Golden Era');
    });
  });

  describe('Span-Event associations', () => {
    it('should add event to span', () => {
      const span = service.createSpan(createTestSpan({ name: 'Era' }));
      const event = service.createEvent(createTestEvent({ name: 'Event' }));

      const updated = service.addEventToSpan(span.id, event.id);

      expect(updated?.events).toContain(event.id);
    });

    it('should remove event from span', () => {
      const span = service.createSpan(createTestSpan({ name: 'Era' }));
      const event1 = service.createEvent(createTestEvent({ name: 'Event1' }));
      const event2 = service.createEvent(createTestEvent({ name: 'Event2' }));

      service.addEventToSpan(span.id, event1.id);
      service.addEventToSpan(span.id, event2.id);
      const updated = service.removeEventFromSpan(span.id, event1.id);

      expect(updated?.events).not.toContain(event1.id);
      expect(updated?.events).toContain(event2.id);
    });

    it('should get events in span', () => {
      const span = service.createSpan(createTestSpan({ name: 'Era' }));
      const event1 = service.createEvent(createTestEvent({ name: 'Event1' }));
      const event2 = service.createEvent(createTestEvent({ name: 'Event2' }));

      service.addEventToSpan(span.id, event1.id);
      service.addEventToSpan(span.id, event2.id);

      const events = service.getEventsInSpan(span.id);
      expect(events.length).toBe(2);
    });

    it('should get spans for event', () => {
      const span1 = service.createSpan(createTestSpan({ name: 'Era1' }));
      const span2 = service.createSpan(createTestSpan({ name: 'Era2' }));
      const event = service.createEvent(createTestEvent({ name: 'Event' }));

      service.addEventToSpan(span1.id, event.id);
      service.addEventToSpan(span2.id, event.id);

      const spans = service.getSpansForEvent(event.id);
      expect(spans.length).toBe(2);
    });

    it('should clean up span references when deleting event', () => {
      const span = service.createSpan(createTestSpan({ name: 'Era' }));
      const event = service.createEvent(createTestEvent({ name: 'Event' }));

      service.addEventToSpan(span.id, event.id);
      service.deleteEvent(event.id);

      const spanUpdated = service.getSpan(span.id);
      expect(spanUpdated?.events).not.toContain(event.id);
    });
  });

  describe('Analysis operations', () => {
    it('should get chronologically sorted events', () => {
      service.createEvent(createTestEvent({
        name: 'Later',
        position: { chapterNumber: 10, storyTime: 'Day 10' },
      }));
      service.createEvent(createTestEvent({
        name: 'Earlier',
        position: { chapterNumber: 1, storyTime: 'Day 1' },
      }));
      service.createEvent(createTestEvent({
        name: 'Middle',
        position: { chapterNumber: 5, storyTime: 'Day 5' },
      }));

      const sorted = service.getChronologicalEvents();
      expect(sorted[0].name).toBe('Earlier');
      expect(sorted[1].name).toBe('Middle');
      expect(sorted[2].name).toBe('Later');
    });

    it('should find conflicts when character appears in multiple locations at same time', () => {
      service.createEvent(createTestEvent({
        name: 'Event1',
        position: { chapterNumber: 5 },
        involvedCharacters: ['char-123'],
        locations: ['loc-1'],
      }));
      service.createEvent(createTestEvent({
        name: 'Event2',
        position: { chapterNumber: 5 },
        involvedCharacters: ['char-123'],
        locations: ['loc-2'],
      }));

      const conflicts = service.findConflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].character).toBe('char-123');
    });

    it('should not report conflict when events are at different times', () => {
      service.createEvent(createTestEvent({
        name: 'Event1',
        position: { chapterNumber: 5 },
        involvedCharacters: ['char-123'],
        locations: ['loc-1'],
      }));
      service.createEvent(createTestEvent({
        name: 'Event2',
        position: { chapterNumber: 10 },
        involvedCharacters: ['char-123'],
        locations: ['loc-2'],
      }));

      const conflicts = service.findConflicts();
      expect(conflicts.length).toBe(0);
    });

    it('should get causal chain', () => {
      const event1 = service.createEvent(createTestEvent({ name: 'Event1' }));
      const event2 = service.createEvent(createTestEvent({ name: 'Event2' }));
      const event3 = service.createEvent(createTestEvent({ name: 'Event3' }));

      service.addEffect(event1.id, event2.id);
      service.addEffect(event2.id, event3.id);

      const chain = service.getCausalChain(event1.id);
      expect(chain.length).toBe(3);
      expect(chain[0].name).toBe('Event1');
      expect(chain[1].name).toBe('Event2');
      expect(chain[2].name).toBe('Event3');
    });

    it('should handle cycles in causal chain', () => {
      const event1 = service.createEvent(createTestEvent({ name: 'Event1' }));
      const event2 = service.createEvent(createTestEvent({ name: 'Event2' }));

      service.addEffect(event1.id, event2.id);
      service.addEffect(event2.id, event1.id); // Create a cycle

      const chain = service.getCausalChain(event1.id);
      // Should not infinite loop, should visit each once
      expect(chain.length).toBe(2);
    });
  });
});
