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

<div class="relative inline-flex">
  <select
    class="py-1 pl-2 pr-6 text-xs bg-bg border border-border rounded-md text-text appearance-none cursor-pointer transition-all duration-150 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-light"
    bind:value
  >
    {#each allOptions as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  <ChevronDown class="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" size={14} />
</div>
