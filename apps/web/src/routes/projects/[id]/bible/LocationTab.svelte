<script lang="ts">
  import type { Location } from '@repo/types';
  import { Button, Card, EmptyState, Badge, Dialog, TextField, TextArea, Select, FilterSelect } from '$lib/components';
  import { enhance } from '$app/forms';

  interface Props {
    locations: Location[];
    projectId: string;
    searchQuery: string;
  }

  let { locations, projectId, searchQuery }: Props = $props();

  let typeFilter = $state('');
  let statusFilter = $state('');

  const filteredLocations = $derived(
    locations.filter((loc) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          loc.name.toLowerCase().includes(query) ||
          loc.description.toLowerCase().includes(query) ||
          loc.aliases.some((alias) => alias.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      // Type filter
      if (typeFilter && loc.type !== typeFilter) return false;
      // Status filter
      if (statusFilter && loc.status !== statusFilter) return false;
      return true;
    })
  );

  const hasActiveFilters = $derived(!!typeFilter || !!statusFilter);

  function clearFilters() {
    typeFilter = '';
    statusFilter = '';
  }

  let showCreateDialog = $state(false);

  let createForm = $state({
    name: '',
    description: '',
    aliases: '',
    type: 'city' as Location['type'],
    status: 'accessible' as Location['status'],
  });

  const typeOptions = [
    { value: 'world', label: 'World' },
    { value: 'continent', label: 'Continent' },
    { value: 'country', label: 'Country' },
    { value: 'region', label: 'Region' },
    { value: 'city', label: 'City' },
    { value: 'district', label: 'District' },
    { value: 'building', label: 'Building' },
    { value: 'room', label: 'Room' },
    { value: 'natural', label: 'Natural' },
    { value: 'virtual', label: 'Virtual' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'accessible', label: 'Accessible' },
    { value: 'destroyed', label: 'Destroyed' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'restricted', label: 'Restricted' },
    { value: 'unknown', label: 'Unknown' },
  ];

  function resetCreateForm() {
    createForm = {
      name: '',
      description: '',
      aliases: '',
      type: 'city',
      status: 'accessible',
    };
  }

  function getTypeBadgeVariant(type: Location['type']): 'primary' | 'success' | 'warning' | 'info' | 'default' {
    switch (type) {
      case 'world':
      case 'continent':
        return 'primary';
      case 'country':
      case 'region':
        return 'success';
      case 'city':
      case 'district':
        return 'info';
      default:
        return 'default';
    }
  }

  function getStatusBadgeVariant(status: Location['status']): 'success' | 'danger' | 'warning' | 'info' | 'default' {
    switch (status) {
      case 'accessible':
        return 'success';
      case 'destroyed':
        return 'danger';
      case 'hidden':
      case 'restricted':
        return 'warning';
      default:
        return 'default';
    }
  }
</script>

<div class="location-tab">
  <div class="tab-toolbar">
    <div class="toolbar-left">
      <span class="count-label">
        {filteredLocations.length} {filteredLocations.length === 1 ? 'location' : 'locations'}
        {#if searchQuery || hasActiveFilters}
          (filtered from {locations.length})
        {/if}
      </span>
      <div class="filter-controls">
        <FilterSelect bind:value={typeFilter} options={typeOptions} allLabel="All types" />
        <FilterSelect bind:value={statusFilter} options={statusOptions} allLabel="All statuses" />
        {#if hasActiveFilters}
          <button class="clear-filters" onclick={clearFilters}>Clear</button>
        {/if}
      </div>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New Location
    </Button>
  </div>

  {#if filteredLocations.length === 0}
    {#if searchQuery || hasActiveFilters}
      <EmptyState
        title="No locations found"
        description="Try adjusting your search query or filters."
      />
    {:else}
      <EmptyState
        title="No locations yet"
        description="Create your first location to start building your story world."
      >
        {#snippet action()}
          <Button onclick={() => (showCreateDialog = true)}>Create Location</Button>
        {/snippet}
      </EmptyState>
    {/if}
  {:else}
    <div class="location-grid">
      {#each filteredLocations as location (location.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/location/{location.id}" class="location-link">
            <div class="location-content">
              <div class="location-header">
                <h3 class="location-name">{location.name}</h3>
                <div class="location-badges">
                  <Badge variant={getTypeBadgeVariant(location.type)}>
                    {location.type}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(location.status)}>
                    {location.status}
                  </Badge>
                </div>
              </div>

              {#if location.aliases.length > 0}
                <div class="location-aliases">
                  <span class="aliases-label">Also known as:</span>
                  {location.aliases.join(', ')}
                </div>
              {/if}

              <p class="location-description">
                {location.description.length > 200
                  ? location.description.substring(0, 200) + '...'
                  : location.description}
              </p>

              <div class="location-meta">
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {location.features.length} features
                </span>
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  </svg>
                  {location.associatedCharacters.length} characters
                </span>
              </div>
            </div>
          </a>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<!-- Create Location Dialog -->
<Dialog
  open={showCreateDialog}
  title="Create Location"
  onClose={() => (showCreateDialog = false)}
>
  <form method="POST" action="?/createLocation" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'redirect') {
        showCreateDialog = false;
        resetCreateForm();
        window.location.href = result.location;
      } else if (result.type === 'failure') {
        console.error('Create location failed:', result.data);
      }
    };
  }}>
    <div class="dialog-form">
      <TextField
        label="Name"
        name="name"
        bind:value={createForm.name}
        required
      />

      <Select
        label="Type"
        name="type"
        bind:value={createForm.type}
        options={typeOptions}
      />

      <Select
        label="Status"
        name="status"
        bind:value={createForm.status}
        options={statusOptions}
      />

      <TextField
        label="Aliases (comma-separated)"
        name="aliases-display"
        bind:value={createForm.aliases}
        hint="Alternative names"
      />

      <input
        type="hidden"
        name="aliases"
        value={JSON.stringify(createForm.aliases.split(',').map(a => a.trim()).filter(Boolean))}
      />

      <TextArea
        label="Description"
        name="description"
        bind:value={createForm.description}
        rows={6}
        required
      />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Create Location</Button>
      </div>
    </div>
  </form>
</Dialog>

<style>
  .location-tab {
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

  .location-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--space-4);
  }

  .location-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .location-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .location-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .location-name {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .location-badges {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .location-aliases {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .aliases-label {
    font-style: italic;
    margin-right: var(--space-1);
  }

  .location-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .location-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-light);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .dialog-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
    margin-top: var(--space-2);
  }
</style>
