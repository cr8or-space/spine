<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { ArrowLeft } from 'lucide-svelte';
  import {
    Button,
    TextField,
    TextArea,
    Select,
    Badge,
    Card,
    ConfirmDialog,
  } from '$lib/components';

  let { data }: { data: PageData } = $props();

  // Edit state
  let isEditing = $state(false);
  let editForm = $state({
    name: data.plotThread.name,
    description: data.plotThread.description,
    type: data.plotThread.type,
    status: data.plotThread.status,
    scope: data.plotThread.scope,
    priority: data.plotThread.priority,
    involvedCharacters: data.plotThread.involvedCharacters,
  });

  // Dialog states
  let showDeleteConfirm = $state(false);

  const typeOptions = [
    { value: 'main-plot', label: 'Main Plot' },
    { value: 'subplot', label: 'Subplot' },
    { value: 'mystery', label: 'Mystery' },
    { value: 'romance', label: 'Romance' },
    { value: 'character-arc', label: 'Character Arc' },
    { value: 'worldbuilding', label: 'Worldbuilding' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'dormant', label: 'Dormant' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'abandoned', label: 'Abandoned' },
  ];

  const scopeOptions = [
    { value: 'series', label: 'Series' },
    { value: 'book', label: 'Book' },
    { value: 'arc', label: 'Arc' },
    { value: 'chapter', label: 'Chapter' },
  ];

  function getCharacterName(characterId: string): string {
    const character = data.allCharacters.find((c) => c.id === characterId);
    return character?.name || 'Unknown';
  }

  function getTypeBadgeVariant(type: typeof data.plotThread.type): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (type) {
      case 'main-plot': return 'primary';
      case 'subplot': return 'success';
      case 'mystery': return 'info';
      case 'romance': return 'warning';
      case 'character-arc': return 'info';
      default: return 'default';
    }
  }

  function getStatusBadgeVariant(status: typeof data.plotThread.status): 'success' | 'info' | 'warning' | 'default' {
    switch (status) {
      case 'active': return 'success';
      case 'dormant': return 'warning';
      case 'resolved': return 'info';
      default: return 'default';
    }
  }

  function toggleCharacter(characterId: string) {
    if (editForm.involvedCharacters.includes(characterId)) {
      editForm.involvedCharacters = editForm.involvedCharacters.filter(id => id !== characterId);
    } else {
      editForm.involvedCharacters = [...editForm.involvedCharacters, characterId];
    }
  }
</script>

<svelte:head>
  <title>{data.plotThread.name} - {data.project.title} - Spine</title>
</svelte:head>

