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
    name: data.event.name,
    description: data.event.description,
    type: data.event.type,
    significance: data.event.significance,
    positionDate: data.event.position.date || '',
    positionStoryTime: data.event.position.storyTime || '',
    positionChapterNumber: data.event.position.chapterNumber?.toString() || '',
    positionApproximate: data.event.position.approximate,
    duration: data.event.duration || '',
    revealed: data.event.revealed,
    involvedCharacters: data.event.involvedCharacters,
    locations: data.event.locations,
  });

  // Dialog states
  let showDeleteConfirm = $state(false);

  const typeOptions = [
    { value: 'backstory', label: 'Backstory' },
    { value: 'current', label: 'Current' },
    { value: 'flashback', label: 'Flashback' },
    { value: 'flashforward', label: 'Flashforward' },
    { value: 'prophecy', label: 'Prophecy' },
  ];

  const significanceOptions = [
    { value: 'critical', label: 'Critical' },
    { value: 'major', label: 'Major' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'minor', label: 'Minor' },
  ];

  function getCharacterName(characterId: string): string {
    const character = data.allCharacters.find((c) => c.id === characterId);
    return character?.name || 'Unknown';
  }

  function getLocationName(locationId: string): string {
    const location = data.allLocations.find((l) => l.id === locationId);
    return location?.name || 'Unknown';
  }

  function getTypeBadgeVariant(type: typeof data.event.type): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (type) {
      case 'current': return 'success';
      case 'backstory': return 'info';
      case 'flashback': return 'warning';
      case 'flashforward':
      case 'prophecy': return 'primary';
      default: return 'default';
    }
  }

  function getSignificanceBadgeVariant(significance: typeof data.event.significance): 'danger' | 'primary' | 'warning' | 'info' | 'default' {
    switch (significance) {
      case 'critical': return 'danger';
      case 'major': return 'primary';
      case 'moderate': return 'warning';
      case 'minor': return 'info';
      default: return 'default';
    }
  }

  function formatTimelinePosition(): string {
    const { position } = data.event;
    if (position.date) return position.date;
    if (position.storyTime) return position.storyTime;
    if (position.chapterNumber) return `Chapter ${position.chapterNumber}`;
    return 'Unknown time';
  }

  function toggleCharacter(characterId: string) {
    if (editForm.involvedCharacters.includes(characterId)) {
      editForm.involvedCharacters = editForm.involvedCharacters.filter(id => id !== characterId);
    } else {
      editForm.involvedCharacters = [...editForm.involvedCharacters, characterId];
    }
  }

  function toggleLocation(locationId: string) {
    if (editForm.locations.includes(locationId)) {
      editForm.locations = editForm.locations.filter(id => id !== locationId);
    } else {
      editForm.locations = [...editForm.locations, locationId];
    }
  }
</script>

<svelte:head>
  <title>{data.event.name} - {data.project.title} - Spine</title>
</svelte:head>

