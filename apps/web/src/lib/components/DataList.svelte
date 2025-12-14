<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Item {
    label: string;
    value?: string | number;
    content?: Snippet;
    icon?: Snippet;
    hint?: string;
  }

  interface Props {
    items: Item[];
    dense?: boolean;
    class?: string;
  }

  let { items, dense = false, class: className = '' }: Props = $props();
</script>

<dl class={cn('grid gap-3', dense ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1', className)}>
  {#each items as item}
    <div class="flex items-start gap-3 rounded-md border border-border bg-surface p-3">
      {#if item.icon}
        <span class="flex h-8 w-8 items-center justify-center rounded-md bg-surface-hover text-text-secondary">
          {@render item.icon()}
        </span>
      {/if}
      <div class="flex-1 min-w-0 space-y-1">
        <dt class="text-xs uppercase tracking-wide text-text-tertiary">{item.label}</dt>
        {#if item.content}
          <dd class="text-sm text-text leading-relaxed">{@render item.content()}</dd>
        {:else if item.value !== undefined}
          <dd class="text-sm text-text leading-relaxed break-words">{item.value}</dd>
        {/if}
        {#if item.hint}
          <p class="text-xs text-text-secondary m-0">{item.hint}</p>
        {/if}
      </div>
    </div>
  {/each}
</dl>
