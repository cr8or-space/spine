# Spine Upgrade Plan

Comprehensive task list for parallel agent execution. Tasks are organized by phase with explicit dependencies.

## Task Naming Convention

Tasks use format: `{PHASE}.{GROUP}.{SEQ}` (e.g., `1.CR.1` = Phase 1, Code Reduction, Task 1)

## Phases Overview

1. **Code Reduction** (CR) - Generic components to eliminate duplication
2. **Testing Infrastructure** (TI) - vitest-browser-svelte and Playwright setup
3. **Tailwind CSS v4** (TW) - Migrate from custom CSS to Tailwind v4
4. **UI Accessibility** (UA) - Bits UI adoption for accessible components
5. **Icon System** (IC) - Lucide icons for consistent iconography
6. **Architecture Prep** (AP) - Spine framework preparation
7. **Validation & Rendering** (VR) - Generic validation and rendering pipelines

---

## Phase 1: Code Reduction (CR)

**Goal**: Reduce ~2,475 lines of duplicated tab code to ~660 lines using generic components.

### 1.CR.1 - Create EntityCard Component
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Files to create**:
- `apps/web/src/lib/components/EntityCard.svelte`

**Requirements**:
```typescript
interface Props {
  href: string;
  name: string;
  description: string;
  aliases?: string[];
  badges?: { text: string; variant: BadgeVariant }[];
  meta?: { icon?: string; text: string }[];
  maxDescLength?: number;
}
```

**Includes**:
- Card wrapper with hover effect
- Header with name and badges
- Optional aliases display
- Truncated description
- Meta items row (counts, dates, etc.)
- All shared CSS from existing tab cards

**Test file**: `apps/web/src/lib/components/EntityCard.test.ts`

---

### 1.CR.2 - Create EntityListPage Component
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Files to create**:
- `apps/web/src/lib/components/EntityListPage.svelte`

**Requirements**:
```typescript
interface FilterConfig {
  key: string;
  options: { value: string; label: string }[];
  allLabel: string;
}

interface Props<T extends { id: string; name: string; description: string; aliases?: string[] }> {
  items: T[];
  filters: FilterConfig[];
  searchQuery: string;
  entityName: string;           // singular
  entityNamePlural: string;
  emptyTitle: string;
  emptyDescription: string;
  onCreateClick: () => void;
  renderCard: Snippet<[T]>;
  filterFn?: (item: T, filters: Record<string, string>) => boolean;
}
```

**Includes**:
- Toolbar with count, filters, "New X" button
- Dynamic filter state management
- Text search across name, description, aliases
- Custom filter function support
- Empty state (filtered vs no items)
- Grid layout for cards
- "Clear filters" action

**Test file**: `apps/web/src/lib/components/EntityListPage.test.ts`

---

### 1.CR.3 - Create CreateEntityDialog Component
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Files to create**:
- `apps/web/src/lib/components/CreateEntityDialog.svelte`

**Requirements**:
```typescript
interface Props {
  open: boolean;
  title: string;
  action: string;           // form action URL
  onClose: () => void;
  onSuccess: () => void;
  children: Snippet;        // form fields
}
```

**Includes**:
- Dialog wrapper
- Form with `use:enhance`
- Cancel and submit buttons
- Success/failure handling
- Consistent styling

**Test file**: `apps/web/src/lib/components/CreateEntityDialog.test.ts`

---

### 1.CR.4 - Refactor CharacterTab to Use Generic Components
**Dependencies**: 1.CR.1, 1.CR.2, 1.CR.3
**Parallel**: After dependencies complete, can run parallel with 1.CR.5-1.CR.9
**Files to modify**:
- `apps/web/src/lib/bible/CharacterTab.svelte`

**Requirements**:
- Replace ~410 lines with ~80 lines
- Use EntityListPage for list view
- Use EntityCard for card rendering
- Use CreateEntityDialog for creation modal
- Move role/status badge logic to local constants
- Preserve all current functionality

---

