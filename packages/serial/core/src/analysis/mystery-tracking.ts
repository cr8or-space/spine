/**
 * Mystery tracking data generation
 *
 * Extends plot thread tracking with mystery-specific analytics:
 * - Layer classification (surface vs deep)
 * - Lifecycle tracking (planted → resolved)
 * - Clue tracking and density
 * - Resolution satisfaction
 *
 * Phase 5.4 deliverables:
 * - Layer classification
 * - Lifecycle tracking
 * - Resolution detection
 * - Unfulfilled warnings
 */

import type {
	ClueDistributionSuggestion,
	ClueType,
	ContentAnalysis,
	LayerAnalysisResult,
	MysteryClue,
	MysteryLayer,
	MysteryResolution,
	MysteryStatus,
	MysteryTrackingData,
	MysteryWarning,
	PlotThread,
	Structure,
	SuspenseCurve,
} from '@repo/serial-types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';

/**
 * Input for mystery tracking generation
 */
export interface MysteryTrackingInput {
	/** Project ID */
	projectId: string;
	/** Root structure (book or arc) */
	rootStructure: Structure;
	/** Plot threads with type='mystery' */
	plotThreads: PlotThread[];
}

/**
 * Dependencies for mystery tracking
 */
export interface MysteryTrackingDependencies {
	/** Analysis repository for getting thread touches from analysis */
	analysisRepository: AnalysisRepository;
	/** Content repository for getting content linked to structures */
	contentRepository: ContentRepository;
}

/**
 * Configuration for mystery analysis
 */
export interface MysteryAnalysisConfig {
	/** Minimum clues expected per 10 chapters */
	minCluesPerTenChapters: number;
	/** Chapters after climax before resolution expected */
	resolutionBufferChapters: number;
	/** Minimum satisfaction rating to avoid warnings */
	minSatisfactionRating: number;
}

/**
 * Default mystery analysis configuration
 */
export const DEFAULT_MYSTERY_CONFIG: MysteryAnalysisConfig = {
	minCluesPerTenChapters: 2,
	resolutionBufferChapters: 3,
	minSatisfactionRating: 60,
};

/**
 * Chapter info for tracking
 */
interface ChapterInfo {
	structureId: string;
	position: number;
	title: string;
	contentId?: string;
	analysis?: ContentAnalysis;
}

/**
 * Extract chapters from structure in reading order
 */
function extractChapters(rootStructure: Structure): ChapterInfo[] {
	const chapters: ChapterInfo[] = [];
	let position = 0;

	function traverse(node: Structure): void {
		if (node.type === 'chapter' || node.type === 'scene') {
			position++;
			chapters.push({
				structureId: node.id,
				position,
				title: node.title,
			});
		}

		const sortedChildren = [...node.children].sort((a, b) => a.order - b.order);
		for (const child of sortedChildren) {
			traverse(child);
		}
	}

	traverse(rootStructure);
	return chapters;
}

/**
 * Enrich chapters with content IDs and analysis
 */
async function enrichChaptersWithAnalysis(
	projectId: string,
	chapters: ChapterInfo[],
	deps: MysteryTrackingDependencies
): Promise<ChapterInfo[]> {
	const enriched: ChapterInfo[] = [];

	for (const chapter of chapters) {
		// Get content for structure
		const content = deps.contentRepository.findByStructure(
			projectId,
			chapter.structureId
		);

		// Get latest analysis if content exists
		let analysis: ContentAnalysis | undefined;
		if (content) {
			analysis = deps.analysisRepository.findLatest(
				projectId,
				content.id
			);
		}

		enriched.push({
			...chapter,
			contentId: content?.id,
			analysis,
		});
	}

	return enriched;
}

/**
 * Infer mystery layer from thread description
 *
 * In a full implementation, this would be enhanced with LLM analysis.
 * For now, we default to intermediate layer.
 */
function inferMysteryLayer(): MysteryLayer {
	// Default to intermediate if not specified
	// In future: parse description or use LLM to classify
	return 'intermediate';
}

/**
 * Determine mystery lifecycle status
 */
