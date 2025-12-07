import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';
import type { TimelineEvent } from '@repo/types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  const bibleService = createBibleService(locals.db, params.id);
  const event = bibleService.timeline.getEvent(params.eventId);

  if (!event) {
    throw error(404, 'Timeline event not found');
  }

  // Get all characters for association
  const allCharacters = bibleService.characters.getAll();

  // Get all locations for association
  const allLocations = bibleService.locations.getAll();

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    event,
    allCharacters,
    allLocations,
  };
};

export const actions: Actions = {
  update: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data: Partial<TimelineEvent> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as TimelineEvent['type'],
        significance: formData.get('significance') as TimelineEvent['significance'],
        position: {
          date: formData.get('position-date') as string || undefined,
          storyTime: formData.get('position-storyTime') as string || undefined,
          chapterNumber: formData.get('position-chapterNumber') ? parseInt(formData.get('position-chapterNumber') as string) : undefined,
          approximate: formData.get('position-approximate') === 'true',
        },
        duration: formData.get('duration') as string || undefined,
        involvedCharacters: JSON.parse(formData.get('involvedCharacters') as string || '[]'),
        locations: JSON.parse(formData.get('locations') as string || '[]'),
        revealed: formData.get('revealed') === 'true',
      };

      const updated = bibleService.timeline.updateEvent(params.eventId, data);

      if (!updated) {
        return fail(404, { message: 'Timeline event not found' });
      }

      return { success: true };
    } catch {
      return fail(400, { message: 'Invalid timeline event data' });
    }
  },

  delete: async ({ params, locals }) => {
    const bibleService = createBibleService(locals.db, params.id);
    const deleted = bibleService.timeline.deleteEvent(params.eventId);

    if (!deleted) {
      return fail(404, { message: 'Timeline event not found' });
    }

    throw redirect(303, `/projects/${params.id}/bible`);
  },
};