### 1.CR.5 - Refactor LocationTab to Use Generic Components
**Dependencies**: 1.CR.1, 1.CR.2, 1.CR.3
**Parallel**: Yes (with 1.CR.4, 1.CR.6-1.CR.9)
**Files to modify**:
- `apps/web/src/lib/bible/LocationTab.svelte`

---

### 1.CR.6 - Refactor FactionTab to Use Generic Components
**Dependencies**: 1.CR.1, 1.CR.2, 1.CR.3
**Parallel**: Yes (with 1.CR.4-1.CR.5, 1.CR.7-1.CR.9)
**Files to modify**:
- `apps/web/src/lib/bible/FactionTab.svelte`

---

### 1.CR.7 - Refactor WorldRuleTab to Use Generic Components
**Dependencies**: 1.CR.1, 1.CR.2, 1.CR.3
**Parallel**: Yes (with 1.CR.4-1.CR.6, 1.CR.8-1.CR.9)
**Files to modify**:
- `apps/web/src/lib/bible/WorldRuleTab.svelte`

---

### 1.CR.8 - Refactor PlotThreadTab to Use Generic Components
**Dependencies**: 1.CR.1, 1.CR.2, 1.CR.3
**Parallel**: Yes (with 1.CR.4-1.CR.7, 1.CR.9)
**Files to modify**:
- `apps/web/src/lib/bible/PlotThreadTab.svelte`

---

### 1.CR.9 - Refactor TimelineTab to Use Generic Components
**Dependencies**: 1.CR.1, 1.CR.2, 1.CR.3
**Parallel**: Yes (with 1.CR.4-1.CR.8)
**Files to modify**:
- `apps/web/src/lib/bible/TimelineTab.svelte`

---

### 1.CR.10 - Update Component Exports
**Dependencies**: 1.CR.1, 1.CR.2, 1.CR.3
**Parallel**: After generic components complete
**Files to modify**:
- `apps/web/src/lib/components/index.ts`

**Requirements**:
- Export EntityCard, EntityListPage, CreateEntityDialog
- Ensure barrel exports are complete

---

## Phase 2: Testing Infrastructure (TI)

**Goal**: Fix broken component tests, establish vitest-browser-svelte and Playwright patterns.

### 2.TI.1 - Install vitest-browser-svelte Dependencies
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Commands**:
```bash
cd apps/web
pnpm add -D vitest-browser-svelte @vitest/browser playwright
```

---

### 2.TI.2 - Update Vitest Config for Browser Mode
**Dependencies**: 2.TI.1
**Parallel**: No
**Files to modify**:
- `apps/web/vitest.config.ts`

**Requirements**:
```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
    // Keep jsdom as fallback for non-component tests
    environmentMatchGlobs: [
      ['src/**/*.test.ts', 'happy-dom'],
      ['src/lib/components/**/*.test.ts', 'browser'],
    ],
  },
});
```

---

### 2.TI.3 - Create Test Setup File for Browser Tests
**Dependencies**: 2.TI.1
**Parallel**: Yes
**Files to create**:
- `apps/web/src/test-setup-browser.ts`

**Requirements**:
- Import vitest-browser-svelte utilities
- Set up any global test utilities
- Configure cleanup handlers

---

### 2.TI.4 - Migrate Button.test.ts to vitest-browser-svelte
**Dependencies**: 2.TI.2, 2.TI.3
**Parallel**: Yes (with 2.TI.5-2.TI.8)
**Files to modify**:
- `apps/web/src/lib/components/Button.test.ts`

**Requirements**:
- Use `render` from vitest-browser-svelte
- Use `page.getBy*()` locators
- Use `await expect.element()` for assertions
- Follow CLAUDE.md unbreakable rules

---

### 2.TI.5 - Migrate Card.test.ts to vitest-browser-svelte
**Dependencies**: 2.TI.2, 2.TI.3
**Parallel**: Yes (with 2.TI.4, 2.TI.6-2.TI.8)
**Files to modify**:
- `apps/web/src/lib/components/Card.test.ts`

---

