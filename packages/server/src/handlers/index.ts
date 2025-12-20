/**
 * Handler registration module.
 *
 * Exports a function to register all API handlers on the router.
 */

import type { Router } from '../router';
import type { Services } from '../services';
import type { SubscriptionManager } from '../subscriptions';
import { registerProjectHandlers } from './project';
import { registerBibleHandlers } from './bible';
import { registerStructureHandlers } from './structure';
import { registerContentHandlers } from './content';
import { registerSubscriptionHandlers } from './subscription';
import { registerGenerationHandlers } from './generation';
import { registerReviewHandlers } from './review';
import { registerAnalyticsHandlers } from './analytics';
import { registerSerialHandlers } from './serial';
import { registerCascadeHandlers } from './cascade';
import { registerSystemHandlers } from './system';

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
  registerGenerationHandlers(router, services, subscriptions);
  registerReviewHandlers(router, services);
  registerAnalyticsHandlers(router, services);
  registerSerialHandlers(router, services);
  registerCascadeHandlers(router, services);
  registerSystemHandlers(router, services);
}

// Re-export individual handler registrations for selective use
export { registerProjectHandlers } from './project';
export { registerBibleHandlers } from './bible';
export { registerStructureHandlers } from './structure';
export { registerContentHandlers } from './content';
export { registerSubscriptionHandlers } from './subscription';
export { registerGenerationHandlers } from './generation';
export { registerReviewHandlers } from './review';
export { registerAnalyticsHandlers } from './analytics';
export { registerSerialHandlers } from './serial';
export { registerCascadeHandlers } from './cascade';
export { registerSystemHandlers } from './system';
