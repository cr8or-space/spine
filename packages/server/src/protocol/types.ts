import { z } from 'zod';

/**
 * JSON-RPC 2.0 style protocol types for WebSocket communication.
 */

export const JSONRPC_VERSION = '2.0' as const;

// Base message ID schema - can be string or number
export const MessageIdSchema = z.union([z.string(), z.number()]);
export type MessageId = z.infer<typeof MessageIdSchema>;

// Error codes following JSON-RPC 2.0 conventions
export const ErrorCode = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // Application-specific errors (-32000 to -32099)
  PROJECT_NOT_FOUND: -32000,
  ENTITY_NOT_FOUND: -32001,
  VALIDATION_ERROR: -32002,
  GENERATION_ERROR: -32003,
  REVIEW_ERROR: -32004,
  CONTENT_LOCKED: -32005,
  DATABASE_ERROR: -32006,
  LLM_ERROR: -32007,
  SUBSCRIPTION_ERROR: -32008,
  UNAUTHORIZED: -32009,
  RATE_LIMITED: -32010
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// RPC Error schema
export const RpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional()
});
export type RpcError = z.infer<typeof RpcErrorSchema>;

// API Method categories
export const API_METHODS = {
  // Project operations
  PROJECT_LIST: 'project.list',
  PROJECT_CREATE: 'project.create',
  PROJECT_LOAD: 'project.load',
  PROJECT_DELETE: 'project.delete',
  PROJECT_UPDATE_SETTINGS: 'project.updateSettings',
  PROJECT_UPDATE_METADATA: 'project.updateMetadata',

  // Bible operations
  BIBLE_GET: 'bible.get',
  BIBLE_CHARACTER_LIST: 'bible.character.list',
  BIBLE_CHARACTER_GET: 'bible.character.get',
  BIBLE_CHARACTER_CREATE: 'bible.character.create',
  BIBLE_CHARACTER_UPDATE: 'bible.character.update',
  BIBLE_CHARACTER_DELETE: 'bible.character.delete',
  BIBLE_LOCATION_LIST: 'bible.location.list',
  BIBLE_LOCATION_GET: 'bible.location.get',
  BIBLE_LOCATION_CREATE: 'bible.location.create',
  BIBLE_LOCATION_UPDATE: 'bible.location.update',
  BIBLE_LOCATION_DELETE: 'bible.location.delete',
  BIBLE_FACTION_LIST: 'bible.faction.list',
  BIBLE_FACTION_GET: 'bible.faction.get',
  BIBLE_FACTION_CREATE: 'bible.faction.create',
  BIBLE_FACTION_UPDATE: 'bible.faction.update',
  BIBLE_FACTION_DELETE: 'bible.faction.delete',
  BIBLE_WORLD_RULE_LIST: 'bible.worldRule.list',
  BIBLE_WORLD_RULE_GET: 'bible.worldRule.get',
  BIBLE_WORLD_RULE_CREATE: 'bible.worldRule.create',
  BIBLE_WORLD_RULE_UPDATE: 'bible.worldRule.update',
  BIBLE_WORLD_RULE_DELETE: 'bible.worldRule.delete',
  BIBLE_PLOT_THREAD_LIST: 'bible.plotThread.list',
  BIBLE_PLOT_THREAD_GET: 'bible.plotThread.get',
  BIBLE_PLOT_THREAD_CREATE: 'bible.plotThread.create',
  BIBLE_PLOT_THREAD_UPDATE: 'bible.plotThread.update',
  BIBLE_PLOT_THREAD_DELETE: 'bible.plotThread.delete',
  BIBLE_TIMELINE_EVENT_LIST: 'bible.timelineEvent.list',
  BIBLE_TIMELINE_EVENT_GET: 'bible.timelineEvent.get',
  BIBLE_TIMELINE_EVENT_CREATE: 'bible.timelineEvent.create',
  BIBLE_TIMELINE_EVENT_UPDATE: 'bible.timelineEvent.update',
  BIBLE_TIMELINE_EVENT_DELETE: 'bible.timelineEvent.delete',

  // Structure operations
  STRUCTURE_GET_TREE: 'structure.getTree',
  STRUCTURE_GET_ALL: 'structure.getAll',
  STRUCTURE_GET: 'structure.get',
  STRUCTURE_CREATE: 'structure.create',
  STRUCTURE_UPDATE: 'structure.update',
  STRUCTURE_DELETE: 'structure.delete',
  STRUCTURE_REORDER: 'structure.reorder',
  STRUCTURE_ADD_BEAT: 'structure.addBeat',
  STRUCTURE_REMOVE_BEAT: 'structure.removeBeat',
  STRUCTURE_SET_HOOK: 'structure.setHook',

  // Content operations
  CONTENT_GET: 'content.get',
  CONTENT_SAVE: 'content.save',
  CONTENT_GET_HISTORY: 'content.getHistory',
  CONTENT_ROLLBACK: 'content.rollback',

  // Generation operations
  GENERATION_START: 'generation.start',
  GENERATION_CANCEL: 'generation.cancel',
  GENERATION_STATUS: 'generation.status',
  GENERATION_RETRY: 'generation.retry',

  // Review operations
  REVIEW_QUEUE: 'review.queue',
  REVIEW_GET_ITEM: 'review.getItem',
  REVIEW_SUBMIT_ACTION: 'review.submitAction',
  REVIEW_BULK_APPROVE: 'review.bulkApprove',
  REVIEW_CREATE_LOCK_POINT: 'review.createLockPoint',
  REVIEW_PREVIEW_CASCADE: 'review.previewCascade',
  REVIEW_EXECUTE_CASCADE: 'review.executeCascade',

  // Analytics operations
  ANALYTICS_TENSION_CURVE: 'analytics.tensionCurve',
  ANALYTICS_CHARACTER_PRESENCE: 'analytics.characterPresence',
  ANALYTICS_PLOT_THREADS: 'analytics.plotThreads',
  ANALYTICS_QUALITY: 'analytics.quality',

  // Serial operations
  SERIAL_BUFFER_STATUS: 'serial.bufferStatus',
  SERIAL_RELEASE_SCHEDULE: 'serial.releaseSchedule',
  SERIAL_HOOK_PATTERNS: 'serial.hookPatterns',
  SERIAL_CYCLE_STATUS: 'serial.cycleStatus',
  SERIAL_MYSTERY_BOARD: 'serial.mysteryBoard',

  // Subscription operations
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe'
} as const;

export type ApiMethod = (typeof API_METHODS)[keyof typeof API_METHODS];

// Subscription channels
export const SUBSCRIPTION_CHANNELS = {
  PROJECT_UPDATED: 'project.updated',
  BIBLE_UPDATED: 'bible.updated',
  STRUCTURE_UPDATED: 'structure.updated',
  CONTENT_UPDATED: 'content.updated',
  GENERATION_PROGRESS: 'generation.progress',
  GENERATION_COMPLETE: 'generation.complete',
  GENERATION_ERROR: 'generation.error',
  REVIEW_UPDATED: 'review.updated'
} as const;

export type SubscriptionChannel =
  (typeof SUBSCRIPTION_CHANNELS)[keyof typeof SUBSCRIPTION_CHANNELS];
