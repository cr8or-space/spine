<script lang="ts">
  /**
   * StatusBar - Bottom status bar component.
   *
   * Provides a fixed footer area for displaying:
   * - Application status
   * - Background task progress
   * - Quick actions
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

<footer
  class={cn(
    'flex items-center justify-between gap-4 px-4 h-7 bg-surface border-t border-border text-xs text-text-secondary',
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
    <div class="flex items-center gap-3">
      {@render right()}
    </div>
  {/if}
</footer>
