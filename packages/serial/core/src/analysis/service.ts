/**
 * Analysis service implementation
 *
 * Uses LLM to analyze content for tension, hooks, pacing, and continuity.
 */

import { nanoid } from 'nanoid';
import type { ContentAnalysis, ContinuityIssue, ExplainedScore } from '@repo/serial-types';
import type { LLMClient } from '@repo/framework-llm';

import { countWords } from '../utils/text';
import type {
  AnalysisConfig,
  AnalysisInput,
  AnalysisService,
  CharacterMention,
  ContinuityCheckResult,
  FullAnalysisResult,
  HookAnalysisResult,
  LocationMention,
  PacingAnalysisResult,
  PacingSegment,
  TensionAnalysisResult,
  TensionMoment,
} from './types';
import { DEFAULT_ANALYSIS_CONFIG } from './types';
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildContinuityPrompt,
  buildHookPrompt,
  buildPacingPrompt,
  buildTensionPrompt,
} from './prompts';

/**
 * Parse JSON from LLM response, handling potential issues
 */
function parseJsonResponse<T>(text: string, fallback: T): T {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn('No JSON found in response');
    return fallback;
  }

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Merge config with defaults
 */
function mergeConfig(config?: AnalysisConfig): Required<AnalysisConfig> {
  return {
    ...DEFAULT_ANALYSIS_CONFIG,
    ...config,
  };
}

/**
 * Estimate reading time in minutes (average 200 wpm)
 */
function estimateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 200);
}

/**
 * Create a default explained score
 */
function defaultScore(score: number, explanation: string): ExplainedScore {
  return {
    score,
    explanation,
  };
}

/**
 * Create the analysis service
 */
