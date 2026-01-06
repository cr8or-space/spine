/**
 * Story bible management tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { requireProjectId } from '../context';
import { handleToolCall } from '../utils/errors';
import {
  formatCharacter,
  formatLocation,
  formatFaction,
  formatPlotThread
} from '../utils/formatting';

export function registerBibleTools(
  server: McpServer,
  { client, session }: ToolContext
): void {
  // Get full bible
  server.tool(
    'spine_bible_get',
    'Get the complete story bible for the current project',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const bible = await client.bible.get(pid);

        const sections: string[] = ['# Story Bible', ''];

        // Characters
        if (bible.characters?.length > 0) {
          sections.push(`## Characters (${bible.characters.length})`);
          for (const char of bible.characters) {
            sections.push(`### ${char.name} (${char.role})`);
            if (char.description) sections.push(char.description);
            if (char.traits?.length) sections.push(`Traits: ${char.traits.join(', ')}`);
            sections.push('');
          }
        }

        // Locations
        if (bible.locations?.length > 0) {
          sections.push(`## Locations (${bible.locations.length})`);
          for (const loc of bible.locations) {
            sections.push(`### ${loc.name} (${loc.type})`);
            if (loc.description) sections.push(loc.description);
            sections.push('');
          }
        }

        // Factions
        if (bible.factions?.length > 0) {
          sections.push(`## Factions (${bible.factions.length})`);
          for (const faction of bible.factions) {
            sections.push(`### ${faction.name} (${faction.type})`);
            if (faction.description) sections.push(faction.description);
            sections.push('');
          }
        }

        // Plot Threads
        if (bible.plotThreads?.length > 0) {
          sections.push(`## Plot Threads (${bible.plotThreads.length})`);
          for (const thread of bible.plotThreads) {
            sections.push(`### ${thread.name} (${thread.type}) - ${thread.status || 'active'}`);
            if (thread.description) sections.push(thread.description);
            sections.push('');
          }
        }

        // World Rules
        if (bible.worldRules?.length > 0) {
          sections.push(`## World Rules (${bible.worldRules.length})`);
          for (const rule of bible.worldRules) {
            sections.push(`### ${rule.name} (${rule.category})`);
            if (rule.description) sections.push(rule.description);
            sections.push('');
          }
        }

        // Timeline
        if (bible.timeline?.length > 0) {
          sections.push(`## Timeline (${bible.timeline.length} events)`);
          for (const event of bible.timeline) {
            sections.push(`### ${event.date}: ${event.name}`);
            if (event.description) sections.push(event.description);
            sections.push('');
          }
        }

        return {
          content: [{ type: 'text', text: sections.join('\n') }]
        };
      });
    }
  );

  // List characters
  server.tool(
    'spine_bible_character_list',
    'List all characters in the story bible',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const characters = await client.bible.character.list(pid);

        if (characters.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No characters found. Use spine_bible_character_create to add characters.'
              }
            ]
          };
        }

        const lines = characters.map((c) => formatCharacter(c));

        return {
          content: [
            {
              type: 'text',
              text: `# Characters (${characters.length})\n\n${lines.join('\n\n---\n\n')}`
            }
          ]
        };
      });
    }
  );

  // Create character
  server.tool(
    'spine_bible_character_create',
    'Create a new character in the story bible',
    {
      name: z.string().describe('Character name'),
      role: z
        .enum(['protagonist', 'antagonist', 'supporting', 'minor'])
        .describe('Character role in the story'),
      description: z.string().optional().describe('Physical and personality description'),
      traits: z.array(z.string()).optional().describe('Character traits'),
      goals: z.array(z.string()).optional().describe('Character goals'),
      backstory: z.string().optional().describe('Background history'),
      voiceNotes: z.string().optional().describe('Voice and dialogue notes'),
      arcSummary: z.string().optional().describe('Character arc summary'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, ...data }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const character = await client.bible.character.create(pid, data);

        return {
          content: [
            {
              type: 'text',
              text: `Created character "${character.name}" (${character.id})\n\n${formatCharacter(character)}`
            }
          ]
        };
      });
    }
  );

  // Update character
  server.tool(
    'spine_bible_character_update',
    'Update an existing character',
    {
      id: z.string().describe('Character ID'),
      name: z.string().optional().describe('Character name'),
      role: z
        .enum(['protagonist', 'antagonist', 'supporting', 'minor'])
        .optional()
        .describe('Character role'),
      description: z.string().optional().describe('Physical and personality description'),
      traits: z.array(z.string()).optional().describe('Character traits'),
      goals: z.array(z.string()).optional().describe('Character goals'),
      backstory: z.string().optional().describe('Background history'),
      voiceNotes: z.string().optional().describe('Voice and dialogue notes'),
      arcSummary: z.string().optional().describe('Character arc summary'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, id, ...data }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const character = await client.bible.character.update(pid, id, data);

        return {
          content: [
            {
              type: 'text',
              text: `Updated character "${character.name}"\n\n${formatCharacter(character)}`
            }
          ]
        };
      });
    }
  );

  // Delete character
  server.tool(
    'spine_bible_character_delete',
    'Delete a character from the story bible',
    {
      id: z.string().describe('Character ID to delete'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, id }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        await client.bible.character.delete(pid, id);

        return {
          content: [{ type: 'text', text: `Deleted character ${id}` }]
        };
      });
    }
  );

  // List locations
  server.tool(
    'spine_bible_location_list',
    'List all locations in the story bible',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const locations = await client.bible.location.list(pid);

        if (locations.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No locations found. Use spine_bible_location_create to add locations.'
              }
            ]
          };
        }

        const lines = locations.map((l) => formatLocation(l));

        return {
          content: [
            {
              type: 'text',
              text: `# Locations (${locations.length})\n\n${lines.join('\n\n---\n\n')}`
            }
          ]
        };
      });
    }
  );

  // Create location
  server.tool(
    'spine_bible_location_create',
    'Create a new location in the story bible',
    {
      name: z.string().describe('Location name'),
      type: z
        .enum([
          'world',
          'continent',
          'country',
          'region',
          'city',
          'district',
          'building',
          'room',
          'natural',
          'virtual',
          'other'
        ])
        .describe('Location type'),
      description: z.string().optional().describe('Visual description'),
      atmosphere: z.string().optional().describe('Mood and feel'),
      significance: z.string().optional().describe('Narrative importance'),
      parentLocationId: z.string().optional().describe('Parent location ID for nesting'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, ...data }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const location = await client.bible.location.create(pid, data);

        return {
          content: [
            {
              type: 'text',
              text: `Created location "${location.name}" (${location.id})\n\n${formatLocation(location)}`
            }
          ]
        };
      });
    }
  );

  // List factions
  server.tool(
    'spine_bible_faction_list',
    'List all factions in the story bible',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const factions = await client.bible.faction.list(pid);

        if (factions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No factions found. Use spine_bible_faction_create to add factions.'
              }
            ]
          };
        }

        const lines = factions.map((f) => formatFaction(f));

        return {
          content: [
            {
              type: 'text',
              text: `# Factions (${factions.length})\n\n${lines.join('\n\n---\n\n')}`
            }
          ]
        };
      });
    }
  );

  // Create faction
  server.tool(
    'spine_bible_faction_create',
    'Create a new faction in the story bible',
    {
      name: z.string().describe('Faction name'),
      type: z
        .enum([
          'government',
          'military',
          'religious',
          'criminal',
          'corporate',
          'secret-society',
          'guild',
          'family',
          'informal',
          'other'
        ])
        .describe('Faction type'),
      description: z.string().optional().describe('Overview'),
      goals: z.array(z.string()).optional().describe('Faction objectives'),
      values: z.array(z.string()).optional().describe('Core values'),
      structure: z.string().optional().describe('Organizational structure'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, ...data }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const faction = await client.bible.faction.create(pid, data);

        return {
          content: [
            {
              type: 'text',
              text: `Created faction "${faction.name}" (${faction.id})\n\n${formatFaction(faction)}`
            }
          ]
        };
      });
    }
  );

  // List plot threads
  server.tool(
    'spine_bible_thread_list',
    'List all plot threads in the story bible',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const threads = await client.bible.plotThread.list(pid);

        if (threads.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No plot threads found. Use spine_bible_thread_create to add threads.'
              }
            ]
          };
        }

        const lines = threads.map((t) => formatPlotThread(t));

        return {
          content: [
            {
              type: 'text',
              text: `# Plot Threads (${threads.length})\n\n${lines.join('\n\n---\n\n')}`
            }
          ]
        };
      });
    }
  );

  // Create plot thread
  server.tool(
    'spine_bible_thread_create',
    'Create a new plot thread in the story bible',
    {
      name: z.string().describe('Thread name'),
      type: z
        .enum([
          'main-plot',
          'subplot',
          'mystery',
          'romance',
          'conflict',
          'character-arc',
          'worldbuilding',
          'other'
        ])
        .describe('Thread type'),
      description: z.string().optional().describe('Thread summary'),
      status: z
        .enum(['planned', 'active', 'dormant', 'resolved', 'abandoned'])
        .optional()
        .default('planned')
        .describe('Current status'),
      startChapter: z.number().optional().describe('Starting chapter number'),
      endChapter: z.number().optional().describe('Ending chapter number'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, ...data }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const thread = await client.bible.plotThread.create(pid, data);

        return {
          content: [
            {
              type: 'text',
              text: `Created plot thread "${thread.name}" (${thread.id})\n\n${formatPlotThread(thread)}`
            }
          ]
        };
      });
    }
  );

  // List world rules
  server.tool(
    'spine_bible_rule_list',
    'List all world rules in the story bible',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const rules = await client.bible.worldRule.list(pid);

        if (rules.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No world rules found. Use spine_bible_rule_create to add rules.'
              }
            ]
          };
        }

        const lines = rules.map(
          (r) =>
            `**${r.name}** (${r.category})\n${r.description || 'No description'}`
        );

        return {
          content: [
            {
              type: 'text',
              text: `# World Rules (${rules.length})\n\n${lines.join('\n\n---\n\n')}`
            }
          ]
        };
      });
    }
  );

  // Create world rule
  server.tool(
    'spine_bible_rule_create',
    'Create a new world rule in the story bible',
    {
      name: z.string().describe('Rule name'),
      category: z
        .enum(['magic', 'physics', 'social', 'economic', 'other'])
        .describe('Rule category'),
      description: z.string().optional().describe('How the rule works'),
      constraints: z.array(z.string()).optional().describe('Limitations'),
      exceptions: z.array(z.string()).optional().describe('Edge cases'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, ...data }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const rule = await client.bible.worldRule.create(pid, data);

        return {
          content: [
            {
              type: 'text',
              text: `Created world rule "${rule.name}" (${rule.id})`
            }
          ]
        };
      });
    }
  );

  // List timeline events
  server.tool(
    'spine_bible_timeline',
    'List all timeline events in the story bible',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const events = await client.bible.timelineEvent.list(pid);

        if (events.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No timeline events found. Use spine_bible_event_create to add events.'
              }
            ]
          };
        }

        const lines = events.map(
          (e) =>
            `**${e.date}**: ${e.name}${e.significance ? ` (${e.significance})` : ''}\n${e.description || ''}`
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Timeline (${events.length} events)\n\n${lines.join('\n\n')}`
            }
          ]
        };
      });
    }
  );

  // Create timeline event
  server.tool(
    'spine_bible_event_create',
    'Create a new timeline event in the story bible',
    {
      name: z.string().describe('Event name'),
      date: z.string().describe('In-world date'),
      description: z.string().optional().describe('What happened'),
      significance: z
        .enum(['major', 'moderate', 'minor'])
        .optional()
        .describe('Event significance'),
      relatedCharacterIds: z
        .array(z.string())
        .optional()
        .describe('Associated character IDs'),
      relatedLocationIds: z
        .array(z.string())
        .optional()
        .describe('Associated location IDs'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, ...data }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const event = await client.bible.timelineEvent.create(pid, data);

        return {
          content: [
            {
              type: 'text',
              text: `Created timeline event "${event.name}" on ${event.date} (${event.id})`
            }
          ]
        };
      });
    }
  );
}
