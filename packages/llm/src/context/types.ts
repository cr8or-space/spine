/**
 * Context assembly types
 *
 * Types for building LLM prompts with relevant story context
 * while staying within token budgets.
 */

import type {
  Character,
  CharacterSummary,
  Content,
  ContentSummary,
  Faction,
  FactionSummary,
  Location,
  LocationSummary,
  PlotThread,
  PlotThreadSummary,
  Structure,
  WorldRule,
  WorldRuleSummary,
} from '@repo/types';

/**
 * Task types that require different context assembly strategies
 */
export type ContextTaskType =
  | 'outline'
  | 'beat-expansion'
  | 'draft'
  | 'analysis'
  | 'continuity-check'
  | 'self-review';

/**
 * Token budget allocation for different context sections
 */
export interface TokenBudget {
  /** Total tokens available for context */
  total: number;
  /** Tokens reserved for system prompt */
  system: number;
  /** Tokens reserved for bible context */
  bible: number;
  /** Tokens reserved for recent content */
  recentContent: number;
  /** Tokens reserved for structure context */
  structure: number;
  /** Tokens reserved for constraints */
  constraints: number;
  /** Tokens reserved for task-specific instructions */
  task: number;
  /** Tokens reserved for completion (response) */
  completion: number;
}

/**
 * Default budget allocations by task type (as percentages of available tokens)
 */
export const DEFAULT_BUDGET_ALLOCATIONS: Record<ContextTaskType, Omit<TokenBudget, 'total'>> = {
  outline: {
    system: 500,
    bible: 2000,
    recentContent: 500,
    structure: 1000,
    constraints: 500,
    task: 500,
    completion: 2000,
  },
  'beat-expansion': {
    system: 500,
    bible: 1500,
    recentContent: 1000,
    structure: 1500,
    constraints: 500,
    task: 500,
    completion: 1500,
  },
  draft: {
    system: 500,
    bible: 2500,
    recentContent: 2000,
    structure: 1000,
    constraints: 1000,
    task: 500,
    completion: 4000,
  },
  analysis: {
    system: 500,
    bible: 1000,
    recentContent: 3000,
    structure: 500,
    constraints: 500,
    task: 500,
    completion: 1000,
  },
  'continuity-check': {
    system: 500,
    bible: 3000,
    recentContent: 2000,
    structure: 500,
    constraints: 1000,
    task: 500,
    completion: 500,
  },
  'self-review': {
    system: 500,
    bible: 1500,
    recentContent: 2500,
    structure: 500,
    constraints: 500,
    task: 1000,
    completion: 1500,
  },
};

/**
 * Relevance score for a bible entity
 */
export interface RelevanceScore {
  /** Entity ID */
  entityId: string;
  /** Entity type */
  entityType: 'character' | 'location' | 'faction' | 'worldRule' | 'plotThread';
  /** Relevance score (0-100) */
  score: number;
  /** Reasons for the relevance score */
  reasons: string[];
}

/**
 * Entity reference for relevance calculation
 */
export interface EntityReference {
  /** Entity ID */
  id: string;
  /** Entity type */
  type: 'character' | 'location' | 'faction' | 'worldRule' | 'plotThread';
  /** Entity name for text matching */
  name: string;
  /** Aliases for text matching */
  aliases?: string[];
}

/**
 * Context for relevance scoring
 */
export interface RelevanceContext {
  /** Current structure being worked on */
  currentStructure?: Structure;
  /** Recent content (most recent chapters) */
  recentContent?: Content[];
  /** Content summaries for reference */
  contentSummaries?: ContentSummary[];
  /** Explicit entity mentions (from beats, notes, etc.) */
  explicitMentions?: EntityReference[];
  /** Active plot threads */
  activePlotThreads?: PlotThread[];
}

/**
 * Constraint extracted from bible for LLM guidance
 */
export interface Constraint {
  /** Constraint type */
  type: 'fact' | 'rule' | 'relationship' | 'timeline' | 'voice' | 'location';
  /** Source entity ID */
  sourceId: string;
  /** Source entity type */
  sourceType: 'character' | 'location' | 'faction' | 'worldRule' | 'plotThread' | 'timeline';
  /** The constraint statement */
  statement: string;
  /** Priority (higher = more important to enforce) */
  priority: number;
  /** Whether violation would be a continuity error */
  critical: boolean;
}

/**
 * Summarized content for context assembly
 */
export interface ContentContext {
  /** Content ID */
  id: string;
  /** Structure ID */
  structureId: string;
  /** Chapter number if applicable */
  chapterNumber?: number;
  /** Title from structure */
  title: string;
  /** Summary of the content */
  summary: string;
  /** Key events in the content */
  keyEvents?: string[];
  /** Characters appearing in the content */
  charactersPresent?: string[];
  /** Location(s) of the content */
  locations?: string[];
  /** Token count of this summary */
  tokenCount: number;
}

/**
 * Bible context section
 */
export interface BibleContext {
  /** Characters included (full or summary based on relevance) */
  characters: (Character | CharacterSummary)[];
  /** Locations included */
  locations: (Location | LocationSummary)[];
  /** Factions included */
  factions: (Faction | FactionSummary)[];
  /** World rules included */
  worldRules: (WorldRule | WorldRuleSummary)[];
  /** Plot threads included */
  plotThreads: (PlotThread | PlotThreadSummary)[];
  /** Total token count */
  tokenCount: number;
}

/**
 * Structure context section
 */
export interface StructureContext {
  /** Current structure node */
  current: Structure;
  /** Parent structures (for hierarchy context) */
  ancestors: Structure[];
  /** Sibling structures (for narrative flow) */
  siblings: Structure[];
  /** Total token count */
  tokenCount: number;
}

/**
 * Assembled context ready for prompt building
 */
export interface AssembledContext {
  /** Task type this context was assembled for */
  taskType: ContextTaskType;
  /** Bible context section */
  bible: BibleContext;
  /** Recent content context */
  recentContent: ContentContext[];
  /** Structure context */
  structure: StructureContext | null;
  /** Extracted constraints */
  constraints: Constraint[];
  /** Token budget used */
  budget: TokenBudget;
  /** Actual tokens used per section */
  actualTokens: {
    bible: number;
    recentContent: number;
    structure: number;
    constraints: number;
    total: number;
  };
}

/**
 * Options for context assembly
 */
export interface ContextAssemblyOptions {
  /** Task type for budget allocation */
  taskType: ContextTaskType;
  /** Total token budget (defaults based on model) */
  totalBudget?: number;
  /** Custom budget allocations (overrides defaults) */
  customBudget?: Partial<TokenBudget>;
  /** Number of recent chapters to include */
  recentChapterCount?: number;
  /** Minimum relevance score to include entity (0-100) */
  relevanceThreshold?: number;
  /** Whether to include full entities or just summaries */
  preferFullEntities?: boolean;
  /** Maximum entities per type */
  maxEntitiesPerType?: number;
  /** Explicit entity IDs to always include */
  alwaysInclude?: EntityReference[];
  /** Entity IDs to exclude */
  exclude?: string[];
}

/**
 * Default context assembly options
 */
export const DEFAULT_CONTEXT_OPTIONS: Required<
  Omit<ContextAssemblyOptions, 'customBudget' | 'alwaysInclude' | 'exclude'>
> = {
  taskType: 'draft',
  totalBudget: 8000,
  recentChapterCount: 3,
  relevanceThreshold: 30,
  preferFullEntities: false,
  maxEntitiesPerType: 10,
};
