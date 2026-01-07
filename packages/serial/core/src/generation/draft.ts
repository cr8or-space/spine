/**
 * Draft generation service
 *
 * Generates full prose drafts from expanded beats.
 * This is the main content generation stage in the pipeline.
 */

import { nanoid } from 'nanoid';
import type { Beat, Content, Structure } from '@repo/serial-types';
import type { LLMClient, AssembledContext } from '@repo/framework-llm';

import { buildStageMessages } from './prompts';
import type { ExpandedBeat } from './beats';
import type { SelfReviewFeedback } from './types';
import { formatContextForDraft, formatStructureForDraft } from './formatting';
import { countWords as countWordsUtil, splitParagraphs as splitParagraphsUtil } from '../utils/text';

/**
 * Draft generation configuration
 */
export interface DraftConfig {
  /** Model to use (overrides client default) */
  model?: string;
  /** Temperature for generation (0-2, higher for more creative) */
  temperature?: number;
  /** Maximum tokens for completion */
  maxTokens?: number;
  /** Custom system prompt */
  systemPrompt?: string;
  /** Style guidance for the prose */
  styleGuidance?: string;
  /** Target word count */
  targetWordCount?: number;
  /** Whether to include self-review after generation */
  includeSelfReview?: boolean;
  /** Callback for streaming tokens */
  onToken?: (token: string) => void;
}

/**
 * Default draft configuration
 */
export const DEFAULT_DRAFT_CONFIG: Required<
  Omit<DraftConfig, 'model' | 'systemPrompt' | 'styleGuidance' | 'onToken'>
> = {
  temperature: 0.7,
  maxTokens: 4000,
  targetWordCount: 2000,
  includeSelfReview: false,
};

/**
 * Draft generation input
 */
export interface DraftInput {
  /** Structure to generate draft for */
  structure: Structure;
  /** Assembled context */
  context: AssembledContext;
  /** Beats to write from */
  beats: Beat[] | ExpandedBeat[];
  /** POV character name */
  povCharacter?: string;
  /** Previous chapter's ending (for continuity) */
  previousEnding?: string;
  /** Voice notes for the POV character */
  voiceNotes?: string;
}

/**
 * Draft generation result
 */
export interface DraftResult {
  /** Whether generation succeeded */
  success: boolean;
  /** Generated prose text */
  text: string;
  /** Word count */
  wordCount: number;
  /** Token usage */
  tokens: {
    prompt: number;
    completion: number;
  };
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
  /** Model used */
  modelId: string;
  /** Self-review feedback if requested */
  selfReview?: SelfReviewFeedback;
}

/**
 * Revision input
 */
export interface RevisionInput extends DraftInput {
  /** Original draft to revise */
  originalDraft: string;
  /** Issues to address */
  issues: SelfReviewFeedback['issues'];
  /** Suggestions to incorporate */
  suggestions: string[];
  /** Problematic paragraph indices */
  problematicParagraphs: number[];
}

/**
 * Draft service interface
 */
export interface DraftService {
  /**
   * Generate a draft from beats
   */
  generate(input: DraftInput, config?: DraftConfig): Promise<DraftResult>;

  /**
   * Revise a draft based on feedback
   */
  revise(input: RevisionInput, config?: DraftConfig): Promise<DraftResult>;

  /**
   * Continue an incomplete draft
   */
  continue(
    input: DraftInput,
    partialDraft: string,
    config?: DraftConfig
  ): Promise<DraftResult>;

  /**
   * Convert draft result to Content object
   */
  toContent(structureId: string, result: DraftResult): Content;

  /**
   * Count words in text
   */
  countWords(text: string): number;

  /**
   * Split draft into paragraphs
   */
  splitParagraphs(text: string): string[];
}

/**
 * Format beats for prompt
 */
function formatBeats(beats: (Beat | ExpandedBeat)[]): string {
  return beats
    .sort((a, b) => a.order - b.order)
    .map((beat, i) => {
      let line = `${i + 1}. ${beat.description}`;
      if (beat.targetWordCount) {
        line += ` (~${beat.targetWordCount} words)`;
      }
      // Check for expanded beat properties
      if ('emotionalTone' in beat && beat.emotionalTone) {
        line += ` [tone: ${beat.emotionalTone}]`;
      }
      if ('tensionLevel' in beat && beat.tensionLevel !== undefined) {
        line += ` [tension: ${beat.tensionLevel}]`;
      }
      return line;
    })
    .join('\n');
}

/**
 * Create the draft service
 */
