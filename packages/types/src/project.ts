import { z } from 'zod';

import { BibleSchema } from './bible';
import { IdSchema, TimestampSchema } from './common';
import { ContentSchema } from './content';
import { StructureSchema } from './structure';

/**
 * Project format - determines default settings and constraints
 */
export const ProjectFormatSchema = z.enum(['short', 'light-novel', 'web-serial']);
export type ProjectFormat = z.infer<typeof ProjectFormatSchema>;

/**
 * LLM provider configuration
 */
export const LlmConfigSchema = z.object({
  /** API endpoint URL (OpenAI-compatible) */
  endpoint: z.string().url(),
  /** Model identifier */
  model: z.string(),
  /** API key (stored separately for security) */
  apiKeyRef: z.string().optional(),
  /** Default temperature */
  temperature: z.number().min(0).max(2).default(0.7),
  /** Maximum tokens for generation */
  maxTokens: z.number().int().positive().default(4096),
  /** Context window size */
  contextWindow: z.number().int().positive().default(128000),
});
export type LlmConfig = z.infer<typeof LlmConfigSchema>;

/**
 * Revision cascade settings
 */
export const RevisionSettingsSchema = z.object({
  /** Maximum chapters to cascade revisions */
  horizonChapters: z.number().int().positive().default(20),
  /** Whether to auto-cascade or require confirmation */
  autoCascade: z.boolean().default(false),
  /** Whether to preview impact before cascading */
  previewImpact: z.boolean().default(true),
});
export type RevisionSettings = z.infer<typeof RevisionSettingsSchema>;

/**
 * Web serial specific settings
 */
export const SerialSettingsSchema = z.object({
  /** Tension cycle length in chapters */
  cycleLength: z.number().int().positive().default(5),
  /** Per-position tension targets */
  cycleTensionTargets: z.array(z.number().min(0).max(100)),
  /** Minimum buffer chapters before release */
  minimumBuffer: z.number().int().min(0).default(5),
  /** Release schedule (days between releases) */
  releaseInterval: z.number().int().positive().default(2),
  /** Hook variety enforcement */
  enforceHookVariety: z.boolean().default(true),
  /** Maximum consecutive same-type hooks */
  maxConsecutiveSameHook: z.number().int().positive().default(2),
});
export type SerialSettings = z.infer<typeof SerialSettingsSchema>;

/**
 * Bible extraction settings
 */
export const ExtractionSettingsSchema = z.object({
  /** How aggressively to suggest new entities */
  aggressiveness: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
  /** Entity types to auto-extract */
  autoExtractTypes: z
    .array(z.enum(['character', 'location', 'faction', 'world-rule']))
    .default(['character', 'location']),
  /** Whether to suggest updates to existing entities */
  suggestUpdates: z.boolean().default(true),
});
export type ExtractionSettings = z.infer<typeof ExtractionSettingsSchema>;

/**
 * Project settings
 */
export const ProjectSettingsSchema = z.object({
  /** LLM configuration */
  llm: LlmConfigSchema,
  /** Revision cascade settings */
  revision: RevisionSettingsSchema,
  /** Web serial settings (only for web-serial format) */
  serial: SerialSettingsSchema.optional(),
  /** Bible extraction settings */
  extraction: ExtractionSettingsSchema,
  /** Default chapter word count target */
  defaultChapterWordCount: z.number().int().positive().default(2500),
  /** Auto-save interval in seconds (0 to disable) */
  autoSaveInterval: z.number().int().min(0).default(60),
});
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

/**
 * Project metadata
 */
export const ProjectMetadataSchema = z.object({
  /** Author name */
  author: z.string().optional(),
  /** Project description */
  description: z.string().optional(),
  /** Genre tags */
  genres: z.array(z.string()),
  /** Target audience */
  audience: z.enum(['general', 'young-adult', 'adult']).optional(),
  /** Estimated total word count */
  estimatedWordCount: z.number().int().positive().optional(),
  /** Cover image path */
  coverImage: z.string().optional(),
});
export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;

/**
 * Project statistics
 */
export const ProjectStatsSchema = z.object({
  /** Total word count across all content */
  totalWordCount: z.number().int().min(0),
  /** Total chapters */
  totalChapters: z.number().int().min(0),
  /** Chapters by status */
  chaptersByStatus: z.object({
    draft: z.number().int().min(0),
    review: z.number().int().min(0),
    approved: z.number().int().min(0),
    published: z.number().int().min(0),
  }),
  /** Bible entity counts */
  bibleStats: z.object({
    characters: z.number().int().min(0),
    locations: z.number().int().min(0),
    factions: z.number().int().min(0),
    worldRules: z.number().int().min(0),
    plotThreads: z.number().int().min(0),
    timelineEvents: z.number().int().min(0),
  }),
  /** Unresolved continuity issues */
  unresolvedIssues: z.number().int().min(0),
  /** Last updated timestamp */
  calculatedAt: TimestampSchema,
});
export type ProjectStats = z.infer<typeof ProjectStatsSchema>;

/**
 * Project entity - top-level container for a novel
 */
export const ProjectSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  format: ProjectFormatSchema,
  settings: ProjectSettingsSchema,
  metadata: ProjectMetadataSchema,
  /** The story bible */
  bible: BibleSchema,
  /** The structure tree (root is usually a book) */
  structure: StructureSchema,
  /** All content pieces */
  content: z.array(ContentSchema),
  /** Cached statistics */
  stats: ProjectStatsSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

/**
 * Project summary for listing
 */
export const ProjectSummarySchema = z.object({
  id: IdSchema,
  title: z.string(),
  format: ProjectFormatSchema,
  wordCount: z.number().int().min(0),
  chapterCount: z.number().int().min(0),
  lastModified: TimestampSchema,
  coverImage: z.string().optional(),
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

/**
 * Default LLM config for new projects
 */
export const DEFAULT_LLM_CONFIG: LlmConfig = {
  endpoint: 'http://localhost:1234/v1',
  model: 'local-model',
  temperature: 0.7,
  maxTokens: 4096,
  contextWindow: 128000,
};

/**
 * Default project settings
 */
export function createDefaultSettings(format: ProjectFormat): ProjectSettings {
  const base: ProjectSettings = {
    llm: DEFAULT_LLM_CONFIG,
    revision: {
      horizonChapters: 20,
      autoCascade: false,
      previewImpact: true,
    },
    extraction: {
      aggressiveness: 'moderate',
      autoExtractTypes: ['character', 'location'],
      suggestUpdates: true,
    },
    defaultChapterWordCount: 2500,
    autoSaveInterval: 60,
  };

  if (format === 'web-serial') {
    base.serial = {
      cycleLength: 5,
      cycleTensionTargets: [40, 60, 70, 80, 50],
      minimumBuffer: 5,
      releaseInterval: 2,
      enforceHookVariety: true,
      maxConsecutiveSameHook: 2,
    };
  }

  return base;
}