export function createAnalysisService(client: LLMClient): AnalysisService {
  /**
   * Make an LLM call for analysis
   */
  async function callLLM(prompt: string, config: Required<AnalysisConfig>): Promise<string> {
    // Use config model or fall back to client's default model
    const model = config.model || client.getConfig().defaultModel;

    const response = await client.chat({
      model,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });

    return response.choices[0]?.message?.content ?? '';
  }

  /**
   * Analyze tension levels in content
   */
  async function analyzeTension(
    input: AnalysisInput,
    config?: AnalysisConfig
  ): Promise<TensionAnalysisResult> {
    const mergedConfig = mergeConfig(config);
    const prompt = buildTensionPrompt(input);

    const response = await callLLM(prompt, mergedConfig);

    const defaultResult: TensionAnalysisResult = {
      score: defaultScore(50, 'Unable to analyze tension'),
      tensionMoments: [],
    };

    const parsed = parseJsonResponse<{
      score: ExplainedScore;
      tensionMoments: TensionMoment[];
    }>(response, { score: defaultResult.score, tensionMoments: [] });

    // Calculate divergence if structure has tension target
    let divergence: number | undefined;
    if (input.structure.tensionTarget !== undefined) {
      divergence = parsed.score.score - input.structure.tensionTarget;
    }

    return {
      score: parsed.score,
      divergence,
      tensionMoments: parsed.tensionMoments || [],
    };
  }

  /**
   * Analyze hook strength
   */
  async function analyzeHook(
    input: AnalysisInput,
    config?: AnalysisConfig
  ): Promise<HookAnalysisResult> {
    const mergedConfig = mergeConfig(config);
    const prompt = buildHookPrompt(input);

    const response = await callLLM(prompt, mergedConfig);

    const defaultResult: HookAnalysisResult = {
      score: defaultScore(50, 'Unable to analyze hook'),
      hookType: 'none',
    };

    const parsed = parseJsonResponse<{
      score: ExplainedScore;
      hookType: HookAnalysisResult['hookType'];
      improvements?: string[];
    }>(response, defaultResult);

    return {
      score: parsed.score,
      hookType: parsed.hookType || 'none',
      improvements: parsed.improvements,
    };
  }

  /**
   * Analyze pacing
   */
  async function analyzePacing(
    input: AnalysisInput,
    config?: AnalysisConfig
  ): Promise<PacingAnalysisResult> {
    const mergedConfig = mergeConfig(config);
    const prompt = buildPacingPrompt(input);

    const response = await callLLM(prompt, mergedConfig);

    const defaultResult: PacingAnalysisResult = {
      score: defaultScore(50, 'Unable to analyze pacing'),
      segments: [],
      profile: 'moderate',
    };

    const parsed = parseJsonResponse<{
      score: ExplainedScore;
      segments: PacingSegment[];
      profile: PacingAnalysisResult['profile'];
    }>(response, defaultResult);

    return {
      score: parsed.score,
      segments: parsed.segments || [],
      profile: parsed.profile || 'moderate',
    };
  }

  /**
   * Check continuity against bible
   */
  async function checkContinuity(
    input: AnalysisInput,
    config?: AnalysisConfig
  ): Promise<ContinuityCheckResult> {
    const mergedConfig = mergeConfig(config);
    const prompt = buildContinuityPrompt(input);

    const response = await callLLM(prompt, mergedConfig);

    const defaultResult: ContinuityCheckResult = {
      issues: [],
      characterMentions: [],
      locationMentions: [],
      relevantRules: [],
      score: 100,
    };

    const parsed = parseJsonResponse<{
      issues: Array<{
        type: ContinuityIssue['type'];
        severity: ContinuityIssue['severity'];
        description: string;
        conflictsWith: {
          type: ContinuityIssue['conflictsWith']['type'];
          id: string;
          detail?: string;
        };
        suggestion?: string;
      }>;
      characterMentions: CharacterMention[];
      locationMentions: LocationMention[];
      relevantRules: string[];
      score: number;
    }>(response, defaultResult);

    // Transform issues to proper ContinuityIssue format
    const issues: ContinuityIssue[] = (parsed.issues || []).map((issue) => ({
      id: nanoid(),
      type: issue.type,
      severity: issue.severity,
      description: issue.description,
      location: {},
      conflictsWith: {
        type: issue.conflictsWith.type,
        id: issue.conflictsWith.id,
        detail: issue.conflictsWith.detail,
      },
      suggestion: issue.suggestion,
      reviewed: false,
      falsePositive: false,
    }));

    return {
      issues,
      characterMentions: parsed.characterMentions || [],
      locationMentions: parsed.locationMentions || [],
      relevantRules: parsed.relevantRules || [],
      score: parsed.score ?? 100,
    };
  }

  /**
   * Run full analysis
   */
  async function analyzeContent(
    input: AnalysisInput,
    config?: AnalysisConfig
  ): Promise<FullAnalysisResult> {
    const mergedConfig = mergeConfig(config);

    // Run all analyses in parallel
    const [tension, hook, pacing, continuity] = await Promise.all([
      analyzeTension(input, mergedConfig),
      // Only analyze hook for chapters (not scenes or books)
      input.structure.type === 'chapter'
        ? analyzeHook(input, mergedConfig)
        : Promise.resolve(undefined),
      analyzePacing(input, mergedConfig),
      checkContinuity(input, mergedConfig),
    ]);

    const wordCount = countWords(input.content.text);
    const readingTime = estimateReadingTime(wordCount);

    return {
      tension,
      hook,
      pacing,
      continuity,
      wordCount,
      readingTime,
      analyzedAt: new Date().toISOString(),
      modelId: mergedConfig.model || client.getConfig().defaultModel,
    };
  }

  /**
   * Convert analysis result to ContentAnalysis for storage
   */
  function toContentAnalysis(
    contentId: string,
    contentVersion: number,
    result: FullAnalysisResult
  ): ContentAnalysis {
    // Build character appearances from continuity check
    const characterAppearances = result.continuity.characterMentions.map((mention) => ({
      characterId: mention.characterId,
      type: mention.appearanceType,
      dialogueLines: mention.dialogueLines,
    }));

    // Build location appearances from continuity check
    const locationAppearances = result.continuity.locationMentions.map(
      (mention) => mention.locationId
    );

    // Build thread touches (placeholder - would need plot thread analysis)
    const threadTouches: ContentAnalysis['threadTouches'] = [];

    // Build character voice scores (placeholder - would need per-character analysis)
    const characterVoiceScores: ContentAnalysis['characterVoiceScores'] = {};

    return {
      id: nanoid(),
      contentId,
      contentVersion,
      tensionScore: result.tension.score,
      hookStrength: result.hook?.score,
      paceScore: result.pacing.score,
      characterVoiceScores,
      continuityIssues: result.continuity.issues,
      wordCount: result.wordCount,
      readingTime: result.readingTime,
      characterAppearances,
      locationAppearances,
      threadTouches,
      analyzedAt: result.analyzedAt,
      modelId: result.modelId,
    };
  }

  return {
    analyzeTension,
    analyzeHook,
    analyzePacing,
    checkContinuity,
    analyzeContent,
    toContentAnalysis,
  };
}