<div class="flex-1 flex flex-col overflow-hidden">
  <header class="flex items-center justify-between p-6 border-b border-border bg-surface">
    <div class="flex flex-col gap-2">
      <a href="/projects/{data.project.id}/bible" class="flex items-center gap-1 text-sm text-text-secondary no-underline transition-colors duration-150 hover:text-primary">
        <ArrowLeft size={20} />
        Back to Bible
      </a>
      <h1 class="text-2xl font-bold m-0">{data.event.name}</h1>
      <div class="flex gap-2">
        <Badge variant={getTypeBadgeVariant(data.event.type)}>
          {data.event.type}
        </Badge>
        <Badge variant={getSignificanceBadgeVariant(data.event.significance)}>
          {data.event.significance}
        </Badge>
        <Badge variant={data.event.revealed ? 'success' : 'warning'}>
          {data.event.revealed ? 'Revealed' : 'Hidden'}
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
              label="Significance"
              name="significance"
              bind:value={editForm.significance}
              options={significanceOptions}
            />

            <TextField
              label="Duration"
              name="duration"
              bind:value={editForm.duration}
              hint="e.g., 3 days, instant, ongoing"
            />

            <TextField
              label="Date (in-world)"
              name="position-date"
              bind:value={editForm.positionDate}
            />

            <TextField
              label="Story Time"
              name="position-storyTime"
              bind:value={editForm.positionStoryTime}
            />

            <TextField
              label="Chapter Number"
              name="position-chapterNumber"
              type="number"
              bind:value={editForm.positionChapterNumber}
            />

            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" bind:checked={editForm.positionApproximate} class="cursor-pointer" />
                Approximate time
              </label>
              <input type="hidden" name="position-approximate" value={editForm.positionApproximate.toString()} />

              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" bind:checked={editForm.revealed} class="cursor-pointer" />
                Revealed in story
              </label>
              <input type="hidden" name="revealed" value={editForm.revealed.toString()} />
            </div>

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
              <div class="flex flex-wrap gap-3 p-3 bg-bg border border-border rounded-md max-h-[200px] overflow-y-auto">
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

            <div class="col-span-2">
              <span class="block text-sm font-medium mb-2 text-text">Locations</span>
              <div class="flex flex-wrap gap-3 p-3 bg-bg border border-border rounded-md max-h-[200px] overflow-y-auto">
                {#each data.allLocations as location}
                  <label class="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.locations.includes(location.id)}
                      onchange={() => toggleLocation(location.id)}
                      class="cursor-pointer"
                    />
                    {location.name}
                  </label>
                {/each}
              </div>
              <input
                type="hidden"
                name="locations"
                value={JSON.stringify(editForm.locations)}
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onclick={() => {
              isEditing = false;
              editForm = {
                name: data.event.name,
                description: data.event.description,
                type: data.event.type,
                significance: data.event.significance,
                positionDate: data.event.position.date || '',
                positionStoryTime: data.event.position.storyTime || '',
                positionChapterNumber: data.event.position.chapterNumber?.toString() || '',
                positionApproximate: data.event.position.approximate,
                duration: data.event.duration || '',
                revealed: data.event.revealed,
                involvedCharacters: data.event.involvedCharacters,
                locations: data.event.locations,
              };
            }}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Card>
    {:else}
      <div class="grid gap-4 max-w-screen-xl">
        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Timeline Position</h2>
          <div class="flex items-center gap-2 text-lg font-medium text-text">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span class="text-primary">{formatTimelinePosition()}</span>
            {#if data.event.position.approximate}
              <Badge size="sm" variant="warning">Approximate</Badge>
            {/if}
          </div>
          {#if data.event.duration}
            <p class="text-sm text-text-secondary mt-2 m-0">Duration: {data.event.duration}</p>
          {/if}
        </Card>

        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Description</h2>
          <p class="text-sm text-text leading-relaxed m-0">{data.event.description}</p>
        </Card>

        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Involved Characters ({data.event.involvedCharacters.length})</h2>
          {#if data.event.involvedCharacters.length === 0}
            <p class="text-text-secondary text-sm m-0">No characters involved.</p>
          {:else}
            <div class="flex flex-wrap gap-2">
              {#each data.event.involvedCharacters as characterId}
                <a href="/projects/{data.project.id}/bible/character/{characterId}" class="px-3 py-2 bg-primary/10 text-primary rounded-full text-sm no-underline transition-colors duration-150 hover:bg-primary hover:text-white">
                  {getCharacterName(characterId)}
                </a>
              {/each}
            </div>
          {/if}
        </Card>

        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Locations ({data.event.locations.length})</h2>
          {#if data.event.locations.length === 0}
            <p class="text-text-secondary text-sm m-0">No locations associated.</p>
          {:else}
            <div class="flex flex-wrap gap-2">
              {#each data.event.locations as locationId}
                <a href="/projects/{data.project.id}/bible/location/{locationId}" class="px-3 py-2 bg-success/10 text-success rounded-full text-sm no-underline transition-colors duration-150 hover:bg-success hover:text-white">
                  {getLocationName(locationId)}
                </a>
              {/each}
            </div>
          {/if}
        </Card>

        {#if data.event.consequences && data.event.consequences.length > 0}
          <Card>
            <h2 class="text-lg font-semibold m-0 mb-4">Consequences</h2>
            <ul class="list-none p-0 m-0 flex flex-col gap-2">
              {#each data.event.consequences as consequence}
                <li class="p-3 bg-bg border border-border rounded-md text-sm">{consequence}</li>
              {/each}
            </ul>
          </Card>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Delete Confirmation -->
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete Timeline Event"
  message="Are you sure you want to delete {data.event.name}? This action cannot be undone."
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
