<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    icon?: Snippet;
    action?: Snippet;
  }

  let { title, description, icon, action }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center text-center py-12 px-4">
  {#if icon}
    <div class="mb-4">
      {@render icon()}
    </div>
  {:else}
    <div class="mb-4 text-text-tertiary">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    </div>
  {/if}

  <h3 class="text-lg font-semibold text-text m-0">{title}</h3>

  {#if description}
    <p class="text-sm text-text-secondary mt-2 max-w-[400px] m-0">{description}</p>
  {/if}

  {#if action}
    <div class="mt-6">
      {@render action()}
    </div>
  {/if}
</div>
