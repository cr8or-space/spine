<script lang="ts">
  /**
   * Sidebar - Collapsible side navigation component.
   *
   * Provides a vertical navigation panel that can be:
   * - Fixed or collapsible
   * - Positioned left or right
   *
   * Future @spine/ui candidate.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    header?: Snippet;
    footer?: Snippet;
    collapsed?: boolean;
    position?: 'left' | 'right';
    width?: string;
    collapsedWidth?: string;
    class?: string;
  }

  let {
    children,
    header,
    footer,
    collapsed = false,
    position = 'left',
    width = '240px',
    collapsedWidth = '64px',
    class: className = '',
  }: Props = $props();

  const currentWidth = $derived(collapsed ? collapsedWidth : width);
</script>

<aside
  class="sidebar sidebar-{position} {className}"
  class:collapsed
  style="--sidebar-width: {currentWidth}"
>
  {#if header}
    <div class="sidebar-header">
      {@render header()}
    </div>
  {/if}

  <nav class="sidebar-content">
    {@render children()}
  </nav>

  {#if footer}
    <div class="sidebar-footer">
      {@render footer()}
    </div>
  {/if}
</aside>

<style>
  .sidebar {
    width: var(--sidebar-width);
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface);
    border-right: 1px solid var(--color-border);
    transition: width var(--transition-normal);
    overflow: hidden;
  }

  .sidebar-right {
    border-right: none;
    border-left: 1px solid var(--color-border);
  }

  .sidebar-header {
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .sidebar-footer {
    padding: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .sidebar.collapsed .sidebar-header,
  .sidebar.collapsed .sidebar-footer {
    padding: var(--space-2);
  }
</style>
