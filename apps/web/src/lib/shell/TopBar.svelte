<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    left?: Snippet;
    center?: Snippet;
    right?: Snippet;
    class?: string;
    sticky?: boolean;
  }

  let { left, center, right, class: className = '', sticky = true }: Props = $props();
  const position = $derived(sticky ? 'sticky top-0 z-30' : 'relative');
</script>

<header
  class={cn(
    'flex items-center gap-3 px-4 h-[var(--header-height)] bg-surface/80 backdrop-blur border-b border-border',
    'shadow-sm',
    position,
    className
  )}
>
  <div class="min-w-[64px] flex items-center gap-2">
    {#if left}
      {@render left()}
    {/if}
  </div>

  <div class="flex-1 flex items-center min-w-0">
    {#if center}
      {@render center()}
    {/if}
  </div>

  <div class="min-w-[64px] flex items-center justify-end gap-2">
    {#if right}
      {@render right()}
    {/if}
  </div>
</header>
