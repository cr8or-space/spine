<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface FilterOption {
    label: string;
    value: string;
    count?: number;
    icon?: Snippet;
  }

  interface Props {
    filters: FilterOption[];
    value?: string | null;
    allowEmpty?: boolean;
    class?: string;
  }

  const dispatch = createEventDispatcher<{ change: string | null }>();

  let { filters, value = null, allowEmpty = false, class: className = '' }: Props = $props();

  function selectFilter(next: string) {
    if (value === next && allowEmpty) {
      value = null;
      dispatch('change', null);
      return;
    }
    value = next;
    dispatch('change', next);
  }
</script>

<div class={cn('flex flex-wrap items-center gap-2', className)}>
  {#each filters as filter}
    <button
      type="button"
      class={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors border',
        value === filter.value
          ? 'bg-primary-light text-primary border-primary/60'
          : 'bg-surface text-text-secondary border-border hover:border-border-light hover:text-text'
      )}
      aria-pressed={value === filter.value}
      onclick={() => selectFilter(filter.value)}
    >
      {#if filter.icon}
        <span class="flex items-center justify-center w-4 h-4">{@render filter.icon()}</span>
      {/if}
      <span>{filter.label}</span>
      {#if filter.count !== undefined}
        <span
          class={cn(
            'text-xs rounded-full px-2 py-0.5 border',
            value === filter.value ? 'border-primary/70 text-primary' : 'border-border text-text-tertiary'
          )}
        >
          {filter.count}
        </span>
      {/if}
    </button>
  {/each}
</div>
