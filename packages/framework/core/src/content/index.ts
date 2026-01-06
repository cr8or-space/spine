/**
 * Content module - Storage, versioning, and reference management.
 */

// Repository
export {
  createContentRepository,
  type ContentRepository,
  type StoredContent,
  type ContentQueryOptions,
} from './repository';

// Versions
export {
  createContentVersionRepository,
  createContentRollback,
  type ContentVersionRepository,
  type ContentVersion,
  type ContentVersionSource,
  type ContentRollback,
} from './versions';

// References
export {
  createContentReferenceRepository,
  createSimpleReferenceExtractor,
  type ContentReferenceRepository,
  type StoredReference,
  type ReferenceExtractor,
} from './references';