function determineMysteryStatus(
	mystery: PlotThread,
	hasPlanted: boolean,
	hasClimax: boolean,
	hasResolution: boolean
): MysteryStatus {
	if (mystery.status === 'abandoned') {
		return 'abandoned';
	}

	if (hasResolution) {
		return 'resolved';
	}

	if (hasClimax) {
		return 'resolving';
	}

	if (mystery.touches.some((t) => t.type === 'climax')) {
		return 'climaxing';
	}

	if (hasPlanted || mystery.touches.length > 0) {
		return 'developing';
	}

	return 'planted';
}

/**
 * Extract clues from thread touches
 */
function extractClues(
	mystery: PlotThread,
	chapters: ChapterInfo[]
): MysteryClue[] {
	const clues: MysteryClue[] = [];

	// Extract from thread touches marked as development or complication
	for (const touch of mystery.touches) {
		if ((touch.type === 'development' || touch.type === 'complication') && touch.contentId) {
			const chapter = chapters.find((c) => c.contentId === touch.contentId);
			if (chapter) {
				clues.push({
					id: crypto.randomUUID(),
					description: touch.description || 'Clue revealed',
					type: touch.type === 'complication' ? 'red-herring' : 'indirect',
					revealedAt: {
						contentId: touch.contentId,
						position: chapter.position,
						chapterNumber: chapter.position,
					},
					importance: 50,
					fulfilled: false,
				});
			}
		}
	}

	return clues;
}

/**
 * Extract resolutions from thread touches
 */
function extractResolutions(
	mystery: PlotThread,
	chapters: ChapterInfo[]
): MysteryResolution[] {
	const resolutions: MysteryResolution[] = [];

	// Extract from thread touches marked as resolution
	for (const touch of mystery.touches) {
		if (touch.type === 'resolution' && touch.contentId) {
			const chapter = chapters.find((c) => c.contentId === touch.contentId);
			if (chapter) {
				resolutions.push({
					id: crypto.randomUUID(),
					resolvedAt: {
						contentId: touch.contentId,
						position: chapter.position,
						chapterNumber: chapter.position,
					},
					type: 'reveal',
					satisfying: true,
					cluesResolved: [],
				});
			}
		}
	}

	return resolutions;
}

/**
 * Calculate clue statistics
 */
function calculateClueSummary(
	clues: MysteryClue[],
	totalChapters: number,
	resolutions: MysteryResolution[]
): MysteryTrackingData['summary'] {
	const directClues = clues.filter((c) => c.type === 'direct').length;
	const indirectClues = clues.filter((c) => c.type === 'indirect').length;
	const redHerringCount = clues.filter((c) => c.type === 'red-herring').length;

	// Mark clues as fulfilled based on resolutions
	const resolvedClueIds = new Set(
		resolutions.flatMap((r) => r.cluesResolved)
	);
	const unfulfilledClues = clues.filter(
		(c) => !resolvedClueIds.has(c.id) && !c.fulfilled
	);

	const clueDensity = totalChapters > 0 ? clues.length / totalChapters : 0;

	// Calculate average chapters per clue
	let averageChaptersPerClue: number | undefined;
	if (clues.length > 1) {
		const positions = clues
			.map((c) => c.revealedAt.position)
			.sort((a, b) => a - b);
		const gaps: number[] = [];
		for (let i = 1; i < positions.length; i++) {
			const prevPos = positions[i - 1];
			const currPos = positions[i];
			if (prevPos !== undefined && currPos !== undefined) {
				gaps.push(currPos - prevPos);
			}
		}
		if (gaps.length > 0) {
			averageChaptersPerClue =
				gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
		}
	}

	// Calculate suspense and satisfaction ratings
	const suspenseRating = calculateSuspenseRating(clues, resolutions);
	const satisfactionRating = calculateSatisfactionRating(
		clues,
		resolutions,
		unfulfilledClues
	);

	return {
		totalClues: clues.length,
		directClues,
		indirectClues,
		redHerringCount,
		clueDensity,
		averageChaptersPerClue,
		unfulfilledClues: unfulfilledClues.length,
		unfulfilled: unfulfilledClues.map((c) => c.description),
		suspenseRating,
		satisfactionRating,
	};
}