<div class="flex-1 flex flex-col overflow-hidden">
  <header class="flex items-center justify-between p-6 border-b border-border bg-surface">
    <div class="flex flex-col gap-2">
      <a href="/projects/{data.project.id}/bible" class="flex items-center gap-1 text-sm text-text-secondary no-underline transition-colors duration-150 hover:text-primary">
        <ArrowLeft size={20} />
        Back to Bible
      </a>
      <h1 class="text-2xl font-bold m-0">{data.plotThread.name}</h1>
      <div class="flex gap-2">
        <Badge variant={getTypeBadgeVariant(data.plotThread.type)}>
          {data.plotThread.type}
        </Badge>
        <Badge variant={getStatusBadgeVariant(data.plotThread.status)}>
          {data.plotThread.status}
        </Badge>
        <Badge variant="default">
          {data.plotThread.scope}
        </Badge>
      </div>
    </div>
    <div class="flex gap-2">
      {#if !isEditing}
        <Button variant="secondary" onclick={() => (isEditing = true)}>Edit</Button>
        <Button variant="danger" onclick={() => (showDeleteConfirm = true)}>Delete</Button>
      {/if}
    </div>
  </header>

  <div class="flex-1 overflow-auto p-6 bg-bg">
    {#if isEditing}
      <Card>
        <form method="POST" action="?/update" use:enhance={() => {
          return async ({ update }) => {
            await update();
            isEditing = false;
          };
        }}>
          <div class="grid grid-cols-2 gap-4">
            <TextField
              label="Name"
              name="name"
              bind:value={editForm.name}
              required
            />

            <Select
              label="Type"
              name="type"
              bind:value={editForm.type}
              options={typeOptions}
            />

            <Select
              label="Status"
              name="status"
              bind:value={editForm.status}
              options={statusOptions}
            />

            <Select
              label="Scope"
              name="scope"
              bind:value={editForm.scope}
              options={scopeOptions}
            />

            <TextField
              label="Priority (0-100)"
              name="priority"
              type="number"
              bind:value={editForm.priority}
              min="0"
              max="100"
            />

            <div class="col-span-2">
              <TextArea
                label="Description"
                name="description"
                bind:value={editForm.description}
                rows={6}
                required
              />
            </div>

            <div class="col-span-2">
              <span class="block text-sm font-medium mb-2 text-text">Involved Characters</span>
              <div class="flex flex-wrap gap-3 p-3 bg-bg border border-border rounded-md">
                {#each data.allCharacters as character}
                  <label class="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.involvedCharacters.includes(character.id)}
                      onchange={() => toggleCharacter(character.id)}
                      class="cursor-pointer"
                    />
                    {character.name}
                  </label>
                {/each}
              </div>
              <input
                type="hidden"
                name="involvedCharacters"
                value={JSON.stringify(editForm.involvedCharacters)}
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onclick={() => {
              isEditing = false;
              editForm = {
                name: data.plotThread.name,
                description: data.plotThread.description,
                type: data.plotThread.type,
                status: data.plotThread.status,
                scope: data.plotThread.scope,
                priority: data.plotThread.priority,
                involvedCharacters: data.plotThread.involvedCharacters,
              };
            }}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Card>
    {:else}
      <div class="grid gap-4 max-w-screen-xl">
        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Details</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-text-secondary">Priority</span>
              <span class="text-sm text-text m-0">{data.plotThread.priority}/100</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-text-secondary">Scope</span>
              <span class="text-sm text-text m-0">{data.plotThread.scope}</span>
            </div>
            <div class="flex flex-col gap-1 col-span-2">
              <span class="text-xs font-semibold uppercase text-text-secondary">Description</span>
              <p class="text-sm text-text m-0 leading-relaxed">{data.plotThread.description}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Involved Characters ({data.plotThread.involvedCharacters.length})</h2>
          {#if data.plotThread.involvedCharacters.length === 0}
            <p class="text-text-secondary text-sm m-0">No characters assigned to this thread yet.</p>
          {:else}
            <div class="flex flex-wrap gap-2">
              {#each data.plotThread.involvedCharacters as characterId}
                <a href="/projects/{data.project.id}/bible/character/{characterId}" class="px-3 py-2 bg-primary/10 text-primary rounded-full text-sm no-underline transition-colors duration-150 hover:bg-primary hover:text-white">
                  {getCharacterName(characterId)}
                </a>
              {/each}
            </div>
          {/if}
        </Card>

        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Promises ({data.plotThread.promises.length})</h2>
          {#if data.plotThread.promises.length === 0}
            <p class="text-text-secondary text-sm m-0">No promises tracked yet.</p>
          {:else}
            <div class="flex flex-col gap-3">
              {#each data.plotThread.promises as promise}
                <div class="p-3 bg-bg border border-border rounded-md">
                  <div class="flex items-center gap-2 mb-2">
                    <Badge size="sm" variant={promise.status === 'fulfilled' ? 'success' : promise.status === 'pending' ? 'warning' : 'danger'}>
                      {promise.status}
                    </Badge>
                    <strong>{promise.promise}</strong>
                  </div>
                  {#if promise.payoff}
                    <p class="text-sm text-text-secondary m-0 mb-2">Payoff: {promise.payoff}</p>
                  {/if}
                  {#if promise.madeInChapter}
                    <span class="text-xs text-text-tertiary">Made in Chapter {promise.madeInChapter}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        {#if data.plotThread.relatedThreads && data.plotThread.relatedThreads.length > 0}
          <Card>
            <h2 class="text-lg font-semibold m-0 mb-4">Related Threads</h2>
            <div class="flex flex-col gap-2">
              {#each data.plotThread.relatedThreads as relatedId}
                <a href="/projects/{data.project.id}/bible/plot-thread/{relatedId}" class="text-primary no-underline hover:underline">
                  View Related Thread
                </a>
              {/each}
            </div>
          </Card>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Delete Confirmation -->
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete Plot Thread"
  message="Are you sure you want to delete {data.plotThread.name}? This action cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  onConfirm={() => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '?/delete';
    document.body.appendChild(form);
    form.submit();
  }}
  onCancel={() => (showDeleteConfirm = false)}
/>
