<script lang="ts">
  import { Tabs } from 'bits-ui';

  interface Tab {
    id: string;
    label: string;
    count?: number;
  }

  interface Props {
    tabs: Tab[];
    active?: string;
  }

  let { tabs, active = $bindable('') }: Props = $props();
</script>

<Tabs.Root bind:value={active}>
  <Tabs.List class="tabs">
    {#each tabs as tab}
      <Tabs.Trigger value={tab.id} class="tab">
        {tab.label}
        {#if tab.count !== undefined}
          <span class="tab-count">{tab.count}</span>
        {/if}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>
</Tabs.Root>

<style>
  :global(.tabs) {
    display: flex;
    gap: var(--space-1);
    border-bottom: 1px solid var(--color-border);
    padding: 0 var(--space-4);
    overflow-x: auto;
  }

  :global(.tab) {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    font-family: inherit;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  :global(.tab:hover) {
    color: var(--color-text);
  }

  :global(.tab[data-state='active']) {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  .tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 var(--space-2);
    font-size: var(--text-xs);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-full);
  }

  :global(.tab[data-state='active']) .tab-count {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
  }
</style>
