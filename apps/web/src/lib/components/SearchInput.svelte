<script lang="ts">
  import { Search, X } from 'lucide-svelte';

  interface Props {
    value: string;
    placeholder?: string;
  }

  let { value = $bindable(), placeholder = 'Search...' }: Props = $props();
</script>

<div class="relative flex items-center">
  <Search class="absolute left-3 text-text-tertiary pointer-events-none" size={16} />
  <input
    type="search"
    class="w-full py-2 pl-10 pr-8 text-sm bg-bg-secondary border border-border rounded-md text-text transition-all duration-150 placeholder:text-text-tertiary focus:outline-none focus:bg-bg focus:border-primary focus:ring-3 focus:ring-primary-light [&::-webkit-search-cancel-button]:hidden"
    bind:value
    {placeholder}
  />
  {#if value}
    <button
      class="absolute right-2 flex items-center justify-center w-6 h-6 bg-transparent border-none rounded-sm text-text-tertiary cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-text"
      onclick={() => (value = '')}
      aria-label="Clear search"
    >
      <X size={14} />
    </button>
  {/if}
</div>
