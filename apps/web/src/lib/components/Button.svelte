<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    children,
    ...rest
  }: Props = $props();
</script>

<button
  class="btn btn-{variant} btn-{size}"
  disabled={disabled || loading}
  {...rest}
>
  {#if loading}
    <span class="spinner"></span>
  {/if}
  <span class="btn-content" class:loading>
    {@render children()}
  </span>
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: inherit;
    font-weight: 500;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Sizes */
  .btn-sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
    height: 32px;
  }

  .btn-md {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    height: 40px;
  }

  .btn-lg {
    padding: var(--space-3) var(--space-6);
    font-size: var(--text-base);
    height: 48px;
  }

  /* Variants */
  .btn-primary {
    background-color: var(--color-primary);
    color: var(--color-primary-text);
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--color-primary-hover);
  }

  .btn-secondary {
    background-color: var(--color-bg-secondary);
    border-color: var(--color-border);
    color: var(--color-text);
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: var(--color-bg-tertiary);
  }

  .btn-danger {
    background-color: var(--color-danger);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #dc2626;
  }

  .btn-ghost {
    background-color: transparent;
    color: var(--color-text-secondary);
  }

  .btn-ghost:hover:not(:disabled) {
    background-color: var(--color-surface-hover);
    color: var(--color-text);
  }

  /* Loading */
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .btn-content.loading {
    opacity: 0.7;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
