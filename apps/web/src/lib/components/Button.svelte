<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

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
    type,
    onclick,
    class: className,
  }: Props = $props();

  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-medium border border-transparent rounded-md cursor-pointer transition-all duration-150 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary text-primary-text hover:enabled:bg-primary-hover',
    secondary:
      'bg-bg-secondary border-border text-text hover:enabled:bg-bg-tertiary',
    danger: 'bg-danger text-white hover:enabled:bg-[#dc2626]',
    ghost:
      'bg-transparent text-text-secondary hover:enabled:bg-surface-hover hover:enabled:text-text',
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm h-8',
    md: 'px-4 py-2 text-sm h-10',
    lg: 'px-6 py-3 text-base h-12',
  };
</script>

<button
  class={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
  disabled={disabled || loading}
  {type}
  {onclick}
>
  {#if loading}
    <span
      class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
    ></span>
  {/if}
  <span class={cn(loading && 'opacity-70')}>
    {@render children()}
  </span>
</button>
