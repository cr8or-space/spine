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
    name: data.location.name,
    description: data.location.description,
    aliases: data.location.aliases.join(', '),
    type: data.location.type,
    status: data.location.status,
    features: data.location.features.join('\n'),
    associatedCharacters: data.location.associatedCharacters,
  });

  // Dialog states
  let showDeleteConfirm = $state(false);

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

  function getTypeBadgeVariant(type: typeof data.location.type): 'primary' | 'success' | 'warning' | 'info' | 'default' {
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

  function getStatusBadgeVariant(status: typeof data.location.status): 'success' | 'danger' | 'warning' | 'info' | 'default' {
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

  function getCharacterName(characterId: string): string {
    const character = data.allCharacters.find((c) => c.id === characterId);
    return character?.name || 'Unknown';
  }
</script>

<svelte:head>
  <title>{data.location.name} - {data.project.title} - Spine</title>
</svelte:head>

<div class="flex-1 flex flex-col overflow-hidden">
  <header class="flex items-center justify-between p-6 border-b border-border bg-surface">
    <div class="flex flex-col gap-2">
      <a href="/projects/{data.project.id}/bible" class="flex items-center gap-1 text-sm text-text-secondary no-underline transition-colors duration-150 hover:text-primary">
        <ArrowLeft size={20} />
        Back to Bible
      </a>
      <h1 class="text-2xl font-bold m-0">{data.location.name}</h1>
      <div class="flex gap-2">
        <Badge variant={getTypeBadgeVariant(data.location.type)}>
          {data.location.type}
        </Badge>
        <Badge variant={getStatusBadgeVariant(data.location.status)}>
          {data.location.status}
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

            <TextField
              label="Aliases (comma-separated)"
              name="aliases-display"
              bind:value={editForm.aliases}
              hint="Also known as, alternative names, etc."
            />

            <input
              type="hidden"
              name="aliases"
              value={JSON.stringify(editForm.aliases.split(',').map(a => a.trim()).filter(Boolean))}
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
              <TextArea
                label="Features (one per line)"
                name="features-display"
                bind:value={editForm.features}
                rows={6}
                hint="Notable characteristics, landmarks, or points of interest"
              />
              <input
                type="hidden"
                name="features"
                value={JSON.stringify(editForm.features.split('\n').map(s => s.trim()).filter(Boolean))}
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onclick={() => {
              isEditing = false;
              editForm = {
                name: data.location.name,
                description: data.location.description,
                aliases: data.location.aliases.join(', '),
                type: data.location.type,
                status: data.location.status,
                features: data.location.features.join('\n'),
                associatedCharacters: data.location.associatedCharacters,
              };
            }}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Card>
    {:else}
      <div class="grid gap-4 max-w-screen-xl">
        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Basic Information</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-text-secondary">Name</span>
              <span class="text-sm text-text m-0">{data.location.name}</span>
            </div>
            {#if data.location.aliases.length > 0}
              <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-text-secondary">Also known as</span>
                <span class="text-sm text-text m-0">{data.location.aliases.join(', ')}</span>
              </div>
            {/if}
            <div class="flex flex-col gap-1 col-span-2">
              <span class="text-xs font-semibold uppercase text-text-secondary">Description</span>
              <p class="text-sm text-text m-0">{data.location.description}</p>
            </div>
          </div>
        </Card>

        {#if data.location.features.length > 0}
          <Card>
            <h2 class="text-lg font-semibold m-0 mb-4">Features ({data.location.features.length})</h2>
            <ul class="list-none p-0 m-0 flex flex-col gap-2">
              {#each data.location.features as feature}
                <li class="p-3 bg-bg border border-border rounded-md text-sm">{feature}</li>
              {/each}
            </ul>
          </Card>
        {/if}

        {#if data.location.associatedCharacters.length > 0}
          <Card>
            <h2 class="text-lg font-semibold m-0 mb-4">Associated Characters ({data.location.associatedCharacters.length})</h2>
            <div class="flex flex-wrap gap-2">
              {#each data.location.associatedCharacters as characterId}
                <a href="/projects/{data.project.id}/bible/character/{characterId}" class="px-3 py-2 bg-primary/10 text-primary rounded-full text-sm no-underline transition-colors duration-150 hover:bg-primary hover:text-white">
                  {getCharacterName(characterId)}
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
  title="Delete Location"
  message="Are you sure you want to delete {data.location.name}? This action cannot be undone."
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