### 2.TI.6 - Migrate Dialog.test.ts to vitest-browser-svelte
**Dependencies**: 2.TI.2, 2.TI.3
**Parallel**: Yes (with 2.TI.4-2.TI.5, 2.TI.7-2.TI.8)
**Files to modify**:
- `apps/web/src/lib/components/Dialog.test.ts`

**Additional requirements**:
- Test escape key closes dialog
- Test focus trap (if implemented)
- Test backdrop click closes dialog

---

### 2.TI.7 - Migrate TextField.test.ts to vitest-browser-svelte
**Dependencies**: 2.TI.2, 2.TI.3
**Parallel**: Yes (with 2.TI.4-2.TI.6, 2.TI.8)
**Files to modify**:
- `apps/web/src/lib/components/TextField.test.ts`

---

### 2.TI.8 - Migrate Tabs.test.ts to vitest-browser-svelte
**Dependencies**: 2.TI.2, 2.TI.3
**Parallel**: Yes (with 2.TI.4-2.TI.7)
**Files to modify**:
- `apps/web/src/lib/components/Tabs.test.ts`

---

### 2.TI.9 - Write Tests for New Generic Components
**Dependencies**: 1.CR.1, 1.CR.2, 1.CR.3, 2.TI.2, 2.TI.3
**Parallel**: After Phase 1 CR.1-3 and TI setup
**Files to create**:
- `apps/web/src/lib/components/EntityCard.test.ts`
- `apps/web/src/lib/components/EntityListPage.test.ts`
- `apps/web/src/lib/components/CreateEntityDialog.test.ts`

---

### 2.TI.10 - Update Playwright Config
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Files to modify**:
- `apps/web/playwright.config.ts`

**Requirements**:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### 2.TI.11 - Create Playwright Integration Test for Bible Flow
**Dependencies**: 2.TI.10
**Parallel**: Yes (with 2.TI.12)
**Files to create**:
- `apps/web/tests/bible.spec.ts`

**Requirements**:
- Test navigating to bible page
- Test creating a character
- Test filtering characters
- Test viewing character details

---

### 2.TI.12 - Create Playwright Integration Test for Project Flow
**Dependencies**: 2.TI.10
**Parallel**: Yes (with 2.TI.11)
**Files to create**:
- `apps/web/tests/project.spec.ts`

**Requirements**:
- Test creating a project
- Test project list view
- Test project navigation

---

## Phase 3: Tailwind CSS v4 (TW)

**Goal**: Migrate from custom CSS custom properties to Tailwind CSS v4 for faster development and consistency.

### 3.TW.1 - Install Tailwind CSS v4
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Commands**:
```bash
cd apps/web
pnpm add -D tailwindcss @tailwindcss/vite
```

---

### 3.TW.2 - Configure Tailwind v4 with Vite
**Dependencies**: 3.TW.1
**Parallel**: No
**Files to create/modify**:
- `apps/web/vite.config.ts` - Add Tailwind plugin
- `apps/web/src/app.css` - Import Tailwind

**Requirements**:
```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

```css
/* app.css */
@import 'tailwindcss';
```

Tailwind v4 uses CSS-first configuration - no tailwind.config.js needed.

---

### 3.TW.3 - Create Tailwind Theme from Existing Design Tokens
**Dependencies**: 3.TW.2
**Parallel**: No
**Files to modify**:
- `apps/web/src/app.css`

**Requirements**:
Map existing CSS custom properties to Tailwind v4 theme:

```css
@import 'tailwindcss';

@theme {
  /* Colors - map from existing --color-* variables */
  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-surface: #ffffff;
  --color-surface-elevated: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
  --color-border: #e5e7eb;
  --color-border-light: #f3f4f6;

  /* Semantic colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  /* Spacing - map from existing --space-* variables */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-full: 9999px;

  /* Typography */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px rgb(0 0 0 / 0.1);
}

