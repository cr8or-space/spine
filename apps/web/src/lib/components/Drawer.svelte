<script lang="ts">
  import type { Snippet } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';

  type Position = 'left' | 'right';

  interface Props {
    open: boolean;
    title?: string;
    position?: Position;
    width?: string;
    header?: Snippet;
    footer?: Snippet;
    class?: string;
    children: Snippet;
  }

  const dispatch = createEventDispatcher<{ close: void }>();

  let {
    open,
    title,
    position = 'right',
    width = '420px',
    header,
    footer,
    class: className = '',
    children,
  }: Props = $props();

  function handleClose() {
    dispatch('close');
  }

  const translateClass = $derived(() => {
    if (open) return 'translate-x-0';
    return position === 'right' ? 'translate-x-full' : '-translate-x-full';
  });

  const sidePosition = $derived(position === 'right' ? 'right-0' : 'left-0');
</script>

<div class={cn('fixed inset-0 z-40', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
  <div
    class={cn('absolute inset-0 bg-black/40 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
    on:click={handleClose}
    role="button"
    tabindex="0"
    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') handleClose(); }}
    aria-label="Close overlay"
  ></div>

  <div
    class={cn(
      'absolute top-0 h-full bg-surface shadow-md border-l border-border w-full max-w-[90vw]',
      'transition-transform duration-300 ease-in-out backdrop-blur',
      sidePosition,
      translateClass,
      className
    )}
    style={`width: ${width}`}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'drawer-title' : undefined}
  >
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between gap-3 px-4 h-[var(--header-height)] border-b border-border">
        {#if title}
          <h2 id="drawer-title" class="text-base font-semibold text-text m-0 truncate">{title}</h2>
        {/if}
        <div class="flex items-center gap-2">
          {#if header}
            {@render header()}
          {/if}
          <button
            type="button"
            class="flex items-center justify-center w-9 h-9 rounded-md text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
            on:click={handleClose}
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        {@render children()}
      </div>

      {#if footer}
        <div class="border-t border-border p-4 bg-surface/90">{@render footer()}</div>
      {/if}
    </div>
  </div>
</div>
