/**
 * Version management module
 *
 * Provides version comparison, diff generation, history tracking,
 * and rollback support for content.
 */

export { createVersionService } from './service';
export {
  DEFAULT_VERSION_CONFIG,
  type CreateVersionInput,
  type VersionHistory,
  type VersionHistoryEntry,
  type VersionService,
  type VersionServiceConfig,
} from './types';