/* Dark mode - Tailwind v4 uses CSS nesting */
@media (prefers-color-scheme: dark) {
  @theme {
    --color-surface: #1a1a1a;
    --color-surface-elevated: #242424;
    --color-text-primary: #f9fafb;
    --color-text-secondary: #9ca3af;
    --color-text-tertiary: #6b7280;
    --color-border: #374151;
    --color-border-light: #1f2937;
  }
}
```

---

### 3.TW.4 - Migrate Button Component to Tailwind
**Dependencies**: 3.TW.3
**Parallel**: Yes (with 3.TW.5-3.TW.10)
**Files to modify**:
- `apps/web/src/lib/components/Button.svelte`

**Requirements**:
- Replace `<style>` block with Tailwind utility classes
- Use `class:` directive for variant/size switching
- Maintain all existing functionality

**Example migration**:
```svelte
<!-- Before -->
<button class="btn btn-{variant} btn-{size}">

<!-- After -->
<button class={cn(
  'inline-flex items-center justify-center font-medium rounded-md transition-colors',
  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
  {
    'bg-primary text-white hover:bg-primary-hover': variant === 'primary',
    'bg-surface border border-border hover:bg-surface-elevated': variant === 'secondary',
    'bg-danger text-white hover:bg-danger/90': variant === 'danger',
  },
  {
    'px-2 py-1 text-sm': size === 'sm',
    'px-4 py-2 text-base': size === 'md',
    'px-6 py-3 text-lg': size === 'lg',
  },
  className
)}>
```

---

### 3.TW.5 - Migrate Card Component to Tailwind
**Dependencies**: 3.TW.3
**Parallel**: Yes (with 3.TW.4, 3.TW.6-3.TW.10)
**Files to modify**:
- `apps/web/src/lib/components/Card.svelte`

---

### 3.TW.6 - Migrate Badge Component to Tailwind
**Dependencies**: 3.TW.3
**Parallel**: Yes (with 3.TW.4-3.TW.5, 3.TW.7-3.TW.10)
**Files to modify**:
- `apps/web/src/lib/components/Badge.svelte`

---

### 3.TW.7 - Migrate TextField Component to Tailwind
**Dependencies**: 3.TW.3
**Parallel**: Yes (with 3.TW.4-3.TW.6, 3.TW.8-3.TW.10)
**Files to modify**:
- `apps/web/src/lib/components/TextField.svelte`

---

### 3.TW.8 - Migrate TextArea Component to Tailwind
**Dependencies**: 3.TW.3
**Parallel**: Yes (with 3.TW.4-3.TW.7, 3.TW.9-3.TW.10)
**Files to modify**:
- `apps/web/src/lib/components/TextArea.svelte`

---

### 3.TW.9 - Migrate Dialog Component to Tailwind
**Dependencies**: 3.TW.3
**Parallel**: Yes (with 3.TW.4-3.TW.8, 3.TW.10)
**Files to modify**:
- `apps/web/src/lib/components/Dialog.svelte`
- `apps/web/src/lib/components/ConfirmDialog.svelte`

---

### 3.TW.10 - Migrate Remaining Components to Tailwind
**Dependencies**: 3.TW.3
**Parallel**: Yes (with 3.TW.4-3.TW.9)
**Files to modify**:
- `apps/web/src/lib/components/EmptyState.svelte`
- `apps/web/src/lib/components/SearchInput.svelte`
- `apps/web/src/lib/components/Tabs.svelte`
- `apps/web/src/lib/components/Select.svelte`
- `apps/web/src/lib/components/FilterSelect.svelte`

---

### 3.TW.11 - Create Tailwind Utility Helper (cn function)
**Dependencies**: 3.TW.1
**Parallel**: Yes
**Files to create**:
- `apps/web/src/lib/utils/cn.ts`

**Requirements**:
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Commands**:
```bash
cd apps/web
pnpm add clsx tailwind-merge
```

---

### 3.TW.12 - Migrate Layout Components to Tailwind
**Dependencies**: 3.TW.3
**Parallel**: After 3.TW.3
**Files to modify**:
- `apps/web/src/routes/+layout.svelte`
- `apps/web/src/routes/projects/+layout.svelte`
- Any shell/navigation components

---

### 3.TW.13 - Migrate Bible Tab Components to Tailwind
**Dependencies**: 3.TW.3, 1.CR.4-1.CR.9 (if code reduction done first)
**Parallel**: After dependencies
**Files to modify**:
- All files in `apps/web/src/lib/bible/`

**Note**: If Phase 1 Code Reduction is complete, this will be much simpler as there's less CSS to migrate.

---

### 3.TW.14 - Remove Legacy CSS
**Dependencies**: 3.TW.4-3.TW.13
**Parallel**: No (final cleanup)
**Files to modify**:
- `apps/web/src/app.css` - Remove old custom property definitions that are now in @theme
- Delete any component-specific CSS that's been fully migrated

**Verification**:
- Visual regression testing
- All components render correctly
- Dark mode still works
- No unused CSS remains

---

### 3.TW.15 - Add Tailwind Prettier Plugin
**Dependencies**: 3.TW.1
**Parallel**: Yes
**Commands**:
```bash
pnpm add -D prettier-plugin-tailwindcss
```

**Files to modify**:
- `.prettierrc` or `prettier.config.js`

```json
{
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"]
}
```

---

## Phase 4: UI Accessibility (UA)

**Goal**: Replace hand-rolled Dialog, Tabs, Select with accessible Bits UI components.

### 4.UA.1 - Install Bits UI
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Commands**:
```bash
cd apps/web
pnpm add bits-ui
```

---

### 4.UA.2 - Create Accessible Dialog Component with Bits UI
**Dependencies**: 4.UA.1
**Parallel**: Yes (with 4.UA.3-4.UA.4)
**Files to create**:
- `apps/web/src/lib/components/AccessibleDialog.svelte`

**Requirements**:
- Use Bits UI Dialog primitives
- Maintain existing styling (CSS custom properties)
- Focus trap
- Return focus on close
- Escape key closes
- Backdrop click closes (configurable)

**Test file**: `apps/web/src/lib/components/AccessibleDialog.test.ts`

---

### 4.UA.3 - Create Accessible Tabs Component with Bits UI
**Dependencies**: 4.UA.1
**Parallel**: Yes (with 4.UA.2, 4.UA.4)
**Files to create**:
- `apps/web/src/lib/components/AccessibleTabs.svelte`

**Requirements**:
- Use Bits UI Tabs primitives
- Arrow key navigation
- Proper ARIA roles
- Maintain existing styling

**Test file**: `apps/web/src/lib/components/AccessibleTabs.test.ts`

---

### 4.UA.4 - Create Accessible Select Component with Bits UI
**Dependencies**: 4.UA.1
**Parallel**: Yes (with 4.UA.2-4.UA.3)
**Files to create**:
- `apps/web/src/lib/components/AccessibleSelect.svelte`

**Requirements**:
- Use Bits UI Select primitives
- Keyboard navigation
- Typeahead search
- Proper ARIA

**Test file**: `apps/web/src/lib/components/AccessibleSelect.test.ts`

---

### 4.UA.5 - Migrate Dialog Usage to AccessibleDialog
**Dependencies**: 4.UA.2
**Parallel**: After 4.UA.2 complete
**Files to modify**:
- All files importing `Dialog.svelte`
- Eventually delete `Dialog.svelte` or rename `AccessibleDialog` to `Dialog`

---

### 4.UA.6 - Migrate Tabs Usage to AccessibleTabs
**Dependencies**: 4.UA.3
**Parallel**: After 4.UA.3 complete
**Files to modify**:
- All files importing `Tabs.svelte`

---

### 4.UA.7 - Migrate Select Usage to AccessibleSelect
**Dependencies**: 4.UA.4
**Parallel**: After 4.UA.4 complete
**Files to modify**:
- All files importing `Select.svelte`
- `FilterSelect.svelte` (may extend AccessibleSelect)

---

## Phase 5: Icon System (IC)

**Goal**: Replace inline SVGs with Lucide icons for consistency.

### 5.IC.1 - Install Lucide Svelte
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Commands**:
```bash
cd apps/web
pnpm add lucide-svelte
```

---

### 5.IC.2 - Audit Existing Inline SVGs
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Deliverable**: List of all inline SVGs and their Lucide equivalents

---

### 5.IC.3 - Replace Inline SVGs with Lucide Icons
**Dependencies**: 5.IC.1, 5.IC.2
**Parallel**: No (affects many files)
**Files to modify**:
- All files with inline SVG elements
- May need to create an icon wrapper component for consistency

---

## Phase 6: Architecture Preparation (AP)

**Goal**: Prepare Spine codebase for future Spine framework extraction.

### 6.AP.1 - Create Base Entity Interface
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Files to create**:
- `packages/types/src/base/entity.ts`

**Requirements**:
```typescript
export interface BaseEntity {
  id: string;
  type: string;
  introducedAt?: SpinePosition;
  retiredAt?: SpinePosition;
}

