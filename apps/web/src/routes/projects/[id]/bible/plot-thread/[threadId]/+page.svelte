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

<div class="plot-thread-page">
  <header class="page-header">
    <div class="header-left">
      <a href="/projects/{data.project.id}/bible" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Bible
      </a>
      <h1 class="page-title">{data.plotThread.name}</h1>
      <div class="thread-badges">
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
              <div class="character-selection">
                {#each data.allCharacters as character}
                  <label class="character-checkbox">
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
          </div>

          <div class="form-actions">
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
      <div class="detail-grid">
        <Card>
          <h2 class="section-title">Details</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Priority</span>
              <span class="info-value">{data.plotThread.priority}/100</span>
            </div>
            <div class="info-item">
              <span class="info-label">Scope</span>
              <span class="info-value">{data.plotThread.scope}</span>
            </div>
            <div class="info-item full-width">
              <span class="info-label">Description</span>
              <p class="info-value">{data.plotThread.description}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 class="section-title">Involved Characters ({data.plotThread.involvedCharacters.length})</h2>
          {#if data.plotThread.involvedCharacters.length === 0}
            <p class="empty-message">No characters assigned to this thread yet.</p>
          {:else}
            <div class="character-chips">
              {#each data.plotThread.involvedCharacters as characterId}
                <a href="/projects/{data.project.id}/bible/character/{characterId}" class="character-chip">
                  {getCharacterName(characterId)}
                </a>
              {/each}
            </div>
          {/if}
        </Card>

        <Card>
          <h2 class="section-title">Promises ({data.plotThread.promises.length})</h2>
          {#if data.plotThread.promises.length === 0}
            <p class="empty-message">No promises tracked yet.</p>
          {:else}
            <div class="promise-list">
              {#each data.plotThread.promises as promise}
                <div class="promise-item">
                  <div class="promise-header">
                    <Badge size="sm" variant={promise.status === 'fulfilled' ? 'success' : promise.status === 'pending' ? 'warning' : 'danger'}>
                      {promise.status}
                    </Badge>
                    <strong>{promise.promise}</strong>
                  </div>
                  {#if promise.payoff}
                    <p class="promise-payoff">Payoff: {promise.payoff}</p>
                  {/if}
                  {#if promise.madeInChapter}
                    <span class="promise-chapter">Made in Chapter {promise.madeInChapter}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        {#if data.plotThread.relatedThreads && data.plotThread.relatedThreads.length > 0}
          <Card>
            <h2 class="section-title">Related Threads</h2>
            <div class="related-list">
              {#each data.plotThread.relatedThreads as relatedId}
                <a href="/projects/{data.project.id}/bible/plot-thread/{relatedId}" class="related-link">
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

<style>
  .plot-thread-page {
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

  .thread-badges {
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
    line-height: 1.6;
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

  .promise-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .promise-item {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .promise-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .promise-payoff {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-2);
  }

  .promise-chapter {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }

  .related-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .related-link {
    color: var(--color-primary);
    text-decoration: none;
  }

  .related-link:hover {
    text-decoration: underline;
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

  .character-selection {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .character-checkbox {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .character-checkbox input[type="checkbox"] {
    cursor: pointer;
  }
</style>
