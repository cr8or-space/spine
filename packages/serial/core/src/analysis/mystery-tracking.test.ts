/**
 * Tests for mystery tracking
 */

import { describe, it, expect } from 'vitest';
import type { PlotThread } from '@repo/serial-types';
import {
	analyzeMysteryLayers,
	calculateSuspenseProgression,
	DEFAULT_MYSTERY_CONFIG,
	detectUnfulfilledClues,
	generateMysteryTrackingData,
	getMysteryWarnings,
	suggestClueDistribution,
} from './mystery-tracking';

/**
 * Helper to create a test mystery thread
 */
function createTestMystery(
	id: string,
	name: string,
	overrides: Partial<PlotThread> = {}
): PlotThread {
	return {
		id,
		name,
		type: 'mystery',
		status: 'active',
		scope: 'arc',
		priority: 50,
		involvedCharacters: [],
		relatedLocations: [],
		promises: [],
		touches: [],
		childThreads: [],
		...overrides,
	};
}


/**
 * Helper to create chapter info
 */
function createChapterInfo(position: number) {
	return {
		structureId: `chapter-${position}`,
		position,
		title: `Chapter ${position}`,
		contentId: `content-${position}`,
	};
}

describe('Mystery Tracking', () => {
	describe('generateMysteryTrackingData', () => {
		it('should generate basic mystery tracking data', () => {
			const mystery = createTestMystery('m1', 'Who killed the king?', {
				touches: [
					{
						type: 'introduction',
						contentId: 'content-1',
						description: 'Mystery introduced',
					},
				],
			});

			const chapters = [
				createChapterInfo(1),
				createChapterInfo(2),
				createChapterInfo(3),
			];

			const result = generateMysteryTrackingData(mystery, chapters);

			expect(result.threadId).toBe('m1');
			expect(result.mysteryName).toBe('Who killed the king?');
			expect(result.layer).toBe('intermediate'); // Default
			expect(result.status).toBe('developing');
			expect(result.planted).toBeDefined();
			expect(result.planted?.position).toBe(1);
		});

		it('should use default mystery layer', () => {
			const mystery = createTestMystery('m1', 'Test Mystery');

			const chapters = [createChapterInfo(1)];
			const result = generateMysteryTrackingData(mystery, chapters);

			expect(result.layer).toBe('intermediate'); // Default
		});

		it('should track lifecycle progression', () => {
			const mystery = createTestMystery('m1', 'Test Mystery', {
				touches: [
					{
						type: 'introduction',
						contentId: 'content-1',
						description: 'Planted',
					},
					{
						type: 'climax',
						contentId: 'content-5',
						description: 'Key revelation',
					},
					{
						type: 'resolution',
						contentId: 'content-7',
						description: 'Solved',
					},
				],
			});

			const chapters = Array.from({ length: 10 }, (_, i) =>
				createChapterInfo(i + 1)
			);

			const result = generateMysteryTrackingData(mystery, chapters);

			expect(result.status).toBe('resolved');
			expect(result.planted?.position).toBe(1);
			expect(result.climax?.position).toBe(5);
			expect(result.resolution?.position).toBe(7);
		});

		it('should extract clues from touches', () => {
			const mystery = createTestMystery('m1', 'Test Mystery', {
				touches: [
					{
						type: 'introduction',
						contentId: 'content-1',
						description: 'Mystery introduced',
					},
					{
						type: 'development',
						contentId: 'content-2',
						description: 'First clue revealed',
					},
					{
						type: 'development',
						contentId: 'content-4',
						description: 'Second clue revealed',
					},
				],
			});

			const chapters = Array.from({ length: 5 }, (_, i) =>
				createChapterInfo(i + 1)
			);

			const result = generateMysteryTrackingData(mystery, chapters);

			expect(result.clues.length).toBeGreaterThanOrEqual(2);
			expect(result.summary.totalClues).toBeGreaterThanOrEqual(2);
		});

		it('should calculate summary statistics', () => {
			const mystery = createTestMystery('m1', 'Test Mystery', {
				touches: [
					{
						type: 'development',
						contentId: 'content-2',
						description: 'First clue',
					},
					{
						type: 'development',
						contentId: 'content-3',
						description: 'Second clue',
					},
					{
						type: 'complication',
						contentId: 'content-4',
						description: 'Red herring',
					},
				],
			});

			const chapters = Array.from({ length: 10 }, (_, i) =>
				createChapterInfo(i + 1)
			);

			const result = generateMysteryTrackingData(mystery, chapters);

			expect(result.summary.totalClues).toBe(3);
			expect(result.summary.indirectClues).toBe(2);
			expect(result.summary.redHerringCount).toBe(1);
		});
	});

	describe('analyzeMysteryLayers', () => {
		it('should count mysteries by layer', () => {
			const mysteries = [
				generateMysteryTrackingData(
					createTestMystery('m1', 'Mystery 1'),
					[createChapterInfo(1)]
				),
				generateMysteryTrackingData(
					createTestMystery('m2', 'Mystery 2'),
					[createChapterInfo(1)]
				),
				generateMysteryTrackingData(
					createTestMystery('m3', 'Mystery 3'),
					[createChapterInfo(1)]
				),
			];

			const result = analyzeMysteryLayers(mysteries);

			// All default to intermediate
			expect(result.intermediateCount).toBe(3);
			expect(result.surfaceCount).toBe(0);
			expect(result.deepCount).toBe(0);
			expect(result.metaCount).toBe(0);
		});

		it('should provide recommendations for no mysteries', () => {
			const result = analyzeMysteryLayers([]);

			expect(result.recommendation).toContain('No mysteries detected');
		});

		it('should analyze mystery layer distribution', () => {
			const mysteries = [
				generateMysteryTrackingData(
					createTestMystery('m1', 'Mystery 1'),
					[createChapterInfo(1)]
				),
				generateMysteryTrackingData(
					createTestMystery('m2', 'Mystery 2'),
					[createChapterInfo(1)]
				),
			];

			const result = analyzeMysteryLayers(mysteries);

			// All intermediate by default
			expect(result.intermediateCount).toBe(2);
		});
	});

	describe('detectUnfulfilledClues', () => {
		it('should detect missing climax', () => {
			const mystery = createTestMystery('m1', 'Test Mystery', {
				touches: [
					{
						type: 'development',
						contentId: 'content-1',
						description: 'Clue 1',
					},
					{
						type: 'development',
						contentId: 'content-2',
						description: 'Clue 2',
					},
					{
						type: 'development',
						contentId: 'content-3',
						description: 'Clue 3',
					},
					{
						type: 'development',
						contentId: 'content-4',
						description: 'Clue 4',
					},
				],
			});

			const chapters = Array.from({ length: 5 }, (_, i) =>
				createChapterInfo(i + 1)
			);
			const mysteries = [generateMysteryTrackingData(mystery, chapters)];

			const warnings = detectUnfulfilledClues(mysteries);

			const missingClimax = warnings.find((w) => w.type === 'missing-climax');
			expect(missingClimax).toBeDefined();
		});

		it('should detect premature resolution', () => {
			const mystery = createTestMystery('m1', 'Test Mystery', {
				touches: [
					{
						type: 'introduction',
						contentId: 'content-1',
						description: 'Planted',
					},
					{
						type: 'resolution',
						contentId: 'content-2',
						description: 'Resolved',
					},
				],
			});

			const mysteries = [
				generateMysteryTrackingData(mystery, [
					createChapterInfo(1),
					createChapterInfo(2),
				]),
			];

			const warnings = detectUnfulfilledClues(mysteries);

			const premature = warnings.find((w) => w.type === 'premature-resolution');
			expect(premature).toBeDefined();
		});

		it('should detect abandoned mysteries', () => {
			const mystery = createTestMystery('m1', 'Test Mystery', {
				status: 'abandoned',
				touches: [
					{
						type: 'development',
						contentId: 'content-1',
						description: 'Abandoned clue',
					},
				],
			});

			const mysteries = [
				generateMysteryTrackingData(mystery, [createChapterInfo(1)]),
			];

			const warnings = detectUnfulfilledClues(mysteries);

			const abandoned = warnings.find((w) => w.type === 'abandoned');
			expect(abandoned).toBeDefined();
		});
	});

	describe('calculateSuspenseProgression', () => {
		it('should calculate suspense levels across chapters', () => {
			const mystery = createTestMystery('m1', 'Test Mystery', {
				touches: [
					{
						type: 'introduction',
						contentId: 'content-1',
						description: 'Planted',
					},
					{
						type: 'development',
						contentId: 'content-2',
						description: 'Clue',
					},
					{
						type: 'resolution',
						contentId: 'content-5',
						description: 'Resolved',
					},
				],
			});

			const chapters = Array.from({ length: 5 }, (_, i) =>
				createChapterInfo(i + 1)
			);
			const mysteries = [generateMysteryTrackingData(mystery, chapters)];

			const result = calculateSuspenseProgression(mysteries, chapters);

			expect(result.chapters.length).toBe(5);
			expect(result.chapters[0]?.suspenseLevel).toBeGreaterThanOrEqual(0);
			expect(result.chapters[1]?.activeMysteries).toBe(1);
			expect(result.chapters[1]?.cluesRevealed).toBe(1);
		});
	});

	describe('suggestClueDistribution', () => {
		it('should suggest clue distribution for a mystery', () => {
			const mystery = createTestMystery('m1', 'Test Mystery');

			const result = suggestClueDistribution(mystery, 20);

			expect(result.recommendedClues).toBeGreaterThanOrEqual(3);
			expect(result.distribution.length).toBeGreaterThan(0);
			expect(result.distribution[0]?.clueType).toBe('direct');
		});

		it('should suggest more clues for longer narratives', () => {
			const mystery = createTestMystery('m1', 'Test Mystery');

			const short = suggestClueDistribution(mystery, 10);
			const long = suggestClueDistribution(mystery, 50);

			expect(long.recommendedClues).toBeGreaterThan(short.recommendedClues);
		});
	});

	describe('getMysteryWarnings', () => {
		it('should warn about unresolved mysteries after climax', () => {
			const mystery = createTestMystery('m1', 'Test Mystery', {
				touches: [
					{
						type: 'introduction',
						contentId: 'content-1',
						description: 'Planted',
					},
					{
						type: 'climax',
						contentId: 'content-5',
						description: 'Climax',
					},
				],
			});

			const chapters = Array.from({ length: 10 }, (_, i) =>
				createChapterInfo(i + 1)
			);
			const mysteries = [generateMysteryTrackingData(mystery, chapters)];

			const warnings = getMysteryWarnings(
				mysteries,
				10,
				DEFAULT_MYSTERY_CONFIG
			);

			const unresolved = warnings.find(
				(w) => w.message.includes('has not been resolved')
			);
			expect(unresolved).toBeDefined();
		});
	});
});
