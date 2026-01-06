/**
 * Tests for analysis prompts
 */

import { describe, it, expect } from 'vitest';

import {
  buildTensionPrompt,
  buildHookPrompt,
  buildPacingPrompt,
  buildContinuityPrompt,
  ANALYSIS_SYSTEM_PROMPT,
} from './prompts';
import type { AnalysisInput } from './types';
import type { Bible, Content, Structure } from '@repo/serial-types';

// Create test fixtures
function createTestBible(): Bible {
  return {
    id: 'bible-1',
    characters: [
      {
        id: 'char-1',
        name: 'Elena',
        aliases: ['The Seeker'],
        description: 'A determined young woman',
        traits: [
          { category: 'personality', name: 'Determined', description: 'Never gives up' },
        ],
        relationships: [],
        voiceSamples: ['I will find the truth.'],
        appearances: [],
        role: 'protagonist',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    locations: [
      {
        id: 'loc-1',
        name: 'The Market',
        aliases: [],
        description: 'A bustling marketplace',
        type: 'district',
        relations: [],
        features: [],
        associatedCharacters: [],
        status: 'accessible',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    factions: [],
    worldRules: [
      {
        id: 'rule-1',
        name: 'Magic Rule',
        description: 'How magic works',
        category: 'magic',
        rule: 'Magic requires specific gestures',
        exceptions: [],
        publicKnowledge: true,
        relatedRules: [],
        priority: 50,
        established: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rule-2',
        name: 'Unestablished Rule',
        description: 'Not yet canon',
        category: 'magic',
        rule: 'This should not appear',
        exceptions: [],
        publicKnowledge: true,
        relatedRules: [],
        priority: 50,
        established: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    plotThreads: [],
    timelineEvents: [],
    timelineSpans: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTestStructure(overrides: Partial<Structure> = {}): Structure {
  return {
    id: 'structure-1',
    type: 'chapter',
    title: 'Chapter 1',
    summary: 'The beginning',
    beats: [],
    tensionTarget: 60,
    chapterType: 'action',
    hook: {
      type: 'cliffhanger',
      description: 'A shocking revelation',
    },
    order: 0,
    children: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createTestContent(): Content {
  return {
    id: 'content-1',
    structureId: 'structure-1',
    currentVersion: 1,
    versions: [],
    text: 'Elena walked through the market.',
    status: 'draft',
    reviews: [],
    generationHistory: [],
    locked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTestInput(overrides: Partial<AnalysisInput> = {}): AnalysisInput {
  return {
    content: createTestContent(),
    structure: createTestStructure(),
    bible: createTestBible(),
    ...overrides,
  };
}

describe('Analysis prompts', () => {
  describe('ANALYSIS_SYSTEM_PROMPT', () => {
    it('should define the system role', () => {
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('expert fiction editor');
    });

    it('should mention JSON format requirement', () => {
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('JSON');
    });

    it('should include scoring guidelines', () => {
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('0-20');
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('81-100');
    });
  });

  describe('buildTensionPrompt', () => {
    it('should include structure context', () => {
      const input = createTestInput();
      const prompt = buildTensionPrompt(input);

      expect(prompt).toContain('Chapter 1');
      expect(prompt).toContain('chapter');
      expect(prompt).toContain('action');
    });

    it('should include content to analyze', () => {
      const input = createTestInput();
      const prompt = buildTensionPrompt(input);

      expect(prompt).toContain('Elena walked through the market');
    });

    it('should include characters from bible', () => {
      const input = createTestInput();
      const prompt = buildTensionPrompt(input);

      expect(prompt).toContain('Elena');
      expect(prompt).toContain('protagonist');
    });

    it('should include locations from bible', () => {
      const input = createTestInput();
      const prompt = buildTensionPrompt(input);

      expect(prompt).toContain('The Market');
      expect(prompt).toContain('district');
    });

    it('should include only established world rules', () => {
      const input = createTestInput();
      const prompt = buildTensionPrompt(input);

      expect(prompt).toContain('Magic Rule');
      expect(prompt).not.toContain('Unestablished Rule');
    });

    it('should include tension target when specified', () => {
      const input = createTestInput();
      const prompt = buildTensionPrompt(input);

      expect(prompt).toContain('60');
      expect(prompt).toContain('target tension');
    });

    it('should not include tension target note when not specified', () => {
      const input = createTestInput({
        structure: createTestStructure({ tensionTarget: undefined }),
      });
      const prompt = buildTensionPrompt(input);

      expect(prompt).not.toContain('target tension level is');
    });

    it('should request JSON response format', () => {
      const input = createTestInput();
      const prompt = buildTensionPrompt(input);

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('score');
      expect(prompt).toContain('tensionMoments');
    });
  });

  describe('buildHookPrompt', () => {
    it('should explain hook types', () => {
      const input = createTestInput();
      const prompt = buildHookPrompt(input);

      expect(prompt).toContain('revelation');
      expect(prompt).toContain('cliffhanger');
      expect(prompt).toContain('emotional');
      expect(prompt).toContain('question');
    });

    it('should include expected hook from structure', () => {
      const input = createTestInput();
      const prompt = buildHookPrompt(input);

      expect(prompt).toContain('cliffhanger');
      expect(prompt).toContain('A shocking revelation');
    });

    it('should request JSON with hookType', () => {
      const input = createTestInput();
      const prompt = buildHookPrompt(input);

      expect(prompt).toContain('hookType');
      expect(prompt).toContain('improvements');
    });

    it('should mention web serial format', () => {
      const input = createTestInput();
      const prompt = buildHookPrompt(input);

      expect(prompt).toContain('web serial');
    });
  });

  describe('buildPacingPrompt', () => {
    it('should include structure context', () => {
      const input = createTestInput();
      const prompt = buildPacingPrompt(input);

      expect(prompt).toContain('Chapter 1');
    });

    it('should mention pacing considerations', () => {
      const input = createTestInput();
      const prompt = buildPacingPrompt(input);

      expect(prompt).toContain('action');
      expect(prompt).toContain('dialogue');
      expect(prompt).toContain('description');
    });

    it('should request segments in response', () => {
      const input = createTestInput();
      const prompt = buildPacingPrompt(input);

      expect(prompt).toContain('segments');
      expect(prompt).toContain('startPosition');
      expect(prompt).toContain('profile');
    });
  });

  describe('buildContinuityPrompt', () => {
    it('should include character IDs for reference', () => {
      const input = createTestInput();
      const prompt = buildContinuityPrompt(input);

      expect(prompt).toContain('char-1');
      expect(prompt).toContain('"id"');
    });

    it('should include character voice samples', () => {
      const input = createTestInput();
      const prompt = buildContinuityPrompt(input);

      expect(prompt).toContain('I will find the truth');
    });

    it('should include location IDs for reference', () => {
      const input = createTestInput();
      const prompt = buildContinuityPrompt(input);

      expect(prompt).toContain('loc-1');
    });

    it('should include world rule IDs for reference', () => {
      const input = createTestInput();
      const prompt = buildContinuityPrompt(input);

      expect(prompt).toContain('rule-1');
      expect(prompt).not.toContain('rule-2'); // unestablished
    });

    it('should list issue types to check', () => {
      const input = createTestInput();
      const prompt = buildContinuityPrompt(input);

      expect(prompt).toContain('character-inconsistency');
      expect(prompt).toContain('location-error');
      expect(prompt).toContain('timeline-conflict');
      expect(prompt).toContain('fact-contradiction');
      expect(prompt).toContain('world-rule-violation');
    });

    it('should include recent content when provided', () => {
      const input = createTestInput({
        recentContent: [
          {
            id: 'prev-1',
            structureId: 'structure-0',
            title: 'Previous Chapter',
            summary: 'What happened before',
            characterAppearances: ['char-1'],
            locationAppearances: ['loc-1'],
          },
        ],
      });
      const prompt = buildContinuityPrompt(input);

      expect(prompt).toContain('Previous Chapter');
      expect(prompt).toContain('What happened before');
    });

    it('should not include recent content section when empty', () => {
      const input = createTestInput({ recentContent: [] });
      const prompt = buildContinuityPrompt(input);

      expect(prompt).not.toContain('## Recent Chapters');
    });

    it('should request characterMentions in response', () => {
      const input = createTestInput();
      const prompt = buildContinuityPrompt(input);

      expect(prompt).toContain('characterMentions');
      expect(prompt).toContain('appearanceType');
      expect(prompt).toContain('dialogueLines');
    });

    it('should request locationMentions in response', () => {
      const input = createTestInput();
      const prompt = buildContinuityPrompt(input);

      expect(prompt).toContain('locationMentions');
      expect(prompt).toContain('consistent');
    });
  });
});