export interface SpinePosition {
  nodeId: string;
  order: number;
}
```

---

### 6.AP.2 - Create Base Content Interface
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Files to create**:
- `packages/types/src/base/content.ts`

**Requirements**:
```typescript
export type ContentStatus = 'draft' | 'review' | 'approved' | 'published';

export interface BaseContent {
  id: string;
  type: string;
  spineNode: string;
  status: ContentStatus;
  references: Reference[];
}

export interface Reference {
  entityId: string;
  entityType: string;
  position: { start: number; end: number };
}
```

---

### 6.AP.3 - Create Spine Interface
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Files to create**:
- `packages/types/src/base/spine.ts`

**Requirements**:
```typescript
export interface Spine<Node> {
  roots(): Node[];
  children(node: Node): Node[];
  parent(node: Node): Node | null;
  linearize(): Node[];
  position(node: Node): number;
}

export interface TreeSpine<Node> extends Spine<Node> {
  depth(node: Node): number;
  ancestors(node: Node): Node[];
  descendants(node: Node): Node[];
}
```

---

### 6.AP.4 - Create Validator Interface
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Files to create**:
- `packages/types/src/base/validator.ts`

**Requirements**:
```typescript
export type ValidationPhase = 'structural' | 'automated' | 'computed';

export interface ValidationResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  location?: SpinePosition;
  fix?: string;
}

