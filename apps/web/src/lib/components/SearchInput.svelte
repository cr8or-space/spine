<script lang="ts">
  interface Props {
    value: string;
    placeholder?: string;
  }

  let { value = $bindable(), placeholder = 'Search...' }: Props = $props();
</script>

<div class="relative flex items-center">
  <svg
    class="absolute left-3 text-text-tertiary pointer-events-none"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
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
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  {/if}
</div>
