<script lang="ts">
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

<div class="tabs" role="tablist">
  {#each tabs as tab}
    <button
      class="tab"
      class:active={active === tab.id}
      role="tab"
      aria-selected={active === tab.id}
      onclick={() => active = tab.id}
    >
      {tab.label}
      {#if tab.count !== undefined}
        <span class="tab-count">{tab.count}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: var(--space-1);
    border-bottom: 1px solid var(--color-border);
    padding: 0 var(--space-4);
    overflow-x: auto;
  }

  .tab {
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

  .tab:hover {
    color: var(--color-text);
  }

  .tab.active {
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

  .tab.active .tab-count {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
  }
</style>
