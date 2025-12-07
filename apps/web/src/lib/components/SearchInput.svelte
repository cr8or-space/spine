<script lang="ts">
  interface Props {
    value: string;
    placeholder?: string;
  }

  let { value = $bindable(), placeholder = 'Search...' }: Props = $props();
</script>

<div class="search-input">
  <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
  <input
    type="search"
    class="input"
    bind:value
    {placeholder}
  />
  {#if value}
    <button class="clear-btn" onclick={() => value = ''} aria-label="Clear search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .search-input {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: var(--space-3);
    color: var(--color-text-tertiary);
    pointer-events: none;
  }

  .input {
    width: 100%;
    padding: var(--space-2) var(--space-8) var(--space-2) var(--space-10);
    font-family: inherit;
    font-size: var(--text-sm);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    transition: all var(--transition-fast);
  }

  .input::placeholder {
    color: var(--color-text-tertiary);
  }

  .input:focus {
    outline: none;
    background-color: var(--color-bg);
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  /* Hide browser clear button */
  .input::-webkit-search-cancel-button {
    display: none;
  }

  .clear-btn {
    position: absolute;
    right: var(--space-2);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .clear-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }
</style>
