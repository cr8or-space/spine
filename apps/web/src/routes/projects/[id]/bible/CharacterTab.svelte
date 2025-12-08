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

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between gap-4 flex-wrap">
    <div class="flex items-center gap-4 flex-wrap">
      <span class="text-sm text-text-secondary">
        {filteredCharacters.length} {filteredCharacters.length === 1 ? 'character' : 'characters'}
        {#if searchQuery || hasActiveFilters}
          (filtered from {characters.length})
        {/if}
      </span>
      <div class="flex items-center gap-2">
        <FilterSelect bind:value={roleFilter} options={roleOptions} allLabel="All roles" />
        <FilterSelect bind:value={statusFilter} options={statusOptions} allLabel="All statuses" />
        {#if hasActiveFilters}
          <button class="px-2 py-1 font-inherit text-xs text-text-secondary bg-transparent border-none cursor-pointer underline hover:text-text" onclick={clearFilters}>Clear</button>
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
    <div class="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4">
      {#each filteredCharacters as character (character.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/character/{character.id}" class="block no-underline text-inherit">
            <div class="p-4 flex flex-col gap-3">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-lg font-semibold m-0 text-text">{character.name}</h3>
                <div class="flex gap-2 shrink-0">
                  <Badge variant={getRoleBadgeVariant(character.role)}>
                    {character.role}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(character.status)}>
                    {character.status}
                  </Badge>
                </div>
              </div>

              {#if character.aliases.length > 0}
                <div class="text-sm text-text-secondary">
                  <span class="italic mr-1">Also known as:</span>
                  {character.aliases.join(', ')}
                </div>
              {/if}

              <p class="text-sm text-text-secondary leading-normal m-0">
                {character.description.length > 200
                  ? character.description.substring(0, 200) + '...'
                  : character.description}
              </p>

              <div class="flex flex-wrap gap-4 text-xs text-text-tertiary pt-2 border-t border-border-light">
                <span class="flex items-center gap-1">
                  <User size={14} />
                  {character.traits.length} traits
                </span>
                <span class="flex items-center gap-1">
                  <Users size={14} />
                  {character.relationships.length} relationships
                </span>
                <span class="flex items-center gap-1">
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
    <div class="flex flex-col gap-4">
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

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
        <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Create Character</Button>
      </div>
    </div>
  </form>
</Dialog>

