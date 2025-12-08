<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    children: Snippet;
    class?: string;
  }

  let { padding = 'md', hover = false, children, class: className }: Props = $props();

  const baseClasses = 'bg-surface border border-border rounded-lg';

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const hoverClasses = hover
    ? 'cursor-pointer transition-all duration-150 hover:border-primary hover:shadow-md'
    : '';
</script>

<div class={cn(baseClasses, paddingClasses[padding], hoverClasses, className)}>
  {@render children()}
</div>
