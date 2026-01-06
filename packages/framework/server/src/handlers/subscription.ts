/**
 * Subscription API handlers - Subscribe/unsubscribe to real-time updates
 */

import type { Router, HandlerContext } from '../router';
import { ApiError } from '../router';
import type { SubscriptionManager } from '../subscriptions';
import {
  API_METHODS,
  SUBSCRIPTION_CHANNELS,
  SubscribeParamsSchema,
  type SubscribeParams,
  UnsubscribeParamsSchema,
  type UnsubscribeParams
} from '../protocol';

/**
 * Register subscription handlers on the router.
 */
export function registerSubscriptionHandlers(
  router: Router,
  subscriptions: SubscriptionManager
): void {
  // subscribe - Subscribe to a channel
  router.register<SubscribeParams, { success: boolean }>(
    API_METHODS.SUBSCRIBE,
    (params, context: HandlerContext) => {
      // Validate channel
      const validChannels = Object.values(SUBSCRIPTION_CHANNELS);
      if (!validChannels.includes(params.channel as typeof SUBSCRIPTION_CHANNELS[keyof typeof SUBSCRIPTION_CHANNELS])) {
        throw ApiError.subscriptionError(`Invalid channel: ${params.channel}`);
      }

      // Build subscription key
      const key = {
        channel: params.channel,
        projectId: params.projectId,
        generationId: params.generationId
      };

      subscriptions.subscribe(context.connection, key);
      return { success: true };
    },
    SubscribeParamsSchema
  );

  // unsubscribe - Unsubscribe from a channel
  router.register<UnsubscribeParams, { success: boolean }>(
    API_METHODS.UNSUBSCRIBE,
    (params, context: HandlerContext) => {
      const key = {
        channel: params.channel,
        projectId: params.projectId,
        generationId: params.generationId
      };

      subscriptions.unsubscribe(context.connection, key);
      return { success: true };
    },
    UnsubscribeParamsSchema
  );
}
