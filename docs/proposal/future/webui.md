  Web UI Tech Stack: Changes for Spine Framework Compatibility

  Current State

  Good foundations:
  - SvelteKit + Svelte 5 with runes
  - Well-organized CSS custom properties (design tokens)
  - Clean component structure (~14 base components + visualization)
  - Form actions pattern (idiomatic SvelteKit)
  - Dark mode support via prefers-color-scheme

  Areas needing attention for Spine extraction:

  ---
  1. Replace Complex Interactive Components with Bits UI

  Your hand-rolled Dialog, Tabs, and Select work but lack accessibility depth:

  | Component     | Issue                                                              | Bits UI Alternative |
  |---------------|--------------------------------------------------------------------|---------------------|
  | Dialog.svelte | Missing focus trap, no return focus, svelte-ignore a11y_* comments | bits-ui/dialog      |
  | Tabs.svelte   | No keyboard nav (arrow keys), no tabpanel association              | bits-ui/tabs        |
  | Select.svelte | Likely missing typeahead, ARIA                                     | bits-ui/select      |

  Action: Install Bits UI, migrate Dialog/Tabs/Select

  pnpm add bits-ui

  <!-- Before: Hand-rolled dialog -->
  <Dialog open={isOpen} title="Edit Character" onClose={() => isOpen = false}>

  <!-- After: Bits UI (you style it) -->
  <Dialog.Root bind:open={isOpen}>
    <Dialog.Portal>
      <Dialog.Overlay class="dialog-backdrop" />
      <Dialog.Content class="dialog">
        <Dialog.Title>Edit Character</Dialog.Title>
        <!-- ... -->
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>

  Keep your styling — Bits UI is headless. Your CSS custom properties work directly.

  Why for Spine: Dialog, Tabs, Select appear in every domain (entity editors, validation panels). Getting accessibility right once in the framework saves each domain from solving it.

  ---
  2. Extract Shell vs. Workspace Pattern

  The Spine framework proposes: Shell (framework) + Workspace (domain)

  Your current structure mixes them:
  - +layout.svelte — shell (navigation, header)
  - projects/[id]/bible/+page.svelte — domain workspace
  - projects/[id]/workspace/+page.svelte — domain workspace

  Refactor to explicit separation:

  apps/web/src/
  ├── lib/
  │   ├── shell/                    # Future @spine/ui candidates
  │   │   ├── AppShell.svelte       # Header + sidebar + main area
  │   │   ├── Sidebar.svelte
  │   │   ├── Header.svelte
  │   │   └── StatusBar.svelte      # Validation status, buffer status
  │   ├── components/               # Generic UI primitives
  │   │   ├── Button.svelte         # Keep (simple enough)
  │   │   ├── Card.svelte           # Keep
  │   │   ├── TextField.svelte      # Keep
  │   │   └── ...
  │   └── domain/                   # Spine-specific
  │       ├── BibleEditor.svelte
  │       ├── CharacterForm.svelte
  │       └── ...
  └── routes/
      └── projects/[id]/
          ├── +layout.svelte        # Uses AppShell
          └── bible/                # Domain workspace

  Why for Spine: When extracting @spine/ui, the shell components move directly. Domain components stay in Spine.

  ---
  3. Add an Icon System

  Your research suggests Lucide or Phosphor. Currently you have inline SVGs everywhere:

  <!-- Current: Scattered inline SVGs -->
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>

  Action: Adopt lucide-svelte

  pnpm add lucide-svelte

  <!-- After: Consistent, tree-shakeable -->
  <script>
    import { X, Plus, Search, ChevronRight } from 'lucide-svelte';
  </script>

  <button onclick={onClose} aria-label="Close">
    <X size={20} />
  </button>

  Why for Spine: Icons are shared across domains. Consistent icon system means entity editors, validation panels, and graph views look coherent.

  ---
  4. Create Generic Entity Editor Components

  Your bible tabs (CharacterTab, LocationTab, FactionTab, etc.) are domain-specific but share patterns:

  - List view with search/filter
  - Detail form with fields
  - Create/edit/delete operations

  Extract generic patterns:

  <!-- lib/components/EntityList.svelte (future @spine/ui) -->
  <script lang="ts">
    interface Props<T> {
      entities: T[];
      searchable?: boolean;
      onSelect: (entity: T) => void;
      onDelete?: (entity: T) => void;
      renderItem: Snippet<[T]>;
    }
  </script>

  <!-- lib/components/EntityForm.svelte -->
  <script lang="ts">
    interface Props {
      schema: ZodSchema;  // Drives form fields
      initialValues?: Record<string, unknown>;
      onSubmit: (values: Record<string, unknown>) => void;
    }
  </script>

  Domain uses generics:

  <!-- CharacterTab.svelte -->
  <EntityList 
    entities={characters} 
    onSelect={(c) => goto(`character/${c.id}`)}
  >
    {#snippet renderItem(character)}
      <div class="character-item">
        <span>{character.name}</span>
        <Badge>{character.role}</Badge>
      </div>
    {/snippet}
  </EntityList>

  Why for Spine: Every domain has entities. Generic list/form components become @spine/ui exports. Domains customize rendering, not mechanics.

  ---
  5. Add Validation Status Components

  Your plan includes validation panels. Create reusable components now:

  <!-- lib/components/ValidationPanel.svelte -->
  <script lang="ts">
    interface ValidationResult {
      status: 'pass' | 'fail' | 'warn';
      message: string;
      location?: { file: string; line?: number };
    }

    interface Props {
      results: ValidationResult[];
      onNavigate?: (location: ValidationResult['location']) => void;
    }
  </script>

  <!-- lib/components/ValidationBadge.svelte -->
  <script lang="ts">
    interface Props {
      passCount: number;
      failCount: number;
      warnCount: number;
    }
  </script>

  Why for Spine: Validation result display is identical across domains (per Spine rationale: "All domains report validation results in the same format, viewable in the same UI").

  ---
  6. Prepare for Virtual Scrolling

  Your outline tree and chapter lists will grow. Add virtual scrolling infrastructure:

  pnpm add svelte-virtual-list
  # or: @tanstack/svelte-virtual

  Create a wrapper component:

  <!-- lib/components/VirtualList.svelte -->
  <script lang="ts" generics="T">
    import VirtualList from 'svelte-virtual-list';

    interface Props {
      items: T[];
      itemHeight: number;
      renderItem: Snippet<[T, number]>;
    }
  </script>

  Why for Spine: Large projects (100+ chapters, 500+ entities) need virtual scrolling. Building it into the framework means domains get it automatically.

  ---
  7. Add Command Palette Infrastructure

  Your research mentions "Cmd+K pattern." This is essential for productivity tools:

  <!-- lib/components/CommandPalette.svelte -->
  <script lang="ts">
    interface Command {
      id: string;
      label: string;
      shortcut?: string;
      action: () => void;
      category?: string;
    }

    interface Props {
      commands: Command[];
    }
  </script>

  Implementation options:
  - Build with Bits UI Combobox (headless)
  - Use cmdk-sv (Svelte port of cmdk)

  Why for Spine: All authoring tools benefit from quick command access. Framework provides the palette; domains register commands.

  ---
  8. Improve Test Infrastructure

  Your CLAUDE.md mentions broken component tests. Fix the vitest-browser setup:

  // vitest.config.ts
  export default defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'jsdom',  // or configure browser mode properly
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
    },
  });

  For Svelte 5 component testing with vitest-browser-svelte:

  // src/lib/components/Dialog.test.ts
  import { render } from 'vitest-browser-svelte';
  import { page } from '@vitest/browser/context';
  import Dialog from './Dialog.svelte';

  test('closes on escape', async () => {
    const onClose = vi.fn();
    render(Dialog, { open: true, title: 'Test', onClose });

    await page.keyboard.press('Escape');
    expect(onClose).toHaveBeenCalled();
  });

  Why for Spine: Shared components need tests. Extracting @spine/ui means extracting tests too.

  ---
  9. Design Token Consolidation

  Your CSS custom properties are well-organized. Prepare for theming:

  /* app.css - Add semantic layer */
  :root {
    /* Primitive tokens (current) */
    --color-indigo-500: #4f46e5;
    --color-indigo-600: #4338ca;

    /* Semantic tokens (add these) */
    --color-primary: var(--color-indigo-500);
    --color-primary-hover: var(--color-indigo-600);

    /* Component tokens (add these) */
    --dialog-bg: var(--color-surface);
    --dialog-border-radius: var(--radius-xl);
    --button-primary-bg: var(--color-primary);
  }

  Consider moving to a JSON token file for tooling:

  // tokens.json
  {
    "color": {
      "primary": { "value": "{color.indigo.500}" },
      "surface": { "value": "#ffffff", "dark": "#242424" }
    }
  }

  Tools like https://amzn.github.io/style-dictionary/ can generate CSS from this.

  Why for Spine: Different domains might want different accent colors. Token abstraction makes theming possible without forking CSS.

  ---
  10. Consider Rich Text Editor Strategy

  Your workspace has ContentEditor.svelte with <TextArea>. For prose editing, you'll eventually need:

  Options:
  - Keep <textarea> — If plain markdown is the target, this works. Many writers prefer it.
  - TipTap — ProseMirror-based, extensible, has Svelte bindings
  - Milkdown — Markdown-focused, also ProseMirror-based

  Recommendation: Keep <textarea> for now, but design the interface to be swappable:

  <!-- ContentEditor.svelte -->
  <script lang="ts">
    interface Props {
      content: string;
      onChange: (content: string) => void;
      mode?: 'plain' | 'rich';  // Future: swap implementation
    }
  </script>

  {#if mode === 'plain'}
    <TextArea value={content} onchange={(e) => onChange(e.target.value)} />
  {:else}
    <!-- Future: <RichTextEditor {content} {onChange} /> -->
  {/if}

  Why for Spine: Fiction needs prose editing, TechBook needs code+prose, Interactive Fiction needs node editing. The editor interface is domain-provided, but infrastructure is shared.

  ---
  Summary: Web UI Priority Changes

  | Priority | Change                                | Effort | Spine Impact                    |
  |----------|---------------------------------------|--------|---------------------------------|
  | High     | Adopt Bits UI for Dialog/Tabs/Select  | Medium | Accessibility done once         |
  | High     | Extract Shell vs. Workspace pattern   | Low    | Clean @spine/ui boundary        |
  | High     | Fix test infrastructure               | Medium | Tests travel with components    |
  | Medium   | Add Lucide icons                      | Low    | Consistent iconography          |
  | Medium   | Create EntityList/EntityForm generics | Medium | Reusable across domains         |
  | Medium   | Add ValidationPanel components        | Low    | Same display for all validators |
  | Medium   | Add virtual scrolling wrapper         | Low    | Performance at scale            |
  | Low      | Command palette                       | Medium | Productivity boost              |
  | Low      | Token consolidation/theming           | Low    | Domain customization            |
  | Low      | Rich text editor abstraction          | Low    | Just design the interface       |

  The key principle: Build components as if they'll be extracted to @spine/ui. If it's domain-agnostic (shell, validation display, entity list), make it generic. If it's Spine-specific (CharacterForm, TensionCurve), it stays in
   the domain.