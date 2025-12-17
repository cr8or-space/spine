<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    children: Snippet;
    class?: string;
  }

  // svelte-ignore custom_element_props_identifier
  let { padding = 'md', hover = false, children, class: className, ...rest }: Props = $props();

  const baseClasses = 'bg-surface border border-border rounded-lg';

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  let hoverClasses = $derived(
    hover
      ? 'cursor-pointer transition-all duration-150 hover:border-primary hover:shadow-md'
      : ''
  );
</script>

<div class={cn(baseClasses, paddingClasses[padding], hoverClasses, className)} {...rest}>
  {@render children()}
</div>
