/**
 * Tests for prompt templates
 */

import { describe, it, expect } from 'vitest';

import {
  fillTemplate,
  getStageTemplate,
  buildStageMessages,
  STAGE_TEMPLATES,
  BASE_SYSTEM_PROMPT,
} from './prompts';
import type { PromptPlaceholders } from './types';

describe('fillTemplate', () => {
  it('should replace simple placeholders', () => {
    const template = 'Hello {{context}}, welcome to {{structure}}';
    const placeholders: PromptPlaceholders = {
      context: 'World',
      structure: 'NovelGen',
    };

    const result = fillTemplate(template, placeholders);
    expect(result).toBe('Hello World, welcome to NovelGen');
  });

  it('should handle missing placeholders', () => {
    const template = 'Beats: {{beats}}, Draft: {{draft}}';
    const placeholders: PromptPlaceholders = {
      context: '',
      structure: '',
    };

    const result = fillTemplate(template, placeholders);
    expect(result).toBe('Beats: , Draft:');
  });

  it('should replace numeric placeholders', () => {
    const template = 'Target: {{targetWordCount}} words, Tension: {{tensionTarget}}';
    const placeholders: PromptPlaceholders = {
      context: '',
      structure: '',
      targetWordCount: 2500,
      tensionTarget: 75,
    };

    const result = fillTemplate(template, placeholders);
    expect(result).toBe('Target: 2500 words, Tension: 75');
  });

  it('should handle conditional blocks with truthy values', () => {
    const template = '{{#if styleGuidance}}Style: {{styleGuidance}}{{/if}}';
    const placeholders: PromptPlaceholders = {
      context: '',
      structure: '',
      styleGuidance: 'Write in first person',
    };

    const result = fillTemplate(template, placeholders);
    expect(result).toBe('Style: Write in first person');
  });

  it('should handle conditional blocks with falsy values', () => {
    const template = 'Before{{#if styleGuidance}}Style: {{styleGuidance}}{{/if}}After';
    const placeholders: PromptPlaceholders = {
      context: '',
      structure: '',
    };

    const result = fillTemplate(template, placeholders);
    expect(result).toBe('BeforeAfter');
  });

  it('should handle multiple conditional blocks', () => {
    const template = `{{#if constraints}}Constraints: {{constraints}}{{/if}}
{{#if styleGuidance}}Style: {{styleGuidance}}{{/if}}`;

    const placeholders: PromptPlaceholders = {
      context: '',
      structure: '',
      constraints: 'Must include dragon',
      styleGuidance: '',
    };

    const result = fillTemplate(template, placeholders);
    expect(result).toContain('Constraints: Must include dragon');
    expect(result).not.toContain('Style:');
  });

  it('should clean up multiple empty lines', () => {
    const template = `Line 1



Line 2`;
    const placeholders: PromptPlaceholders = {
      context: '',
      structure: '',
    };

    const result = fillTemplate(template, placeholders);
    expect(result).toBe('Line 1\n\nLine 2');
  });
});

describe('getStageTemplate', () => {
  it('should return outline template', () => {
    const template = getStageTemplate('outline');
    expect(template.id).toBe('outline-v1');
    expect(template.stage).toBe('outline');
    expect(template.systemPrompt).toContain('outline');
  });

  it('should return beats template', () => {
    const template = getStageTemplate('beats');
    expect(template.id).toBe('beats-v1');
    expect(template.stage).toBe('beats');
  });

  it('should return draft template', () => {
    const template = getStageTemplate('draft');
    expect(template.id).toBe('draft-v1');
    expect(template.stage).toBe('draft');
  });

  it('should return self-review template', () => {
    const template = getStageTemplate('self-review');
    expect(template.id).toBe('self-review-v1');
    expect(template.stage).toBe('self-review');
  });

  it('should return revision template', () => {
    const template = getStageTemplate('revision');
    expect(template.id).toBe('revision-v1');
    expect(template.stage).toBe('revision');
  });

  it('should have all required stages', () => {
    const stages = ['outline', 'beats', 'draft', 'self-review', 'revision'] as const;
    for (const stage of stages) {
      expect(STAGE_TEMPLATES[stage]).toBeDefined();
      expect(STAGE_TEMPLATES[stage].systemPrompt).toBeTruthy();
      expect(STAGE_TEMPLATES[stage].userPromptTemplate).toBeTruthy();
    }
  });
});

describe('buildStageMessages', () => {
  const basePlaceholders: PromptPlaceholders = {
    context: 'Story context here',
    structure: 'Chapter 1: The Beginning',
  };

  it('should build messages for outline stage', () => {
    const messages = buildStageMessages('outline', basePlaceholders);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[0].content).toContain(BASE_SYSTEM_PROMPT);
    expect(messages[1].content).toContain('Story context here');
  });

  it('should build messages for draft stage', () => {
    const placeholders: PromptPlaceholders = {
      ...basePlaceholders,
      beats: '1. Opening scene\n2. Conflict\n3. Resolution',
      targetWordCount: 3000,
    };

    const messages = buildStageMessages('draft', placeholders);

    expect(messages[1].content).toContain('Opening scene');
    expect(messages[1].content).toContain('3000');
  });

  it('should build messages for self-review stage', () => {
    const placeholders: PromptPlaceholders = {
      ...basePlaceholders,
      draft: 'This is the draft content to review.',
      constraints: 'Must not kill the main character',
    };

    const messages = buildStageMessages('self-review', placeholders);

    expect(messages[1].content).toContain('draft content to review');
    expect(messages[1].content).toContain('JSON format');
  });

  it('should use custom system prompt if provided', () => {
    const customPrompt = 'You are a fantasy writer.';
    const messages = buildStageMessages('outline', basePlaceholders, customPrompt);

    expect(messages[0].content).toBe(customPrompt);
    expect(messages[0].content).not.toContain(BASE_SYSTEM_PROMPT);
  });

  it('should include hook requirements when provided', () => {
    const placeholders: PromptPlaceholders = {
      ...basePlaceholders,
      hookRequirements: 'cliffhanger',
    };

    const messages = buildStageMessages('outline', placeholders);
    expect(messages[1].content).toContain('cliffhanger');
  });

  it('should include tension target when provided', () => {
    const placeholders: PromptPlaceholders = {
      ...basePlaceholders,
      tensionTarget: 85,
    };

    const messages = buildStageMessages('outline', placeholders);
    expect(messages[1].content).toContain('85');
  });
});

describe('STAGE_TEMPLATES', () => {
  it('all templates should have base system prompt', () => {
    for (const template of Object.values(STAGE_TEMPLATES)) {
      expect(template.systemPrompt).toContain(BASE_SYSTEM_PROMPT);
    }
  });

  it('all templates should have required placeholders', () => {
    for (const template of Object.values(STAGE_TEMPLATES)) {
      expect(template.userPromptTemplate).toContain('{{context}}');
    }
  });

  it('draft template should reference beats', () => {
    expect(STAGE_TEMPLATES.draft.userPromptTemplate).toContain('{{beats}}');
  });

  it('self-review template should reference draft', () => {
    expect(STAGE_TEMPLATES['self-review'].userPromptTemplate).toContain('{{draft}}');
  });

  it('self-review template should request JSON output', () => {
    expect(STAGE_TEMPLATES['self-review'].userPromptTemplate).toContain('JSON');
    expect(STAGE_TEMPLATES['self-review'].userPromptTemplate).toContain('qualityScore');
  });
});
