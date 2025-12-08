<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    value: string;
    options: Option[];
    allLabel?: string;
  }

  let { value = $bindable(), options, allLabel = 'All' }: Props = $props();

  const allOptions = $derived([{ value: '', label: allLabel }, ...options]);
</script>

<div class="filter-select">
  <select class="select" bind:value>
    {#each allOptions as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  <ChevronDown class="select-icon" size={14} />
</div>

<style>
  .filter-select {
    position: relative;
    display: inline-flex;
  }

  .select {
    padding: var(--space-1) var(--space-6) var(--space-1) var(--space-2);
    font-family: inherit;
    font-size: var(--text-xs);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    appearance: none;
    cursor: pointer;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  .filter-select :global(.select-icon) {
    position: absolute;
    right: var(--space-1);
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--color-text-secondary);
  }
</style>
