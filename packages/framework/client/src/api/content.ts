/**
 * Content API methods
 */

import type { SpineClient } from '../client';
import type { Content, ContentVersion } from '@repo/serial-types';

export interface ContentApi {
  get(projectId: string, structureId: string): Promise<Content | null>;
  save(projectId: string, structureId: string, text: string): Promise<Content>;
  getHistory(projectId: string, structureId: string): Promise<ContentVersion[]>;
  rollback(projectId: string, structureId: string, versionNumber: number): Promise<Content>;
}

export function createContentApi(client: SpineClient): ContentApi {
  return {
    async get(projectId: string, structureId: string): Promise<Content | null> {
      return client.request<Content | null>('content.get', { projectId, structureId });
    },

    async save(projectId: string, structureId: string, text: string): Promise<Content> {
      return client.request<Content>('content.save', { projectId, structureId, text });
    },

    async getHistory(projectId: string, structureId: string): Promise<ContentVersion[]> {
      return client.request<ContentVersion[]>('content.getHistory', { projectId, structureId });
    },

    async rollback(
      projectId: string,
      structureId: string,
      versionNumber: number
    ): Promise<Content> {
      return client.request<Content>('content.rollback', {
        projectId,
        structureId,
        versionNumber
      });
    }
  };
}
