# Testing Architecture

This document covers the testing infrastructure, patterns, and known issues for Spine development.

## Test Stack

- **Unit tests**: Vitest with vitest-browser-svelte for component testing
- **Integration tests**: Playwright for end-to-end testing
- **Package tests**: Vitest for package-level unit tests

## Running Tests

```bash
# Web app tests
cd apps/web
pnpm test             # All tests
pnpm test:unit        # Unit tests only
pnpm test:integration # Playwright tests only

# Package tests
cd packages/core && pnpm test
cd packages/llm && pnpm test
cd packages/server && pnpm test
cd packages/client && pnpm test
cd packages/mcp && pnpm test
```

## Component Testing (vitest-browser-svelte)

### SvelteKit Module Mocks

Components that use SvelteKit modules (`$app/*`) require mocks for vitest-browser tests:

```
src/test-mocks/app/
├── navigation.ts   # goto, invalidate, etc.
├── stores.ts       # page, navigating stores
├── environment.ts  # browser, dev, building
└── forms.ts        # enhance, applyAction
```

These are configured in `vitest.config.ts` via resolve aliases.

### Patterns

- Always use locators (`page.getBy*()`) - never containers
- Use `.first()`, `.nth()`, `.last()` for multiple elements to avoid strict mode violations
- Always use `untrack()` when accessing `$derived` values in tests
- Use real `FormData`/`Request` objects in server tests - minimal mocking only
- Never click SvelteKit form submit buttons - test state directly
- Use `await expect.element()` for all locator assertions

### Existing Component Tests

- `Button.test.ts`
- `Card.test.ts`
- `Dialog.test.ts`
- `TextField.test.ts`
- `Tabs.test.ts`
- `EntityCard.test.ts`
- `EntityListPage.test.ts`
- `CreateEntityDialog.test.ts`

## Integration Testing (Playwright)

### Test Organization

Tests are organized by feature area:

- `bible-management.spec.ts` - Bible editor and entity management
- `entity-creation.spec.ts` - Entity CRUD operations
- `navigation.spec.ts` - App navigation and routing
- `project-management.spec.ts` - Project CRUD operations
- `workspace.spec.ts` - Writing workspace and structure management
- `analytics.spec.ts` - Analytics dashboard
- `serial.spec.ts` - Serial features dashboard
- `review.spec.ts` - Review workflow
- `generation.spec.ts` - Content generation

### Helper Patterns

#### Dialog Transitions

```typescript
// Wait for dialog to close after action
await waitForDialogTransition(page);
```

#### Bits UI Select Components

```typescript
// Use custom helper for Bits UI Select
await selectOption(page, 'Label', 'Option Text');

// Assertions use toHaveText, not toHaveValue
await expect(page.getByRole('combobox')).toHaveText('Selected Value');
```

#### Structure Tree Navigation

```typescript
// Click "Add child" on a tree item
await clickAddChildOnTreeItem(page, 'Parent Node');
```

#### Button Selectors

```typescript
// Use exact matching to avoid conflicts
page.getByRole('button', { name: 'Save', exact: true })
```

### Test Fixes Applied

The following patterns were identified and fixed during test development:

1. **`selectOption` helper** - Works with Bits UI Select using `getByRole('listbox')` and `getByRole('option')`
2. **Structure creation** - Uses tree item "Add child" button instead of header button
3. **Workspace setup** - Uses auto-created root book (project title) as parent
4. **Button naming** - Uses "Save Changes" instead of ambiguous "Save"
5. **Select assertions** - Uses `toHaveText` instead of `toHaveValue` for Bits UI
6. **Content editor** - Requires click-to-focus before textarea fill
7. **Svelte reactivity** - Add wait times after content changes
8. **Back-link navigation** - Uses `getByRole('link')` instead of CSS selectors
9. **Strict mode** - Uses `.first()` selector for multiple elements

### Database Isolation

Integration tests use a temporary database directory to avoid polluting development data:

- `tests/global-setup.ts` - Creates temp directory at `/tmp/spine-playwright-tests`
- `playwright.config.ts` - Configures `SPINE_DATA_DIR` environment variable for webServer
- Cleanup runs automatically after tests complete

### Known Issues

1. **Project auto-creation** - Project creation auto-creates a root book with project title (affects empty state tests)
2. **Content editor timing** - Can be flaky; requires click-to-focus and wait for Svelte reactivity
3. **Chapter creation stabilization** - Some tests need longer waits after chapter creation
4. **Server timeouts** - Can cause test flakiness in CI environments
5. **Parallel execution** - 16 workers causes database contention; tests pass individually but may fail together
6. **Review queue visibility** - Content may not immediately appear in review queue after creation

### Test Status Summary

**Unit Tests (111 tests)**: All passing
- Button, Card, Dialog, TextField, Tabs, Select
- ValidationPanel, ValidationBadge
- EntityCard, EntityListPage, CreateEntityDialog

**Integration Tests (176 tests)**:
- 122+ passing
- 10 failing (timing/race conditions)
- 4 flaky (pass on retry)
- ~40 skipped (due to serial mode dependencies)

**Failing Tests**:
- analytics.spec.ts: Plot thread timeline, structure filtering
- generation.spec.ts: Analysis panel, version history
- review.spec.ts: Queue display, content review page, diff view, bulk actions
- serial.spec.ts: Mystery board display

**Flaky Tests**:
- bible-management.spec.ts: Search filter
- entity-creation.spec.ts: Faction list display
- generation.spec.ts: Generation config options
- review.spec.ts: Revision cascade

## LLM-Dependent Tests

Some tests require an LLM connection and are skipped in normal test runs:

- Outline generation flow
- Beat expansion flow
- Draft generation flow
- Self-review pass
- Generation history tracking
- Stage retry functionality
- Actual analysis data display
