<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    children: Snippet;
    class?: string;
  }

  let { variant = 'default', size = 'md', children, class: className }: Props = $props();

  const baseClasses = 'inline-flex items-center font-medium rounded-full whitespace-nowrap';

  const sizeClasses = {
    sm: 'px-2 text-xs h-5',
    md: 'px-3 py-1 text-xs h-6',
  };

  const variantClasses = {
    default: 'bg-bg-tertiary text-text-secondary',
    primary: 'bg-primary-light text-primary',
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
    danger: 'bg-danger-light text-danger',
    info: 'bg-info-light text-info',
  };
</script>

<span class={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}>
  {@render children()}
</span>
