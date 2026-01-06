/**
 * Framework Handler Registration
 *
 * Registers only the framework-generic handlers that work with any domain.
 * Serial-specific handlers are registered separately by the domain.
 */

import type { Router } from '../router';
import type { SubscriptionManager } from '../subscriptions';
import type { BaseServices, ProjectService, BaseProject, ValidationService } from '../types';
import type { SessionManager } from '../session';

import { registerEntityHandlers } from './entity';
import { registerGenericContentHandlers } from './generic-content';
import { registerGenericProjectHandlers } from './generic-project';
import { registerValidationHandlers } from './validation';
import { registerSubscriptionHandlers } from './subscription';

/**
 * Options for framework handler registration.
 */
export interface FrameworkHandlerOptions<TProject extends BaseProject = BaseProject> {
  /** Project service (required for project operations) */
  projectService?: ProjectService<TProject>;

  /** Validation service (optional, enables validation endpoints) */
  validationService?: ValidationService;
}

/**
 * Register all framework-generic handlers.
 *
 * These handlers work with any domain and don't depend on serial-specific types.
 *
 * @param router - Router to register handlers on
 * @param services - Base services
 * @param subscriptions - Subscription manager
 * @param sessionManager - Session manager
 * @param options - Optional services for additional functionality
 */
export function registerFrameworkHandlers<TProject extends BaseProject = BaseProject>(
  router: Router,
  services: BaseServices,
  subscriptions: SubscriptionManager,
  sessionManager: SessionManager,
  options: FrameworkHandlerOptions<TProject> = {}
): void {
  // Entity handlers (generic CRUD for any entity type)
  registerEntityHandlers(router, services, sessionManager);

  // Content handlers (generic CRUD for any content type)
  registerGenericContentHandlers(router, services, sessionManager);

  // Project handlers (if project service is provided)
  if (options.projectService) {
    registerGenericProjectHandlers(router, options.projectService, sessionManager);
  }

  // Validation handlers (if validation service is provided)
  registerValidationHandlers(router, services, sessionManager, options.validationService);

  // Subscription handlers (always registered)
  registerSubscriptionHandlers(router, subscriptions);
}
