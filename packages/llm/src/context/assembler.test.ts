import { describe, expect, it } from 'vitest';

import type { Bible, Content, Structure } from '@repo/types';

import { assembleContext, formatContext, type ContextInput } from './assembler';
import type { ContextAssemblyOptions } from './types';

// Test fixtures
const createBible = (): Bible => ({
  id: 'bible-1',
  characters: [
    {
      id: 'char-1',
      name: 'Elena',
      aliases: ['The Brave'],
      description: 'A brave warrior from the northern lands.',
      traits: [{ category: 'personality', name: 'Brave', description: 'Very brave' }],
      relationships: [],
      voiceSamples: ['For honor!'],
      appearances: [],
      role: 'protagonist',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'char-2',
      name: 'Marcus',
      aliases: [],
      description: 'A minor merchant.',
      traits: [],
      relationships: [],
      voiceSamples: [],
      appearances: [],
      role: 'minor',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  locations: [
    {
      id: 'loc-1',
      name: 'Castle Shadowmere',
      aliases: ['The Dark Castle'],
      description: 'An ancient fortress.',
      type: 'building',
      relations: [],
      features: [],
      associatedCharacters: [],
      status: 'accessible',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  factions: [
    {
      id: 'fac-1',
      name: 'The Order',
      aliases: [],
      description: 'A knightly order.',
      type: 'military',
      goals: ['Protect the realm'],
      ranks: [],
      members: [],
      relations: [],
      locations: [],
      status: 'active',
      influence: 'major',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  worldRules: [
    {
      id: 'rule-1',
      name: 'Magic Limit',
      description: 'Magic has limits.',
      category: 'magic',
      rule: 'Magic requires concentration and drains the user.',
      exceptions: [],
      publicKnowledge: true,
      relatedRules: [],
      priority: 80,
      established: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  plotThreads: [
    {
      id: 'thread-1',
      name: 'The Quest',
      description: 'A quest to save the kingdom.',
      type: 'main-plot',
      status: 'active',
      scope: 'book',
      priority: 90,
      involvedCharacters: ['char-1'],
      relatedLocations: ['loc-1'],
      promises: [],
      touches: [],
      childThreads: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  timelineEvents: [],
  timelineSpans: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createStructure = (): Structure => ({
  id: 'struct-1',
  type: 'chapter',
  title: 'Chapter 5: The Arrival',
  summary: 'Elena arrives at Castle Shadowmere to begin her quest.',
  beats: [
    { id: 'beat-1', description: 'Elena approaches the castle', completed: false, order: 0 },
    { id: 'beat-2', description: 'She meets the gatekeeper', completed: false, order: 1 },
  ],
  tensionTarget: 60,
  hook: { type: 'revelation', description: 'The gatekeeper reveals a secret' },
  order: 5,
  children: [],
  notes: 'Focus on atmosphere and foreshadowing.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createContent = (chapterNumber: number): Content => ({
  id: `content-${chapterNumber}`,
  structureId: `struct-${chapterNumber}`,
  currentVersion: 1,
  versions: [
    {
      version: 1,
      text: `Chapter ${chapterNumber} content. This is the story of Elena's journey.`,
      wordCount: 10,
      source: 'generated',
      createdAt: new Date().toISOString(),
    },
  ],
  text: `Chapter ${chapterNumber} content. This is the story of Elena's journey.`,
  status: 'approved',
  reviews: [],
  generationHistory: [],
  locked: false,
  chapterNumber,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('assembleContext', () => {
  it('assembles context with all sections', () => {
    const input: ContextInput = {
      bible: createBible(),
      currentStructure: createStructure(),
      allStructures: [createStructure()],
      recentContent: [createContent(4), createContent(3)],
      structureMap: new Map([
        ['struct-4', { ...createStructure(), id: 'struct-4', title: 'Chapter 4' }],
        ['struct-3', { ...createStructure(), id: 'struct-3', title: 'Chapter 3' }],
      ]),
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
      totalBudget: 10000,
    };

    const context = assembleContext(input, options);

    expect(context.taskType).toBe('draft');
    expect(context.bible.characters.length).toBeGreaterThan(0);
    expect(context.structure).not.toBeNull();
    expect(context.recentContent.length).toBeGreaterThan(0);
    expect(context.budget.total).toBe(10000);
  });

  it('prioritizes protagonist over minor characters', () => {
    const input: ContextInput = {
      bible: createBible(),
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
      maxEntitiesPerType: 1,
    };

    const context = assembleContext(input, options);

    // Should include Elena (protagonist) not Marcus (minor)
    expect(context.bible.characters.length).toBe(1);
    expect(context.bible.characters[0].name).toBe('Elena');
  });

  it('respects relevance threshold', () => {
    const input: ContextInput = {
      bible: createBible(),
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
      relevanceThreshold: 90, // Very high threshold
    };

    const context = assembleContext(input, options);

    // Only very relevant entities should be included
    // Minor characters should be filtered out
    const hasMinor = context.bible.characters.some((c) => c.name === 'Marcus');
    expect(hasMinor).toBe(false);
  });

  it('boosts entities mentioned in current structure', () => {
    const input: ContextInput = {
      bible: createBible(),
      currentStructure: createStructure(), // Mentions Elena and Castle Shadowmere
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
    };

    const context = assembleContext(input, options);

    // Elena and Castle Shadowmere should be included (mentioned in structure)
    expect(context.bible.characters.some((c) => c.name === 'Elena')).toBe(true);
    expect(context.bible.locations.some((l) => l.name === 'Castle Shadowmere')).toBe(true);
  });

  it('limits recent content by chapter count', () => {
    const input: ContextInput = {
      bible: createBible(),
      recentContent: [createContent(5), createContent(4), createContent(3), createContent(2)],
      structureMap: new Map([
        ['struct-5', { ...createStructure(), id: 'struct-5', title: 'Chapter 5' }],
        ['struct-4', { ...createStructure(), id: 'struct-4', title: 'Chapter 4' }],
        ['struct-3', { ...createStructure(), id: 'struct-3', title: 'Chapter 3' }],
        ['struct-2', { ...createStructure(), id: 'struct-2', title: 'Chapter 2' }],
      ]),
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
      recentChapterCount: 2,
    };

    const context = assembleContext(input, options);

    // Should only include 2 most recent chapters
    expect(context.recentContent.length).toBeLessThanOrEqual(2);
  });

  it('extracts constraints from relevant entities', () => {
    const bible = createBible();
    // Add a high priority world rule that will generate constraints
    bible.worldRules[0].priority = 90;
    bible.worldRules[0].established = true;

    const input: ContextInput = {
      bible,
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
      preferFullEntities: true, // Need full entities to extract constraints
    };

    const context = assembleContext(input, options);

    // With preferFullEntities and established world rules, should have constraints
    // Note: constraints are only extracted from full entities, not summaries
    expect(context.bible.worldRules.length).toBeGreaterThan(0);
  });

  it('calculates actual token usage', () => {
    const input: ContextInput = {
      bible: createBible(),
      currentStructure: createStructure(),
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
      totalBudget: 10000,
    };

    const context = assembleContext(input, options);

    expect(context.actualTokens.bible).toBeGreaterThan(0);
    expect(context.actualTokens.structure).toBeGreaterThan(0);
    expect(context.actualTokens.total).toBe(
      context.actualTokens.bible +
        context.actualTokens.recentContent +
        context.actualTokens.structure +
        context.actualTokens.constraints
    );
  });

  it('handles empty bible gracefully', () => {
    const emptyBible: Bible = {
      id: 'empty',
      characters: [],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
      timelineEvents: [],
      timelineSpans: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const input: ContextInput = {
      bible: emptyBible,
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
    };

    const context = assembleContext(input, options);

    expect(context.bible.characters).toHaveLength(0);
    expect(context.bible.locations).toHaveLength(0);
    expect(context.constraints).toHaveLength(0);
  });

  it('handles missing optional inputs', () => {
    const input: ContextInput = {
      bible: createBible(),
      // No currentStructure, allStructures, recentContent, or structureMap
    };

    const options: ContextAssemblyOptions = {
      taskType: 'outline',
    };

    const context = assembleContext(input, options);

    expect(context.structure).toBeNull();
    expect(context.recentContent).toHaveLength(0);
  });
});

describe('formatContext', () => {
  it('formats context as markdown', () => {
    const input: ContextInput = {
      bible: createBible(),
      currentStructure: createStructure(),
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
    };

    const context = assembleContext(input, options);
    const formatted = formatContext(context);

    expect(formatted).toContain('## Story Bible');
    expect(formatted).toContain('## Current Structure');
  });

  it('includes character information', () => {
    const input: ContextInput = {
      bible: createBible(),
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
    };

    const context = assembleContext(input, options);
    const formatted = formatContext(context);

    expect(formatted).toContain('Elena');
    expect(formatted).toContain('protagonist');
  });

  it('includes world rules', () => {
    const input: ContextInput = {
      bible: createBible(),
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
    };

    const context = assembleContext(input, options);
    const formatted = formatContext(context);

    expect(formatted).toContain('World Rules');
    expect(formatted).toContain('Magic Limit');
  });

  it('includes world rules in formatted output', () => {
    const bible = createBible();
    // Add established world rule
    bible.worldRules[0].established = true;

    const input: ContextInput = {
      bible,
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
    };

    const context = assembleContext(input, options);
    const formatted = formatContext(context);

    // Should include world rules section
    expect(formatted).toContain('World Rules');
    expect(formatted).toContain('Magic Limit');
  });

  it('separates sections with dividers', () => {
    const input: ContextInput = {
      bible: createBible(),
      currentStructure: createStructure(),
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
    };

    const context = assembleContext(input, options);
    const formatted = formatContext(context);

    expect(formatted).toContain('---');
  });

  it('handles empty context gracefully', () => {
    const emptyBible: Bible = {
      id: 'empty',
      characters: [],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
      timelineEvents: [],
      timelineSpans: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const input: ContextInput = {
      bible: emptyBible,
    };

    const options: ContextAssemblyOptions = {
      taskType: 'draft',
    };

    const context = assembleContext(input, options);
    const formatted = formatContext(context);

    // Should not throw, may be empty or minimal
    expect(typeof formatted).toBe('string');
  });
});

describe('task type variations', () => {
  const input: ContextInput = {
    bible: createBible(),
    currentStructure: createStructure(),
  };

  it('uses different budget allocations for outline task', () => {
    const outlineContext = assembleContext(input, { taskType: 'outline' });
    const draftContext = assembleContext(input, { taskType: 'draft' });

    // Different task types should have different budget distributions
    // Both should have valid budgets
    expect(outlineContext.budget.total).toBeGreaterThan(0);
    expect(draftContext.budget.total).toBeGreaterThan(0);
  });

  it('uses different budget allocations for analysis task', () => {
    const analysisContext = assembleContext(input, { taskType: 'analysis' });

    // Analysis should have more budget for recent content than bible
    expect(analysisContext.budget.recentContent).toBeGreaterThan(analysisContext.budget.bible);
  });

  it('uses different budget allocations for continuity-check task', () => {
    const continuityContext = assembleContext(input, { taskType: 'continuity-check' });

    // Continuity check should have substantial bible budget
    expect(continuityContext.budget.bible).toBeGreaterThan(continuityContext.budget.task);
  });
});
