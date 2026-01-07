/**
 * Tests for generation formatting utilities
 */

import { describe, expect, it } from 'vitest';
import type { Structure } from '@repo/serial-types';
import type { AssembledContext } from '@repo/framework-llm';

import {
  formatContext,
  formatStructure,
  formatContextForOutline,
  formatContextForBeats,
  formatContextForDraft,
  formatStructureForOutline,
  formatStructureForBeats,
  formatStructureForDraft,
  formatStructureForPipeline,
} from './formatting';

// Mock context helper
function createMockContext(overrides: Partial<AssembledContext> = {}): AssembledContext {
  return {
    bible: {
      characters: [],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
      timelineEvents: [],
    },
    recentContent: [],
    constraints: [],
    ...overrides,
  };
}

// Mock structure helper
function createMockStructure(overrides: Partial<Structure> = {}): Structure {
  return {
    id: 'struct-1',
    projectId: 'proj-1',
    type: 'chapter',
    title: 'Test Chapter',
    order: 0,
    beats: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('formatContext', () => {
  it('should format empty context', () => {
    const context = createMockContext();
    const result = formatContext(context);
    expect(result).toBe('');
  });

  it('should format characters', () => {
    const context = createMockContext({
      bible: {
        characters: [
          { name: 'Hero', role: 'protagonist', description: 'The main character' },
        ] as unknown as AssembledContext['bible']['characters'],
        locations: [],
        factions: [],
        worldRules: [],
        plotThreads: [],
        timelineEvents: [],
      },
    });
    const result = formatContext(context, { includeDescriptions: true });
    expect(result).toContain('### Characters');
    expect(result).toContain('**Hero**');
    expect(result).toContain('protagonist');
    expect(result).toContain('The main character');
  });

  it('should format characters without descriptions', () => {
    const context = createMockContext({
      bible: {
        characters: [
          { name: 'Hero', role: 'protagonist', description: 'The main character' },
        ] as unknown as AssembledContext['bible']['characters'],
        locations: [],
        factions: [],
        worldRules: [],
        plotThreads: [],
        timelineEvents: [],
      },
    });
    const result = formatContext(context, { includeDescriptions: false });
    expect(result).toContain('**Hero**');
    expect(result).toContain('protagonist');
    expect(result).not.toContain('The main character');
  });

  it('should highlight POV character', () => {
    const context = createMockContext({
      bible: {
        characters: [
          { name: 'Hero', role: 'protagonist', description: 'Main' },
          { name: 'Sidekick', role: 'supporting', description: 'Helper' },
        ] as unknown as AssembledContext['bible']['characters'],
        locations: [],
        factions: [],
        worldRules: [],
        plotThreads: [],
        timelineEvents: [],
      },
    });
    const result = formatContext(context, { povCharacter: 'Hero' });
    expect(result).toContain('**Hero (POV)**');
    expect(result).not.toContain('**Sidekick (POV)**');
  });

  it('should include location types when requested', () => {
    const context = createMockContext({
      bible: {
        characters: [],
        locations: [
          { name: 'Castle', type: 'building', description: 'A fortress' },
        ] as unknown as AssembledContext['bible']['locations'],
        factions: [],
        worldRules: [],
        plotThreads: [],
        timelineEvents: [],
      },
    });
    const result = formatContext(context, { includeLocationTypes: true });
    expect(result).toContain('**Castle** (building)');
  });

  it('should include plot threads when requested', () => {
    const context = createMockContext({
      bible: {
        characters: [],
        locations: [],
        factions: [],
        worldRules: [],
        plotThreads: [
          { name: 'Main Quest', type: 'main', status: 'active' },
        ] as unknown as AssembledContext['bible']['plotThreads'],
        timelineEvents: [],
      },
    });
    const result = formatContext(context, { includePlotThreads: true });
    expect(result).toContain('### Active Plot Threads');
    expect(result).toContain('**Main Quest**');
  });

  it('should include recent content', () => {
    const context = createMockContext({
      recentContent: [
        { title: 'Chapter 1', summary: 'Hero begins journey' },
      ],
    });
    const result = formatContext(context);
    expect(result).toContain('### Recent Events');
    expect(result).toContain('**Chapter 1**: Hero begins journey');
  });
});

describe('formatStructure', () => {
  it('should format basic structure', () => {
    const structure = createMockStructure();
    const result = formatStructure(structure);
    expect(result).toContain('**CHAPTER**: Test Chapter');
  });

  it('should include summary when present', () => {
    const structure = createMockStructure({ summary: 'The hero arrives' });
    const result = formatStructure(structure);
    expect(result).toContain('Summary: The hero arrives');
  });

  it('should include chapter type when present', () => {
    const structure = createMockStructure({ chapterType: 'action' });
    const result = formatStructure(structure);
    expect(result).toContain('Type: action');
  });

  it('should include tension target when present', () => {
    const structure = createMockStructure({ tensionTarget: 75 });
    const result = formatStructure(structure);
    expect(result).toContain('Tension Target: 75/100');
  });

  it('should include hook with custom label', () => {
    const structure = createMockStructure({
      hook: { type: 'cliffhanger', description: 'Hero falls' },
    });
    const result = formatStructure(structure, { hookLabel: 'Required Hook' });
    expect(result).toContain('Required Hook: cliffhanger - Hero falls');
  });

  it('should include notes when requested', () => {
    const structure = createMockStructure({ notes: 'Important scene' });
    const result = formatStructure(structure, { includeNotes: true });
    expect(result).toContain('Notes: Important scene');
  });

  it('should exclude notes when not requested', () => {
    const structure = createMockStructure({ notes: 'Important scene' });
    const result = formatStructure(structure, { includeNotes: false });
    expect(result).not.toContain('Notes:');
  });

  it('should include beats when requested', () => {
    const structure = createMockStructure({
      beats: [
        { id: 'b1', description: 'Opening', completed: true, order: 0 },
        { id: 'b2', description: 'Conflict', completed: false, order: 1 },
      ],
    });
    const result = formatStructure(structure, { includeBeats: true });
    expect(result).toContain('Beats:');
    expect(result).toContain('[x] Opening');
    expect(result).toContain('[ ] Conflict');
  });
});

describe('pre-configured formatters', () => {
  const context = createMockContext({
    bible: {
      characters: [
        { name: 'Hero', role: 'protagonist', description: 'Main' },
      ] as unknown as AssembledContext['bible']['characters'],
      locations: [
        { name: 'Castle', type: 'building', description: 'Fortress' },
      ] as unknown as AssembledContext['bible']['locations'],
      factions: [],
      worldRules: [],
      plotThreads: [
        { name: 'Quest', type: 'main', status: 'active' },
      ] as unknown as AssembledContext['bible']['plotThreads'],
      timelineEvents: [],
    },
  });

  const structure = createMockStructure({
    summary: 'Test',
    notes: 'Important',
    hook: { type: 'cliffhanger', description: 'Danger' },
    beats: [{ id: 'b1', description: 'Beat 1', completed: false, order: 0 }],
  });

  it('formatContextForOutline includes descriptions and plot threads', () => {
    const result = formatContextForOutline(context);
    expect(result).toContain('Main'); // description
    expect(result).toContain('building'); // location type
    expect(result).toContain('Active Plot Threads'); // plot threads
  });

  it('formatContextForBeats is minimal', () => {
    const result = formatContextForBeats(context);
    expect(result).toContain('**Hero**');
    expect(result).not.toContain('Main'); // no description
    expect(result).not.toContain('Active Plot Threads'); // no plot threads
  });

  it('formatContextForDraft highlights POV', () => {
    const result = formatContextForDraft(context, 'Hero');
    expect(result).toContain('**Hero (POV)**');
  });

  it('formatStructureForOutline includes notes', () => {
    const result = formatStructureForOutline(structure);
    expect(result).toContain('Notes: Important');
    expect(result).toContain('Hook:');
  });

  it('formatStructureForBeats is minimal', () => {
    const result = formatStructureForBeats(structure);
    expect(result).not.toContain('Notes:');
    expect(result).not.toContain('Beats:');
  });

  it('formatStructureForDraft uses Required Hook label', () => {
    const result = formatStructureForDraft(structure);
    expect(result).toContain('Required Hook:');
    expect(result).toContain('Notes: Important');
  });

  it('formatStructureForPipeline includes beats', () => {
    const result = formatStructureForPipeline(structure);
    expect(result).toContain('Beats:');
    expect(result).toContain('[ ] Beat 1');
  });
});
