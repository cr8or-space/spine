<script lang="ts">
  import type { Location } from '@repo/types';
  import { Button, Card, EmptyState, Badge } from '$lib/components';

  interface Props {
    locations: Location[];
    projectId: string;
    searchQuery: string;
  }

  let { locations, projectId, searchQuery }: Props = $props();

  const filteredLocations = $derived(
    searchQuery
      ? locations.filter(
          (loc) =>
            loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loc.aliases.some((alias) =>
              alias.toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
      : locations
  );

  let showCreateDialog = $state(false);

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
    <div class="toolbar-info">
      <span class="count-label">
        {filteredLocations.length} {filteredLocations.length === 1 ? 'location' : 'locations'}
        {#if searchQuery}
          (filtered from {locations.length})
        {/if}
      </span>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New Location
    </Button>
  </div>

  {#if filteredLocations.length === 0}
    {#if searchQuery}
      <EmptyState
        title="No locations found"
        description="Try adjusting your search query."
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
  }

  .count-label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
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
</style>
