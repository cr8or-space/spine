import { error, fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';
import { createAnalysisRepository } from '@repo/core/analysis';
import type { Character, Location, Faction, WorldRule, PlotThread, TimelineEvent } from '@repo/types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  // Get bible service for this project
  const bibleService = createBibleService(locals.db, locals.drizzle, params.id);

  // Get the complete bible
  const bible = bibleService.getBible();

  // Compute appearance counts from content analysis
  const analysisRepo = createAnalysisRepository(locals.db, locals.drizzle);
  const allAnalyses = analysisRepo.findByProject(params.id);

  // Count appearances per character from analysis data
  const appearanceCounts = new Map<string, number>();
  for (const analysis of allAnalyses) {
    for (const appearance of analysis.characterAppearances) {
      const count = appearanceCounts.get(appearance.characterId) || 0;
      appearanceCounts.set(appearance.characterId, count + 1);
    }
  }

  // Count appearances per location from analysis data
  const locationAppearanceCounts = new Map<string, number>();
  for (const analysis of allAnalyses) {
    for (const locationId of analysis.locationAppearances) {
      const count = locationAppearanceCounts.get(locationId) || 0;
      locationAppearanceCounts.set(locationId, count + 1);
    }
  }

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    bible,
    appearanceCounts: Object.fromEntries(appearanceCounts),
    locationAppearanceCounts: Object.fromEntries(locationAppearanceCounts),
  };
};

export const actions: Actions = {
  createCharacter: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, locals.drizzle, params.id);

    try {
      const data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        aliases: JSON.parse(formData.get('aliases') as string || '[]'),
        role: formData.get('role') as Character['role'],
        status: formData.get('status') as Character['status'],
        traits: [],
        voiceSamples: [],
        relationships: [],
        appearances: [],
      };

      const character = bibleService.characters.create(data);

      return redirect(303, `/projects/${params.id}/bible/character/${character.id}`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('createCharacter error:', err);
      return fail(400, { message: 'Invalid character data' });
    }
  },

  createLocation: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, locals.drizzle, params.id);

    try {
      const data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        aliases: JSON.parse(formData.get('aliases') as string || '[]'),
        type: formData.get('type') as Location['type'],
        status: formData.get('status') as Location['status'],
        features: [],
        relations: [],
        associatedCharacters: [],
      };

      const location = bibleService.locations.create(data);

      return redirect(303, `/projects/${params.id}/bible/location/${location.id}`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('createLocation error:', err);
      return fail(400, { message: 'Invalid location data' });
    }
  },

  createFaction: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, locals.drizzle, params.id);

    try {
      const data: Omit<Faction, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        aliases: JSON.parse(formData.get('aliases') as string || '[]'),
        type: formData.get('type') as Faction['type'],
        status: formData.get('status') as Faction['status'],
        influence: formData.get('influence') as Faction['influence'],
        ideology: (formData.get('ideology') as string) || undefined,
        goals: [],
        ranks: [],
        members: [],
        relations: [],
        locations: [],
      };

      const faction = bibleService.factions.create(data);

      return redirect(303, `/projects/${params.id}/bible/faction/${faction.id}`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('createFaction error:', err);
      return fail(400, { message: 'Invalid faction data' });
    }
  },

  createWorldRule: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, locals.drizzle, params.id);

    try {
      const data: Omit<WorldRule, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.get('name') as string,
        category: formData.get('category') as WorldRule['category'],
        rule: formData.get('rule') as string,
        description: formData.get('description') as string || '',
        exceptions: [],
        relatedRules: [],
        established: formData.get('established') === 'true',
        publicKnowledge: formData.get('publicKnowledge') === 'true',
        priority: parseInt(formData.get('priority') as string) || 50,
      };

      const worldRule = bibleService.worldRules.create(data);

      return redirect(303, `/projects/${params.id}/bible/world-rule/${worldRule.id}`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('createWorldRule error:', err);
      return fail(400, { message: 'Invalid world rule data' });
    }
  },

  createPlotThread: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, locals.drizzle, params.id);

    try {
      const data: Omit<PlotThread, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as PlotThread['type'],
        status: formData.get('status') as PlotThread['status'],
        scope: formData.get('scope') as PlotThread['scope'],
        priority: parseInt(formData.get('priority') as string) || 50,
        involvedCharacters: [],
        relatedLocations: [],
        promises: [],
        touches: [],
        childThreads: [],
      };

      const plotThread = bibleService.plotThreads.create(data);

      return redirect(303, `/projects/${params.id}/bible/plot-thread/${plotThread.id}`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('createPlotThread error:', err);
      return fail(400, { message: 'Invalid plot thread data' });
    }
  },

  createTimelineEvent: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, locals.drizzle, params.id);

    try {
      const data: Omit<TimelineEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as TimelineEvent['type'],
        significance: formData.get('significance') as TimelineEvent['significance'],
        position: {
          date: (formData.get('date') as string) || undefined,
          storyTime: (formData.get('storyTime') as string) || undefined,
          chapterNumber: formData.get('chapterNumber') ? parseInt(formData.get('chapterNumber') as string) : undefined,
          approximate: formData.get('approximate') === 'true',
        },
        involvedCharacters: [],
        locations: [],
        relatedThreads: [],
        causes: [],
        effects: [],
        revealed: formData.get('revealed') === 'true',
        contentRefs: [],
      };

      const timelineEvent = bibleService.timeline.createEvent(data);

      return redirect(303, `/projects/${params.id}/bible/timeline/${timelineEvent.id}`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('createTimelineEvent error:', err);
      return fail(400, { message: 'Invalid timeline event data' });
    }
  },
};
