import { z } from 'zod';

import { IdSchema, TimestampSchema } from '@repo/framework-types';

/**
 * Types of concepts in a technical book
 */
export const ConceptTypeSchema = z.enum([
  'term', // Vocabulary word or phrase
  'type', // Data type, class, or interface
  'algorithm', // Algorithm or procedure
  'pattern', // Design pattern or idiom
  'principle', // Design principle or guideline
]);
export type ConceptType = z.infer<typeof ConceptTypeSchema>;

/**
 * Example usage of a concept
 */
export const ConceptExampleSchema = z.object({
  /** Code or prose demonstrating the concept */
  content: z.string().min(1),
  /** Optional language for code examples */
  language: z.string().optional(),
  /** Brief explanation of what the example demonstrates */
  explanation: z.string().optional(),
});
export type ConceptExample = z.infer<typeof ConceptExampleSchema>;

/**
 * Link between a code symbol and its explaining concept
 */
export const SymbolLinkSchema = z.object({
  /** The code symbol (function name, type name, etc.) */
  symbol: z.string().min(1),
  /** ID of the concept that explains this symbol */
  conceptId: IdSchema,
  /** ID of the snippet where this symbol appears */
  snippetId: IdSchema,
});
export type SymbolLink = z.infer<typeof SymbolLinkSchema>;

/**
 * A concept in the technical book glossary.
 *
 * Concepts define terms, types, algorithms, and patterns that readers
 * must understand. The system validates that concepts are introduced
 * before they are used (via prerequisites).
 */
export const ConceptSchema = z.object({
  // Entity identification
  id: IdSchema,
  /** Entity type discriminator */
  entityType: z.literal('concept').default('concept'),

  // Core concept data
  /** Human-readable name */
  name: z.string().min(1),
  /** Type of concept */
  type: ConceptTypeSchema,
  /** Full definition/explanation */
  definition: z.string().min(1),

  // Spine position
  /** Chapter ID where this concept is introduced */
  introducedAt: IdSchema.optional(),

  // Dependencies
  /** IDs of concepts that must be understood before this one */
  prerequisites: z.array(IdSchema).default([]),

  // Code connections
  /** Code symbols (function/type names) that this concept explains */
  relatedSymbols: z.array(z.string()).default([]),

  // Examples
  /** Usage examples */
  examples: z.array(ConceptExampleSchema).default([]),

  // Metadata
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Concept = z.infer<typeof ConceptSchema>;

/**
 * Minimal concept for context assembly (reduces token usage)
 */
export const ConceptSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  type: ConceptTypeSchema,
  /** Single-sentence definition */
  brief: z.string(),
  /** Number of prerequisites */
  prerequisiteCount: z.number().int().nonnegative(),
});
export type ConceptSummary = z.infer<typeof ConceptSummarySchema>;

/**
 * Represents a violation of concept ordering
 * (concept used before it's introduced)
 */
export const ConceptViolationSchema = z.object({
  /** The concept that was used prematurely */
  conceptId: IdSchema,
  conceptName: z.string(),
  /** Where it was used */
  usedInChapterId: IdSchema,
  usedInChapterTitle: z.string().optional(),
  /** Where it should have been introduced first */
  introducedInChapterId: IdSchema.optional(),
  introducedInChapterTitle: z.string().optional(),
});
export type ConceptViolation = z.infer<typeof ConceptViolationSchema>;

/**
 * Edge in the concept dependency graph
 */
export const ConceptDependencySchema = z.object({
  /** Concept that has the dependency */
  fromId: IdSchema,
  /** Concept that is depended upon */
  toId: IdSchema,
});
export type ConceptDependency = z.infer<typeof ConceptDependencySchema>;

/**
 * Result of validating concept dependencies
 */
export const ConceptValidationResultSchema = z.object({
  /** Whether the concept graph is valid */
  valid: z.boolean(),
  /** Circular dependencies found (if any) */
  cycles: z.array(z.array(IdSchema)).default([]),
  /** Concepts used before introduction */
  violations: z.array(ConceptViolationSchema).default([]),
  /** Suggested introduction order (topological sort) */
  suggestedOrder: z.array(IdSchema).optional(),
});
export type ConceptValidationResult = z.infer<typeof ConceptValidationResultSchema>;
