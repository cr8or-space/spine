<script lang="ts">
  import type { Snippet } from 'svelte';
  import { untrack } from 'svelte';
  import { Button, EmptyState, FilterSelect } from '$lib/components';

  interface FilterConfig {
    key: string;
    options: { value: string; label: string }[];
    allLabel: string;
  }

  interface BaseEntity {
    id: string;
    name: string;
    description: string;
    aliases?: string[];
  }

  interface Props<T extends BaseEntity> {
    items: T[];
    filters: FilterConfig[];
    searchQuery: string;
    entityName: string;
    entityNamePlural: string;
    emptyTitle: string;
    emptyDescription: string;
    onCreateClick: () => void;
    renderCard: Snippet<[T]>;
    filterFn?: (item: T, filters: Record<string, string>) => boolean;
  }

  let {
    items,
    filters,
    searchQuery,
    entityName,
    entityNamePlural,
    emptyTitle,
    emptyDescription,
    onCreateClick,
    renderCard,
    filterFn,
  }: Props<BaseEntity> = $props();

  // Dynamic filter state - initialize from filter configs
  let filterValues = $state<Record<string, string>>({});

  // Initialize filter values when filters change
  $effect(() => {
    const newValues: Record<string, string> = {};
    const currentValues = untrack(() => filterValues);
    for (const filter of filters) {
      newValues[filter.key] = currentValues[filter.key] ?? '';
    }
    filterValues = newValues;
  });

  const filteredItems = $derived(
    items.filter((item) => {
      // Text search across name, description, and aliases
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          (item.aliases ?? []).some((alias) => alias.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Apply custom filter function if provided
      if (filterFn) {
        return filterFn(item, filterValues);
      }

      // Default filter behavior: check each filter key against item properties
      for (const filter of filters) {
        const filterValue = filterValues[filter.key];
        if (filterValue && (item as unknown as Record<string, unknown>)[filter.key] !== filterValue) {
          return false;
        }
      }
      return true;
    })
  );

  const hasActiveFilters = $derived(
    Object.values(filterValues).some((v) => v !== '')
  );

  function clearFilters() {
    const newValues: Record<string, string> = {};
    for (const filter of filters) {
      newValues[filter.key] = '';
    }
    filterValues = newValues;
  }
</script>

<div class="entity-list-page">
  <div class="tab-toolbar">
    <div class="toolbar-left">
      <span class="count-label">
        {filteredItems.length} {filteredItems.length === 1 ? entityName : entityNamePlural}
        {#if searchQuery || hasActiveFilters}
          (filtered from {items.length})
        {/if}
      </span>
      <div class="filter-controls">
        {#each filters as filter (filter.key)}
          <FilterSelect
            bind:value={filterValues[filter.key]}
            options={filter.options}
            allLabel={filter.allLabel}
          />
        {/each}
        {#if hasActiveFilters}
          <button class="clear-filters" onclick={clearFilters}>Clear</button>
        {/if}
      </div>
    </div>
    <Button onclick={onCreateClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New {entityName}
    </Button>
  </div>

  {#if filteredItems.length === 0}
    {#if searchQuery || hasActiveFilters}
      <EmptyState
        title="No {entityNamePlural} found"
        description="Try adjusting your search query or filters."
      />
    {:else}
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      >
        {#snippet action()}
          <Button onclick={onCreateClick}>Create {entityName}</Button>
        {/snippet}
      </EmptyState>
    {/if}
  {:else}
    <div class="entity-grid">
      {#each filteredItems as item (item.id)}
        {@render renderCard(item)}
      {/each}
    </div>
  {/if}
</div>

<style>
  .entity-list-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .tab-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .count-label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .clear-filters {
    padding: var(--space-1) var(--space-2);
    font-family: inherit;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
  }

  .clear-filters:hover {
    color: var(--color-text);
  }

  .entity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--space-4);
  }
</style>
