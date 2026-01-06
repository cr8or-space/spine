/**
 * Generate Commands
 *
 * Commands for content generation with streaming output.
 */

import { Command } from 'commander';
import { getClient, disconnectClient } from '../client.js';
import { success, error, header, info } from '../ui/format.js';
import { promptConfirm } from '../ui/prompts.js';
import { GenerationProgress } from '../ui/progress.js';
import { loadConfig } from '../config.js';
import { SUBSCRIPTION_CHANNELS } from '@repo/framework-client';

function getProjectId(options: { project?: string }): string {
  const projectId = options.project ?? loadConfig().defaultProject;
  if (!projectId) {
    throw new Error('No project specified. Use --project or set a default project.');
  }
  return projectId;
}

export function createGenerateCommand(): Command {
  const generate = new Command('generate')
    .alias('gen')
    .description('Generate content')
    .option('-p, --project <id>', 'Project ID');

  // Start generation
  generate
    .command('start <structureId>')
    .description('Start content generation for a structure')
    .option('-t, --temperature <temp>', 'Temperature (0.0-1.0)', '0.7')
    .option('-m, --max-tokens <tokens>', 'Maximum tokens', '4000')
    .option('--no-stream', 'Disable streaming output')
    .action(async function (this: Command, structureId: string, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});
        const temperature = parseFloat(options.temperature as string);
        const maxTokens = parseInt(options.maxTokens as string, 10);

        // Get structure info first
        const client = await getClient();
        const struct = await client.structure.get(projectId, structureId);

        console.log(header(`Generating: ${struct.title}`));
        console.log();

        // Check for existing content
        const existing = await client.content.get(projectId, structureId);
        if (existing && existing.text) {
          console.log(info('Content already exists.'));
          const confirmed = await promptConfirm('Overwrite existing content?');
          if (!confirmed) {
            disconnectClient();
            return;
          }
        }

        // Set up progress tracking
        const progress = new GenerationProgress();

        // Subscribe to generation events if streaming
        let generationId: string | null = null;

        if (options.stream !== false) {
          // Set up subscription for progress
          client.subscribe(
            { channel: SUBSCRIPTION_CHANNELS.GENERATION_PROGRESS },
            (params) => {
              if (params.generationId !== generationId) return;

              if (params.event === 'stage_start') {
                progress.setStage(params.stage as string);
              } else if (params.event === 'token') {
                progress.addToken(params.token as string);
              }
            }
          );

          client.subscribe(
            { channel: SUBSCRIPTION_CHANNELS.GENERATION_COMPLETE },
            (params) => {
              if (params.generationId !== generationId) return;

              if (params.success) {
                progress.succeed('Generation complete');
              } else {
                progress.fail('Generation failed');
              }
              disconnectClient();
            }
          );

          client.subscribe(
            { channel: SUBSCRIPTION_CHANNELS.GENERATION_ERROR },
            (params) => {
              if (params.generationId !== generationId) return;

              progress.fail(`Error: ${params.error}`);
              disconnectClient();
            }
          );
        }

        progress.start();

        // Start generation
        const result = await client.generation.start(projectId, structureId, {
          temperature,
          maxTokens
        });

        generationId = result.generationId;
        console.log(info(`Generation ID: ${generationId}`));

        // If not streaming, poll for status
        if (options.stream === false) {
          let status = await client.generation.status(generationId);
          while (status.status === 'running') {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            status = await client.generation.status(generationId);
          }

          if (status.status === 'completed') {
            progress.succeed('Generation complete');
          } else {
            progress.fail(`Generation ${status.status}`);
          }
          disconnectClient();
        }

        // Keep connection alive for streaming
        // Will be closed by subscription handlers
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to start generation'));
        disconnectClient();
        process.exit(1);
      }
    });

  // Check generation status
  generate
    .command('status <generationId>')
    .description('Check generation status')
    .action(async (generationId: string) => {
      try {
        const client = await getClient();
        const status = await client.generation.status(generationId);

        console.log(`Status: ${status.status}`);
        if (status.pipelineState) {
          console.log(`Started: ${status.pipelineState.startedAt}`);
          if (status.pipelineState.completedAt) {
            console.log(`Completed: ${status.pipelineState.completedAt}`);
          }
        }

        disconnectClient();
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to get status'));
        disconnectClient();
        process.exit(1);
      }
    });

  // Cancel generation
  generate
    .command('cancel <generationId>')
    .description('Cancel a running generation')
    .action(async (generationId: string) => {
      try {
        const client = await getClient();
        await client.generation.cancel(generationId);
        console.log(success('Generation cancelled'));
        disconnectClient();
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to cancel'));
        disconnectClient();
        process.exit(1);
      }
    });

  return generate;
}
