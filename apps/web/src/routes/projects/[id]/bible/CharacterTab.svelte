<script lang="ts">
  import type { Character } from '@repo/types';
  import { Button, Card, EmptyState, Badge, Dialog, TextField, TextArea, Select } from '$lib/components';
  import { enhance } from '$app/forms';

  interface Props {
    characters: Character[];
    projectId: string;
    searchQuery: string;
  }

  let { characters, projectId, searchQuery }: Props = $props();

  const filteredCharacters = $derived(
    searchQuery
      ? characters.filter(
          (char) =>
            char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            char.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            char.aliases.some((alias) =>
              alias.toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
      : characters
  );

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
    <div class="toolbar-info">
      <span class="count-label">
        {filteredCharacters.length} {filteredCharacters.length === 1 ? 'character' : 'characters'}
        {#if searchQuery}
          (filtered from {characters.length})
        {/if}
      </span>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New Character
    </Button>
  </div>

  {#if filteredCharacters.length === 0}
    {#if searchQuery}
      <EmptyState
        title="No characters found"
        description="Try adjusting your search query."
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  {character.traits.length} traits
                </span>
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {character.relationships.length} relationships
                </span>
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
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
    return async ({ update }) => {
      await update();
      showCreateDialog = false;
      resetCreateForm();
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
    </div>
    {#snippet footer()}
      <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
        Cancel
      </Button>
      <Button type="submit">Create Character</Button>
    {/snippet}
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
  }

  .count-label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
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
</style>
