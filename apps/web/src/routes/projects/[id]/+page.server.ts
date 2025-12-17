import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const projectId = params.id;

  // Get structure tree for recent chapters
  const structureTree = locals.structureService.getFullTree(projectId);

  // Get all chapters sorted by updated date
  const allStructures = locals.structureService.listByProject(projectId);
  const chapters = allStructures
    .filter((s) => s.type === 'chapter')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Get review queue items
  const reviewItems = locals.reviewService.getQueue(projectId).slice(0, 5);

  // Get content status counts
  const allContent = locals.contentService.listByProject(projectId);
  const statusCounts = {
    draft: 0,
    in_review: 0,
    approved: 0,
    published: 0,
    archived: 0,
  };
  for (const content of allContent) {
    if (content.status in statusCounts) {
      statusCounts[content.status as keyof typeof statusCounts]++;
    }
  }

  // Get bible entity counts
  const bible = locals.bibleService.loadBible(projectId);
  const entityCounts = {
    characters: bible?.characters.length ?? 0,
    locations: bible?.locations.length ?? 0,
    factions: bible?.factions.length ?? 0,
    worldRules: bible?.worldRules.length ?? 0,
    plotThreads: bible?.plotThreads.length ?? 0,
    timelineEvents: bible?.timeline.length ?? 0,
  };

  // Calculate word count
  let totalWords = 0;
  let publishedWords = 0;
  for (const content of allContent) {
    const latestVersion = content.versions.find((v) => v.version === content.currentVersion);
    if (latestVersion) {
      totalWords += latestVersion.wordCount;
      if (content.status === 'published') {
        publishedWords += latestVersion.wordCount;
      }
    }
  }

  // Get release schedule info if available
  const releaseSettings = locals.projectService.loadProject(projectId)?.releaseSchedule;
  let bufferStatus = null;
  if (releaseSettings && structureTree) {
    const bufferCalc = locals.releaseService.calculateBuffer(projectId, structureTree);
    bufferStatus = {
      approvedCount: bufferCalc.approvedCount,
      publishedCount: bufferCalc.publishedCount,
      targetBuffer: releaseSettings.targetBuffer,
      daysUntilDepletion: bufferCalc.daysUntilDepletion,
    };
  }

  return {
    recentChapters: chapters.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      type: c.type,
    })),
    reviewQueue: reviewItems.map((r) => ({
      id: r.id,
      structureId: r.structureId,
      title: r.title,
      status: r.status,
    })),
    statusCounts,
    entityCounts,
    wordCounts: {
      total: totalWords,
      published: publishedWords,
    },
    bufferStatus,
    structureCount: allStructures.length,
  };
};
