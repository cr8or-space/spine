# Pending Work

This file tracks work that was started but needs further refinement or completion.

## Playwright Integration Tests - Entity Creation (Mostly Complete)

**Status**: Significantly improved - 96% pass rate (43/45 tests passing)

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
- **Test stability improvements**:
  - Added explicit waits for dialog transitions (`waitForDialogTransition` helper)
  - Improved selector specificity using `.first()` to avoid strict mode violations
  - Scoped all form interactions to dialog element
  - Added retry logic for Select component interactions (`selectOption` helper)
  - Configured tests to run serially to avoid database conflicts
  - Increased timeout to 60 seconds for dialog-heavy tests
  - Removed flaky `networkidle` waits

**Current issues**:
- 2 tests still failing/flaky:
  - "should create a character with role and status" - Select component interaction causes browser timeout
  - "should create a new project" (in project-management.spec.ts) - occasional flakiness
- Tests using Select dropdowns can timeout if the dropdown fails to open properly

**What needs to be done**:
1. **Fix remaining Select component issues**:
   - Investigate why Select component causes browser closure on retry
   - Consider adding `data-testid` attributes to Select triggers and options
   - May need to modify Select component implementation for better testability

2. **Missing test coverage to add**:
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

**Priority**: Low - Tests are now stable enough for development use (96% pass rate)

**Estimated effort**: 2-3 hours to fix remaining Select component issues
