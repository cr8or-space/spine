/**
 * Mystery tracking types and schemas.
 *
 * Extends plot thread tracking with mystery-specific analytics:
 * - Layer classification (surface vs deep)
 * - Lifecycle tracking (planted → resolved)
 * - Clue tracking and density
 * - Resolution satisfaction
 */

import { z } from 'zod';
import { IdSchema } from './common';

/**
 * Mystery depth layer classification
 */
export const MysteryLayerSchema = z.enum([
	'surface', // Obvious question/puzzle, reader is aware
	'intermediate', // Hints available, requires attention
	'deep', // Hidden, requires careful reading/rereading
	'meta', // Fourth wall, narrative structure tricks
]);

export type MysteryLayer = z.infer<typeof MysteryLayerSchema>;

/**
 * Mystery lifecycle status
 */
export const MysteryStatusSchema = z.enum([
	'planted', // Mystery introduced
	'developing', // Clues being gathered
	'climaxing', // Key revelations happening
	'resolving', // Solution in progress
	'resolved', // Mystery solved
	'abandoned', // Dropped without resolution
]);

export type MysteryStatus = z.infer<typeof MysteryStatusSchema>;

/**
 * Type of clue for mystery resolution
 */
export const ClueTypeSchema = z.enum([
	'direct', // Straightforward evidence
	'indirect', // Requires inference
	'red-herring', // Misleading information
	'misdirection', // Intentionally wrong direction
]);

export type ClueType = z.infer<typeof ClueTypeSchema>;

/**
 * Type of resolution for mystery
 */
export const ResolutionTypeSchema = z.enum([
	'reveal', // Direct explanation/discovery
	'deduction', // Character reasons it out
	'twist', // Unexpected answer
	'subversion', // Question reframed
]);

export type ResolutionType = z.infer<typeof ResolutionTypeSchema>;

/**
 * A single clue in a mystery
 */
export const MysteryClueSchema = z.object({
	id: IdSchema,
	description: z.string(),
	type: ClueTypeSchema,
	revealedAt: z.object({
		contentId: IdSchema,
		chapterNumber: z.number().int().positive().optional(),
		position: z.number().int().positive(),
	}),
	importance: z.number().min(0).max(100), // How critical to resolution
	fulfilled: z.boolean().default(false), // Whether clue was resolved
});

export type MysteryClue = z.infer<typeof MysteryClueSchema>;

/**
 * A resolution point for a mystery
 */
export const MysteryResolutionSchema = z.object({
	id: IdSchema,
	resolvedAt: z.object({
		contentId: IdSchema,
		chapterNumber: z.number().int().positive().optional(),
		position: z.number().int().positive(),
	}),
	type: ResolutionTypeSchema,
	satisfying: z.boolean(), // Whether resolution felt earned
	cluesResolved: z.array(IdSchema), // Which clues this resolution addressed
});

export type MysteryResolution = z.infer<typeof MysteryResolutionSchema>;

/**
 * Tracking data for a single mystery
 */
export const MysteryTrackingDataSchema = z.object({
	threadId: IdSchema, // References PlotThread with type='mystery'
	mysteryName: z.string(),
	layer: MysteryLayerSchema,
	status: MysteryStatusSchema,

	// Lifecycle tracking
	planted: z
		.object({
			position: z.number().int().positive(),
			contentId: IdSchema,
			chapterNumber: z.number().int().positive().optional(),
		})
		.optional(),

	climax: z
		.object({
			position: z.number().int().positive(),
			contentId: IdSchema,
			chapterNumber: z.number().int().positive().optional(),
		})
		.optional(),

	resolution: z
		.object({
			position: z.number().int().positive(),
			contentId: IdSchema,
			chapterNumber: z.number().int().positive().optional(),
		})
		.optional(),

	// Clue tracking
	clues: z.array(MysteryClueSchema),

	// Resolution tracking
	resolutions: z.array(MysteryResolutionSchema),

	// Summary statistics
	summary: z.object({
		totalClues: z.number().int().min(0),
		directClues: z.number().int().min(0),
		indirectClues: z.number().int().min(0),
		redHerringCount: z.number().int().min(0),
		clueDensity: z.number().min(0).max(1), // clues / total chapters
		averageChaptersPerClue: z.number().optional(),
		unfulfilledClues: z.number().int().min(0),
		unfulfilled: z.array(z.string()), // descriptions of unresolved clues
		suspenseRating: z.number().min(0).max(100),
		satisfactionRating: z.number().min(0).max(100), // Based on clue/resolution balance
	}),
});

export type MysteryTrackingData = z.infer<typeof MysteryTrackingDataSchema>;

/**
 * Warning about unfulfilled mystery elements
 */
export const MysteryWarningSchema = z.object({
	mysteryId: IdSchema,
	type: z.enum([
		'unfulfilled-clues', // Clues without resolution
		'missing-climax', // No climactic revelation
		'premature-resolution', // Resolved before sufficient clues
		'abandoned', // Mystery dropped
		'low-satisfaction', // Resolution doesn't match setup
	]),
	severity: z.enum(['low', 'medium', 'high']),
	message: z.string(),
	unfulfilledCount: z.number().int().min(0).optional(),
	position: z.number().int().positive().optional(),
});

export type MysteryWarning = z.infer<typeof MysteryWarningSchema>;

/**
 * Analysis of mystery layers across project
 */
export const LayerAnalysisResultSchema = z.object({
	surfaceCount: z.number().int().min(0),
	intermediateCount: z.number().int().min(0),
	deepCount: z.number().int().min(0),
	metaCount: z.number().int().min(0),
	recommendation: z.string().optional(),
});

export type LayerAnalysisResult = z.infer<typeof LayerAnalysisResultSchema>;

/**
 * Suspense progression over chapter sequence
 */
export const SuspenseCurveSchema = z.object({
	chapters: z.array(
		z.object({
			position: z.number().int().positive(),
			suspenseLevel: z.number().min(0).max(100),
			activeMysteries: z.number().int().min(0),
			cluesRevealed: z.number().int().min(0),
		})
	),
});

export type SuspenseCurve = z.infer<typeof SuspenseCurveSchema>;

/**
 * Suggestion for clue distribution
 */
export const ClueDistributionSuggestionSchema = z.object({
	mysteryId: IdSchema,
	estimatedChapters: z.number().int().positive(),
	recommendedClues: z.number().int().positive(),
	distribution: z.array(
		z.object({
			position: z.number().int().positive(),
			clueType: ClueTypeSchema,
			rationale: z.string(),
		})
	),
});

export type ClueDistributionSuggestion = z.infer<
	typeof ClueDistributionSuggestionSchema
>;
