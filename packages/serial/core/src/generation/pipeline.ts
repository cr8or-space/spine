/**
 * Generation pipeline implementation
 *
 * Orchestrates the outline → beats → draft → self-review cycle.
 */

import { nanoid } from 'nanoid';
import type { Beat, Content, GenerationRecord } from '@repo/serial-types';
import type { LLMClient } from '@repo/framework-llm';
import { formatContext as formatContextLlm } from '@repo/framework-llm';

import {
  type GenerationPipeline,
  type GenerationRequest,
  type GenerationResult,
  type GenerationOptions,
  type GenerationStage,
  type PipelineState,
  type PipelineError,
  type StageResult,
  type SelfReviewFeedback,
  DEFAULT_GENERATION_OPTIONS,
} from './types';
import { buildStageMessages } from './prompts';
import { formatStructureForPipeline } from './formatting';
import { countWords as countWordsUtil } from '../utils/text';
import { parsePipelineOutline, parsePipelineBeats } from './parsing';

/**
 * Create a generation pipeline
 */
export function createGenerationPipeline(client: LLMClient): GenerationPipeline {
  let currentState: PipelineState | null = null;
  let cancelled = false;

  /**
   * Initialize pipeline state
   */
  function initializeState(): PipelineState {
    const now = new Date().toISOString();
    return {
      currentStage: 'outline',
      stageStatuses: {
        outline: 'pending',
        beats: 'pending',
        draft: 'pending',
        revision: 'pending',
        'self-review': 'pending',
      },
      retryCount: 0,
      stageResults: {},
      startedAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update pipeline state
   */
  function updateState(updates: Partial<PipelineState>): void {
    if (currentState) {
      currentState = {
        ...currentState,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Build placeholders for prompt template
   */
  function buildPlaceholders(
    request: GenerationRequest,
    previousResults?: Partial<Record<GenerationStage, StageResult>>
  ): {
    context: string;
    structure: string;
    beats?: string;
    draft?: string;
    styleGuidance?: string;
    targetWordCount?: number;
    constraints?: string;
    hookRequirements?: string;
    tensionTarget?: number;
  } {
    const { structure, context, options } = request;

    // Format context for prompt
    const formattedContext = formatContextLlm(context);

    // Format structure
    const structureText = formatStructureForPipeline(structure);

    // Format beats if we have them from previous stages
    let beatsText: string | undefined;
    if (previousResults?.outline?.generatedBeats) {
      beatsText = formatBeats(previousResults.outline.generatedBeats);
    } else if (previousResults?.beats?.generatedBeats) {
      beatsText = formatBeats(previousResults.beats.generatedBeats);
    }

    // Get draft text if available
    const draftText = previousResults?.draft?.generatedText;

    // Format constraints
    const constraintsText = context.constraints.length > 0
      ? context.constraints.map((c) => `- ${c.statement}`).join('\n')
      : undefined;

    // Hook requirements
    const hookRequirements = structure.hook?.type || 'engaging';

    return {
      context: formattedContext,
      structure: structureText,
      beats: beatsText,
      draft: draftText,
      styleGuidance: options.styleGuidance,
      targetWordCount: options.targetWordCount || DEFAULT_GENERATION_OPTIONS.targetWordCount,
      constraints: constraintsText,
      hookRequirements,
      tensionTarget: structure.tensionTarget,
    };
  }

  /**
   * Format beats for prompt
   */
  function formatBeats(beats: Beat[]): string {
    return beats
      .sort((a, b) => a.order - b.order)
      .map((beat, i) => {
        let line = `${i + 1}. ${beat.description}`;
        if (beat.targetWordCount) {
          line += ` (~${beat.targetWordCount} words)`;
        }
        return line;
      })
      .join('\n');
  }

  /**
   * Parse outline response into beats
   *
   * Uses shared parsing utility with no minimum description length.
   */
  function parseOutlineResponse(text: string): Beat[] {
    return parsePipelineOutline(text);
  }

  /**
   * Parse beats response into detailed beats
   *
   * Uses shared parsing utility with word count extraction only.
   */
  function parseBeatsResponse(text: string): Beat[] {
    return parsePipelineBeats(text);
  }

  /**
   * Parse self-review JSON response
   */
  function parseSelfReviewResponse(text: string): SelfReviewFeedback {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Return default feedback if no JSON found
      return {
        qualityScore: 70,
        issues: [],
        suggestions: [],
        shouldRegenerate: false,
        problematicParagraphs: [],
      };
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
      return {
        qualityScore: 70,
        issues: [],
        suggestions: [],
        shouldRegenerate: false,
        problematicParagraphs: [],
      };
    }
  }

  /**
   * Create error from unknown error type
   */
  function createError(stage: GenerationStage, error: unknown): PipelineError {
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('rate limit')) {
        return {
          stage,
          type: 'llm_error',
          message: error.message,
          retryable: true,
          originalError: error,
        };
      }
      if (error.message.includes('timeout')) {
        return {
          stage,
          type: 'timeout',
          message: error.message,
          retryable: true,
          originalError: error,
        };
      }
      return {
        stage,
        type: 'unknown',
        message: error.message,
        retryable: false,
        originalError: error,
      };
    }
    return {
      stage,
      type: 'unknown',
      message: String(error),
      retryable: false,
      originalError: error,
    };
  }

  /**
   * Run a single generation stage
   */
  async function runStage(
    stage: GenerationStage,
    request: GenerationRequest,
    previousResults?: Partial<Record<GenerationStage, StageResult>>
  ): Promise<StageResult> {
    const { options } = request;
    const startTime = Date.now();

    // Check for cancellation
    if (cancelled) {
      return {
        stage,
        success: false,
        tokens: { prompt: 0, completion: 0 },
        durationMs: 0,
        error: 'Generation cancelled',
      };
    }

    // Notify stage start
    options.onStageStart?.(stage);

    try {
      // Build messages for this stage
      const placeholders = buildPlaceholders(request, previousResults);
      const messages = buildStageMessages(stage, placeholders, options.systemPrompt);

      // Make LLM request
      let responseText = '';
      const model = options.model || client.getConfig().defaultModel;

      if (options.onToken) {
        // Use streaming
        await client.chatStream(
          {
            model,
            messages,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
          },
          (chunk) => {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              responseText += delta;
              options.onToken?.(delta);
            }
          }
        );
      } else {
        // Non-streaming
        const response = await client.chat({
          model,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        });
        responseText = response.choices[0]?.message?.content || '';
      }

      const durationMs = Date.now() - startTime;

      // Parse response based on stage
      let result: StageResult;

      switch (stage) {
        case 'outline':
          result = {
            stage,
            success: true,
            generatedText: responseText,
            generatedBeats: parseOutlineResponse(responseText),
            tokens: { prompt: 0, completion: 0 }, // TODO: Get from response
            durationMs,
          };
          break;

        case 'beats':
          result = {
            stage,
            success: true,
            generatedText: responseText,
            generatedBeats: parseBeatsResponse(responseText),
            tokens: { prompt: 0, completion: 0 },
            durationMs,
          };
          break;

        case 'draft':
        case 'revision':
          result = {
            stage,
            success: true,
            generatedText: responseText,
            tokens: { prompt: 0, completion: 0 },
            durationMs,
          };
          break;

        case 'self-review':
          result = {
            stage,
            success: true,
            generatedText: responseText,
            feedback: parseSelfReviewResponse(responseText),
            tokens: { prompt: 0, completion: 0 },
            durationMs,
          };
          break;

        default:
          result = {
            stage,
            success: true,
            generatedText: responseText,
            tokens: { prompt: 0, completion: 0 },
            durationMs,
          };
      }

      // Notify stage completion
      options.onStageComplete?.(stage, result);

      return result;
    } catch (error) {
      const pipelineError = createError(stage, error);
      const durationMs = Date.now() - startTime;

      const result: StageResult = {
        stage,
        success: false,
        tokens: { prompt: 0, completion: 0 },
        durationMs,
        error: pipelineError.message,
      };

      options.onStageComplete?.(stage, result);

      return result;
    }
  }

  /**
   * Retry a failed stage
   */
  async function retryStage(
    stage: GenerationStage,
    request: GenerationRequest,
    previousResults: Partial<Record<GenerationStage, StageResult>>
  ): Promise<StageResult> {
    // Simply re-run the stage
    return runStage(stage, request, previousResults);
  }

  /**
   * Run the full generation pipeline
   */
  async function generate(request: GenerationRequest): Promise<GenerationResult> {
    cancelled = false;
    currentState = initializeState();

    const { options } = request;
    const mergedOptions: GenerationOptions = {
      ...DEFAULT_GENERATION_OPTIONS,
      ...options,
    };

    // Determine which stages to run
    const stagesToRun = mergedOptions.stages || DEFAULT_GENERATION_OPTIONS.stages;
    const maxRetries = mergedOptions.maxRetries || DEFAULT_GENERATION_OPTIONS.maxRetries;

    const stageResults: Partial<Record<GenerationStage, StageResult>> = {};
    let lastError: PipelineError | undefined;

    // Run each stage
    for (const stage of stagesToRun) {
      if (cancelled) {
        break;
      }

      // Skip self-review if not requested
      if (stage === 'self-review' && !mergedOptions.includeSelfReview) {
        updateState({
          stageStatuses: {
            ...currentState!.stageStatuses,
            [stage]: 'skipped',
          },
        });
        continue;
      }

      updateState({
        currentStage: stage,
        stageStatuses: {
          ...currentState!.stageStatuses,
          [stage]: 'running',
        },
      });

      let result: StageResult | undefined;
      let retryCount = 0;

      // Try the stage with retries
      while (retryCount <= maxRetries) {
        result = await runStage(stage, { ...request, options: mergedOptions }, stageResults);

        if (result.success) {
          break;
        }

        // Check if retryable
        const error = createError(stage, result.error);
        if (!error.retryable || retryCount >= maxRetries) {
          lastError = error;
          break;
        }

        retryCount++;
        updateState({ retryCount });

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      }

      if (result) {
        stageResults[stage] = result;

        if (result.success) {
          updateState({
            stageStatuses: {
              ...currentState!.stageStatuses,
              [stage]: 'completed',
            },
            stageResults,
          });
        } else {
          updateState({
            stageStatuses: {
              ...currentState!.stageStatuses,
              [stage]: 'failed',
            },
            stageResults,
            error: lastError,
          });
          break; // Stop pipeline on failure
        }
      }

      // Check if self-review indicates we should regenerate
      if (
        stage === 'self-review' &&
        result?.feedback?.shouldRegenerate &&
        stagesToRun.includes('revision')
      ) {
        // Run revision stage
        const revisionResult = await runStage(
          'revision',
          { ...request, options: mergedOptions },
          {
            ...stageResults,
            'self-review': result,
          }
        );

        stageResults['revision'] = revisionResult;

        if (revisionResult.success) {
          // Replace draft with revision
          stageResults['draft'] = revisionResult;
        }
      }
    }

    // Mark pipeline as complete
    const completedAt = new Date().toISOString();
    updateState({ completedAt });

    // Build final result
    const success = !lastError && stageResults['draft']?.success === true;
    const draftText = stageResults['draft']?.generatedText || '';

    // Create content object
    const content: Content | undefined = success
      ? {
          id: nanoid(),
          structureId: request.structure.id,
          currentVersion: 1,
          versions: [
            {
              version: 1,
              text: draftText,
              wordCount: countWordsUtil(draftText),
              source: 'generated',
              createdAt: completedAt,
            },
          ],
          text: draftText,
          status: 'draft',
          reviews: [],
          generationHistory: [],
          locked: false,
          createdAt: currentState!.startedAt,
          updatedAt: completedAt,
        }
      : undefined;

    // Calculate total tokens and duration
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalDurationMs = 0;

    for (const result of Object.values(stageResults)) {
      if (result) {
        totalPromptTokens += result.tokens.prompt;
        totalCompletionTokens += result.tokens.completion;
        totalDurationMs += result.durationMs;
      }
    }

    // Create generation record
    const generationRecord: GenerationRecord = {
      id: nanoid(),
      contentId: content?.id || '',
      version: 1,
      modelId: mergedOptions.model || client.getConfig().defaultModel,
      temperature: mergedOptions.temperature || DEFAULT_GENERATION_OPTIONS.temperature,
      tokens: {
        prompt: totalPromptTokens,
        completion: totalCompletionTokens,
      },
      durationMs: totalDurationMs,
      stage: lastError?.stage || 'draft',
      success,
      error: lastError?.message,
      createdAt: completedAt,
    };

    return {
      success,
      content,
      pipelineState: currentState!,
      generationRecord,
      selfReviewFeedback: stageResults['self-review']?.feedback,
    };
  }

  /**
   * Get current pipeline state
   */
  function getState(): PipelineState | null {
    return currentState;
  }

  /**
   * Cancel running generation
   */
  function cancel(): void {
    cancelled = true;
  }

  return {
    generate,
    runStage,
    retryStage,
    getState,
    cancel,
  };
}