export interface Validator<Context> {
  name: string;
  phase: ValidationPhase;
  validate(context: Context): Promise<ValidationResult[]>;
}
```

---

### 6.AP.5 - Extend Character Type from BaseEntity
**Dependencies**: 6.AP.1
**Parallel**: After 6.AP.1
**Files to modify**:
- `packages/types/src/character.ts`

**Requirements**:
```typescript
import { BaseEntity } from './base/entity';

export interface Character extends BaseEntity {
  type: 'character';
  name: string;
  aliases: string[];
  // ... rest of existing fields
}
```

---

### 6.AP.6 - Extend All Bible Types from BaseEntity
**Dependencies**: 6.AP.1
**Parallel**: After 6.AP.1
**Files to modify**:
- `packages/types/src/location.ts`
- `packages/types/src/faction.ts`
- `packages/types/src/world-rule.ts`
- `packages/types/src/plot-thread.ts`
- `packages/types/src/timeline-event.ts`

---

### 6.AP.7 - Create Content Status Transitions
**Dependencies**: 6.AP.2
**Parallel**: After 6.AP.2
**Files to create**:
- `packages/types/src/base/content-status.ts`

**Requirements**:
```typescript
export const validTransitions: Record<ContentStatus, ContentStatus[]> = {
  draft: ['review'],
  review: ['draft', 'approved'],
  approved: ['published'],
  published: [], // immutable
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return validTransitions[from].includes(to);
}
```

---

### 6.AP.8 - Create Generic EntityRepository Interface
**Dependencies**: 6.AP.1
**Parallel**: After 6.AP.1
**Files to create**:
- `packages/core/src/storage/repositories/base/entity-repository.ts`

**Requirements**:
```typescript
export interface EntityRepository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findByType(type: string): Promise<T[]>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
  findBySpinePosition(position: SpinePosition): Promise<T[]>;
}
```

---

### 6.AP.9 - Separate Shell from Workspace in UI
**Dependencies**: None (can start immediately)
**Parallel**: Yes
**Files to reorganize**:
```
apps/web/src/lib/
├── shell/                    # Future @spine/ui
│   ├── AppShell.svelte
│   ├── Sidebar.svelte
│   ├── Header.svelte
│   └── StatusBar.svelte
├── components/               # Generic UI primitives
└── domain/                   # Spine-specific
```

---

## Phase 7: Validation & Rendering (VR)

**Goal**: Create pluggable validation and rendering infrastructure.

### 7.VR.1 - Create ValidationPanel Component
**Dependencies**: 6.AP.4
**Parallel**: Yes
**Files to create**:
- `apps/web/src/lib/components/ValidationPanel.svelte`

**Requirements**:
- Display validation results
- Group by phase (structural, automated, computed)
- Navigate to source location on click
- Show fix suggestions

**Test file**: `apps/web/src/lib/components/ValidationPanel.test.ts`

---

### 7.VR.2 - Create ValidationBadge Component
**Dependencies**: 6.AP.4
**Parallel**: Yes
**Files to create**:
- `apps/web/src/lib/components/ValidationBadge.svelte`

**Requirements**:
- Show pass/fail/warn counts
- Color coding
- Compact display

---

### 7.VR.3 - Create ReferenceExtractor Interface
**Dependencies**: 6.AP.2
**Parallel**: After 6.AP.2
**Files to create**:
- `packages/core/src/analysis/reference-extractor.ts`

**Requirements**:
```typescript
export interface ReferenceExtractor<Content> {
  extract(content: Content): Reference[];
}

