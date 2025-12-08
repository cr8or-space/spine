<script lang="ts">
  import { Tabs } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Tab {
    id: string;
    label: string;
    count?: number;
  }

  interface Props {
    tabs: Tab[];
    active?: string;
    orientation?: 'horizontal' | 'vertical';
    children?: Snippet<[string]>;
  }

  let { tabs, active = $bindable(''), orientation = 'horizontal', children }: Props = $props();

  // Ensure active has a default value if empty
  $effect(() => {
    if (!active && tabs.length > 0) {
      active = tabs[0].id;
    }
  });

  let tabsListClass = $derived(
    orientation === 'vertical' ? 'tabs-list vertical' : 'tabs-list'
  );
</script>

<Tabs.Root bind:value={active} {orientation} class="tabs-root">
  <Tabs.List class={tabsListClass}>
    {#each tabs as tab (tab.id)}
      <Tabs.Trigger value={tab.id} class="tab">
        {tab.label}
        {#if tab.count !== undefined}
          <span class="tab-count">{tab.count}</span>
        {/if}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>

  {#if children}
    {#each tabs as tab (tab.id)}
      <Tabs.Content value={tab.id} class="tab-content">
        {@render children(tab.id)}
      </Tabs.Content>
    {/each}
  {/if}
</Tabs.Root>

<style>
  :global(.tabs-root) {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  :global(.tabs-list) {
    display: flex;
    gap: var(--space-1);
    border-bottom: 1px solid var(--color-border);
    padding: 0 var(--space-4);
    overflow-x: auto;
  }

  :global(.tabs-list.vertical) {
    flex-direction: column;
    border-bottom: none;
    border-right: 1px solid var(--color-border);
    padding: var(--space-4) 0;
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

  :global(.tabs-list.vertical .tab) {
    border-bottom: none;
    border-right: 2px solid transparent;
    margin-bottom: 0;
    margin-right: -1px;
    justify-content: flex-start;
  }

  :global(.tab:hover) {
    color: var(--color-text);
  }

  :global(.tab:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
    border-radius: var(--radius-sm);
  }

  :global(.tab[data-state='active']) {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  :global(.tabs-list.vertical .tab[data-state='active']) {
    border-bottom-color: transparent;
    border-right-color: var(--color-primary);
  }

  :global(.tab-count) {
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

  :global(.tab[data-state='active'] .tab-count) {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
  }

  :global(.tab-content) {
    padding: var(--space-4);
  }

  :global(.tab-content[data-state='inactive']) {
    display: none;
  }
</style>
