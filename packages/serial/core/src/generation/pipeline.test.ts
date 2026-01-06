/**
 * Tests for generation pipeline
 */

import { describe, it, expect, vi } from 'vitest';

import { createGenerationPipeline } from './pipeline';
import type { GenerationRequest } from './types';
import type { LLMClient, AssembledContext } from '@repo/framework-llm';
import type { Structure } from '@repo/serial-types';

// Mock LLM client
function createMockClient(responses: Record<string, string> = {}): LLMClient {
  let callIndex = 0;
  const responseList = Object.values(responses);

  return {
    chat: vi.fn().mockImplementation(async () => {
      const content = responseList[callIndex++] || 'Default response';
      return {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      };
    }),
    chatStream: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      endpoint: 'http://localhost',
      defaultModel: 'test-model',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      retryMultiplier: 2,
    }),
    updateConfig: vi.fn(),
  };
}

// Create test structure
function createTestStructure(): Structure {
  return {
    id: 'structure-1',
    type: 'chapter',
    title: 'Chapter 1: The Beginning',
    summary: 'The protagonist discovers a mysterious artifact',
    beats: [],
    tensionTarget: 60,
    chapterType: 'action',
    hook: {
      type: 'cliffhanger',
      description: 'The artifact activates unexpectedly',
    },
    order: 0,
    children: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Create test context
function createTestContext(): AssembledContext {
  return {
    taskType: 'draft',
    bible: {
      characters: [],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
      tokenCount: 0,
    },
    recentContent: [],
    structure: null,
    constraints: [],
    budget: {
      total: 8000,
      system: 500,
      bible: 2000,
      recentContent: 1000,
      structure: 1000,
      constraints: 500,
      task: 500,
      completion: 2500,
    },
    actualTokens: {
      bible: 0,
      recentContent: 0,
      structure: 0,
      constraints: 0,
      total: 0,
    },
  };
}

describe('createGenerationPipeline', () => {
  describe('generate', () => {
    it('should run full pipeline successfully', async () => {
      const client = createMockClient({
        outline: `1. Opening scene with protagonist
2. Discovery of artifact
3. Initial activation
4. Cliffhanger ending`,
        beats: `1. Opening - The protagonist walks through the market (~200 words)
2. Discovery - She finds the artifact in an old shop (~400 words)
3. Investigation - She examines the strange object (~600 words)
4. Activation - The artifact glows unexpectedly (~500 words)
5. Cliffhanger - The room fills with light (~300 words)`,
        draft: `The morning sun cast long shadows across the marketplace as Elena pushed through the crowd.

She had been searching for weeks, following rumors of ancient artifacts hidden among the merchants' wares. Today, something felt different.

In a dusty corner of an old antique shop, her fingers brushed against cold metal. The artifact was exactly as the legends described - a sphere of dark bronze, covered in strange symbols.

"What is this?" she whispered, lifting it carefully.

The shopkeeper looked up, fear flickering across his face. "That... that shouldn't be here."

Before Elena could respond, the sphere grew warm in her hands. The symbols began to glow with an inner light, pulsing like a heartbeat.

"No," the shopkeeper breathed. "It's awakening."

The light intensified, filling the small shop. Elena wanted to drop the artifact, but her hands wouldn't obey. The symbols blazed brighter and brighter, until the entire room was consumed by brilliant white light.

And then she heard the voice.`,
        'self-review': JSON.stringify({
          qualityScore: 85,
          issues: [
            {
              type: 'pacing',
              severity: 30,
              description: 'The discovery could be drawn out more',
              paragraphIndex: 2,
              suggestedFix: 'Add more sensory details before the discovery',
            },
          ],
          suggestions: ['Consider adding more dialogue', 'Enhance the atmosphere'],
          shouldRegenerate: false,
          problematicParagraphs: [2],
        }),
      });

      const pipeline = createGenerationPipeline(client);
      const request: GenerationRequest = {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {
          temperature: 0.7,
          maxTokens: 4000,
          targetWordCount: 2000,
          includeSelfReview: true,
        },
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content?.text).toContain('Elena');
      expect(result.selfReviewFeedback).toBeDefined();
      expect(result.selfReviewFeedback?.qualityScore).toBe(85);
      expect(result.generationRecord.success).toBe(true);
    });

    it('should call progress callbacks', async () => {
      const client = createMockClient({
        outline: '1. Beat one\n2. Beat two',
        beats: '1. Detailed beat one\n2. Detailed beat two',
        draft: 'Draft content here.',
        'self-review': JSON.stringify({
          qualityScore: 80,
          issues: [],
          suggestions: [],
          shouldRegenerate: false,
          problematicParagraphs: [],
        }),
      });

      const onStageStart = vi.fn();
      const onStageComplete = vi.fn();

      const pipeline = createGenerationPipeline(client);
      const request: GenerationRequest = {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {
          onStageStart,
          onStageComplete,
        },
      };

      await pipeline.generate(request);

      expect(onStageStart).toHaveBeenCalledWith('outline');
      expect(onStageStart).toHaveBeenCalledWith('beats');
      expect(onStageStart).toHaveBeenCalledWith('draft');
      expect(onStageStart).toHaveBeenCalledWith('self-review');

      expect(onStageComplete).toHaveBeenCalledTimes(4);
    });

    it('should skip self-review when not requested', async () => {
      const client = createMockClient({
        outline: '1. Beat one',
        beats: '1. Detailed beat one',
        draft: 'Draft content.',
      });

      const onStageStart = vi.fn();

      const pipeline = createGenerationPipeline(client);
      const request: GenerationRequest = {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {
          includeSelfReview: false,
          onStageStart,
        },
      };

      await pipeline.generate(request);

      expect(onStageStart).not.toHaveBeenCalledWith('self-review');
    });

    it('should handle LLM errors', async () => {
      const client = createMockClient();
      client.chat = vi.fn().mockRejectedValue(new Error('API error'));

      const pipeline = createGenerationPipeline(client);
      const request: GenerationRequest = {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {
          maxRetries: 0, // Disable retries for test
        },
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(false);
      expect(result.pipelineState.error).toBeDefined();
      expect(result.pipelineState.stageStatuses.outline).toBe('failed');
    });

    it('should create content with correct structure', async () => {
      const draftText = 'This is the generated draft content.';
      const client = createMockClient({
        outline: '1. Beat',
        beats: '1. Detailed beat',
        draft: draftText,
        'self-review': JSON.stringify({
          qualityScore: 90,
          issues: [],
          suggestions: [],
          shouldRegenerate: false,
          problematicParagraphs: [],
        }),
      });

      const pipeline = createGenerationPipeline(client);
      const structure = createTestStructure();
      const request: GenerationRequest = {
        structure,
        context: createTestContext(),
        options: {},
      };

      const result = await pipeline.generate(request);

      expect(result.content).toBeDefined();
      expect(result.content!.structureId).toBe(structure.id);
      expect(result.content!.text).toBe(draftText);
      expect(result.content!.currentVersion).toBe(1);
      expect(result.content!.versions).toHaveLength(1);
      expect(result.content!.versions[0].text).toBe(draftText);
      expect(result.content!.versions[0].source).toBe('generated');
      expect(result.content!.status).toBe('draft');
    });
  });

  describe('runStage', () => {
    it('should run a single stage', async () => {
      const client = createMockClient({
        outline: '1. First beat\n2. Second beat\n3. Third beat',
      });

      const pipeline = createGenerationPipeline(client);
      const request: GenerationRequest = {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {},
      };

      const result = await pipeline.runStage('outline', request);

      expect(result.success).toBe(true);
      expect(result.stage).toBe('outline');
      expect(result.generatedBeats).toBeDefined();
      expect(result.generatedBeats!.length).toBeGreaterThan(0);
    });

    it('should parse outline into beats', async () => {
      const client = createMockClient({
        outline: `1. The hero enters the cave
2. Discovery of ancient treasure
- Meets the dragon guardian
* Final confrontation`,
      });

      const pipeline = createGenerationPipeline(client);
      const result = await pipeline.runStage('outline', {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {},
      });

      expect(result.generatedBeats).toHaveLength(4);
      expect(result.generatedBeats![0].description).toBe('The hero enters the cave');
      expect(result.generatedBeats![1].description).toBe('Discovery of ancient treasure');
    });

    it('should parse beats with word counts', async () => {
      const client = createMockClient({
        beats: `1. Opening scene with protagonist (~300 words)
2. The discovery moment (500 words)
3. Climactic confrontation (~800 words)`,
      });

      const pipeline = createGenerationPipeline(client);
      const result = await pipeline.runStage('beats', {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {},
      });

      expect(result.generatedBeats).toHaveLength(3);
      expect(result.generatedBeats![0].targetWordCount).toBe(300);
      expect(result.generatedBeats![1].targetWordCount).toBe(500);
      expect(result.generatedBeats![2].targetWordCount).toBe(800);
    });

    it('should parse self-review JSON', async () => {
      const client = createMockClient({
        'self-review': `Here's my analysis:

${JSON.stringify({
  qualityScore: 75,
  issues: [
    { type: 'voice', severity: 40, description: 'Character voice inconsistent' },
  ],
  suggestions: ['Add more dialogue'],
  shouldRegenerate: false,
  problematicParagraphs: [3, 5],
})}

Hope this helps!`,
      });

      const pipeline = createGenerationPipeline(client);
      const result = await pipeline.runStage('self-review', {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {},
      });

      expect(result.feedback).toBeDefined();
      expect(result.feedback!.qualityScore).toBe(75);
      expect(result.feedback!.issues).toHaveLength(1);
      expect(result.feedback!.issues[0].type).toBe('voice');
      expect(result.feedback!.problematicParagraphs).toEqual([3, 5]);
    });

    it('should handle malformed self-review JSON', async () => {
      const client = createMockClient({
        'self-review': 'This is not valid JSON at all.',
      });

      const pipeline = createGenerationPipeline(client);
      const result = await pipeline.runStage('self-review', {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {},
      });

      // Should return default feedback instead of failing
      expect(result.feedback).toBeDefined();
      expect(result.feedback!.qualityScore).toBe(70);
      expect(result.feedback!.issues).toEqual([]);
      expect(result.feedback!.shouldRegenerate).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should stop pipeline when cancelled', async () => {
      let resolveFirst: () => void;
      const firstCallPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      const client = createMockClient();
      client.chat = vi.fn().mockImplementation(async () => {
        resolveFirst!();
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          choices: [{ message: { content: '1. Beat' } }],
        };
      });

      const pipeline = createGenerationPipeline(client);
      const request: GenerationRequest = {
        structure: createTestStructure(),
        context: createTestContext(),
        options: {},
      };

      // Start generation
      const resultPromise = pipeline.generate(request);

      // Wait for first call to start, then cancel
      await firstCallPromise;
      pipeline.cancel();

      const result = await resultPromise;

      // Pipeline should stop early
      expect(result.success).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return null before generation starts', () => {
      const client = createMockClient();
      const pipeline = createGenerationPipeline(client);

      expect(pipeline.getState()).toBeNull();
    });

    it('should return state during generation', async () => {
      const client = createMockClient();
      const pipeline = createGenerationPipeline(client);
      let capturedState: ReturnType<typeof pipeline.getState> = null;

      client.chat = vi.fn().mockImplementation(async () => {
        capturedState = pipeline.getState();
        return {
          choices: [{ message: { content: '1. Beat' } }],
        };
      });

      const request: GenerationRequest = {
        structure: createTestStructure(),
        context: createTestContext(),
        options: { stages: ['outline'] },
      };

      await pipeline.generate(request);

      expect(capturedState).toBeDefined();
      expect(capturedState!.currentStage).toBe('outline');
      expect(capturedState!.stageStatuses.outline).toBe('running');
    });
  });
});
