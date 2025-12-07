import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  const bibleService = createBibleService(locals.db, params.id);
  const faction = bibleService.factions.get(params.factionId);

  if (!faction) {
    throw error(404, 'Faction not found');
  }

  // Get all characters for member selection
  const allCharacters = bibleService.characters.getAll();

  // Get all locations for association
  const allLocations = bibleService.locations.getAll();

  // Get all factions for relationship selection
  const allFactions = bibleService.factions.getAll().filter((f) => f.id !== faction.id);

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    faction,
    allCharacters,
    allLocations,
    allFactions,
  };
};

export const actions: Actions = {
  update: async ({ request, params, locals }) => {
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
        ideology: formData.get('ideology') as string || undefined,
        goals: JSON.parse(formData.get('goals') as string || '[]'),
      };

      const updated = bibleService.factions.update(params.factionId, data);

      if (!updated) {
        return fail(404, { message: 'Faction not found' });
      }

      return { success: true };
    } catch (err) {
      return fail(400, { message: 'Invalid faction data' });
    }
  },

  delete: async ({ params, locals }) => {
    const bibleService = createBibleService(locals.db, params.id);
    const deleted = bibleService.factions.delete(params.factionId);

    if (!deleted) {
      return fail(404, { message: 'Faction not found' });
    }

    throw redirect(303, `/projects/${params.id}/bible`);
  },

  addRank: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const rank = {
        name: formData.get('name') as string,
        level: parseInt(formData.get('level') as string),
        description: formData.get('description') as string,
        privileges: JSON.parse(formData.get('privileges') as string || '[]'),
      };

      const updated = bibleService.factions.addRank(params.factionId, rank);

      if (!updated) {
        return fail(404, { message: 'Faction not found' });
      }

      return { success: true };
    } catch (err) {
      return fail(400, { message: 'Invalid rank data' });
    }
  },

  removeRank: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const rankName = formData.get('rankName') as string;

    const updated = bibleService.factions.removeRank(params.factionId, rankName);

    if (!updated) {
      return fail(404, { message: 'Faction or rank not found' });
    }

    return { success: true };
  },

  addMember: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const member = {
        characterId: formData.get('characterId') as string,
        rank: formData.get('rank') as string,
        role: formData.get('role') as string || undefined,
        joinedAt: formData.get('joinedAt') as string || undefined,
        status: formData.get('status') as any,
      };

      const updated = bibleService.factions.addMember(params.factionId, member);

      if (!updated) {
        return fail(404, { message: 'Faction not found' });
      }

      return { success: true };
    } catch (err) {
      return fail(400, { message: 'Invalid member data' });
    }
  },

  removeMember: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const characterId = formData.get('characterId') as string;

    const updated = bibleService.factions.removeMember(params.factionId, characterId);

    if (!updated) {
      return fail(404, { message: 'Faction or member not found' });
    }

    return { success: true };
  },

  addRelation: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const relation = {
        targetId: formData.get('targetId') as string,
        type: formData.get('type') as any,
        description: formData.get('description') as string,
        public: formData.get('public') === 'true',
      };

      const updated = bibleService.factions.addRelation(params.factionId, relation);

      if (!updated) {
        return fail(404, { message: 'Faction not found' });
      }

      return { success: true };
    } catch (err) {
      return fail(400, { message: 'Invalid relation data' });
    }
  },

  removeRelation: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const targetId = formData.get('targetId') as string;

    const updated = bibleService.factions.removeRelation(params.factionId, targetId);

    if (!updated) {
      return fail(404, { message: 'Faction or relation not found' });
    }

    return { success: true };
  },

  addGoal: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const goal = formData.get('goal') as string;

    const updated = bibleService.factions.addGoal(params.factionId, goal);

    if (!updated) {
      return fail(404, { message: 'Faction not found' });
    }

    return { success: true };
  },

  removeGoal: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const goalIndex = parseInt(formData.get('goalIndex') as string);

    const updated = bibleService.factions.removeGoal(params.factionId, goalIndex);

    if (!updated) {
      return fail(404, { message: 'Faction or goal not found' });
    }

    return { success: true };
  },

  addLocation: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const locationId = formData.get('locationId') as string;

    const updated = bibleService.factions.addLocation(params.factionId, locationId);

    if (!updated) {
      return fail(404, { message: 'Faction not found' });
    }

    return { success: true };
  },

  removeLocation: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const locationId = formData.get('locationId') as string;

    const updated = bibleService.factions.removeLocation(params.factionId, locationId);

    if (!updated) {
      return fail(404, { message: 'Faction or location not found' });
    }

    return { success: true };
  },
};
