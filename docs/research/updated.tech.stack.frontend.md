● Looking at your frontend specifically:

  Current Frontend Stack

  - SvelteKit + Svelte 5 with runes
  - Custom CSS with design tokens (CSS custom properties)
  - Hand-rolled components (Button, Card, Dialog, TextField, etc.)

  Suggestions

  1. Fix Test Infrastructure (Priority)

  Your component tests are broken:

  `mount(...)` is not available on the server

  The CLAUDE.md mentions vitest-browser-svelte - you should configure that properly. Your vitest.config likely needs environment: 'browser' or similar.

  2. Consider a Component Library

  You've built ~12 components by hand. For a productivity tool, you might benefit from:

  - Bits UI - Headless Svelte 5 components (you style them). Good for accessibility without fighting pre-styled components.
  - Melt UI - Similar headless approach, builder pattern.
  - Skeleton or shadcn-svelte - If you want pre-styled components.

  Your custom components are fine, but things like Dialog, Select, and Tabs have many accessibility edge cases that libraries handle.

  3. Editor Component

  The <textarea> works but is limited:

  - TipTap (ProseMirror-based) - Rich text, extensible, good Svelte bindings exist
  - Milkdown - Markdown-focused, also ProseMirror-based
  - Or keep <textarea> if plain text is intentional - many writers prefer it

  4. CSS Approach

  Your CSS variables are well-organized. Options to consider:

  - Tailwind CSS - Faster iteration, but different mental model
  - Open Props - Just more design tokens, works with your current approach
  - Keep current approach - it's working fine, just ensure tokens are in one place

  5. Icons

  You're using inline SVGs everywhere. Consider:

  - Lucide Svelte or Phosphor Svelte - Consistent icon set, tree-shakeable
  - Keeps markup cleaner than inline SVG paths

  6. Virtual Scrolling

  For large outlines or long chapter lists, you'll eventually need:

  - svelte-virtual-list or similar
  - The outline tree could get slow with 100+ chapters

  7. Keyboard Navigation

  The workspace would benefit from:

  - Keyboard shortcuts for common actions (you have Ctrl+S for save)
  - Arrow key navigation in the outline tree
  - A command palette (Cmd+K pattern) for quick actions

  What's Working Well

  - Svelte 5 runes usage is clean
  - Component structure is sensible
  - CSS custom properties give you theming capability
  - Form actions pattern is idiomatic SvelteKit

  The frontend is functional. The main gaps are test infrastructure, accessibility depth in interactive components, and eventually a richer text editor.
