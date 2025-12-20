/**
 * System tools - Error handling, health checks, and backup management
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { handleToolCall } from '../utils/errors';

export function registerSystemTools(
  server: McpServer,
  { client }: ToolContext
): void {
  // Get system health summary
  server.tool(
    'spine_system_health',
    'Get system health summary including pending operations, errors, and backup status',
    {},
    async () => {
      return handleToolCall(async () => {
        const health = await client.system.health();

        const statusIcon = health.isHealthy ? '✅' : '⚠️';

        const lines: string[] = [
          '# System Health',
          '',
          `${statusIcon} **Status:** ${health.isHealthy ? 'Healthy' : 'Issues Detected'}`,
          '',
          `**Pending Operations:** ${health.pendingOperations}`,
          `**Recent Errors:** ${health.recentErrors}`,
        ];

        if (health.lastBackup) {
          lines.push(`**Last Backup:** ${health.lastBackup}`);
        } else {
          lines.push('**Last Backup:** Never');
        }

        if (health.lastIntegrityCheck) {
          lines.push(`**Last Integrity Check:** ${health.lastIntegrityCheck}`);
        }

        if (!health.isHealthy) {
          lines.push(
            '',
            '---',
            '',
            '**Recommendation:** Run `spine_system_integrity_check` for details.'
          );
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Run integrity check
  server.tool(
    'spine_system_integrity_check',
    'Run full database integrity check and detect issues',
    {},
    async () => {
      return handleToolCall(async () => {
        const result = await client.system.integrityCheck();

        const statusIcon = result.isValid ? '✅' : '❌';

        const lines: string[] = [
          '# Integrity Check Results',
          '',
          `${statusIcon} **Overall:** ${result.isValid ? 'Valid' : 'Issues Found'}`,
        ];

        if (result.errors.length > 0) {
          lines.push('', '## Errors', '');
          for (const error of result.errors) {
            lines.push(`- ❌ ${error}`);
          }
        }

        if (result.warnings.length > 0) {
          lines.push('', '## Warnings', '');
          for (const warning of result.warnings) {
            lines.push(`- ⚠️ ${warning}`);
          }
        }

        lines.push('', '## Check Details', '');
        for (const check of result.checks) {
          const icon =
            check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
          lines.push(`- ${icon} ${check.checkType}: ${check.status}`);
        }

        if (!result.isValid) {
          lines.push(
            '',
            '---',
            '',
            '**Recommendation:** Run `spine_system_repair` to attempt automatic repair.'
          );
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Repair issues
  server.tool(
    'spine_system_repair',
    'Attempt to automatically repair detected issues',
    {},
    async () => {
      return handleToolCall(async () => {
        const result = await client.system.repair();

        const lines: string[] = [
          '# Repair Results',
          '',
          `**Repaired:** ${result.repaired}`,
          `**Failed:** ${result.failed}`,
        ];

        if (result.failed > 0) {
          lines.push(
            '',
            '---',
            '',
            '**Note:** Some issues could not be repaired automatically. Manual intervention may be required.'
          );
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Get recoverable operations
  server.tool(
    'spine_system_recoverable_operations',
    'Get list of operations that can be recovered (pending or in-progress)',
    {},
    async () => {
      return handleToolCall(async () => {
        const operations = await client.system.recoverableOperations();

        if (operations.length === 0) {
          return {
            content: [{ type: 'text', text: 'No recoverable operations found.' }]
          };
        }

        const lines: string[] = [
          '# Recoverable Operations',
          '',
          `Found ${operations.length} operation(s):`,
          '',
        ];

        for (const op of operations) {
          const statusIcon = op.status === 'pending' ? '⏳' : '🔄';
          lines.push(
            `## ${statusIcon} ${op.operationType}`,
            `- **ID:** ${op.id}`,
            `- **Status:** ${op.status}`,
            `- **Retries:** ${op.retryCount}/${op.maxRetries}`,
            `- **Created:** ${op.createdAt}`,
            ''
          );
        }

        lines.push(
          '---',
          '',
          'Use `spine_system_recover` to attempt recovery.'
        );

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Recover operations
  server.tool(
    'spine_system_recover',
    'Attempt to recover pending or failed operations',
    {},
    async () => {
      return handleToolCall(async () => {
        const result = await client.system.recover();

        const statusIcon = result.success ? '✅' : '⚠️';

        const lines: string[] = [
          '# Recovery Results',
          '',
          `${statusIcon} **Success:** ${result.success}`,
          `**Recovered:** ${result.recoveredOperations}`,
          `**Failed:** ${result.failedOperations}`,
        ];

        if (result.details.length > 0) {
          lines.push('', '## Details', '');
          for (const detail of result.details) {
            const icon = detail.recovered ? '✅' : '❌';
            lines.push(`- ${icon} ${detail.operationType}: ${detail.message}`);
          }
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Create backup
  server.tool(
    'spine_system_backup',
    'Create a database backup',
    {
      name: z.string().optional().describe('Optional backup name')
    },
    async ({ name }) => {
      return handleToolCall(async () => {
        const backup = await client.system.createBackup(name);

        const statusIcon = backup.status === 'completed' ? '✅' : '❌';

        const lines: string[] = [
          '# Backup Created',
          '',
          `${statusIcon} **Status:** ${backup.status}`,
          `**ID:** ${backup.id}`,
          `**Type:** ${backup.backupType}`,
          `**Path:** ${backup.filePath}`,
        ];

        if (backup.fileSize) {
          const sizeMB = (backup.fileSize / 1024 / 1024).toFixed(2);
          lines.push(`**Size:** ${sizeMB} MB`);
        }

        if (backup.checksum) {
          lines.push(`**Checksum:** ${backup.checksum.substring(0, 16)}...`);
        }

        if (backup.errorMessage) {
          lines.push(`**Error:** ${backup.errorMessage}`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // List backups
  server.tool(
    'spine_system_list_backups',
    'List all available backups',
    {},
    async () => {
      return handleToolCall(async () => {
        const backups = await client.system.listBackups();

        if (backups.length === 0) {
          return {
            content: [{ type: 'text', text: 'No backups found. Use `spine_system_backup` to create one.' }]
          };
        }

        const lines: string[] = [
          '# Available Backups',
          '',
          `Found ${backups.length} backup(s):`,
          '',
        ];

        for (const backup of backups) {
          const statusIcon =
            backup.status === 'completed' ? '✅' :
              backup.status === 'verified' ? '✓' :
                backup.status === 'failed' ? '❌' : '⏳';

          const sizeMB = backup.fileSize ? `${(backup.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown';

          lines.push(
            `## ${statusIcon} ${backup.id}`,
            `- **Type:** ${backup.backupType}`,
            `- **Status:** ${backup.status}`,
            `- **Size:** ${sizeMB}`,
            `- **Created:** ${backup.createdAt}`,
            ''
          );
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Verify backup
  server.tool(
    'spine_system_verify_backup',
    'Verify the integrity of a backup',
    {
      backupId: z.string().describe('Backup ID to verify')
    },
    async ({ backupId }) => {
      return handleToolCall(async () => {
        const result = await client.system.verifyBackup(backupId);

        const statusIcon = result.valid ? '✅' : '❌';

        const lines: string[] = [
          '# Backup Verification',
          '',
          `${statusIcon} **Valid:** ${result.valid}`,
        ];

        if (result.error) {
          lines.push(`**Error:** ${result.error}`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Delete backup
  server.tool(
    'spine_system_delete_backup',
    'Delete a backup file and record',
    {
      backupId: z.string().describe('Backup ID to delete'),
      confirm: z.boolean().describe('Confirm deletion')
    },
    async ({ backupId, confirm }) => {
      return handleToolCall(async () => {
        if (!confirm) {
          return {
            content: [{ type: 'text', text: 'Deletion not confirmed. Set confirm=true to proceed.' }]
          };
        }

        const result = await client.system.deleteBackup(backupId);

        return {
          content: [{
            type: 'text',
            text: result.success
              ? `✅ Backup ${backupId} deleted successfully.`
              : `❌ Failed to delete backup ${backupId}.`
          }]
        };
      });
    }
  );

  // Cleanup
  server.tool(
    'spine_system_cleanup',
    'Clean up old operation journal entries and excess backups',
    {},
    async () => {
      return handleToolCall(async () => {
        const result = await client.system.cleanup();

        const lines: string[] = [
          '# Cleanup Results',
          '',
          `**Journal Entries Removed:** ${result.journalEntries}`,
          `**Backups Removed:** ${result.backups}`,
        ];

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );
}
