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

  interface Props {
    children?: Snippet;
    left?: Snippet;
    right?: Snippet;
    class?: string;
  }

  let { children, left, right, class: className = '' }: Props = $props();
</script>

<footer class="status-bar {className}">
  {#if left}
    <div class="status-left">
      {@render left()}
    </div>
  {/if}

  {#if children}
    <div class="status-center">
      {@render children()}
    </div>
  {/if}

  {#if right}
    <div class="status-right">
      {@render right()}
    </div>
  {/if}
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: 0 var(--space-4);
    height: var(--status-bar-height, 28px);
    background-color: var(--color-surface);
    border-top: 1px solid var(--color-border);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .status-left,
  .status-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .status-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
