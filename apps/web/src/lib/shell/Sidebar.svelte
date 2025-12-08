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
  import { cn } from '$lib/utils/cn';

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
  class={cn(
    'h-full flex flex-col bg-surface overflow-hidden transition-[width] duration-200',
    position === 'left' ? 'border-r border-border' : 'border-l border-border',
    className
  )}
  style="width: {currentWidth}"
>
  {#if header}
    <div class={cn('p-4 border-b border-border', collapsed && 'p-2')}>
      {@render header()}
    </div>
  {/if}

  <nav class="flex-1 overflow-y-auto p-2">
    {@render children()}
  </nav>

  {#if footer}
    <div class={cn('p-4 border-t border-border', collapsed && 'p-2')}>
      {@render footer()}
    </div>
  {/if}
</aside>
