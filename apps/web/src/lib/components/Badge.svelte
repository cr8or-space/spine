<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    children: Snippet;
  }

  let { variant = 'default', size = 'md', children }: Props = $props();
</script>

<span class="badge badge-{variant} badge-{size}">
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    font-weight: 500;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }

  .badge-sm {
    padding: 0 var(--space-2);
    font-size: var(--text-xs);
    height: 20px;
  }

  .badge-md {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-xs);
    height: 24px;
  }

  .badge-default {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
  }

  .badge-primary {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
  }

  .badge-success {
    background-color: var(--color-success-light);
    color: var(--color-success);
  }

  .badge-warning {
    background-color: var(--color-warning-light);
    color: var(--color-warning);
  }

  .badge-danger {
    background-color: var(--color-danger-light);
    color: var(--color-danger);
  }

  .badge-info {
    background-color: var(--color-info-light);
    color: var(--color-info);
  }
</style>
