/**
 * Project API methods
 */

import type { SpineClient } from '../client';
import type { Project, ProjectSummary } from '@repo/types';

export interface ProjectApi {
  list(): Promise<ProjectSummary[]>;
  create(title: string, format?: 'web-serial' | 'novel' | 'short-story'): Promise<Project>;
  load(id: string): Promise<Project>;
  delete(id: string): Promise<{ success: boolean }>;
  updateSettings(id: string, settings: ProjectSettingsUpdate): Promise<{ success: boolean }>;
  updateMetadata(id: string, metadata: ProjectMetadataUpdate): Promise<{ success: boolean }>;
}

export interface ProjectSettingsUpdate {
  llmConfig?: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    maxTokens?: number;
  };
  revisionHorizon?: number;
  tensionTolerance?: number;
}

export interface ProjectMetadataUpdate {
  description?: string;
  genre?: string;
  targetWordCount?: number;
}

export function createProjectApi(client: SpineClient): ProjectApi {
  return {
    async list(): Promise<ProjectSummary[]> {
      return client.request<ProjectSummary[]>('project.list');
    },

    async create(title: string, format: 'web-serial' | 'novel' | 'short-story' = 'web-serial'): Promise<Project> {
      return client.request<Project>('project.create', { title, format });
    },

    async load(id: string): Promise<Project> {
      return client.request<Project>('project.load', { id });
    },

    async delete(id: string): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>('project.delete', { id });
    },

    async updateSettings(id: string, settings: ProjectSettingsUpdate): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>('project.updateSettings', { id, settings });
    },

    async updateMetadata(id: string, metadata: ProjectMetadataUpdate): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>('project.updateMetadata', { id, metadata });
    }
  };
}
