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

  interface Props {
    children?: Snippet;
    left?: Snippet;
    right?: Snippet;
    class?: string;
  }

  let { children, left, right, class: className = '' }: Props = $props();
</script>

<header class="header {className}">
  {#if left}
    <div class="header-left">
      {@render left()}
    </div>
  {/if}

  {#if children}
    <div class="header-center">
      {@render children()}
    </div>
  {/if}

  {#if right}
    <div class="header-right">
      {@render right()}
    </div>
  {/if}
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: 0 var(--space-4);
    height: var(--header-height);
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .header-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
</style>