/**
 * Calculate suspense rating based on clue distribution
 */
function calculateSuspenseRating(
	clues: MysteryClue[],
	resolutions: MysteryResolution[]
): number {
	if (clues.length === 0) {
		return 0;
	}

	// Higher rating for:
	// - More clues (up to a point)
	// - Good distribution (not all clustered)
	// - Mix of clue types
	// - Unresolved mystery (if no resolution yet)

	const clueScore = Math.min(clues.length * 10, 40);

	const typeVariety = new Set(clues.map((c) => c.type)).size * 10;

	const distributionScore = clues.length > 1 ? 20 : 0;

	const mysteryActiveBonus = resolutions.length === 0 ? 20 : 0;

	return Math.min(clueScore + typeVariety + distributionScore + mysteryActiveBonus, 100);
}

/**
 * Calculate satisfaction rating based on clue/resolution balance
 */
function calculateSatisfactionRating(
	clues: MysteryClue[],
	resolutions: MysteryResolution[],
	unfulfilledClues: MysteryClue[]
): number {
	if (resolutions.length === 0) {
		// No resolution yet, return neutral
		return 50;
	}

	// Higher rating for:
	// - Resolutions that address clues
	// - Few unfulfilled clues
	// - Satisfying resolution type

	const fulfillmentRate =
		clues.length > 0
			? ((clues.length - unfulfilledClues.length) / clues.length) * 60
			: 30;

	const satisfyingResolutions = resolutions.filter((r) => r.satisfying).length;
	const resolutionQuality =
		resolutions.length > 0
			? (satisfyingResolutions / resolutions.length) * 40
			: 0;

	return Math.min(fulfillmentRate + resolutionQuality, 100);
}

/**
 * Generate mystery tracking data for a single mystery
 */
export function generateMysteryTrackingData(
	mystery: PlotThread,
	chapters: ChapterInfo[]
): MysteryTrackingData {
	const layer = inferMysteryLayer();
	const clues = extractClues(mystery, chapters);
	const resolutions = extractResolutions(mystery, chapters);

	// Find lifecycle points
	const plantedTouch = mystery.touches.find((t) => t.type === 'introduction');
	const climaxTouch = mystery.touches.find((t) => t.type === 'climax');
	const resolutionTouch = mystery.touches.find((t) => t.type === 'resolution');

	const planted = plantedTouch
		? {
				contentId: plantedTouch.contentId ?? '',
				position: chapters.find((c) => c.contentId === plantedTouch.contentId)
					?.position ?? 0,
				chapterNumber: chapters.find(
					(c) => c.contentId === plantedTouch.contentId
				)?.position,
			}
		: undefined;

	const climax = climaxTouch
		? {
				contentId: climaxTouch.contentId ?? '',
				position: chapters.find((c) => c.contentId === climaxTouch.contentId)
					?.position ?? 0,
				chapterNumber: chapters.find(
					(c) => c.contentId === climaxTouch.contentId
				)?.position,
			}
		: undefined;

	const resolution = resolutionTouch
		? {
				contentId: resolutionTouch.contentId ?? '',
				position: chapters.find((c) => c.contentId === resolutionTouch.contentId)
					?.position ?? 0,
				chapterNumber: chapters.find(
					(c) => c.contentId === resolutionTouch.contentId
				)?.position,
			}
		: undefined;

	const status = determineMysteryStatus(
		mystery,
		!!planted,
		!!climax,
		!!resolution
	);

	const summary = calculateClueSummary(clues, chapters.length, resolutions);

	return {
		threadId: mystery.id,
		mysteryName: mystery.name,
		layer,
		status,
		planted,
		climax,
		resolution,
		clues,
		resolutions,
		summary,
	};
}

/**
 * Generate mystery tracking data for all mysteries in input
 */
