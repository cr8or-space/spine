import { error, fail, redirect } from '@sveltejs/kit';
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

      throw redirect(303, `/projects/${params.id}/bible/character/${character.id}`);
    } catch (err) {
      if (err instanceof redirect) throw err;
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
        associatedCharacters: [],
        parentLocationId: null,
      };

      const location = bibleService.locations.create(data);

      throw redirect(303, `/projects/${params.id}/bible/location/${location.id}`);
    } catch (err) {
      if (err instanceof redirect) throw err;
      return fail(400, { message: 'Invalid location data' });
    }
  },
};
