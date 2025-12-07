# NovelGen Web Application

The web application for NovelGen, built with SvelteKit and Svelte 5.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests only
pnpm test:integration

# Run tests in watch mode
pnpm test:unit -- --watch

# Generate coverage report
pnpm test:unit -- --coverage
```

## Type Checking

```bash
# Check types with TypeScript
pnpm check-types

# Check types with Svelte
pnpm check

# Watch mode for Svelte type checking
pnpm check:watch
```

## Project Structure

```
apps/web/
├── src/
│   ├── lib/
│   │   └── components/     # Shared UI components
│   ├── routes/             # SvelteKit routes
│   │   ├── +page.svelte            # Project list page
│   │   └── projects/[id]/
│   │       ├── +layout.svelte      # Project layout with navigation
│   │       ├── bible/
│   │       │   ├── +page.svelte    # Bible editor main page
│   │       │   ├── CharacterTab.svelte
│   │       │   ├── LocationTab.svelte
│   │       │   ├── FactionTab.svelte
│   │       │   ├── WorldRuleTab.svelte
│   │       │   ├── PlotThreadTab.svelte
│   │       │   └── TimelineTab.svelte
│   │       └── settings/
│   │           └── +page.svelte    # Project settings page
│   ├── app.css             # Global styles
│   ├── app.d.ts            # TypeScript declarations
│   ├── hooks.server.ts     # Server hooks (DB initialization)
│   └── test-setup.ts       # Vitest setup
├── tests/                  # Integration tests (Playwright)
│   ├── project-management.spec.ts
│   ├── bible-management.spec.ts
│   └── navigation.spec.ts
├── playwright.config.ts    # Playwright configuration
└── vitest.config.ts        # Vitest configuration
```

## Phase 1.5 Implementation Status

All items from Phase 1.5 (Minimal Web UI) have been implemented:

- ✅ Project list page (create, view, delete projects)
- ✅ Project settings page (update metadata)
- ✅ Bible editor layout (tabs, navigation)
- ✅ Character tab (list view with filtering)
- ✅ Location tab (list view with filtering)
- ✅ Faction tab (list view with filtering)
- ✅ World rules tab (list view with filtering)
- ✅ Plot threads tab (list view with filtering)
- ✅ Timeline tab (list view with filtering)
- ✅ Entity forms (create/edit forms in tabs)
- ✅ Search and filter (global search across bible)

## Testing Coverage

### Unit Tests
- Button component
- Card component
- TextField component
- Dialog component
- Tabs component

### Integration Tests
- Project management workflows
- Bible management workflows
- Navigation between pages

## Notes

- Uses Svelte 5 with new runes syntax ($props, $state, $derived, $bindable)
- SQLite database for persistence
- Server-side rendering with SvelteKit
- Local-first architecture (no cloud dependencies)
