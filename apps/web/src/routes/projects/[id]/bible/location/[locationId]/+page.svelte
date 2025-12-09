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

<div class="location-page">
  <header class="page-header">
    <div class="header-left">
      <a href="/projects/{data.project.id}/bible" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Bible
      </a>
      <h1 class="page-title">{data.location.name}</h1>
      <div class="location-badges">
        <Badge variant={getTypeBadgeVariant(data.location.type)}>
          {data.location.type}
        </Badge>
        <Badge variant={getStatusBadgeVariant(data.location.status)}>
          {data.location.status}
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

          <div class="form-actions">
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
      <div class="detail-grid">
        <Card>
          <h2 class="section-title">Basic Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Name</span>
              <span class="info-value">{data.location.name}</span>
            </div>
            {#if data.location.aliases.length > 0}
              <div class="info-item">
                <span class="info-label">Also known as</span>
                <span class="info-value">{data.location.aliases.join(', ')}</span>
              </div>
            {/if}
            <div class="info-item full-width">
              <span class="info-label">Description</span>
              <p class="info-value">{data.location.description}</p>
            </div>
          </div>
        </Card>

        {#if data.location.features.length > 0}
          <Card>
            <h2 class="section-title">Features ({data.location.features.length})</h2>
            <ul class="feature-list">
              {#each data.location.features as feature}
                <li class="feature-item">{feature}</li>
              {/each}
            </ul>
          </Card>
        {/if}

        {#if data.location.associatedCharacters.length > 0}
          <Card>
            <h2 class="section-title">Associated Characters ({data.location.associatedCharacters.length})</h2>
            <div class="character-chips">
              {#each data.location.associatedCharacters as characterId}
                <a href="/projects/{data.project.id}/bible/character/{characterId}" class="character-chip">
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

<style>
  .location-page {
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

  .location-badges {
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

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .info-item.full-width {
    grid-column: 1 / -1;
  }

  .info-label {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .info-value {
    font-size: var(--text-sm);
    color: var(--color-text);
    margin: 0;
  }

  .feature-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .feature-item {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .character-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .character-chip {
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    text-decoration: none;
    transition: background-color var(--transition-fast);
  }

  .character-chip:hover {
    background-color: var(--color-primary);
    color: white;
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
</style>
