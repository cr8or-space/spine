<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    children: Snippet;
    header?: Snippet;
    footer?: Snippet;
    collapsed?: boolean;
    width?: string;
    collapsedWidth?: string;
    class?: string;
    floating?: boolean;
  }

  let {
    children,
    header,
    footer,
    collapsed = false,
    width = 'var(--sidebar-width)',
    collapsedWidth = '80px',
    class: className = '',
    floating = false,
  }: Props = $props();

  const currentWidth = $derived(collapsed ? collapsedWidth : width);
</script>

<aside
  class={cn(
    'h-full flex flex-col bg-[color:var(--color-surface)]/92 backdrop-blur border-r border-border text-text shadow-sm',
    floating && 'rounded-lg m-3 overflow-hidden shadow-md',
    className
  )}
  style={`width: ${currentWidth}`}
>
  {#if header}
    <div class={cn('p-3 border-b border-border', collapsed && 'p-2')}>{@render header()}</div>
  {/if}

  <div class="flex-1 overflow-y-auto p-2 space-y-1">
    {@render children()}
  </div>

  {#if footer}
    <div class={cn('p-3 border-t border-border', collapsed && 'p-2')}>{@render footer()}</div>
  {/if}
</aside>
