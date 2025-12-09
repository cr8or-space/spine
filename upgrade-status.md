# Upgrade Status

This file tracks work that was started but needs further refinement or completion.

## Playwright Integration Tests - Entity Creation (Partial)

**Status**: Implemented but with some test flakiness

**Location**: `apps/web/tests/entity-creation.spec.ts`

**What was completed**:
- Comprehensive entity creation tests for all bible entity types:
  - Character creation with basic info, role/status, and aliases
  - Location creation with type and status
  - Faction creation with type, status, and influence
  - World Rule creation with category and priority
  - Plot Thread creation with type, status, and scope
  - Timeline Event creation with type and significance
- Tab count update verification tests
- Cancel operation tests
- Entity listing after creation tests

**Current issues**:
- Some tests are flaky (~17 failures out of 45 tests on first run, ~28 passing)
- Timing issues with dialog interactions and form submissions
- Occasional "strict mode violations" when multiple elements match selectors

**What needs to be done**:
1. **Add explicit waits for dialog transitions**:
   - Wait for dialog animations to complete before interacting
   - Add `page.waitForTimeout()` after dialog opens/closes
   - Use `waitForLoadState('networkidle')` after navigation

2. **Improve selector specificity**:
   - Some selectors still match multiple elements in edge cases
   - Consider using test IDs (`data-testid`) for critical form elements
   - Scope all form interactions explicitly to the dialog element

3. **Add retry logic for flaky operations**:
   - Wrap Select component interactions in retry logic
   - Add custom Playwright fixtures for common operations

4. **Test isolation improvements**:
   - Ensure each test properly cleans up (database, navigation state)
   - Consider using separate test projects with isolated storage

5. **Missing test coverage to add**:
  - Entity editing (update existing entities)
  - Entity deletion
  - Entity detail page interactions
  - Relationship management between entities
  - Entity filtering and search
  - Validation error handling
  - Form field validation messages

**References**:
- Existing working tests: `bible-management.spec.ts`, `project-management.spec.ts`, `navigation.spec.ts`
- SvelteKit testing best practices: Use real FormData/Request objects, avoid clicking submit buttons
- Bits UI Select component patterns in the codebase

**Priority**: Medium - Tests provide good coverage but need stability improvements before CI/CD

**Estimated effort**: 4-6 hours to stabilize all tests and add explicit waits
