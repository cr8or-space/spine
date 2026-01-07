/**
 * Project management tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { loadProject, clearContext } from '../context';
import { handleToolCall } from '../utils/errors';
import { emptyListResponse, textResponse } from '../utils/response';

export function registerProjectTools(
  server: McpServer,
  { client, session }: ToolContext
): void {
  // List all projects
  server.tool(
    'spine_project_list',
    'List all Spine writing projects',
    {},
    async () => {
      return handleToolCall(async () => {
        const projects = await client.project.list();

        if (projects.length === 0) {
          return emptyListResponse('projects', 'spine_project_create');
        }

        const lines = projects.map(
          (p) =>
            `• ${p.title} (${p.id})\n  Format: ${p.format} | Updated: ${p.updatedAt}`
        );

        return textResponse(`Found ${projects.length} project(s):\n\n${lines.join('\n\n')}`);
      });
    }
  );

  // Create a new project
  server.tool(
    'spine_project_create',
    'Create a new Spine writing project',
    {
      title: z.string().describe('Project title'),
      format: z
        .enum(['web-serial', 'novel', 'short-story'])
        .optional()
        .default('web-serial')
        .describe('Project format type')
    },
    async ({ title, format }) => {
      return handleToolCall(async () => {
        const project = await client.project.create(title, format);

        // Auto-load the new project
        loadProject(session, project.id, project.title);

        return textResponse(
          `Created and loaded project "${project.title}" (${project.id})\nFormat: ${project.format}\n\nProject is now active. You can start adding to the bible or structure.`
        );
      });
    }
  );

  // Load an existing project
  server.tool(
    'spine_project_load',
    'Load a project into the current session',
    {
      id: z.string().describe('Project ID to load')
    },
    async ({ id }) => {
      return handleToolCall(async () => {
        const project = await client.project.load(id);

        loadProject(session, project.id, project.title);

        return textResponse(
          `Loaded project "${project.title}" (${project.id})\nFormat: ${project.format}\nCreated: ${project.createdAt}\nUpdated: ${project.updatedAt}`
        );
      });
    }
  );

  // Delete a project
  server.tool(
    'spine_project_delete',
    'Delete a project (this action is irreversible)',
    {
      id: z.string().describe('Project ID to delete'),
      confirm: z
        .boolean()
        .describe('Must be true to confirm deletion')
    },
    async ({ id, confirm }) => {
      return handleToolCall(async () => {
        if (!confirm) {
          return textResponse('Deletion not confirmed. Set confirm: true to delete the project.');
        }

        // Clear session if deleting current project
        if (session.currentProjectId === id) {
          clearContext(session);
        }

        await client.project.delete(id);

        return textResponse(`Project ${id} has been deleted.`);
      });
    }
  );

  // Get current session status
  server.tool(
    'spine_session_status',
    'Show current session state (loaded project and selected structure)',
    {},
    async () => {
      const lines: string[] = ['**Session Status**', ''];

      if (session.currentProjectId) {
        lines.push(`Project: ${session.currentProjectTitle} (${session.currentProjectId})`);
      } else {
        lines.push('Project: None loaded');
      }

      if (session.currentStructureId) {
        lines.push(`Structure: ${session.currentStructureId}`);
      } else {
        lines.push('Structure: None selected');
      }

      lines.push('');
      lines.push(
        session.currentProjectId
          ? 'Ready to work on the current project.'
          : 'Use spine_project_load or spine_project_create to get started.'
      );

      return textResponse(lines.join('\n'));
    }
  );

  // Update project settings
  server.tool(
    'spine_project_settings',
    'Update project settings (LLM config, revision horizon, tension tolerance)',
    {
      revisionHorizon: z
        .number()
        .optional()
        .describe('Number of chapters affected by revision cascades'),
      tensionTolerance: z
        .number()
        .optional()
        .describe('Acceptable tension score deviation (0-100)'),
      llmBaseUrl: z.string().optional().describe('LLM API base URL'),
      llmApiKey: z.string().optional().describe('LLM API key'),
      llmModel: z.string().optional().describe('LLM model name'),
      llmMaxTokens: z.number().optional().describe('LLM max tokens')
    },
    async (params) => {
      return handleToolCall(async () => {
        const projectId = session.currentProjectId;
        if (!projectId) {
          return textResponse('No project loaded. Use spine_project_load first.');
        }

        const settings: Record<string, unknown> = {};

        if (params.revisionHorizon !== undefined) {
          settings.revisionHorizon = params.revisionHorizon;
        }

        if (params.tensionTolerance !== undefined) {
          settings.tensionTolerance = params.tensionTolerance;
        }

        if (
          params.llmBaseUrl ||
          params.llmApiKey ||
          params.llmModel ||
          params.llmMaxTokens
        ) {
          settings.llmConfig = {
            ...(params.llmBaseUrl && { baseUrl: params.llmBaseUrl }),
            ...(params.llmApiKey && { apiKey: params.llmApiKey }),
            ...(params.llmModel && { model: params.llmModel }),
            ...(params.llmMaxTokens && { maxTokens: params.llmMaxTokens })
          };
        }

        if (Object.keys(settings).length === 0) {
          return textResponse('No settings provided to update.');
        }

        await client.project.updateSettings(projectId, settings);

        return textResponse(`Updated settings for project "${session.currentProjectTitle}".`);
      });
    }
  );
}
