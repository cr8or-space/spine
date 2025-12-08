<script lang="ts">
  import type { Faction } from '@repo/types';
  import { Button, Card, EmptyState, Badge, Dialog, TextField, TextArea, Select, FilterSelect } from '$lib/components';
  import { enhance } from '$app/forms';
  import { Plus, Users, Layers } from 'lucide-svelte';

  interface Props {
    factions: Faction[];
    projectId: string;
    searchQuery: string;
  }

  let { factions, projectId, searchQuery }: Props = $props();

  let typeFilter = $state('');
  let statusFilter = $state('');
  let influenceFilter = $state('');

  const filteredFactions = $derived(
    factions.filter((faction) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          faction.name.toLowerCase().includes(query) ||
          faction.description.toLowerCase().includes(query) ||
          faction.aliases.some((alias) => alias.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      // Type filter
      if (typeFilter && faction.type !== typeFilter) return false;
      // Status filter
      if (statusFilter && faction.status !== statusFilter) return false;
      // Influence filter
      if (influenceFilter && faction.influence !== influenceFilter) return false;
      return true;
    })
  );

  const hasActiveFilters = $derived(!!typeFilter || !!statusFilter || !!influenceFilter);

  function clearFilters() {
    typeFilter = '';
    statusFilter = '';
    influenceFilter = '';
  }

  let showCreateDialog = $state(false);

  let createForm = $state({
    name: '',
    description: '',
    aliases: '',
    type: 'organization' as Faction['type'],
    status: 'active' as Faction['status'],
    influence: 'moderate' as Faction['influence'],
    ideology: '',
  });

  const typeOptions = [
    { value: 'government', label: 'Government' },
    { value: 'military', label: 'Military' },
    { value: 'religious', label: 'Religious' },
    { value: 'criminal', label: 'Criminal' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'secret-society', label: 'Secret Society' },
    { value: 'guild', label: 'Guild' },
    { value: 'family', label: 'Family' },
    { value: 'informal', label: 'Informal' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'disbanded', label: 'Disbanded' },
    { value: 'underground', label: 'Underground' },
    { value: 'emerging', label: 'Emerging' },
    { value: 'unknown', label: 'Unknown' },
  ];

  const influenceOptions = [
    { value: 'dominant', label: 'Dominant' },
    { value: 'major', label: 'Major' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'minor', label: 'Minor' },
    { value: 'negligible', label: 'Negligible' },
  ];

  function resetCreateForm() {
    createForm = {
      name: '',
      description: '',
      aliases: '',
      type: 'organization',
      status: 'active',
      influence: 'moderate',
      ideology: '',
    };
  }

  function getTypeBadgeVariant(type: Faction['type']): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (type) {
      case 'government':
        return 'primary';
      case 'military':
        return 'danger';
      case 'religious':
        return 'info';
      case 'criminal':
        return 'warning';
      case 'corporate':
        return 'success';
      default:
        return 'default';
    }
  }

  function getInfluenceBadgeVariant(influence: Faction['influence']): 'primary' | 'success' | 'warning' | 'info' | 'default' {
    switch (influence) {
      case 'dominant':
        return 'primary';
      case 'major':
        return 'success';
      case 'moderate':
        return 'info';
      case 'minor':
        return 'warning';
      default:
        return 'default';
    }
  }
</script>

<div class="faction-tab">
  <div class="tab-toolbar">
    <div class="toolbar-left">
      <span class="count-label">
        {filteredFactions.length} {filteredFactions.length === 1 ? 'faction' : 'factions'}
        {#if searchQuery || hasActiveFilters}
          (filtered from {factions.length})
        {/if}
      </span>
      <div class="filter-controls">
        <FilterSelect bind:value={typeFilter} options={typeOptions} allLabel="All types" />
        <FilterSelect bind:value={statusFilter} options={statusOptions} allLabel="All statuses" />
        <FilterSelect bind:value={influenceFilter} options={influenceOptions} allLabel="All influence" />
        {#if hasActiveFilters}
          <button class="clear-filters" onclick={clearFilters}>Clear</button>
        {/if}
      </div>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <Plus size={16} />
      New Faction
    </Button>
  </div>

  {#if filteredFactions.length === 0}
    {#if searchQuery || hasActiveFilters}
      <EmptyState
        title="No factions found"
        description="Try adjusting your search query or filters."
      />
    {:else}
      <EmptyState
        title="No factions yet"
        description="Create your first faction to start organizing groups in your story."
      >
        {#snippet action()}
          <Button onclick={() => (showCreateDialog = true)}>Create Faction</Button>
        {/snippet}
      </EmptyState>
    {/if}
  {:else}
    <div class="faction-grid">
      {#each filteredFactions as faction (faction.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/faction/{faction.id}" class="faction-link">
            <div class="faction-content">
              <div class="faction-header">
                <h3 class="faction-name">{faction.name}</h3>
                <div class="faction-badges">
                  <Badge variant={getTypeBadgeVariant(faction.type)}>
                    {faction.type}
                  </Badge>
                  <Badge variant={getInfluenceBadgeVariant(faction.influence)}>
                    {faction.influence}
                  </Badge>
                </div>
              </div>

              {#if faction.aliases.length > 0}
                <div class="faction-aliases">
                  <span class="aliases-label">Also known as:</span>
                  {faction.aliases.join(', ')}
                </div>
              {/if}

              <p class="faction-description">
                {faction.description.length > 200
                  ? faction.description.substring(0, 200) + '...'
                  : faction.description}
              </p>

              <div class="faction-meta">
                <span class="meta-item">
                  <Users size={14} />
                  {faction.members.length} members
                </span>
                <span class="meta-item">
                  <Layers size={14} />
                  {faction.ranks.length} ranks
                </span>
                <span class="meta-item">
                  Status: {faction.status}
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
  .faction-tab {
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

  .faction-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--space-4);
  }

  .faction-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .faction-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .faction-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .faction-name {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .faction-badges {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .faction-aliases {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .aliases-label {
    font-style: italic;
    margin-right: var(--space-1);
  }

  .faction-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .faction-meta {
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

<!-- Create Faction Dialog -->
<Dialog
  open={showCreateDialog}
  title="Create Faction"
  onClose={() => (showCreateDialog = false)}
>
  <form method="POST" action="?/createFaction" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'redirect') {
        showCreateDialog = false;
        resetCreateForm();
        window.location.href = result.location;
      } else if (result.type === 'failure') {
        console.error('Create faction failed:', result.data);
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

      <Select
        label="Influence"
        name="influence"
        bind:value={createForm.influence}
        options={influenceOptions}
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

      <TextField
        label="Ideology"
        name="ideology"
        bind:value={createForm.ideology}
        hint="Core beliefs or principles"
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
        <Button type="submit">Create Faction</Button>
      </div>
    </div>
  </form>
</Dialog>
