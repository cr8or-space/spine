import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';
import type { Location } from '@repo/types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  const bibleService = createBibleService(locals.db, locals.drizzle, params.id);
  const location = bibleService.locations.get(params.locationId);

  if (!location) {
    throw error(404, 'Location not found');
  }

  // Get all characters for association
  const allCharacters = bibleService.characters.getAll();

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    location,
    allCharacters,
  };
};

export const actions: Actions = {
  update: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, locals.drizzle, params.id);

    try {
      const data: Partial<Location> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        aliases: JSON.parse(formData.get('aliases') as string || '[]'),
        type: formData.get('type') as Location['type'],
        status: formData.get('status') as Location['status'],
        features: JSON.parse(formData.get('features') as string || '[]'),
        associatedCharacters: JSON.parse(formData.get('associatedCharacters') as string || '[]'),
      };

      const updated = bibleService.locations.update(params.locationId, data);

      if (!updated) {
        return fail(404, { message: 'Location not found' });
      }

      return { success: true };
    } catch {
      return fail(400, { message: 'Invalid location data' });
    }
  },

  delete: async ({ params, locals }) => {
    const bibleService = createBibleService(locals.db, locals.drizzle, params.id);
    const deleted = bibleService.locations.delete(params.locationId);

    if (!deleted) {
      return fail(404, { message: 'Location not found' });
    }

    throw redirect(303, `/projects/${params.id}/bible`);
  },
};
