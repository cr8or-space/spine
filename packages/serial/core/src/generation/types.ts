/**
 * Generation pipeline types
 *
 * Types for orchestrating the outline → beats → draft → review generation cycle.
 */

import type { Beat, Content, GenerationRecord, Structure } from '@repo/serial-types';
import type { AssembledContext } from '@repo/framework-llm';

/**
 * Generation stage in the pipeline
 */
export type GenerationStage = 'outline' | 'beats' | 'draft' | 'revision' | 'self-review';

/**
 * Stage status
 */
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Generation pipeline state
 */
export interface PipelineState {
  /** Current stage */
  currentStage: GenerationStage;
  /** Status of each stage */
  stageStatuses: Record<GenerationStage, StageStatus>;
  /** Error if any stage failed */
  error?: PipelineError;
  /** Number of retries attempted for current stage */
  retryCount: number;
  /** Intermediate results from each stage */
  stageResults: Partial<Record<GenerationStage, StageResult>>;
  /** Timestamps */
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Result from a single generation stage
 */
export interface StageResult {
  /** Stage that produced this result */
  stage: GenerationStage;
  /** Whether the stage succeeded */
  success: boolean;
  /** Generated content (if applicable) */
  generatedText?: string;
  /** Generated beats (for outline/beats stages) */
  generatedBeats?: Beat[];
  /** Analysis/feedback (for self-review stage) */
  feedback?: SelfReviewFeedback;
  /** Token usage */
  tokens: {
    prompt: number;
    completion: number;
  };
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Self-review feedback from LLM
 */
export interface SelfReviewFeedback {
  /** Overall quality score (0-100) */
  qualityScore: number;
  /** Specific issues found */
  issues: SelfReviewIssue[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Whether content should be regenerated */
  shouldRegenerate: boolean;
  /** Paragraphs that need revision */
  problematicParagraphs: number[];
}

/**
 * Issue found during self-review
 */
export interface SelfReviewIssue {
  /** Type of issue */
  type: 'continuity' | 'pacing' | 'voice' | 'clarity' | 'hook' | 'tension' | 'other';
  /** Severity (0-100, higher is worse) */
  severity: number;
  /** Description of the issue */
  description: string;
  /** Location in text (paragraph index) */
  paragraphIndex?: number;
  /** Suggested fix */
  suggestedFix?: string;
}

/**
 * Pipeline error
 */
export interface PipelineError {
  /** Stage where error occurred */
  stage: GenerationStage;
  /** Error type */
  type: 'llm_error' | 'parse_error' | 'validation_error' | 'context_error' | 'timeout' | 'unknown';
  /** Error message */
  message: string;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Original error for debugging */
  originalError?: unknown;
}

/**
 * Generation request
 */
export interface GenerationRequest {
  /** Structure to generate content for */
  structure: Structure;
  /** Assembled context for the generation */
  context: AssembledContext;
  /** Generation options */
  options: GenerationOptions;
}

/**
 * Generation options
 */
export interface GenerationOptions {
  /** Model to use (overrides client default) */
  model?: string;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** Maximum tokens for completion */
  maxTokens?: number;
  /** Stages to run (defaults to all) */
  stages?: GenerationStage[];
  /** Whether to run self-review */
  includeSelfReview?: boolean;
  /** Maximum retries per stage */
  maxRetries?: number;
  /** Custom system prompt */
  systemPrompt?: string;
  /** Style guidance */
  styleGuidance?: string;
  /** Target word count for draft */
  targetWordCount?: number;
  /** Callback for stage progress */
  onStageStart?: (stage: GenerationStage) => void;
  /** Callback for stage completion */
  onStageComplete?: (stage: GenerationStage, result: StageResult) => void;
  /** Callback for streaming tokens */
  onToken?: (token: string) => void;
}

/**
 * Default generation options
 */
export const DEFAULT_GENERATION_OPTIONS: Required<
  Omit<GenerationOptions, 'model' | 'systemPrompt' | 'styleGuidance' | 'onStageStart' | 'onStageComplete' | 'onToken'>
> = {
  temperature: 0.7,
  maxTokens: 4000,
  stages: ['outline', 'beats', 'draft', 'self-review'],
  includeSelfReview: true,
  maxRetries: 2,
  targetWordCount: 2000,
};

/**
 * Generation result
 */
export interface GenerationResult {
  /** Whether generation succeeded */
  success: boolean;
  /** Final content (if successful) */
  content?: Content;
  /** Pipeline state at completion */
  pipelineState: PipelineState;
  /** Generation record for history */
  generationRecord: GenerationRecord;
  /** Self-review feedback (if self-review ran) */
  selfReviewFeedback?: SelfReviewFeedback;
}

/**
 * Prompt template for a generation stage
 */
export interface PromptTemplate {
  /** Template ID */
  id: string;
  /** Stage this template is for */
  stage: GenerationStage;
  /** System prompt */
  systemPrompt: string;
  /** User prompt template (supports placeholders) */
  userPromptTemplate: string;
  /** Description of the template */
  description: string;
}

/**
 * Prompt template placeholders
 */
export interface PromptPlaceholders {
  /** Story context (bible, recent content, etc.) */
  context: string;
  /** Current structure details */
  structure: string;
  /** Beats to expand (for draft stage) */
  beats?: string;
  /** Draft to review (for self-review stage) */
  draft?: string;
  /** Style guidance */
  styleGuidance?: string;
  /** Target word count */
  targetWordCount?: number;
  /** Constraints */
  constraints?: string;
  /** Hook requirements */
  hookRequirements?: string;
  /** Tension target */
  tensionTarget?: number;
  /** Issues for revision stage */
  issues?: Array<{ type: string; severity: number; description: string; suggestedFix?: string }>;
  /** Suggestions for revision stage */
  suggestions?: string[];
  /** Problematic paragraphs for revision stage */
  problematicParagraphs?: string;
}

/**
 * Generation history entry
 */
export interface GenerationHistoryEntry {
  /** Entry ID */
  id: string;
  /** Content ID */
  contentId: string;
  /** Structure ID */
  structureId: string;
  /** When generation started */
  startedAt: string;
  /** When generation completed */
  completedAt?: string;
  /** Whether generation succeeded */
  success: boolean;
  /** Stage that was completed or failed */
  finalStage: GenerationStage;
  /** Total tokens used */
  totalTokens: {
    prompt: number;
    completion: number;
  };
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Model used */
  modelId: string;
  /** Options used */
  options: GenerationOptions;
  /** Error if failed */
  error?: PipelineError;
}

/**
 * Interface for generation pipeline
 */
export interface GenerationPipeline {
  /**
   * Run the full generation pipeline
   */
  generate(request: GenerationRequest): Promise<GenerationResult>;

  /**
   * Run a single stage
   */
  runStage(
    stage: GenerationStage,
    request: GenerationRequest,
    previousResults?: Partial<Record<GenerationStage, StageResult>>
  ): Promise<StageResult>;

  /**
   * Retry a failed stage
   */
  retryStage(
    stage: GenerationStage,
    request: GenerationRequest,
    previousResults: Partial<Record<GenerationStage, StageResult>>
  ): Promise<StageResult>;

  /**
   * Get current pipeline state
   */
  getState(): PipelineState | null;

  /**
   * Cancel running generation
   */
  cancel(): void;
}
