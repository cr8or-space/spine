<script lang="ts">
  /**
   * Header - Application header bar component.
   *
   * Provides a fixed header with customizable left, center, and right sections.
   * Typically contains:
   * - Left: Back button, title
   * - Right: Navigation items
   *
   * Future @spine/ui candidate.
   */
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    children?: Snippet;
    left?: Snippet;
    right?: Snippet;
    class?: string;
  }

  let { children, left, right, class: className = '' }: Props = $props();
</script>

<header
  class={cn(
    'flex items-center justify-between gap-4 px-4 h-14 bg-surface border-b border-border',
    className
  )}
>
  {#if left}
    <div class="flex items-center gap-3">
      {@render left()}
    </div>
  {/if}

  {#if children}
    <div class="flex-1 flex items-center justify-center">
      {@render children()}
    </div>
  {/if}

  {#if right}
    <div class="flex items-center gap-1">
      {@render right()}
    </div>
  {/if}
</header>
