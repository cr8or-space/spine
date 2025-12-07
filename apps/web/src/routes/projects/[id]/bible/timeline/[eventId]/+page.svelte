<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
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
  <title>{data.event.name} - {data.project.title} - NovelGen</title>
</svelte:head>

<div class="timeline-event-page">
  <header class="page-header">
    <div class="header-left">
      <a href="/projects/{data.project.id}/bible" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Bible
      </a>
      <h1 class="page-title">{data.event.name}</h1>
      <div class="event-badges">
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
    <div class="header-actions">
      {#if !isEditing}
        <Button variant="secondary" onclick={() => (isEditing = true)}>Edit</Button>
        <Button variant="danger" onclick={() => (showDeleteConfirm = true)}>Delete</Button>
      {/if}
    </div>
  </header>

  <div class="page-content">
    {#if isEditing}
      <Card>
        <form method="POST" action="?/update" use:enhance={() => {
          return async ({ update }) => {
            await update();
            isEditing = false;
          };
        }}>
          <div class="form-grid">
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

            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={editForm.positionApproximate} />
                Approximate time
              </label>
              <input type="hidden" name="position-approximate" value={editForm.positionApproximate.toString()} />

              <label class="checkbox-label">
                <input type="checkbox" bind:checked={editForm.revealed} />
                Revealed in story
              </label>
              <input type="hidden" name="revealed" value={editForm.revealed.toString()} />
            </div>

            <div class="form-full-width">
              <TextArea
                label="Description"
                name="description"
                bind:value={editForm.description}
                rows={6}
                required
              />
            </div>

            <div class="form-full-width">
              <span class="field-label">Involved Characters</span>
              <div class="selection-grid">
                {#each data.allCharacters as character}
                  <label class="selection-checkbox">
                    <input
                      type="checkbox"
                      checked={editForm.involvedCharacters.includes(character.id)}
                      onchange={() => toggleCharacter(character.id)}
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

            <div class="form-full-width">
              <span class="field-label">Locations</span>
              <div class="selection-grid">
                {#each data.allLocations as location}
                  <label class="selection-checkbox">
                    <input
                      type="checkbox"
                      checked={editForm.locations.includes(location.id)}
                      onchange={() => toggleLocation(location.id)}
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

          <div class="form-actions">
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
      <div class="detail-grid">
        <Card>
          <h2 class="section-title">Timeline Position</h2>
          <div class="time-display">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span class="time-value">{formatTimelinePosition()}</span>
            {#if data.event.position.approximate}
              <Badge size="sm" variant="warning">Approximate</Badge>
            {/if}
          </div>
          {#if data.event.duration}
            <p class="duration">Duration: {data.event.duration}</p>
          {/if}
        </Card>

        <Card>
          <h2 class="section-title">Description</h2>
          <p class="description">{data.event.description}</p>
        </Card>

        <Card>
          <h2 class="section-title">Involved Characters ({data.event.involvedCharacters.length})</h2>
          {#if data.event.involvedCharacters.length === 0}
            <p class="empty-message">No characters involved.</p>
          {:else}
            <div class="entity-chips">
              {#each data.event.involvedCharacters as characterId}
                <a href="/projects/{data.project.id}/bible/character/{characterId}" class="entity-chip">
                  {getCharacterName(characterId)}
                </a>
              {/each}
            </div>
          {/if}
        </Card>

        <Card>
          <h2 class="section-title">Locations ({data.event.locations.length})</h2>
          {#if data.event.locations.length === 0}
            <p class="empty-message">No locations associated.</p>
          {:else}
            <div class="entity-chips">
              {#each data.event.locations as locationId}
                <a href="/projects/{data.project.id}/bible/location/{locationId}" class="entity-chip location-chip">
                  {getLocationName(locationId)}
                </a>
              {/each}
            </div>
          {/if}
        </Card>

        {#if data.event.consequences && data.event.consequences.length > 0}
          <Card>
            <h2 class="section-title">Consequences</h2>
            <ul class="consequence-list">
              {#each data.event.consequences as consequence}
                <li class="consequence-item">{consequence}</li>
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

<style>
  .timeline-event-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-surface);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  .back-link:hover {
    color: var(--color-primary);
  }

  .page-title {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin: 0;
  }

  .event-badges {
    display: flex;
    gap: var(--space-2);
  }

  .header-actions {
    display: flex;
    gap: var(--space-2);
  }

  .page-content {
    flex: 1;
    overflow: auto;
    padding: var(--space-6);
    background-color: var(--color-bg);
  }

  .detail-grid {
    display: grid;
    gap: var(--space-4);
    max-width: 1200px;
  }

  .section-title {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0 0 var(--space-4);
  }

  .time-display {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-lg);
    font-weight: 500;
    color: var(--color-text);
  }

  .time-value {
    color: var(--color-primary);
  }

  .duration {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: var(--space-2) 0 0;
  }

  .description {
    font-size: var(--text-sm);
    color: var(--color-text);
    line-height: 1.6;
    margin: 0;
  }

  .entity-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .entity-chip {
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    text-decoration: none;
    transition: background-color var(--transition-fast);
  }

  .entity-chip:hover {
    background-color: var(--color-primary);
    color: white;
  }

  .location-chip {
    background-color: var(--color-success-light);
    color: var(--color-success);
  }

  .location-chip:hover {
    background-color: var(--color-success);
    color: white;
  }

  .consequence-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .consequence-item {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .empty-message {
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    margin: 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .form-full-width {
    grid-column: 1 / -1;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .field-label {
    display: block;
    font-size: var(--text-sm);
    font-weight: 500;
    margin-bottom: var(--space-2);
    color: var(--color-text);
  }

  .selection-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    max-height: 200px;
    overflow-y: auto;
  }

  .selection-checkbox {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .selection-checkbox input[type="checkbox"] {
    cursor: pointer;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
