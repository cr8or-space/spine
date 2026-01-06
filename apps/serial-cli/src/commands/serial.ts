/**
 * Serial Commands
 *
 * Commands for managing web serial publishing features.
 */

import { Command } from 'commander';
import { withClient } from '../client.js';
import { formatTable, header, error, dim, warning, success } from '../ui/format.js';
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

export function createSerialCommand(): Command {
  const serial = new Command('serial')
    .description('Manage web serial publishing')
    .option('-p, --project <id>', 'Project ID')
    .option('--book <id>', 'Filter by book ID')
    .option('--arc <id>', 'Filter by arc ID');

  // Buffer status
  serial
    .command('buffer')
    .description('Display buffer status and health')
    .action(async function (this: Command) {
      try {
        const parentOpts = this.parent?.opts() ?? {};
        const projectId = getProjectId(parentOpts);

        const status = await withClient(async (client) => {
          return withSpinner('Loading buffer status...', () =>
            client.serial.bufferStatus(projectId)
          );
        });

        console.log(header('Buffer Status'));
        console.log();

        // Health indicator
        const healthSymbol = status.health === 'healthy' ? '✓'
          : status.health === 'warning' ? '⚠'
          : '✗';
        const healthColor = status.health === 'healthy' ? success
          : status.health === 'warning' ? warning
          : error;

        console.log(`Health: ${healthColor(`${healthSymbol} ${status.health}`)}`);
        console.log();

        console.log(`Current Buffer: ${status.currentBuffer} chapters`);
        console.log(`Minimum Required: ${status.minimumBuffer} chapters`);
        console.log(`Chapters Ready: ${status.readyChapters}`);
        console.log(`Chapters In Progress: ${status.inProgressChapters}`);
        console.log();

        // Release info
        if (status.nextReleaseDate) {
          console.log(`Next Release: ${status.nextReleaseDate}`);
        }

        if (status.releasesPerWeek) {
          console.log(`Releases/Week: ${status.releasesPerWeek}`);
        }

        // Warnings
        if (status.health !== 'healthy') {
          console.log();
          if (status.currentBuffer < status.minimumBuffer) {
            console.log(warning(
              `Buffer is ${status.minimumBuffer - status.currentBuffer} chapter(s) below minimum!`
            ));
          }
          if (status.health === 'critical' && status.currentBuffer === 0) {
            console.log(error('No chapters ready for release!'));
          }
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load buffer status'));
        process.exit(1);
      }
    });

  // Release schedule
  serial
    .command('schedule')
    .description('Display release schedule and deadlines')
    .action(async function (this: Command) {
      try {
        const parentOpts = this.parent?.opts() ?? {};
        const projectId = getProjectId(parentOpts);

        const result = await withClient(async (client) => {
          return withSpinner('Loading release schedule...', () =>
            client.serial.releaseSchedule(projectId)
          );
        });

        console.log(header('Release Schedule'));
        console.log();

        if (result.nextReleaseDate) {
          console.log(`Next Release: ${result.nextReleaseDate}`);
        }
        console.log(`Releases/Week: ${result.releasesPerWeek}`);
        console.log();

        // Depletion info
        console.log(header('Buffer Depletion'));
        console.log(`Current Buffer: ${result.depletion.currentBuffer} chapters`);
        if (result.depletion.depletionDate) {
          console.log(`Depletion Date: ${result.depletion.depletionDate}`);
          if (result.depletion.daysUntilDepletion !== null) {
            const daysLabel = result.depletion.daysUntilDepletion === 1 ? 'day' : 'days';
            console.log(`Days Until Depletion: ${result.depletion.daysUntilDepletion} ${daysLabel}`);

            if (result.depletion.daysUntilDepletion <= 7) {
              console.log(warning('Buffer will deplete soon! Schedule more writing time.'));
            }
          }
        } else {
          console.log(dim('No depletion projected (schedule or buffer not configured)'));
        }

        console.log();

        // Scheduled releases
        if (result.schedule.length === 0) {
          console.log('No releases scheduled.');
          return;
        }

        console.log(header('Upcoming Releases'));
        const rows = result.schedule.map((r) => [
          r.date,
          r.structureId,
          r.title ?? '-',
          r.status ?? 'scheduled'
        ]);

        console.log(formatTable(rows, {
          head: ['Date', 'Structure ID', 'Title', 'Status']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load schedule'));
        process.exit(1);
      }
    });

  // Hook patterns
  serial
    .command('hooks')
    .description('Display hook patterns and variety warnings')
    .action(async function (this: Command) {
      try {
        const parentOpts = this.parent?.opts() ?? {};
        const projectId = getProjectId(parentOpts);
        const scope = getScope(parentOpts as { book?: string; arc?: string });

        const result = await withClient(async (client) => {
          return withSpinner('Loading hook patterns...', () =>
            client.serial.hookPatterns(projectId, scope)
          );
        });

        console.log(header('Hook Pattern Analysis'));
        console.log();

        // Variety score
        const varietySymbol = result.analysis.varietyScore >= 50 ? '✓' : '⚠';
        console.log(`Variety Score: ${result.analysis.varietyScore}/100 ${varietySymbol}`);
        console.log();

        // Distribution
        console.log(header('Hook Type Distribution'));
        const distribution = Object.entries(result.analysis.distribution)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a);

        if (distribution.length === 0) {
          console.log('No hook data available.');
        } else {
          const rows = distribution.map(([hookType, count]) => [
            hookType,
            String(count)
          ]);
          console.log(formatTable(rows, {
            head: ['Hook Type', 'Count']
          }));
        }

        // Strength trend
        console.log();
        console.log(header('Strength Trend'));
        console.log(`Average Strength: ${result.strengthTrend.average}/100`);
        console.log(`Trend: ${result.strengthTrend.trend}`);
        if (result.strengthTrend.slope !== 0) {
          const slopeDir = result.strengthTrend.slope > 0 ? 'improving' : 'declining';
          console.log(`Slope: ${result.strengthTrend.slope.toFixed(2)} (${slopeDir})`);
        }

        // Repetition issues
        if (result.repetitionDetails.length > 0) {
          console.log();
          console.log(header('Repetition Issues'));
          for (const rep of result.repetitionDetails) {
            console.log(warning(
              `${rep.consecutiveCount}x "${rep.hookType}" in a row (chapters ${rep.startPosition}-${rep.endPosition})`
            ));
          }
        }

        // Warnings
        if (result.analysis.warnings.length > 0) {
          console.log();
          console.log(header('Warnings'));
          for (const warn of result.analysis.warnings) {
            console.log(warning(warn));
          }
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load hook patterns'));
        process.exit(1);
      }
    });

  // Cycle status
  serial
    .command('cycle')
    .description('Display tension cycle status')
    .action(async function (this: Command) {
      try {
        const parentOpts = this.parent?.opts() ?? {};
        const projectId = getProjectId(parentOpts);
        const scope = getScope(parentOpts as { book?: string; arc?: string });

        const result = await withClient(async (client) => {
          return withSpinner('Loading cycle status...', () =>
            client.serial.cycleStatus(projectId, scope)
          );
        });

        console.log(header('Tension Cycle Status'));
        console.log();

        // Phase info
        console.log(header('Current Phase'));
        console.log(`Cycle: ${result.phaseInfo.currentCycle}`);
        console.log(`Position: ${result.phaseInfo.currentPosition}/${result.phaseInfo.cycleLength} (${result.phaseInfo.phaseDescription})`);
        console.log(`Total Chapters: ${result.phaseInfo.totalChapters}`);
        console.log(`Chapters in Current Cycle: ${result.phaseInfo.chaptersInCurrentCycle}`);

        if (result.phaseInfo.nextTargetTension !== undefined) {
          console.log(`Next Target Tension: ${result.phaseInfo.nextTargetTension}`);
        }

        // Cycle pattern
        console.log();
        console.log(header('Cycle Pattern'));
        console.log(`Pattern: [${result.phaseInfo.tensionTargets.join(', ')}]`);

        // Statistics
        console.log();
        console.log(header('Statistics'));
        console.log(`Complete Cycles: ${result.stats.completeCycles}/${result.stats.totalCycles}`);
        console.log(`Compliance Rate: ${result.stats.complianceRate}%`);
        console.log(`Average Deviation: ${result.stats.averageDeviation.toFixed(1)}`);
        console.log(`Violations: ${result.stats.violationCount}`);

        // Violations
        if (result.violations.length > 0) {
          console.log();
          console.log(header('Violations'));
          const rows = result.violations.map((v) => [
            String(v.globalPosition),
            v.title,
            String(v.expectedTension),
            String(v.actualValue),
            (v.deviation >= 0 ? '+' : '') + v.deviation.toFixed(0),
            v.severity
          ]);

          console.log(formatTable(rows, {
            head: ['Pos', 'Title', 'Expected', 'Actual', 'Dev', 'Severity']
          }));
        }

        // Suggestions
        if (result.suggestions.length > 0) {
          console.log();
          console.log(header('Rebalancing Suggestions'));
          for (const s of result.suggestions.slice(0, 5)) { // Show top 5
            console.log(`${s.priority.toUpperCase()}: "${s.title}"`);
            console.log(dim(`  ${s.direction} tension from ${s.currentTension} to ${s.suggestedTension}`));
          }
          if (result.suggestions.length > 5) {
            console.log(dim(`  ... and ${result.suggestions.length - 5} more`));
          }
        }

        // Warnings
        if (result.warnings.length > 0) {
          console.log();
          console.log(header('Warnings'));
          for (const warn of result.warnings) {
            console.log(warning(warn));
          }
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load cycle status'));
        process.exit(1);
      }
    });

  // Mystery board
  serial
    .command('mysteries')
    .description('Display mystery board with clue tracking')
    .action(async function (this: Command) {
      try {
        const parentOpts = this.parent?.opts() ?? {};
        const projectId = getProjectId(parentOpts);

        const data = await withClient(async (client) => {
          return withSpinner('Loading mystery board...', () =>
            client.serial.mysteryBoard(projectId)
          );
        });

        if (data.size === 0) {
          console.log('No mysteries tracked.');
          return;
        }

        console.log(header('Mystery Board'));
        console.log();

        const entries = Array.from(data.entries());

        // Group by status
        const active = entries.filter(([, m]) => m.status === 'active' || m.status === 'dormant');
        const resolved = entries.filter(([, m]) => m.status === 'resolved');

        if (active.length > 0) {
          console.log(header('Active Mysteries'));
          const rows = active.map(([, m]) => {
            const statusSymbol = m.status === 'active' ? '●' : '○';
            return [
              `${statusSymbol} ${m.threadName}`,
              m.threadType,
              m.scope,
              String(m.summary.totalTouches),
              m.summary.lastTouchPosition?.toString() ?? '-'
            ];
          });

          console.log(formatTable(rows, {
            head: ['Mystery', 'Type', 'Scope', 'Touches', 'Last Touch']
          }));
        }

        // Show unfulfilled promises
        const threadsWithUnfulfilled = entries.filter(([, m]) => m.summary.unfulfilledCount > 0);
        if (threadsWithUnfulfilled.length > 0) {
          console.log();
          console.log(header('Unfulfilled Promises'));
          for (const [, m] of threadsWithUnfulfilled) {
            const unfulfilled = m.promises.filter((p) => p.status === 'pending');
            for (const promise of unfulfilled) {
              console.log(warning(`"${m.threadName}": ${promise.description}`));
              if (promise.madeAtPosition) {
                console.log(dim(`  Made at chapter ${promise.madeAtPosition}, expected: ${promise.expectedPayoff}`));
              }
            }
          }
        }

        if (resolved.length > 0) {
          console.log();
          console.log(header('Resolved Mysteries'));
          const rows = resolved.map(([, m]) => [
            `✓ ${m.threadName}`,
            m.threadType,
            m.summary.firstTouchPosition?.toString() ?? '-',
            m.resolution?.position?.toString() ?? '-'
          ]);

          console.log(formatTable(rows, {
            head: ['Mystery', 'Type', 'Introduced', 'Resolved']
          }));
        }

        // Show dangling warnings
        const danglingMysteries = entries.filter(([, m]) => m.summary.isDangling);
        if (danglingMysteries.length > 0) {
          console.log();
          console.log(warning(`${danglingMysteries.length} dangling mystery thread(s):`));
          for (const [, m] of danglingMysteries) {
            console.log(dim(`  - "${m.threadName}" (last touched at chapter ${m.summary.lastTouchPosition})`));
          }
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load mystery board'));
        process.exit(1);
      }
    });

  return serial;
}
