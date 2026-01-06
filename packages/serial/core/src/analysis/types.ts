/**
 * Types for the analysis engine
 *
 * The analysis engine uses LLM to evaluate content quality,
 * tension levels, hook strength, pacing, and continuity.
 */

import type {
  Bible,
  Content,
  ContentAnalysis,
  ContinuityIssue,
  ExplainedScore,
  Structure,
} from '@repo/serial-types';
import type { LLMClient } from '@repo/framework-llm';

/**
 * Configuration for analysis operations
 */
export interface AnalysisConfig {
  /** Model to use for analysis */
  model?: string;
  /** Temperature for LLM calls (lower = more deterministic) */
  temperature?: number;
  /** Maximum tokens for analysis response */
  maxTokens?: number;
  /** Whether to include detailed factor breakdown */
  includeFactors?: boolean;
  /** Minimum score threshold for flagging issues */
  issueThreshold?: number;
}

/**
 * Default analysis configuration
 */
export const DEFAULT_ANALYSIS_CONFIG: Required<AnalysisConfig> = {
  model: '',
  temperature: 0.3,
  maxTokens: 2000,
  includeFactors: true,
  issueThreshold: 40,
};

/**
 * Input for content analysis
 */
export interface AnalysisInput {
  /** Content to analyze */
  content: Content;
  /** Structure containing the content */
  structure: Structure;
  /** Story bible for context */
  bible: Bible;
  /** Recent content for continuity checking */
  recentContent?: ContentSummaryForAnalysis[];
}

/**
 * Minimal content summary for continuity context
 */
export interface ContentSummaryForAnalysis {
  id: string;
  structureId: string;
  title: string;
  summary: string;
  characterAppearances: string[];
  locationAppearances: string[];
}

/**
 * Result of a tension analysis
 */
export interface TensionAnalysisResult {
  score: ExplainedScore;
  /** Planned vs actual divergence (if structure has tension target) */
  divergence?: number;
  /** Key tension moments identified */
  tensionMoments: TensionMoment[];
}

/**
 * A moment of tension in the content
 */
export interface TensionMoment {
  /** Description of the moment */
  description: string;
  /** Estimated position (0-100) within the content */
  position: number;
  /** Type of tension */
  type: 'conflict' | 'suspense' | 'emotional' | 'mystery' | 'action';
  /** Intensity (0-100) */
  intensity: number;
}

/**
 * Result of hook strength analysis
 */
export interface HookAnalysisResult {
  score: ExplainedScore;
  /** Type of hook used */
  hookType: 'revelation' | 'decision' | 'cliffhanger' | 'emotional' | 'question' | 'twist' | 'promise' | 'none';
  /** Suggestions for improvement */
  improvements?: string[];
}

/**
 * Result of pacing analysis
 */
export interface PacingAnalysisResult {
  score: ExplainedScore;
  /** Pacing segments with their characteristics */
  segments: PacingSegment[];
  /** Overall pacing profile */
  profile: 'fast' | 'moderate' | 'slow' | 'varied';
}

/**
 * A segment with distinct pacing
 */
export interface PacingSegment {
  /** Approximate position range (0-100) */
  startPosition: number;
  endPosition: number;
  /** Pacing type */
  type: 'action' | 'dialogue' | 'description' | 'introspection' | 'transition';
  /** Speed rating */
  speed: 'fast' | 'moderate' | 'slow';
}

/**
 * Result of continuity checking
 */
export interface ContinuityCheckResult {
  /** All issues found */
  issues: ContinuityIssue[];
  /** Characters mentioned in content */
  characterMentions: CharacterMention[];
  /** Locations mentioned in content */
  locationMentions: LocationMention[];
  /** World rules relevant to content */
  relevantRules: string[];
  /** Overall continuity score */
  score: number;
}

/**
 * Character mention in content
 */
export interface CharacterMention {
  characterId: string;
  characterName: string;
  /** Type of appearance */
  appearanceType: 'mention' | 'scene' | 'pov';
  /** Number of dialogue lines (approximate) */
  dialogueLines: number;
  /** Whether character actions are consistent */
  consistent: boolean;
  /** Issues with this character, if any */
  issues?: string[];
}

/**
 * Location mention in content
 */
export interface LocationMention {
  locationId: string;
  locationName: string;
  /** Whether location description is consistent */
  consistent: boolean;
  /** Issues with this location, if any */
  issues?: string[];
}

/**
 * Full analysis result combining all analysis types
 */
export interface FullAnalysisResult {
  tension: TensionAnalysisResult;
  hook?: HookAnalysisResult;
  pacing: PacingAnalysisResult;
  continuity: ContinuityCheckResult;
  /** Word count */
  wordCount: number;
  /** Estimated reading time in minutes */
  readingTime: number;
  /** When analysis was performed */
  analyzedAt: string;
  /** Model used for analysis */
  modelId?: string;
}

/**
 * Analysis service interface
 */
export interface AnalysisService {
  /** Analyze content tension levels */
  analyzeTension(input: AnalysisInput, config?: AnalysisConfig): Promise<TensionAnalysisResult>;
  /** Analyze hook strength (for chapter endings) */
  analyzeHook(input: AnalysisInput, config?: AnalysisConfig): Promise<HookAnalysisResult>;
  /** Analyze pacing */
  analyzePacing(input: AnalysisInput, config?: AnalysisConfig): Promise<PacingAnalysisResult>;
  /** Check continuity against bible */
  checkContinuity(input: AnalysisInput, config?: AnalysisConfig): Promise<ContinuityCheckResult>;
  /** Run full analysis */
  analyzeContent(input: AnalysisInput, config?: AnalysisConfig): Promise<FullAnalysisResult>;
  /** Convert analysis result to ContentAnalysis for storage */
  toContentAnalysis(
    contentId: string,
    contentVersion: number,
    result: FullAnalysisResult
  ): ContentAnalysis;
}

/**
 * Factory for creating analysis service
 */
export type CreateAnalysisService = (client: LLMClient) => AnalysisService;
