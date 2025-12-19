/**
 * Handler registration module.
 *
 * Exports a function to register all API handlers on the router.
 *
 * Note: Some handlers (generation, review cascade, analytics, serial) require
 * services that are not yet fully integrated. These are registered with stub
 * implementations that return appropriate errors.
 */

import type { Router } from '../router';
import type { Services } from '../services';
import type { SubscriptionManager } from '../subscriptions';
import { registerProjectHandlers } from './project';
import { registerBibleHandlers } from './bible';
import { registerStructureHandlers } from './structure';
import { registerContentHandlers } from './content';
import { registerSubscriptionHandlers } from './subscription';

/**
 * Register all API handlers on the router.
 */
export function registerAllHandlers(
  router: Router,
  services: Services,
  subscriptions: SubscriptionManager
): void {
  registerProjectHandlers(router, services);
  registerBibleHandlers(router, services);
  registerStructureHandlers(router, services);
  registerContentHandlers(router, services);
  registerSubscriptionHandlers(router, subscriptions);

  // TODO: These handlers require additional service integration:
  // - registerGenerationHandlers (needs generation pipeline)
  // - registerReviewHandlers (needs review workflow and cascade services)
  // - registerAnalyticsHandlers (needs analysis service)
  // - registerSerialHandlers (needs release planning functions)
}

// Re-export individual handler registrations for selective use
export { registerProjectHandlers } from './project';
export { registerBibleHandlers } from './bible';
export { registerStructureHandlers } from './structure';
export { registerContentHandlers } from './content';
export { registerSubscriptionHandlers } from './subscription';