export function createDraftService(client: LLMClient): DraftService {
  /**
   * Build prompt placeholders
   */
  function buildPlaceholders(
    input: DraftInput,
    config: Required<Omit<DraftConfig, 'model' | 'systemPrompt' | 'styleGuidance' | 'onToken'>> & Partial<DraftConfig>
  ): {
    context: string;
    structure: string;
    beats?: string;
    styleGuidance?: string;
    targetWordCount?: number;
    constraints?: string;
    hookRequirements?: string;
    tensionTarget?: number;
  } {
    const { structure, context, beats } = input;

    // Format context for prompt, highlighting POV character
    const formattedContext = formatContextForDraft(context, input.povCharacter);

    // Format structure
    const structureText = formatStructureForDraft(structure);

    // Format beats
    const beatsText = formatBeats(beats);

    // Format constraints
    const constraintsText = context.constraints.length > 0
      ? context.constraints.map((c) => `- ${c.statement}`).join('\n')
      : undefined;

    // Build style guidance
    let styleGuidance = config.styleGuidance || '';

    // Add POV guidance
    if (input.povCharacter) {
      styleGuidance += `\n\nWrite from ${input.povCharacter}'s point of view.`;
    }

    // Add voice notes
    if (input.voiceNotes) {
      styleGuidance += `\n\nVoice Notes: ${input.voiceNotes}`;
    }

    // Add previous ending for continuity
    if (input.previousEnding) {
      styleGuidance += `\n\nPrevious chapter ended with:\n"${input.previousEnding}"`;
    }

    // Hook requirements
    const hookRequirements = structure.hook?.type || 'engaging';

    return {
      context: formattedContext,
      structure: structureText,
      beats: beatsText,
      styleGuidance: styleGuidance.trim() || undefined,
      targetWordCount: config.targetWordCount,
      constraints: constraintsText,
      hookRequirements,
      tensionTarget: structure.tensionTarget,
    };
  }

  /**
   * Generate a draft from beats
   */
  async function generate(input: DraftInput, config?: DraftConfig): Promise<DraftResult> {
    const mergedConfig = {
      ...DEFAULT_DRAFT_CONFIG,
      ...config,
    };

    const startTime = Date.now();
    const model = mergedConfig.model || client.getConfig().defaultModel;

    try {
      // Build messages
      const placeholders = buildPlaceholders(input, mergedConfig);
      const messages = buildStageMessages('draft', placeholders, mergedConfig.systemPrompt);

      // Make LLM request
      let responseText = '';

      if (mergedConfig.onToken) {
        // Use streaming
        await client.chatStream(
          {
            model,
            messages,
            temperature: mergedConfig.temperature,
            max_tokens: mergedConfig.maxTokens,
          },
          (chunk) => {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              responseText += delta;
              mergedConfig.onToken?.(delta);
            }
          }
        );
      } else {
        // Non-streaming
        const response = await client.chat({
          model,
          messages,
          temperature: mergedConfig.temperature,
          max_tokens: mergedConfig.maxTokens,
        });
        responseText = response.choices[0]?.message?.content || '';
      }

      const durationMs = Date.now() - startTime;
      const wordCount = countWordsUtil(responseText);

      const result: DraftResult = {
        success: true,
        text: responseText,
        wordCount,
        tokens: { prompt: 0, completion: 0 }, // TODO: Get from response
        durationMs,
        modelId: model,
      };

      // Run self-review if requested
      if (mergedConfig.includeSelfReview) {
        const reviewResult = await runSelfReview(input, responseText, mergedConfig);
        result.selfReview = reviewResult;
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        text: '',
        wordCount: 0,
        tokens: { prompt: 0, completion: 0 },
        durationMs,
        error: error instanceof Error ? error.message : String(error),
        modelId: model,
      };
    }
  }

  /**
   * Run self-review on generated draft
   */
  async function runSelfReview(
    input: DraftInput,
    draft: string,
    config: Required<Omit<DraftConfig, 'model' | 'systemPrompt' | 'styleGuidance' | 'onToken'>> & Partial<DraftConfig>
  ): Promise<SelfReviewFeedback> {
    const model = config.model || client.getConfig().defaultModel;

    try {
      const placeholders = {
        context: formatContextForDraft(input.context, input.povCharacter),
        structure: formatStructureForDraft(input.structure),
        draft,
        constraints: input.context.constraints.length > 0
          ? input.context.constraints.map((c) => `- ${c.statement}`).join('\n')
          : '',
      };

      const messages = buildStageMessages('self-review', placeholders, config.systemPrompt);

      const response = await client.chat({
        model,
        messages,
        temperature: 0.3, // Lower temperature for more consistent reviews
        max_tokens: 1500,
      });

      const responseText = response.choices[0]?.message?.content || '';

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return defaultSelfReview();
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : 70,
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          shouldRegenerate: parsed.shouldRegenerate === true,
          problematicParagraphs: Array.isArray(parsed.problematicParagraphs)
            ? parsed.problematicParagraphs
            : [],
        };
      } catch {
        return defaultSelfReview();
      }
    } catch {
      return defaultSelfReview();
    }
  }

  /**
   * Default self-review result
   */
  function defaultSelfReview(): SelfReviewFeedback {
    return {
      qualityScore: 70,
      issues: [],
      suggestions: [],
      shouldRegenerate: false,
      problematicParagraphs: [],
    };
  }

  /**
   * Revise a draft based on feedback
   */
  async function revise(input: RevisionInput, config?: DraftConfig): Promise<DraftResult> {
    const mergedConfig = {
      ...DEFAULT_DRAFT_CONFIG,
      ...config,
    };

    const startTime = Date.now();
    const model = mergedConfig.model || client.getConfig().defaultModel;

    try {
      // Build revision-specific prompt
      const formattedContext = formatContextForDraft(input.context, input.povCharacter);

      const messages = buildStageMessages(
        'revision',
        {
          context: formattedContext,
          structure: formatStructureForDraft(input.structure),
          draft: input.originalDraft,
          issues: input.issues.map((issue) => ({
            type: issue.type,
            severity: issue.severity,
            description: issue.description,
            suggestedFix: issue.suggestedFix,
          })),
          suggestions: input.suggestions,
          problematicParagraphs: input.problematicParagraphs.join(', '),
        },
        mergedConfig.systemPrompt
      );

      // Make LLM request
      let responseText = '';

      if (mergedConfig.onToken) {
        await client.chatStream(
          {
            model,
            messages,
            temperature: mergedConfig.temperature,
            max_tokens: mergedConfig.maxTokens,
          },
          (chunk) => {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              responseText += delta;
              mergedConfig.onToken?.(delta);
            }
          }
        );
      } else {
        const response = await client.chat({
          model,
          messages,
          temperature: mergedConfig.temperature,
          max_tokens: mergedConfig.maxTokens,
        });
        responseText = response.choices[0]?.message?.content || '';
      }

      const durationMs = Date.now() - startTime;
      const wordCount = countWordsUtil(responseText);

      return {
        success: true,
        text: responseText,
        wordCount,
        tokens: { prompt: 0, completion: 0 },
        durationMs,
        modelId: model,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        text: '',
        wordCount: 0,
        tokens: { prompt: 0, completion: 0 },
        durationMs,
        error: error instanceof Error ? error.message : String(error),
        modelId: model,
      };
    }
  }

  /**
   * Continue an incomplete draft
   */
  async function draftContinue(
    input: DraftInput,
    partialDraft: string,
    config?: DraftConfig
  ): Promise<DraftResult> {
    const mergedConfig = {
      ...DEFAULT_DRAFT_CONFIG,
      ...config,
    };

    const startTime = Date.now();
    const model = mergedConfig.model || client.getConfig().defaultModel;

    try {
      // Build continuation prompt
      const placeholders = buildPlaceholders(input, mergedConfig);

      // Add partial draft to style guidance
      const continueGuidance = `
## Draft So Far
${partialDraft}

## Instructions
Continue writing from where the draft left off. Maintain the same voice, tone, and style.
Complete all remaining beats and end with the required hook.
`;

      const messages = buildStageMessages(
        'draft',
        {
          ...placeholders,
          styleGuidance: (placeholders.styleGuidance || '') + continueGuidance,
        },
        mergedConfig.systemPrompt
      );

      // Make LLM request
      let responseText = '';

      if (mergedConfig.onToken) {
        await client.chatStream(
          {
            model,
            messages,
            temperature: mergedConfig.temperature,
            max_tokens: mergedConfig.maxTokens,
          },
          (chunk) => {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              responseText += delta;
              mergedConfig.onToken?.(delta);
            }
          }
        );
      } else {
        const response = await client.chat({
          model,
          messages,
          temperature: mergedConfig.temperature,
          max_tokens: mergedConfig.maxTokens,
        });
        responseText = response.choices[0]?.message?.content || '';
      }

      // Combine partial and continuation
      const fullDraft = partialDraft + '\n\n' + responseText;

      const durationMs = Date.now() - startTime;
      const wordCount = countWordsUtil(fullDraft);

      return {
        success: true,
        text: fullDraft,
        wordCount,
        tokens: { prompt: 0, completion: 0 },
        durationMs,
        modelId: model,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        text: partialDraft, // Return what we had
        wordCount: countWordsUtil(partialDraft),
        tokens: { prompt: 0, completion: 0 },
        durationMs,
        error: error instanceof Error ? error.message : String(error),
        modelId: model,
      };
    }
  }

  /**
   * Convert draft result to Content object
   */
  function toContent(structureId: string, result: DraftResult): Content {
    const now = new Date().toISOString();
    return {
      id: nanoid(),
      structureId,
      currentVersion: 1,
      versions: [
        {
          version: 1,
          text: result.text,
          wordCount: result.wordCount,
          source: 'generated',
          metadata: {
            modelId: result.modelId,
            generationStage: 'draft',
          },
          createdAt: now,
        },
      ],
      text: result.text,
      status: 'draft',
      reviews: [],
      generationHistory: [],
      locked: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    generate,
    revise,
    continue: draftContinue,
    toContent,
    countWords: countWordsUtil,
    splitParagraphs: splitParagraphsUtil,
  };
}
