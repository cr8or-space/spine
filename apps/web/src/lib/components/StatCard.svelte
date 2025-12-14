<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  type Tone = 'neutral' | 'positive' | 'negative' | 'warning';

  interface Props {
    title: string;
    value: string | number;
    delta?: string;
    tone?: Tone;
    icon?: Snippet;
    footer?: Snippet;
    class?: string;
  }

  let {
    title,
    value,
    delta,
    tone = 'neutral',
    icon,
    footer,
    class: className = '',
  }: Props = $props();

  const deltaToneClass = $derived(() => {
    if (tone === 'positive') return 'text-success';
    if (tone === 'negative') return 'text-danger';
    if (tone === 'warning') return 'text-warning';
    return 'text-text-secondary';
  });
</script>

<article
  class={cn(
    'rounded-lg border border-border bg-surface shadow-sm p-4 flex flex-col gap-3',
    className
  )}
>
  <div class="flex items-start gap-3">
    {#if icon}
      <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light/50 text-primary">
        {@render icon()}
      </span>
    {/if}
    <div class="flex-1 min-w-0">
      <p class="text-xs uppercase tracking-wide text-text-tertiary m-0">{title}</p>
      <div class="flex items-baseline gap-2 mt-1">
        <span class="text-2xl font-semibold leading-none text-text">{value}</span>
        {#if delta}
          <span class={cn('text-sm font-medium leading-none', deltaToneClass)}>{delta}</span>
        {/if}
      </div>
    </div>
  </div>

  {#if footer}
    <div class="text-sm text-text-secondary leading-relaxed">{@render footer()}</div>
  {/if}
</article>
