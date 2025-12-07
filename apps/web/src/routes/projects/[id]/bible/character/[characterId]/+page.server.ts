import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';
import type { Character, Trait } from '@repo/types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  const bibleService = createBibleService(locals.db, params.id);
  const character = bibleService.characters.get(params.characterId);

  if (!character) {
    throw error(404, 'Character not found');
  }

  // Get all characters for relationship selection
  const allCharacters = bibleService.characters.getAll();

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    character,
    allCharacters: allCharacters.filter((c) => c.id !== character.id),
  };
};

export const actions: Actions = {
  update: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data: Partial<Character> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        aliases: JSON.parse(formData.get('aliases') as string || '[]'),
        role: formData.get('role') as Character['role'],
        status: formData.get('status') as Character['status'],
        voiceSamples: JSON.parse(formData.get('voiceSamples') as string || '[]'),
      };

      const updated = bibleService.characters.update(params.characterId, data);

      if (!updated) {
        return fail(404, { message: 'Character not found' });
      }

      return { success: true };
    } catch {
      return fail(400, { message: 'Invalid character data' });
    }
  },

  delete: async ({ params, locals }) => {
    const bibleService = createBibleService(locals.db, params.id);
    const deleted = bibleService.characters.delete(params.characterId);

    if (!deleted) {
      return fail(404, { message: 'Character not found' });
    }

    throw redirect(303, `/projects/${params.id}/bible`);
  },

  addTrait: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const trait: Trait = {
        category: formData.get('category') as Trait['category'],
        name: formData.get('name') as string,
        description: formData.get('description') as string,
      };

      const updated = bibleService.characters.addTrait(params.characterId, trait);

      if (!updated) {
        return fail(404, { message: 'Character not found' });
      }

      return { success: true };
    } catch {
      return fail(400, { message: 'Invalid trait data' });
    }
  },

  removeTrait: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const traitName = formData.get('traitName') as string;

    const updated = bibleService.characters.removeTrait(params.characterId, traitName);

    if (!updated) {
      return fail(404, { message: 'Character or trait not found' });
    }

    return { success: true };
  },

  addRelationship: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    // Import Relationship type inline to avoid unused import warning
    type Relationship = Character['relationships'][number];

    try {
      const relationship: Relationship = {
        targetId: formData.get('targetId') as string,
        type: formData.get('type') as Relationship['type'],
        description: formData.get('description') as string,
        intensity: parseInt(formData.get('intensity') as string),
        mutual: formData.get('mutual') === 'true',
      };

      const updated = bibleService.characters.addRelationship(params.characterId, relationship);

      if (!updated) {
        return fail(404, { message: 'Character not found' });
      }

      return { success: true };
    } catch {
      return fail(400, { message: 'Invalid relationship data' });
    }
  },

  removeRelationship: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const targetId = formData.get('targetId') as string;

    const updated = bibleService.characters.removeRelationship(params.characterId, targetId);

    if (!updated) {
      return fail(404, { message: 'Character or relationship not found' });
    }

    return { success: true };
  },
};
