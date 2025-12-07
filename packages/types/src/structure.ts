import { z } from 'zod';

import { IdSchema, TimestampSchema } from './common';

/**
 * Story beat - a specific moment or development to hit
 */
export const BeatSchema = z.object({
  id: IdSchema,
  description: z.string(),
  /** Whether this beat has been written */
  completed: z.boolean(),
  /** Approximate word count target */
  targetWordCount: z.number().int().positive().optional(),
  /** Order within parent structure */
  order: z.number().int().min(0),
});
export type Beat = z.infer<typeof BeatSchema>;

/**
 * Hook type for chapter/scene endings
 */
export const HookTypeSchema = z.enum([
  'revelation',
  'decision',
  'cliffhanger',
  'emotional',
  'question',
  'twist',
  'promise',
]);
export type HookType = z.infer<typeof HookTypeSchema>;

/**
 * Hook specification for ending a structural unit
 */
export const HookSchema = z.object({
  type: HookTypeSchema,
  description: z.string(),
  /** Target strength score (0-100) */
  targetStrength: z.number().min(0).max(100).optional(),
});
export type Hook = z.infer<typeof HookSchema>;

/**
 * Chapter type for variety tracking
 */
export const ChapterTypeSchema = z.enum([
  'action',
  'character',
  'worldbuilding',
  'dialogue',
  'introspection',
  'transition',
  'climax',
  'resolution',
]);
export type ChapterType = z.infer<typeof ChapterTypeSchema>;

/**
 * Structure type in the hierarchy
 */
export const StructureTypeSchema = z.enum(['book', 'arc', 'chapter', 'scene']);
export type StructureType = z.infer<typeof StructureTypeSchema>;

/**
 * Structure node - hierarchical planning unit
 *
 * The structure tree: Book → Arc → Chapter → Scene
 * Each level can contain beats to hit and tension targets.
 */
export const StructureSchema: z.ZodType<Structure> = z.lazy(() =>
  z.object({
    id: IdSchema,
    type: StructureTypeSchema,
    title: z.string().min(1),
    summary: z.string(),
    /** Story beats to hit in this structure */
    beats: z.array(BeatSchema),
    /** Target tension level (0-100) */
    tensionTarget: z.number().min(0).max(100).optional(),
    /** Chapter type (only for chapter-level structures) */
    chapterType: ChapterTypeSchema.optional(),
    /** Hook for ending this section */
    hook: HookSchema.optional(),
    /** Order within parent */
    order: z.number().int().min(0),
    /** Child structures */
    children: z.array(StructureSchema),
    /** Parent structure ID */
    parentId: IdSchema.optional(),
    /** Word count target for this structure */
    targetWordCount: z.number().int().positive().optional(),
    /** Notes for the author */
    notes: z.string().optional(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

export interface Structure {
  id: string;
  type: StructureType;
  title: string;
  summary: string;
  beats: Beat[];
  tensionTarget?: number;
  chapterType?: ChapterType;
  hook?: Hook;
  order: number;
  children: Structure[];
  parentId?: string;
  targetWordCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Flat structure reference for simpler operations
 */
export const StructureRefSchema = z.object({
  id: IdSchema,
  type: StructureTypeSchema,
  title: z.string(),
  parentId: IdSchema.optional(),
  order: z.number(),
});
export type StructureRef = z.infer<typeof StructureRefSchema>;

/**
 * Create an empty structure
 */
export function createEmptyStructure(
  id: string,
  type: StructureType,
  title: string,
  parentId?: string
): Structure {
  const now = new Date().toISOString();
  return {
    id,
    type,
    title,
    summary: '',
    beats: [],
    order: 0,
    children: [],
    parentId,
    createdAt: now,
    updatedAt: now,
  };
}
