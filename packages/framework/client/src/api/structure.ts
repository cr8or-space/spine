/**
 * Structure API methods
 */

import type { SpineClient } from '../client';
import type { Structure, Beat } from '@repo/serial-types';

export interface StructureApi {
  getTree(projectId: string): Promise<Structure>;
  getAll(projectId: string): Promise<Structure[]>;
  get(projectId: string, id: string): Promise<Structure>;
  create(projectId: string, data: StructureCreate): Promise<Structure>;
  update(projectId: string, id: string, data: StructureUpdate): Promise<Structure>;
  delete(projectId: string, id: string): Promise<{ success: boolean }>;
  reorder(projectId: string, id: string, newOrder: number, newParentId?: string | null): Promise<Structure>;
  addBeat(projectId: string, structureId: string, description: string, targetWordCount?: number): Promise<Beat>;
  removeBeat(projectId: string, structureId: string, beatId: string): Promise<{ success: boolean }>;
  setHook(projectId: string, structureId: string, hook?: HookData | null): Promise<Structure>;
}

export interface StructureCreate {
  title: string;
  type: 'book' | 'arc' | 'chapter' | 'scene';
  parentId?: string | null;
  order?: number;
  synopsis?: string;
  tensionTarget?: number;
  chapterType?: 'action' | 'character' | 'worldbuilding' | 'transition';
}

export interface StructureUpdate {
  title?: string;
  synopsis?: string;
  tensionTarget?: number;
  chapterType?: 'action' | 'character' | 'worldbuilding' | 'transition';
}

export interface HookData {
  type: 'revelation' | 'decision' | 'cliffhanger' | 'emotional';
  description?: string;
}

export function createStructureApi(client: SpineClient): StructureApi {
  return {
    async getTree(projectId: string): Promise<Structure> {
      return client.request<Structure>('structure.getTree', { projectId });
    },

    async getAll(projectId: string): Promise<Structure[]> {
      return client.request<Structure[]>('structure.getAll', { projectId });
    },

    async get(projectId: string, id: string): Promise<Structure> {
      return client.request<Structure>('structure.get', { projectId, id });
    },

    async create(projectId: string, data: StructureCreate): Promise<Structure> {
      return client.request<Structure>('structure.create', { projectId, data });
    },

    async update(projectId: string, id: string, data: StructureUpdate): Promise<Structure> {
      return client.request<Structure>('structure.update', { projectId, id, data });
    },

    async delete(projectId: string, id: string): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>('structure.delete', { projectId, id });
    },

    async reorder(
      projectId: string,
      id: string,
      newOrder: number,
      newParentId?: string | null
    ): Promise<Structure> {
      return client.request<Structure>('structure.reorder', {
        projectId,
        id,
        newOrder,
        newParentId
      });
    },

    async addBeat(
      projectId: string,
      structureId: string,
      description: string,
      targetWordCount?: number
    ): Promise<Beat> {
      return client.request<Beat>('structure.addBeat', {
        projectId,
        structureId,
        description,
        targetWordCount
      });
    },

    async removeBeat(
      projectId: string,
      structureId: string,
      beatId: string
    ): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>('structure.removeBeat', {
        projectId,
        structureId,
        beatId
      });
    },

    async setHook(
      projectId: string,
      structureId: string,
      hook?: HookData | null
    ): Promise<Structure> {
      return client.request<Structure>('structure.setHook', {
        projectId,
        structureId,
        hook
      });
    }
  };
}
