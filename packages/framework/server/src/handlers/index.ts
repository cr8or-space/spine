/**
 * Handler registration module.
 *
 * Exports functions to register API handlers on the router.
 *
 * Two registration approaches:
 * 1. registerFrameworkHandlers - Only framework-generic handlers (for new domains)
 * 2. registerAllHandlers - All handlers including serial-specific (for backwards compatibility)
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
import { registerExtractionHandlers } from './extraction';

/**
 * Register all API handlers on the router.
 *
 * This includes both framework-generic and serial-specific handlers.
 * Used by serial-server for backwards compatibility.
 *
 * For new domains, use registerFrameworkHandlers instead and register
 * domain-specific handlers separately.
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
  registerExtractionHandlers(router, services);
}

// ============================================================================
// Framework Handlers (domain-agnostic)
// ============================================================================

// Export framework handler registration
export {
  registerFrameworkHandlers,
  type FrameworkHandlerOptions,
} from './framework';

// Export individual framework handlers
export { registerEntityHandlers } from './entity';
export { registerGenericContentHandlers } from './generic-content';
export { registerGenericProjectHandlers } from './generic-project';
export { registerValidationHandlers } from './validation';

// ============================================================================
// Serial Domain Handlers (serial-specific, for backwards compatibility)
// ============================================================================

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
export { registerExtractionHandlers } from './extraction';
