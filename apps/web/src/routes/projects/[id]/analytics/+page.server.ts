import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';
import { createStructureService } from '@repo/core';
import { createStructureRepository, createContentRepository } from '@repo/core/storage';
import {
  createAnalysisRepository,
  generateTensionCurve,
  generatePresenceHeatmap,
  generateAllPlotThreadTracking,
  type TensionCurveDependencies,
  type CharacterTrackingDependencies,
  type PlotThreadTrackingDependencies,
} from '@repo/core/analysis';
import type {
  TensionCurveData,
  CharacterPresenceHeatmap,
  PlotThreadTrackingData,
  Structure,
  QualityDataPoint,
} from '@repo/types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  // Get services
  const bibleService = createBibleService(locals.db, locals.drizzle, params.id);
  const structureRepo = createStructureRepository(locals.db, locals.drizzle);
  const structureService = createStructureService(params.id, structureRepo);
  const contentRepo = createContentRepository(locals.db, locals.drizzle);
  const analysisRepo = createAnalysisRepository(locals.db, locals.drizzle);

  // Get the full structure tree
  const structureTree = structureService.getFullTree();
  const allStructures = structureService.getAll();

  // Get bible data
  const bible = bibleService.getBible();

  // Get selected structure from URL (defaults to first book if not specified)
  const selectedStructureId = url.searchParams.get('structure');
  let rootStructure: Structure | undefined;

  if (selectedStructureId) {
    rootStructure = structureService.getWithChildren(selectedStructureId);
  } else {
    // Default to first book in the structure tree
    const firstBook = structureTree.find((s) => s.type === 'book');
    if (firstBook) {
      rootStructure = structureService.getWithChildren(firstBook.id);
    }
  }

  // Initialize analytics data
  let tensionCurve: TensionCurveData | null = null;
  let characterHeatmap: CharacterPresenceHeatmap | null = null;
  let plotThreadTracking: PlotThreadTrackingData[] = [];
  let qualityTrends: QualityDataPoint[] = [];
  let chapterTypeData: { type: string; count: number; percentage: number }[] = [];

  // Generate analytics if we have a root structure
  if (rootStructure) {
    const deps: TensionCurveDependencies &
      CharacterTrackingDependencies &
      PlotThreadTrackingDependencies = {
      analysisRepository: analysisRepo,
      contentRepository: contentRepo,
    };

    // Generate tension curve data
    tensionCurve = generateTensionCurve(
      {
        projectId: params.id,
        rootStructure,
      },
      deps
    );

    // Generate character heatmap if we have characters
    if (bible.characters.length > 0) {
      characterHeatmap = generatePresenceHeatmap(
        {
          projectId: params.id,
          rootStructure,
          characters: bible.characters,
        },
        deps
      );
    }

    // Generate plot thread tracking if we have threads
    if (bible.plotThreads.length > 0) {
      plotThreadTracking = generateAllPlotThreadTracking(
        {
          projectId: params.id,
          rootStructure,
          plotThreads: bible.plotThreads,
        },
        deps
      );
    }

    // Generate quality trend data from tension curve
    if (tensionCurve) {
      qualityTrends = tensionCurve.dataPoints
        .filter((dp) => dp.hasAnalysis)
        .map((dp) => {
          const analysis = dp.contentId ? analysisRepo.findLatest(params.id, dp.contentId) : undefined;

          return {
            position: dp.position,
            label: dp.title,
            tension: analysis?.tensionScore?.score,
            pacing: analysis?.pacing?.averageScore,
            hookStrength: analysis?.hook?.strength,
          };
        });
    }

    // Generate chapter type distribution
    const chapterTypeCounts = new Map<string, number>();
    let totalChapters = 0;

    function traverseForChapterTypes(node: Structure): void {
      if (node.type === 'chapter' && node.chapterType) {
        totalChapters++;
        const count = chapterTypeCounts.get(node.chapterType) || 0;
        chapterTypeCounts.set(node.chapterType, count + 1);
      }
      for (const child of node.children) {
        traverseForChapterTypes(child);
      }
    }

    if (rootStructure) {
      traverseForChapterTypes(rootStructure);
    }

    chapterTypeData = Array.from(chapterTypeCounts.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: totalChapters > 0 ? (count / totalChapters) * 100 : 0,
    }));
  }

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    structureTree,
    allStructures,
    rootStructure,
    tensionCurve,
    characterHeatmap,
    plotThreadTracking,
    qualityTrends,
    chapterTypeData,
    bible,
  };
};