export async function generateAllMysteryTracking(
	input: MysteryTrackingInput,
	deps: MysteryTrackingDependencies
): Promise<MysteryTrackingData[]> {
	// Filter to only mystery-type threads
	const mysteries = input.plotThreads.filter((t) => t.type === 'mystery');

	if (mysteries.length === 0) {
		return [];
	}

	// Extract and enrich chapters
	const chapters = extractChapters(input.rootStructure);
	const enrichedChapters = await enrichChaptersWithAnalysis(
		input.projectId,
		chapters,
		deps
	);

	// Generate tracking data for each mystery
	return mysteries.map((mystery) =>
		generateMysteryTrackingData(mystery, enrichedChapters)
	);
}

/**
 * Analyze mystery layer distribution
 */
export function analyzeMysteryLayers(
	mysteries: MysteryTrackingData[]
): LayerAnalysisResult {
	const surfaceCount = mysteries.filter((m) => m.layer === 'surface').length;
	const intermediateCount = mysteries.filter(
		(m) => m.layer === 'intermediate'
	).length;
	const deepCount = mysteries.filter((m) => m.layer === 'deep').length;
	const metaCount = mysteries.filter((m) => m.layer === 'meta').length;

	let recommendation: string | undefined;

	// Provide recommendations based on distribution
	if (mysteries.length === 0) {
		recommendation = 'No mysteries detected in the narrative.';
	} else if (surfaceCount === mysteries.length) {
		recommendation =
			'All mysteries are surface-level. Consider adding deeper mysteries for engagement.';
	} else if (deepCount > mysteries.length / 2) {
		recommendation =
			'Many deep mysteries may confuse readers. Consider adding surface-level mysteries for balance.';
	} else if (intermediateCount > 0 && deepCount > 0 && surfaceCount > 0) {
		recommendation =
			'Good balance of mystery layers across surface, intermediate, and deep levels.';
	}

	return {
		surfaceCount,
		intermediateCount,
		deepCount,
		metaCount,
		recommendation,
	};
}

/**
 * Detect unfulfilled clues and generate warnings
 */
export function detectUnfulfilledClues(
	mysteries: MysteryTrackingData[],
	config: MysteryAnalysisConfig = DEFAULT_MYSTERY_CONFIG
): MysteryWarning[] {
	const warnings: MysteryWarning[] = [];

	for (const mystery of mysteries) {
		// Check for unfulfilled clues
		if (mystery.summary.unfulfilledClues > 0) {
			const severity =
				mystery.summary.unfulfilledClues > 3
					? 'high'
					: mystery.summary.unfulfilledClues > 1
						? 'medium'
						: 'low';

			warnings.push({
				mysteryId: mystery.threadId,
				type: 'unfulfilled-clues',
				severity,
				message: `Mystery "${mystery.mysteryName}" has ${mystery.summary.unfulfilledClues} unfulfilled clue(s): ${mystery.summary.unfulfilled.join(', ')}`,
				unfulfilledCount: mystery.summary.unfulfilledClues,
			});
		}

		// Check for missing climax
		if (
			mystery.status === 'developing' &&
			!mystery.climax &&
			mystery.clues.length > 3
		) {
			warnings.push({
				mysteryId: mystery.threadId,
				type: 'missing-climax',
				severity: 'medium',
				message: `Mystery "${mystery.mysteryName}" has ${mystery.clues.length} clues but no climax yet.`,
			});
		}

		// Check for premature resolution
		if (mystery.resolution && mystery.clues.length < 2) {
			warnings.push({
				mysteryId: mystery.threadId,
				type: 'premature-resolution',
				severity: 'medium',
				message: `Mystery "${mystery.mysteryName}" resolved with only ${mystery.clues.length} clue(s). Consider adding more setup.`,
				position: mystery.resolution.position,
			});
		}

		// Check for abandoned mysteries
		if (mystery.status === 'abandoned' && mystery.clues.length > 0) {
			warnings.push({
				mysteryId: mystery.threadId,
				type: 'abandoned',
				severity: 'high',
				message: `Mystery "${mystery.mysteryName}" was abandoned after planting ${mystery.clues.length} clue(s).`,
			});
		}

		// Check for low satisfaction
		if (
			mystery.resolution &&
			mystery.summary.satisfactionRating < config.minSatisfactionRating
		) {
			warnings.push({
				mysteryId: mystery.threadId,
				type: 'low-satisfaction',
				severity: 'medium',
				message: `Mystery "${mystery.mysteryName}" has low satisfaction rating (${mystery.summary.satisfactionRating.toFixed(0)}/100).`,
			});
		}
	}

	return warnings;
}

