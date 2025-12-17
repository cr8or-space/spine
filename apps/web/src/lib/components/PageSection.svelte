<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    title?: string;
    description?: string;
    actions?: Snippet;
    padding?: 'none' | 'sm' | 'md';
    subdued?: boolean;
    class?: string;
    children: Snippet;
  }

  let {
    title,
    description,
    actions,
    padding = 'md',
    subdued = false,
    class: className = '',
    children,
  }: Props = $props();

  const paddingClass = $derived(
    padding === 'none' ? 'p-0' : padding === 'sm' ? 'p-3' : 'p-5'
  );
</script>

<section
  class={cn(
    'rounded-lg border border-border bg-surface shadow-sm',
    subdued && 'bg-[color:var(--color-surface-muted)] border-border-light',
    paddingClass,
    className
  )}
>
  {#if title || description || actions}
    <header class={cn('flex items-start gap-3 mb-4', padding === 'none' && 'px-5 pt-5')}>
      <div class="flex-1 min-w-0">
        {#if title}
          <h2 class="text-base font-semibold text-text m-0 truncate">{title}</h2>
        {/if}
        {#if description}
          <p class="text-sm text-text-secondary m-0 mt-1 leading-relaxed">{description}</p>
        {/if}
      </div>
      {#if actions}
        <div class="flex items-center gap-2 shrink-0">{@render actions()}</div>
      {/if}
    </header>
  {/if}

  <div class={cn(padding === 'none' ? 'px-5 pb-5' : '')}>{@render children()}</div>
</section>
