/**
 * Structure API handlers - Structure tree, beats, hooks
 */

import type { Router } from '../router';
import { ApiError } from '../router';
import type { Services } from '../services';
import { API_METHODS } from '../protocol';
import type { Structure } from '@repo/types';

// Simplified param types
interface ProjectIdParams {
  projectId: string;
}

interface StructureIdParams {
  projectId: string;
  id: string;
}

interface StructureCreateParams {
  projectId: string;
  data: {
    type: 'book' | 'arc' | 'chapter' | 'scene';
    title: string;
    synopsis?: string;
    parentId?: string | null;
    order?: number;
    tensionTarget?: number;
    chapterType?: 'action' | 'character' | 'worldbuilding' | 'transition';
  };
}

interface StructureUpdateParams {
  projectId: string;
  id: string;
  data: {
    title?: string;
    synopsis?: string;
    tensionTarget?: number;
    chapterType?: 'action' | 'character' | 'worldbuilding' | 'transition';
  };
}

interface BeatParams {
  projectId: string;
  structureId: string;
  description: string;
  targetWordCount?: number;
}

interface RemoveBeatParams {
  projectId: string;
  structureId: string;
  beatId: string;
}

interface SetHookParams {
  projectId: string;
  structureId: string;
  hook?: {
    type: 'revelation' | 'decision' | 'cliffhanger' | 'emotional' | 'promise' | 'question' | 'twist';
    description?: string;
  } | null;
}

/**
 * Register structure handlers on the router.
 */
export function registerStructureHandlers(router: Router, services: Services): void {
  // structure.getTree - Get full structure tree
  router.register<ProjectIdParams, Structure>(
    API_METHODS.STRUCTURE_GET_TREE,
    (params) => {
      const structure = services.project.loadStructure(params.projectId);
      if (!structure) {
        throw ApiError.projectNotFound(params.projectId);
      }
      return structure;
    }
  );

  // structure.getAll - Get all structures as flat list
  router.register<ProjectIdParams, Structure[]>(
    API_METHODS.STRUCTURE_GET_ALL,
    (params) => {
      const structureSvc = services.structure(params.projectId);
      return structureSvc.getAll();
    }
  );

  // structure.get - Get single structure by ID
  router.register<StructureIdParams, Structure>(
    API_METHODS.STRUCTURE_GET,
    (params) => {
      const structureSvc = services.structure(params.projectId);
      const structure = structureSvc.get(params.id);
      if (!structure) {
        throw ApiError.entityNotFound('Structure', params.id);
      }
      return structure;
    }
  );

  // structure.create - Create new structure node
  router.register<StructureCreateParams, Structure>(
    API_METHODS.STRUCTURE_CREATE,
    (params) => {
      const structureSvc = services.structure(params.projectId);
      return structureSvc.create({
        type: params.data.type,
        title: params.data.title,
        summary: params.data.synopsis ?? '',
        parentId: params.data.parentId ?? undefined,
        order: params.data.order ?? 0,
        tensionTarget: params.data.tensionTarget,
        chapterType: params.data.chapterType,
        beats: []
      });
    }
  );

  // structure.update - Update structure node
  router.register<StructureUpdateParams, Structure>(
    API_METHODS.STRUCTURE_UPDATE,
    (params) => {
      const structureSvc = services.structure(params.projectId);
      const updated = structureSvc.update(params.id, {
        title: params.data.title,
        summary: params.data.synopsis,
        tensionTarget: params.data.tensionTarget,
        chapterType: params.data.chapterType
      });

      if (!updated) {
        throw ApiError.entityNotFound('Structure', params.id);
      }
      return updated;
    }
  );

  // structure.delete - Delete structure node
  router.register<StructureIdParams, { success: boolean }>(
    API_METHODS.STRUCTURE_DELETE,
    (params) => {
      const structureSvc = services.structure(params.projectId);
      const success = structureSvc.delete(params.id);
      return { success };
    }
  );

  // structure.addBeat - Add a beat to structure
  router.register<BeatParams, { id: string; description: string; targetWordCount?: number; completed: boolean; order: number }>(
    API_METHODS.STRUCTURE_ADD_BEAT,
    (params) => {
      const structureSvc = services.structure(params.projectId);
      const updated = structureSvc.addBeat(
        params.structureId,
        params.description,
        params.targetWordCount
      );

      if (!updated) {
        throw ApiError.entityNotFound('Structure', params.structureId);
      }

      // Return the newly added beat (last one in the array)
      const newBeat = updated.beats[updated.beats.length - 1];
      return newBeat;
    }
  );

  // structure.removeBeat - Remove a beat from structure
  router.register<RemoveBeatParams, { success: boolean }>(
    API_METHODS.STRUCTURE_REMOVE_BEAT,
    (params) => {
      const structureSvc = services.structure(params.projectId);
      const updated = structureSvc.removeBeat(params.structureId, params.beatId);
      return { success: updated !== undefined };
    }
  );

  // structure.setHook - Set or clear hook for structure
  router.register<SetHookParams, Structure>(
    API_METHODS.STRUCTURE_SET_HOOK,
    (params) => {
      const structureSvc = services.structure(params.projectId);
      const hook = params.hook
        ? { type: params.hook.type, description: params.hook.description ?? '' }
        : undefined;
      const updated = structureSvc.setHook(params.structureId, hook);

      if (!updated) {
        throw ApiError.entityNotFound('Structure', params.structureId);
      }
      return updated;
    }
  );
}
