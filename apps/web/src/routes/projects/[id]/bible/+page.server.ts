import { error, fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  // Get bible service for this project
  const bibleService = createBibleService(locals.db, params.id);

  // Get the complete bible
  const bible = bibleService.getBible();

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    bible,
  };
};

export const actions: Actions = {
  createCharacter: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        aliases: JSON.parse(formData.get('aliases') as string || '[]'),
        role: formData.get('role') as any,
        status: formData.get('status') as any,
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
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        aliases: JSON.parse(formData.get('aliases') as string || '[]'),
        type: formData.get('type') as any,
        status: formData.get('status') as any,
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
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        aliases: JSON.parse(formData.get('aliases') as string || '[]'),
        type: formData.get('type') as any,
        status: formData.get('status') as any,
        influence: formData.get('influence') as any,
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
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data = {
        name: formData.get('name') as string,
        category: formData.get('category') as any,
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
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as any,
        status: formData.get('status') as any,
        scope: formData.get('scope') as any,
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
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as any,
        significance: formData.get('significance') as any,
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
