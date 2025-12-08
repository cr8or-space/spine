<script lang="ts">
  import type { Character } from '@repo/types';
  import { Button, Card, EmptyState, Badge, Dialog, TextField, TextArea, Select, FilterSelect } from '$lib/components';
  import { enhance } from '$app/forms';
  import { Plus, User, Users, BookOpen } from 'lucide-svelte';

  interface Props {
    characters: Character[];
    projectId: string;
    searchQuery: string;
  }

  let { characters, projectId, searchQuery }: Props = $props();

  let roleFilter = $state('');
  let statusFilter = $state('');

  const filteredCharacters = $derived(
    characters.filter((char) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          char.name.toLowerCase().includes(query) ||
          char.description.toLowerCase().includes(query) ||
          char.aliases.some((alias) => alias.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      // Role filter
      if (roleFilter && char.role !== roleFilter) return false;
      // Status filter
      if (statusFilter && char.status !== statusFilter) return false;
      return true;
    })
  );

  const hasActiveFilters = $derived(!!roleFilter || !!statusFilter);

  function clearFilters() {
    roleFilter = '';
    statusFilter = '';
  }

  let showCreateDialog = $state(false);

  let createForm = $state({
    name: '',
    description: '',
    aliases: '',
    role: 'supporting' as Character['role'],
    status: 'active' as Character['status'],
  });

  const roleOptions = [
    { value: 'protagonist', label: 'Protagonist' },
    { value: 'antagonist', label: 'Antagonist' },
    { value: 'major', label: 'Major' },
    { value: 'supporting', label: 'Supporting' },
    { value: 'minor', label: 'Minor' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'deceased', label: 'Deceased' },
    { value: 'absent', label: 'Absent' },
    { value: 'unknown', label: 'Unknown' },
  ];

  function resetCreateForm() {
    createForm = {
      name: '',
      description: '',
      aliases: '',
      role: 'supporting',
      status: 'active',
    };
  }

  function getRoleBadgeVariant(role: Character['role']): 'primary' | 'success' | 'warning' | 'info' | 'default' {
    switch (role) {
      case 'protagonist':
        return 'primary';
      case 'antagonist':
        return 'warning';
      case 'major':
        return 'success';
      case 'supporting':
        return 'info';
      default:
        return 'default';
    }
  }

  function getStatusBadgeVariant(status: Character['status']): 'success' | 'danger' | 'warning' | 'default' {
    switch (status) {
      case 'active':
        return 'success';
      case 'deceased':
        return 'danger';
      case 'absent':
        return 'warning';
      default:
        return 'default';
    }
  }
</script>

<div class="character-tab">
  <div class="tab-toolbar">
    <div class="toolbar-left">
      <span class="count-label">
        {filteredCharacters.length} {filteredCharacters.length === 1 ? 'character' : 'characters'}
        {#if searchQuery || hasActiveFilters}
          (filtered from {characters.length})
        {/if}
      </span>
      <div class="filter-controls">
        <FilterSelect bind:value={roleFilter} options={roleOptions} allLabel="All roles" />
        <FilterSelect bind:value={statusFilter} options={statusOptions} allLabel="All statuses" />
        {#if hasActiveFilters}
          <button class="clear-filters" onclick={clearFilters}>Clear</button>
        {/if}
      </div>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <Plus size={16} />
      New Character
    </Button>
  </div>

  {#if filteredCharacters.length === 0}
    {#if searchQuery || hasActiveFilters}
      <EmptyState
        title="No characters found"
        description="Try adjusting your search query or filters."
      />
    {:else}
      <EmptyState
        title="No characters yet"
        description="Create your first character to start building your story bible."
      >
        {#snippet action()}
          <Button onclick={() => (showCreateDialog = true)}>Create Character</Button>
        {/snippet}
      </EmptyState>
    {/if}
  {:else}
    <div class="character-grid">
      {#each filteredCharacters as character (character.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/character/{character.id}" class="character-link">
            <div class="character-content">
              <div class="character-header">
                <h3 class="character-name">{character.name}</h3>
                <div class="character-badges">
                  <Badge variant={getRoleBadgeVariant(character.role)}>
                    {character.role}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(character.status)}>
                    {character.status}
                  </Badge>
                </div>
              </div>

              {#if character.aliases.length > 0}
                <div class="character-aliases">
                  <span class="aliases-label">Also known as:</span>
                  {character.aliases.join(', ')}
                </div>
              {/if}

              <p class="character-description">
                {character.description.length > 200
                  ? character.description.substring(0, 200) + '...'
                  : character.description}
              </p>

              <div class="character-meta">
                <span class="meta-item">
                  <User size={14} />
                  {character.traits.length} traits
                </span>
                <span class="meta-item">
                  <Users size={14} />
                  {character.relationships.length} relationships
                </span>
                <span class="meta-item">
                  <BookOpen size={14} />
                  {character.appearances.length} appearances
                </span>
              </div>
            </div>
          </a>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<!-- Create Character Dialog -->
<Dialog
  open={showCreateDialog}
  title="Create Character"
  onClose={() => (showCreateDialog = false)}
>
  <form method="POST" action="?/createCharacter" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'redirect') {
        showCreateDialog = false;
        resetCreateForm();
        window.location.href = result.location;
      } else if (result.type === 'failure') {
        console.error('Create character failed:', result.data);
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
        label="Role"
        name="role"
        bind:value={createForm.role}
        options={roleOptions}
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
        hint="Also known as, nicknames, etc."
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
        <Button type="submit">Create Character</Button>
      </div>
    </div>
  </form>
</Dialog>

<style>
  .character-tab {
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

  .character-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--space-4);
  }

  .character-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .character-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .character-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .character-name {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .character-badges {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .character-aliases {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .aliases-label {
    font-style: italic;
    margin-right: var(--space-1);
  }

  .character-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .character-meta {
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
