import { z } from 'zod';

import { IdSchema, TimestampSchema } from '@repo/framework-types';

/**
 * Entity types that can be extracted
 */
export const ExtractableEntityTypeSchema = z.enum([
  'character',
  'location',
  'faction',
  'world-rule',
  'plot-thread',
]);
export type ExtractableEntityType = z.infer<typeof ExtractableEntityTypeSchema>;

/**
 * Suggestion status
 */
export const SuggestionStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'merged',
]);
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>;

/**
 * Suggestion type - new entity or update to existing
 */
export const SuggestionTypeSchema = z.enum(['new', 'update']);
export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;

/**
 * Confidence level for extraction
 */
export const ConfidenceLevelSchema = z.enum(['low', 'medium', 'high']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

/**
 * Evidence from content supporting the suggestion
 */
export const ExtractionEvidenceSchema = z.object({
  /** The excerpt from content */
  excerpt: z.string(),
  /** Structure ID where found */
  structureId: z.string(),
  /** Approximate position in content (0-100) */
  position: z.number().min(0).max(100).optional(),
});
export type ExtractionEvidence = z.infer<typeof ExtractionEvidenceSchema>;

/**
 * Suggested field update for existing entity
 */
export const FieldUpdateSchema = z.object({
  /** Field name */
  field: z.string(),
  /** Current value (if exists) */
  currentValue: z.unknown().optional(),
  /** Suggested new value */
  suggestedValue: z.unknown(),
  /** Reason for update */
  reason: z.string(),
});
export type FieldUpdate = z.infer<typeof FieldUpdateSchema>;

/**
 * Entity suggestion - either new or update
 */
export const EntitySuggestionSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  /** Type of suggestion */
  suggestionType: SuggestionTypeSchema,
  /** Entity type */
  entityType: ExtractableEntityTypeSchema,
  /** For updates: existing entity ID */
  existingEntityId: z.string().optional(),
  /** For new entities: suggested name */
  name: z.string(),
  /** Suggested data (full entity data for new, partial for update) */
  suggestedData: z.record(z.unknown()),
  /** For updates: specific field changes */
  fieldUpdates: z.array(FieldUpdateSchema).optional(),
  /** Evidence from content */
  evidence: z.array(ExtractionEvidenceSchema),
  /** Confidence in the suggestion */
  confidence: ConfidenceLevelSchema,
  /** LLM explanation */
  reasoning: z.string(),
  /** Current status */
  status: SuggestionStatusSchema,
  /** User notes on decision */
  reviewNotes: z.string().optional(),
  /** When extracted */
  createdAt: TimestampSchema,
  /** When reviewed */
  reviewedAt: TimestampSchema.optional(),
});
export type EntitySuggestion = z.infer<typeof EntitySuggestionSchema>;

/**
 * Summary of a suggestion for listing
 */
export const SuggestionSummarySchema = z.object({
  id: IdSchema,
  suggestionType: SuggestionTypeSchema,
  entityType: ExtractableEntityTypeSchema,
  name: z.string(),
  confidence: ConfidenceLevelSchema,
  status: SuggestionStatusSchema,
  evidenceCount: z.number().int().min(0),
  createdAt: TimestampSchema,
});
export type SuggestionSummary = z.infer<typeof SuggestionSummarySchema>;

/**
 * Result of running extraction on content
 */
export const ExtractionResultSchema = z.object({
  /** Structure IDs that were analyzed */
  structuresAnalyzed: z.array(z.string()),
  /** New suggestions created */
  suggestionsCreated: z.number().int().min(0),
  /** Suggestions by type */
  byType: z.object({
    new: z.number().int().min(0),
    update: z.number().int().min(0),
  }),
  /** Suggestions by entity type */
  byEntityType: z.record(z.number().int().min(0)),
  /** Any errors encountered */
  errors: z.array(z.string()),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

/**
 * Options for running extraction
 */
export const ExtractionOptionsSchema = z.object({
  /** Structure IDs to analyze (empty = all with content) */
  structureIds: z.array(z.string()).optional(),
  /** Entity types to extract (empty = use project settings) */
  entityTypes: z.array(ExtractableEntityTypeSchema).optional(),
  /** Override aggressiveness setting */
  aggressiveness: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  /** Include content that was already analyzed */
  reanalyze: z.boolean().default(false),
});
export type ExtractionOptions = z.infer<typeof ExtractionOptionsSchema>;

/**
 * Result of accepting a suggestion
 */
export const AcceptResultSchema = z.object({
  success: z.boolean(),
  /** Created or updated entity ID */
  entityId: z.string().optional(),
  /** Error message if failed */
  error: z.string().optional(),
});
export type AcceptResult = z.infer<typeof AcceptResultSchema>;
