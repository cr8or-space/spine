<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    children: Snippet;
  }

  let { padding = 'md', hover = false, children }: Props = $props();
</script>

<div class="card card-padding-{padding}" class:hover>
  {@render children()}
</div>

<style>
  .card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .card.hover {
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .card.hover:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
  }

  .card-padding-none {
    padding: 0;
  }

  .card-padding-sm {
    padding: var(--space-3);
  }

  .card-padding-md {
    padding: var(--space-4);
  }

  .card-padding-lg {
    padding: var(--space-6);
  }
</style>