export class ProseReferenceExtractor implements ReferenceExtractor<ProseContent> {
  constructor(private entityRegistry: EntityRegistry) {}

  extract(content: ProseContent): Reference[] {
    // Scan prose for entity names
  }
}
```

---

### 7.VR.4 - Create ContentRenderer Interface
**Dependencies**: 6.AP.2
**Parallel**: After 6.AP.2
**Files to create**:
- `packages/core/src/render/content-renderer.ts`

**Requirements**:
```typescript
export interface ContentRenderer<C, IR> {
  render(content: C): IR;
}

export interface FormatRenderer<IR, Output> {
  render(ir: IR): Output;
}
```

---

## Dependency Graph Summary

```
Phase 1 (Code Reduction):
1.CR.1 ─┬─→ 1.CR.4 ─┐
1.CR.2 ─┼─→ 1.CR.5 ─┤
1.CR.3 ─┴─→ 1.CR.6 ─┼─→ 1.CR.10
            1.CR.7 ─┤
            1.CR.8 ─┤
            1.CR.9 ─┘

Phase 2 (Testing):
2.TI.1 ─→ 2.TI.2 ─┬─→ 2.TI.4
          2.TI.3 ─┼─→ 2.TI.5
                  ├─→ 2.TI.6
                  ├─→ 2.TI.7
                  └─→ 2.TI.8

1.CR.1 ─┐
1.CR.2 ─┼─→ 2.TI.9
1.CR.3 ─┤
2.TI.2 ─┤
2.TI.3 ─┘

2.TI.10 ─→ 2.TI.11
        └─→ 2.TI.12

Phase 3 (Tailwind CSS v4):
3.TW.1 ─→ 3.TW.2 ─→ 3.TW.3 ─┬─→ 3.TW.4  ─┐
                             ├─→ 3.TW.5  ─┤
                             ├─→ 3.TW.6  ─┤
                             ├─→ 3.TW.7  ─┤
                             ├─→ 3.TW.8  ─┼─→ 3.TW.14
                             ├─→ 3.TW.9  ─┤
                             ├─→ 3.TW.10 ─┤
                             ├─→ 3.TW.12 ─┤
                             └─→ 3.TW.13 ─┘

3.TW.1 ─→ 3.TW.11 (parallel)
3.TW.1 ─→ 3.TW.15 (parallel)