/**
 * Calculate suspense progression over chapter sequence
 */
export function calculateSuspenseProgression(
	mysteries: MysteryTrackingData[],
	chapters: ChapterInfo[]
): SuspenseCurve {
	const chapterData = chapters.map((chapter) => {
		// Count active mysteries at this position
		const activeMysteries = mysteries.filter((m) => {
			const plantedPos = m.planted?.position ?? 0;
			const resolvedPos = m.resolution?.position ?? Infinity;
			return chapter.position >= plantedPos && chapter.position < resolvedPos;
		}).length;

		// Count clues revealed in this chapter
		const cluesRevealed = mysteries
			.flatMap((m) => m.clues)
			.filter((c) => c.revealedAt.position === chapter.position).length;

		// Calculate suspense level based on active mysteries and recent clues
		const mysteryScore = activeMysteries * 20;
		const clueBonus = cluesRevealed * 10;
		const suspenseLevel = Math.min(mysteryScore + clueBonus, 100);

		return {
			position: chapter.position,
			suspenseLevel,
			activeMysteries,
			cluesRevealed,
		};
	});

	return {
		chapters: chapterData,
	};
}

/**
 * Suggest clue distribution for a mystery
 */
export function suggestClueDistribution(
	mystery: PlotThread,
	estimatedChapters: number,
	config: MysteryAnalysisConfig = DEFAULT_MYSTERY_CONFIG
): ClueDistributionSuggestion {
	const recommendedClues = Math.max(
		Math.floor((estimatedChapters / 10) * config.minCluesPerTenChapters),
		3
	);

	const distribution: ClueDistributionSuggestion['distribution'] = [];

	// Suggest clue placement
	const plantPosition = Math.max(1, Math.floor(estimatedChapters * 0.1));
	const midPosition = Math.floor(estimatedChapters * 0.5);
	const latePosition = Math.floor(estimatedChapters * 0.8);

	distribution.push({
		position: plantPosition,
		clueType: 'direct',
		rationale: 'Initial direct clue to establish mystery',
	});

	const middleClues = Math.max(recommendedClues - 3, 0);
	for (let i = 0; i < middleClues; i++) {
		const position = Math.floor(
			plantPosition + ((midPosition - plantPosition) * (i + 1)) / (middleClues + 1)
		);
		const type: ClueType = i % 3 === 0 ? 'red-herring' : 'indirect';
		distribution.push({
			position,
			clueType: type,
			rationale:
				type === 'red-herring'
					? 'Red herring to maintain suspense'
					: 'Indirect clue for gradual revelation',
		});
	}

	distribution.push({
		position: latePosition,
		clueType: 'direct',
		rationale: 'Key clue before resolution',
	});

	return {
		mysteryId: mystery.id,
		estimatedChapters,
		recommendedClues,
		distribution: distribution.sort((a, b) => a.position - b.position),
	};
}

/**
 * Get mystery warnings for current narrative position
 */
export function getMysteryWarnings(
	trackingData: MysteryTrackingData[],
	currentPosition: number,
	config: MysteryAnalysisConfig = DEFAULT_MYSTERY_CONFIG
): MysteryWarning[] {
	const warnings: MysteryWarning[] = [];

	for (const mystery of trackingData) {
		// Check if mystery should be resolved by now
		if (
			mystery.climax &&
			mystery.climax.position + config.resolutionBufferChapters <
				currentPosition &&
			!mystery.resolution
		) {
			warnings.push({
				mysteryId: mystery.threadId,
				type: 'unfulfilled-clues',
				severity: 'high',
				message: `Mystery "${mystery.mysteryName}" reached climax at position ${mystery.climax.position} but has not been resolved.`,
				position: currentPosition,
			});
		}
	}

	// Add general unfulfilled warnings
	warnings.push(...detectUnfulfilledClues(trackingData, config));

	return warnings;
}
