/**
 * Extraction Commands
 *
 * Commands for bible entity extraction from content.
 */

import { Command } from 'commander';
import { withClient } from '../client.js';
import { formatTable, success, error, header, truncate, info, warning } from '../ui/format.js';
import { promptSelect, promptConfirm } from '../ui/prompts.js';
import { withSpinner } from '../ui/progress.js';
import { loadConfig } from '../config.js';
import type { SuggestionSummary, EntitySuggestion } from '@repo/serial-types';

function getProjectId(options: { project?: string }): string {
  const projectId = options.project ?? loadConfig().defaultProject;
  if (!projectId) {
    throw new Error('No project specified. Use --project or set a default project.');
  }
  return projectId;
}

function formatConfidence(confidence: string): string {
  switch (confidence) {
    case 'high':
      return '\x1b[32mhigh\x1b[0m';
    case 'medium':
      return '\x1b[33mmedium\x1b[0m';
    case 'low':
      return '\x1b[31mlow\x1b[0m';
    default:
      return confidence;
  }
}

function formatEntityType(type: string): string {
  return type.replace('-', ' ');
}

export function createExtractionCommand(): Command {
  const extraction = new Command('extract')
    .description('Extract bible entities from content')
    .option('-p, --project <id>', 'Project ID');

  // Run extraction
  extraction
    .command('run')
    .description('Run entity extraction on project content')
    .option('--type <types...>', 'Entity types to extract (character, location, faction, world-rule, plot-thread)')
    .option('--reanalyze', 'Re-analyze content that was already processed')
    .action(async function (this: Command, opts) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const result = await withClient(async (client) => {
          return withSpinner('Extracting entities from content...', () =>
            client.extraction.run(projectId, {
              entityTypes: opts.type,
              reanalyze: opts.reanalyze ?? false,
            })
          );
        });

        console.log(header('Extraction Results'));
        console.log();
        console.log(`Structures analyzed: ${result.structuresAnalyzed.length}`);
        console.log(`Suggestions created: ${result.suggestionsCreated}`);
        console.log(`  - New entities: ${result.byType.new}`);
        console.log(`  - Updates: ${result.byType.update}`);

        if (Object.keys(result.byEntityType).length > 0) {
          console.log('\nBy entity type:');
          for (const [type, count] of Object.entries(result.byEntityType)) {
            console.log(`  - ${formatEntityType(type)}: ${count}`);
          }
        }

        if (result.errors.length > 0) {
          console.log(warning(`\n${result.errors.length} error(s) occurred:`));
          for (const err of result.errors) {
            console.log(`  - ${err}`);
          }
        }

        if (result.suggestionsCreated > 0) {
          console.log(info('\nUse "spine extract suggestions" to review.'));
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to run extraction'));
        process.exit(1);
      }
    });

  // List suggestions
  extraction
    .command('suggestions')
    .alias('list')
    .description('List entity suggestions')
    .option('--status <status>', 'Filter by status (pending, accepted, rejected, merged)')
    .option('--type <type>', 'Filter by entity type')
    .action(async function (this: Command, opts) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const suggestions = await withClient(async (client) => {
          return withSpinner('Loading suggestions...', () =>
            client.extraction.suggestions(projectId, opts.status, opts.type)
          );
        });

        if (suggestions.length === 0) {
          console.log('No suggestions found.');
          return;
        }

        const rows = suggestions.map((s: SuggestionSummary) => [
          s.id.slice(0, 8),
          s.suggestionType,
          formatEntityType(s.entityType),
          truncate(s.name, 25),
          formatConfidence(s.confidence),
          s.status,
          s.evidenceCount.toString(),
        ]);

        console.log(formatTable(rows, {
          head: ['ID', 'Type', 'Entity', 'Name', 'Confidence', 'Status', 'Evidence']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list suggestions'));
        process.exit(1);
      }
    });

  // Show suggestion detail
  extraction
    .command('show <id>')
    .description('Show suggestion details')
    .action(async function (this: Command, suggestionId: string) {
      try {
        const suggestion = await withClient(async (client) => {
          return withSpinner('Loading suggestion...', () =>
            client.extraction.suggestion(suggestionId)
          );
        });

        console.log(header(`${suggestion.suggestionType === 'new' ? 'New' : 'Update'} ${formatEntityType(suggestion.entityType)}: ${suggestion.name}`));
        console.log();
        console.log(`ID: ${suggestion.id}`);
        console.log(`Status: ${suggestion.status}`);
        console.log(`Confidence: ${formatConfidence(suggestion.confidence)}`);
        console.log();
        console.log('Reasoning:');
        console.log(`  ${suggestion.reasoning}`);

        if (suggestion.suggestionType === 'new' && suggestion.suggestedData) {
          console.log('\nSuggested data:');
          for (const [key, value] of Object.entries(suggestion.suggestedData)) {
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            console.log(`  ${key}: ${truncate(displayValue, 60)}`);
          }
        }

        if (suggestion.fieldUpdates && suggestion.fieldUpdates.length > 0) {
          console.log('\nField updates:');
          for (const update of suggestion.fieldUpdates) {
            console.log(`  ${update.field}:`);
            console.log(`    Current: ${JSON.stringify(update.currentValue)}`);
            console.log(`    Suggested: ${JSON.stringify(update.suggestedValue)}`);
            console.log(`    Reason: ${update.reason}`);
          }
        }

        if (suggestion.evidence.length > 0) {
          console.log('\nEvidence:');
          for (const e of suggestion.evidence) {
            console.log(`  - "${truncate(e.excerpt, 80)}"`);
            if (e.position !== undefined) {
              console.log(`    (at position ${e.position}% in ${e.structureId})`);
            }
          }
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load suggestion'));
        process.exit(1);
      }
    });

  // Review pending suggestions interactively
  extraction
    .command('review')
    .description('Interactively review pending suggestions')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const suggestions = await withClient(async (client) => {
          return client.extraction.suggestions(projectId, 'pending');
        });

        if (suggestions.length === 0) {
          console.log('No pending suggestions to review.');
          return;
        }

        console.log(header(`Reviewing ${suggestions.length} pending suggestion(s)`));
        console.log();

        for (const summary of suggestions) {
          const suggestion = await withClient(async (client) => {
            return client.extraction.suggestion(summary.id);
          });

          displaySuggestion(suggestion);

          const action = await promptSelect('Action:', [
            { value: 'accept', name: 'Accept' },
            { value: 'reject', name: 'Reject' },
            { value: 'skip', name: 'Skip' },
            { value: 'quit', name: 'Quit reviewing' },
          ]);

          if (action === 'quit') {
            break;
          }

          if (action === 'accept') {
            await withClient(async (client) => {
              await client.extraction.accept(suggestion.id);
            });
            console.log(success('Suggestion accepted.'));
            console.log(info('Note: You need to manually create the entity using the bible commands.'));
          } else if (action === 'reject') {
            await withClient(async (client) => {
              await client.extraction.reject(suggestion.id);
            });
            console.log(success('Suggestion rejected.'));
          }

          console.log();
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to review suggestions'));
        process.exit(1);
      }
    });

  // Accept a suggestion
  extraction
    .command('accept <id>')
    .description('Accept a suggestion')
    .option('-n, --notes <notes>', 'Review notes')
    .action(async function (this: Command, suggestionId: string, opts) {
      try {
        const result = await withClient(async (client) => {
          return withSpinner('Accepting suggestion...', () =>
            client.extraction.accept(suggestionId, opts.notes)
          );
        });

        if (result.success) {
          console.log(success('Suggestion accepted.'));
          console.log(info('Note: You need to manually create/update the entity using the bible commands.'));
        } else {
          console.log(error(result.error || 'Failed to accept suggestion'));
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to accept suggestion'));
        process.exit(1);
      }
    });

  // Reject a suggestion
  extraction
    .command('reject <id>')
    .description('Reject a suggestion')
    .option('-n, --notes <notes>', 'Review notes')
    .action(async function (this: Command, suggestionId: string, opts) {
      try {
        await withClient(async (client) => {
          return withSpinner('Rejecting suggestion...', () =>
            client.extraction.reject(suggestionId, opts.notes)
          );
        });

        console.log(success('Suggestion rejected.'));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to reject suggestion'));
        process.exit(1);
      }
    });

  // Cleanup old suggestions
  extraction
    .command('cleanup')
    .description('Clean up old reviewed suggestions')
    .option('--days <days>', 'Remove suggestions older than days', '30')
    .action(async function (this: Command, opts) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});
        const days = parseInt(opts.days, 10);

        const confirm = await promptConfirm(
          `Remove reviewed suggestions older than ${days} days?`
        );

        if (!confirm) {
          console.log('Cancelled.');
          return;
        }

        const deleted = await withClient(async (client) => {
          return withSpinner('Cleaning up...', () =>
            client.extraction.cleanup(projectId, days)
          );
        });

        console.log(success(`Deleted ${deleted} old suggestion(s).`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to cleanup'));
        process.exit(1);
      }
    });

  return extraction;
}

function displaySuggestion(suggestion: EntitySuggestion): void {
  console.log('---');
  console.log(`${suggestion.suggestionType === 'new' ? 'NEW' : 'UPDATE'} ${formatEntityType(suggestion.entityType).toUpperCase()}: ${suggestion.name}`);
  console.log(`Confidence: ${formatConfidence(suggestion.confidence)}`);
  console.log();
  console.log(`Reasoning: ${suggestion.reasoning}`);

  if (suggestion.evidence.length > 0) {
    console.log('\nEvidence:');
    for (const e of suggestion.evidence.slice(0, 2)) {
      console.log(`  "${truncate(e.excerpt, 70)}"`);
    }
    if (suggestion.evidence.length > 2) {
      console.log(`  ... and ${suggestion.evidence.length - 2} more`);
    }
  }

  console.log();
}
