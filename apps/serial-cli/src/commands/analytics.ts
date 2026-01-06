/**
 * Analytics Commands
 *
 * Commands for viewing project analytics and insights.
 */

import { Command } from 'commander';
import { withClient } from '../client.js';
import { formatTable, header, error, dim, warning, truncate } from '../ui/format.js';
import { withSpinner } from '../ui/progress.js';
import { loadConfig } from '../config.js';

function getProjectId(options: { project?: string }): string {
  const projectId = options.project ?? loadConfig().defaultProject;
  if (!projectId) {
    throw new Error('No project specified. Use --project or set a default project.');
  }
  return projectId;
}

function getScope(options: { book?: string; arc?: string }): { bookId?: string; arcId?: string } | undefined {
  if (options.book || options.arc) {
    return {
      bookId: options.book,
      arcId: options.arc
    };
  }
  return undefined;
}

export function createAnalyticsCommand(): Command {
  const analytics = new Command('analytics')
    .description('View project analytics and insights')
    .option('-p, --project <id>', 'Project ID')
    .option('--book <id>', 'Filter by book ID')
    .option('--arc <id>', 'Filter by arc ID');

  // Tension curve data
  analytics
    .command('tension')
    .description('Display tension curve data')
    .action(async function (this: Command) {
      try {
        const parentOpts = this.parent?.opts() ?? {};
        const projectId = getProjectId(parentOpts);
        const scope = getScope(parentOpts as { book?: string; arc?: string });

        const data = await withClient(async (client) => {
          return withSpinner('Loading tension curve...', () =>
            client.analytics.tensionCurve(projectId, scope)
          );
        });

        if (!data) {
          console.log('No tension curve data available.');
          return;
        }

        console.log(header('Tension Curve'));
        console.log();

        // Display metadata
        console.log(`Structure: ${data.metadata.rootTitle}`);
        console.log(`Data Points: ${data.metadata.dataPointCount}`);
        if (data.metadata.averagePlannedTension !== undefined) {
          console.log(`Avg Planned: ${data.metadata.averagePlannedTension.toFixed(1)}`);
        }
        if (data.metadata.averageActualTension !== undefined) {
          console.log(`Avg Actual: ${data.metadata.averageActualTension.toFixed(1)}`);
        }
        if (data.metadata.averageAbsoluteDivergence !== undefined) {
          console.log(`Avg Divergence: ${data.metadata.averageAbsoluteDivergence.toFixed(1)}`);
        }
        console.log();

        if (data.dataPoints.length === 0) {
          console.log('No data points available.');
          return;
        }

        // Display data points as table
        const rows = data.dataPoints.map((p) => {
          const planned = p.plannedTension !== undefined ? String(p.plannedTension) : '-';
          const actual = p.actualTension !== undefined ? String(p.actualTension) : '-';
          const divStr = p.divergence !== undefined
            ? (p.divergence >= 0 ? '+' : '') + p.divergence.toFixed(0)
            : '-';
          return [
            String(p.position),
            truncate(p.title, 30),
            planned,
            actual,
            divStr,
            p.contentStatus ?? '-'
          ];
        });

        console.log(formatTable(rows, {
          head: ['Pos', 'Title', 'Planned', 'Actual', 'Div', 'Status']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load tension data'));
        process.exit(1);
      }
    });

  // Character presence heatmap
  analytics
    .command('characters')
    .alias('chars')
    .description('Display character presence data')
    .action(async function (this: Command) {
      try {
        const parentOpts = this.parent?.opts() ?? {};
        const projectId = getProjectId(parentOpts);
        const scope = getScope(parentOpts as { book?: string; arc?: string });

        const data = await withClient(async (client) => {
          return withSpinner('Loading character presence...', () =>
            client.analytics.characterPresence(projectId, scope)
          );
        });

        if (data.size === 0) {
          console.log('No character presence data available.');
          return;
        }

        console.log(header('Character Presence'));
        console.log();

        // Convert Map to array for display
        const entries = Array.from(data.entries());

        for (const [, charData] of entries) {
          console.log(header(charData.characterName));
          console.log(`  Role: ${charData.role}`);
          console.log(`  Total Appearances: ${charData.summary.totalAppearances}`);
          console.log(`  POV Chapters: ${charData.summary.povChapters}`);
          console.log(`  Scene Appearances: ${charData.summary.sceneAppearances}`);
          console.log(`  Mentions: ${charData.summary.mentionAppearances}`);
          console.log(`  Dialogue Lines: ${charData.summary.totalDialogueLines}`);

          if (charData.summary.firstAppearance !== undefined) {
            console.log(`  First Appearance: Chapter ${charData.summary.firstAppearance}`);
          }
          if (charData.summary.lastAppearance !== undefined) {
            console.log(`  Last Appearance: Chapter ${charData.summary.lastAppearance}`);
          }
          console.log(`  Appearance Density: ${(charData.summary.appearanceDensity * 100).toFixed(1)}%`);

          // Show arc progress if available
          if (charData.arcProgress) {
            console.log();
            console.log(`  Arc: ${charData.arcProgress.arcType}`);
            console.log(`  Progress: ${charData.arcProgress.progress.toFixed(0)}%`);
            console.log(`  Milestones: ${charData.arcProgress.achievedMilestones}/${charData.arcProgress.totalMilestones}`);
          }

          console.log();
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load character data'));
        process.exit(1);
      }
    });

  // Plot thread timeline
  analytics
    .command('threads')
    .description('Display plot thread timeline')
    .action(async function (this: Command) {
      try {
        const parentOpts = this.parent?.opts() ?? {};
        const projectId = getProjectId(parentOpts);
        const scope = getScope(parentOpts as { book?: string; arc?: string });

        const data = await withClient(async (client) => {
          return withSpinner('Loading plot threads...', () =>
            client.analytics.plotThreads(projectId, scope)
          );
        });

        if (data.size === 0) {
          console.log('No plot thread data available.');
          return;
        }

        console.log(header('Plot Thread Timeline'));
        console.log();

        const entries = Array.from(data.entries());

        const rows = entries.map(([, threadData]) => {
          const statusSymbol = threadData.status === 'resolved' ? '✓'
            : threadData.status === 'dormant' ? '○'
            : threadData.status === 'abandoned' ? '✗'
            : '●';

          return [
            truncate(threadData.threadName, 25),
            threadData.threadType,
            `${statusSymbol} ${threadData.status}`,
            String(threadData.summary.totalTouches),
            threadData.summary.firstTouchPosition?.toString() ?? '-',
            threadData.summary.lastTouchPosition?.toString() ?? '-',
            `${threadData.summary.fulfilledPromises}/${threadData.summary.totalPromises}`
          ];
        });

        console.log(formatTable(rows, {
          head: ['Thread', 'Type', 'Status', 'Touches', 'First', 'Last', 'Promises']
        }));

        // Show dangling threads warning
        const danglingThreads = entries.filter(([, t]) => t.summary.isDangling);
        if (danglingThreads.length > 0) {
          console.log();
          console.log(warning(`${danglingThreads.length} dangling thread(s) detected:`));
          for (const [, t] of danglingThreads) {
            console.log(dim(`  - ${t.threadName} (last touched at position ${t.summary.lastTouchPosition})`));
          }
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load thread data'));
        process.exit(1);
      }
    });

  // Quality metrics
  analytics
    .command('quality')
    .description('Display quality metrics')
    .action(async function (this: Command) {
      try {
        const parentOpts = this.parent?.opts() ?? {};
        const projectId = getProjectId(parentOpts);
        const scope = getScope(parentOpts as { book?: string; arc?: string });

        const metrics = await withClient(async (client) => {
          return withSpinner('Loading quality metrics...', () =>
            client.analytics.quality(projectId, scope)
          );
        });

        console.log(header('Quality Metrics'));
        console.log();

        console.log(`Chapters Analyzed: ${metrics.chaptersAnalyzed}`);
        console.log(`Chapters With Issues: ${metrics.chaptersWithIssues}`);
        console.log();

        const tensionQuality = metrics.averageTensionScore >= 60 ? '✓' : '⚠';
        const hookQuality = metrics.averageHookStrength >= 50 ? '✓' : '⚠';

        console.log(`Average Tension Score: ${metrics.averageTensionScore.toFixed(1)} ${tensionQuality}`);
        console.log(`Average Hook Strength: ${metrics.averageHookStrength.toFixed(1)} ${hookQuality}`);
        console.log(`Continuity Issues: ${metrics.continuityIssueCount}`);

        // Quality summary
        console.log();
        if (metrics.continuityIssueCount > 0) {
          console.log(warning(`${metrics.continuityIssueCount} continuity issue(s) detected. Run review commands to see details.`));
        }

        if (metrics.averageHookStrength < 50) {
          console.log(warning('Average hook strength is below 50. Consider strengthening chapter endings.'));
        }

        if (metrics.chaptersAnalyzed === 0) {
          console.log(dim('No chapters have been analyzed yet. Run generation to create content analysis.'));
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load quality metrics'));
        process.exit(1);
      }
    });

  return analytics;
}