Phase 4 (Accessibility):
4.UA.1 ─→ 4.UA.2 ─→ 4.UA.5
       ├─→ 4.UA.3 ─→ 4.UA.6
       └─→ 4.UA.4 ─→ 4.UA.7

Phase 5 (Icons):
5.IC.1 ─┬─→ 5.IC.3
5.IC.2 ─┘

Phase 6 (Architecture):
6.AP.1 ─→ 6.AP.5
       └─→ 6.AP.6
       └─→ 6.AP.8

6.AP.2 ─→ 6.AP.7
       └─→ 7.VR.3
       └─→ 7.VR.4

Phase 7 (Validation/Rendering):
6.AP.4 ─→ 7.VR.1
       └─→ 7.VR.2
```

## Parallel Execution Groups

For maximum parallelism, tasks can be grouped:

### Wave 1 (No dependencies - start immediately):
- 1.CR.1, 1.CR.2, 1.CR.3
- 2.TI.1, 2.TI.10
- 3.TW.1
- 4.UA.1
- 5.IC.1, 5.IC.2
- 6.AP.1, 6.AP.2, 6.AP.3, 6.AP.4, 6.AP.9

### Wave 2 (After Wave 1):
- 1.CR.4, 1.CR.5, 1.CR.6, 1.CR.7, 1.CR.8, 1.CR.9, 1.CR.10
- 2.TI.2, 2.TI.3, 2.TI.11, 2.TI.12
- 3.TW.2, 3.TW.11, 3.TW.15
- 4.UA.2, 4.UA.3, 4.UA.4
- 6.AP.5, 6.AP.6, 6.AP.7, 6.AP.8
- 7.VR.1, 7.VR.2, 7.VR.3, 7.VR.4

### Wave 3 (After Wave 2):
- 2.TI.4, 2.TI.5, 2.TI.6, 2.TI.7, 2.TI.8, 2.TI.9
- 3.TW.3
- 4.UA.5, 4.UA.6, 4.UA.7
- 5.IC.3

### Wave 4 (After Wave 3):
- 3.TW.4, 3.TW.5, 3.TW.6, 3.TW.7, 3.TW.8, 3.TW.9, 3.TW.10, 3.TW.12, 3.TW.13

### Wave 5 (After Wave 4):
- 3.TW.14 (final CSS cleanup)

## Estimated Code Impact

| Phase | Files Created | Files Modified | Lines Added | Lines Removed | Net |
|-------|--------------|----------------|-------------|---------------|-----|
| 1.CR  | 3            | 6              | ~400        | ~1,815        | -1,415 |
| 2.TI  | 5            | 8              | ~300        | ~100          | +200 |
| 3.TW  | 2            | ~20            | ~600        | ~1,500        | -900 |
| 4.UA  | 3            | ~10            | ~200        | ~300          | -100 |
| 5.IC  | 0            | ~15            | ~50         | ~200          | -150 |
| 6.AP  | 8            | 8              | ~400        | ~50           | +350 |
| 7.VR  | 4            | 0              | ~200        | 0             | +200 |

**Total**: ~-1,815 net lines with significantly improved architecture, Tailwind utilities, and testability.

## Verification Checklist

After each phase:
- [ ] `pnpm lint` passes
- [ ] `pnpm check-types` passes
- [ ] `pnpm test:unit` passes
- [ ] `pnpm test:integration` passes
- [ ] No accessibility warnings from Bits UI
- [ ] All new components have tests
- [ ] Tailwind classes are properly sorted (after Phase 3)
- [ ] Dark mode works correctly (after Phase 3)

## Task Count Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1.CR  | 10    | Code Reduction - Generic components |
| 2.TI  | 12    | Testing Infrastructure |
| 3.TW  | 15    | Tailwind CSS v4 Migration |
| 4.UA  | 7     | UI Accessibility (Bits UI) |
| 5.IC  | 3     | Icon System (Lucide) |
| 6.AP  | 9     | Architecture Preparation |
| 7.VR  | 4     | Validation & Rendering |
| **Total** | **60** | |
