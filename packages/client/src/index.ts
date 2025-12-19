/**
 * @repo/client - WebSocket client for Spine server
 *
 * Provides:
 * - Connection management with auto-reconnect
 * - Request/response correlation
 * - Subscription management for real-time updates
 * - Typed API methods for all domains
 */

// Import for internal use
import { createSpineClient as createClient } from './client';
import { createProjectApi as createProject } from './api/project';
import { createBibleApi as createBible } from './api/bible';
import { createStructureApi as createStructure } from './api/structure';
import { createContentApi as createContent } from './api/content';
import { createGenerationApi as createGeneration } from './api/generation';
import { createReviewApi as createReview } from './api/review';
import { createAnalyticsApi as createAnalytics } from './api/analytics';
import { createSerialApi as createSerial } from './api/serial';
import type { ClientConfig, SubscriptionKey, NotificationHandler } from './types';

// Core client
export { SpineClient, createSpineClient } from './client';

// Types
export {
  JSONRPC_VERSION,
  ErrorCode,
  SpineApiError,
  SUBSCRIPTION_CHANNELS,
  isErrorResponse,
  type MessageId,
  type RpcError,
  type ErrorCodeType,
  type Request,
  type SuccessResponse,
  type ErrorResponse,
  type Response,
  type Notification,
  type SubscriptionChannel,
  type SubscriptionKey,
  type ClientConfig,
  type ClientState,
  type NotificationHandler
} from './types';

// API modules
export { createProjectApi, type ProjectApi, type ProjectSettingsUpdate, type ProjectMetadataUpdate } from './api/project';
export { createBibleApi, type BibleApi, type CharacterCreate, type CharacterUpdate, type LocationCreate, type LocationUpdate, type FactionCreate, type FactionUpdate, type WorldRuleCreate, type WorldRuleUpdate, type PlotThreadCreate, type PlotThreadUpdate, type TimelineEventCreate, type TimelineEventUpdate } from './api/bible';
export { createStructureApi, type StructureApi, type StructureCreate, type StructureUpdate, type HookData } from './api/structure';
export { createContentApi, type ContentApi } from './api/content';
export { createGenerationApi, type GenerationApi, type GenerationOptions, type GenerationStatus } from './api/generation';
export { createReviewApi, type ReviewApi, type CommentInput, type BulkApproveResult, type CascadePreview, type CascadeResult } from './api/review';
export { createAnalyticsApi, type AnalyticsApi, type AnalyticsScope, type QualityMetrics } from './api/analytics';
export { createSerialApi, type SerialApi, type SerialScope, type BufferDepletionInfo, type ReleaseScheduleResult } from './api/serial';

/**
 * Create a fully-configured Spine client with all API methods
 */
export function createFullClient(config: ClientConfig) {
  const client = createClient(config);

  return {
    // Core client methods
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    isConnected: () => client.isConnected(),
    getState: () => client.getState(),
    subscribe: (key: SubscriptionKey, handler: NotificationHandler) =>
      client.subscribe(key, handler),

    // API modules
    project: createProject(client),
    bible: createBible(client),
    structure: createStructure(client),
    content: createContent(client),
    generation: createGeneration(client),
    review: createReview(client),
    analytics: createAnalytics(client),
    serial: createSerial(client)
  };
}

export type FullClient = ReturnType<typeof createFullClient>;
