<script lang="ts">
  import type { PageData } from './$types';
  import type { Trait, Relationship } from '@repo/types';
  import { enhance } from '$app/forms';
  import {
    Button,
    TextField,
    TextArea,
    Select,
    Badge,
    Card,
    Dialog,
    ConfirmDialog,
  } from '$lib/components';

  let { data }: { data: PageData } = $props();

  // Edit state
  let isEditing = $state(false);
  let editForm = $state({
    name: data.character.name,
    description: data.character.description,
    aliases: data.character.aliases.join(', '),
    role: data.character.role,
    status: data.character.status,
    voiceSamples: data.character.voiceSamples.join('\n\n---\n\n'),
  });

  // Dialog states
  let showTraitDialog = $state(false);
  let showRelationshipDialog = $state(false);
  let showDeleteConfirm = $state(false);

  // Trait form
  let traitForm = $state({
    category: 'personality' as Trait['category'],
    name: '',
    description: '',
  });

  // Relationship form
  let relationshipForm = $state({
    targetId: '',
    type: 'friend' as Relationship['type'],
    description: '',
    intensity: 50,
    mutual: true,
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

  const traitCategoryOptions = [
    { value: 'personality', label: 'Personality' },
    { value: 'physical', label: 'Physical' },
    { value: 'skill', label: 'Skill' },
    { value: 'background', label: 'Background' },
    { value: 'quirk', label: 'Quirk' },
  ];

  const relationshipTypeOptions = [
    { value: 'family', label: 'Family' },
    { value: 'friend', label: 'Friend' },
    { value: 'enemy', label: 'Enemy' },
    { value: 'romantic', label: 'Romantic' },
    { value: 'professional', label: 'Professional' },
    { value: 'rival', label: 'Rival' },
    { value: 'mentor', label: 'Mentor' },
    { value: 'other', label: 'Other' },
  ];

  function resetTraitForm() {
    traitForm = {
      category: 'personality',
      name: '',
      description: '',
    };
  }

  function resetRelationshipForm() {
    relationshipForm = {
      targetId: '',
      type: 'friend',
      description: '',
      intensity: 50,
      mutual: true,
    };
  }

  function getRelationshipTargetName(targetId: string): string {
    const target = data.allCharacters.find((c) => c.id === targetId);
    return target?.name || 'Unknown';
  }
</script>

<svelte:head>
  <title>{data.character.name} - {data.project.title} - NovelGen</title>
</svelte:head>

<div class="character-page">
  <header class="page-header">
    <div class="header-left">
      <a href="/projects/{data.project.id}/bible" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Bible
      </a>
      <h1 class="page-title">{data.character.name}</h1>
      <div class="character-badges">
        <Badge variant={data.character.role === 'protagonist' ? 'primary' : 'default'}>
          {data.character.role}
        </Badge>
        <Badge variant={data.character.status === 'active' ? 'success' : 'warning'}>
          {data.character.status}
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
              label="Role"
              name="role"
              bind:value={editForm.role}
              options={roleOptions}
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
              hint="Also known as, nicknames, etc."
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
                label="Voice Samples"
                name="voiceSamples-display"
                bind:value={editForm.voiceSamples}
                rows={8}
                hint="Separate multiple samples with ---"
              />
              <input
                type="hidden"
                name="voiceSamples"
                value={JSON.stringify(editForm.voiceSamples.split('---').map(s => s.trim()).filter(Boolean))}
              />
            </div>
          </div>

          <div class="form-actions">
            <Button type="button" variant="secondary" onclick={() => {
              isEditing = false;
              editForm = {
                name: data.character.name,
                description: data.character.description,
                aliases: data.character.aliases.join(', '),
                role: data.character.role,
                status: data.character.status,
                voiceSamples: data.character.voiceSamples.join('\n\n---\n\n'),
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
              <span class="info-value">{data.character.name}</span>
            </div>
            {#if data.character.aliases.length > 0}
              <div class="info-item">
                <span class="info-label">Also known as</span>
                <span class="info-value">{data.character.aliases.join(', ')}</span>
              </div>
            {/if}
            <div class="info-item full-width">
              <span class="info-label">Description</span>
              <p class="info-value">{data.character.description}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="section-header">
            <h2 class="section-title">Traits ({data.character.traits.length})</h2>
            <Button size="sm" onclick={() => {
              resetTraitForm();
              showTraitDialog = true;
            }}>Add Trait</Button>
          </div>

          {#if data.character.traits.length === 0}
            <p class="empty-message">No traits defined yet.</p>
          {:else}
            <div class="trait-list">
              {#each data.character.traits as trait}
                <div class="trait-item">
                  <div class="trait-header">
                    <Badge size="sm" variant="info">{trait.category}</Badge>
                    <strong>{trait.name}</strong>
                  </div>
                  <p class="trait-description">{trait.description}</p>
                  <form method="POST" action="?/removeTrait" use:enhance>
                    <input type="hidden" name="traitName" value={trait.name} />
                    <Button type="submit" size="sm" variant="danger">Remove</Button>
                  </form>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <Card>
          <div class="section-header">
            <h2 class="section-title">Relationships ({data.character.relationships.length})</h2>
            <Button size="sm" onclick={() => {
              resetRelationshipForm();
              showRelationshipDialog = true;
            }}>Add Relationship</Button>
          </div>

          {#if data.character.relationships.length === 0}
            <p class="empty-message">No relationships defined yet.</p>
          {:else}
            <div class="relationship-list">
              {#each data.character.relationships as rel}
                <div class="relationship-item">
                  <div class="relationship-header">
                    <Badge size="sm">{rel.type}</Badge>
                    <strong>{getRelationshipTargetName(rel.targetId)}</strong>
                    <span class="intensity">Intensity: {rel.intensity}</span>
                  </div>
                  <p class="relationship-description">{rel.description}</p>
                  <div class="relationship-footer">
                    <span class="mutual-indicator">{rel.mutual ? '↔️ Mutual' : '→ One-sided'}</span>
                    <form method="POST" action="?/removeRelationship" use:enhance>
                      <input type="hidden" name="targetId" value={rel.targetId} />
                      <Button type="submit" size="sm" variant="danger">Remove</Button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        {#if data.character.voiceSamples.length > 0}
          <Card>
            <h2 class="section-title">Voice Samples ({data.character.voiceSamples.length})</h2>
            <div class="voice-samples">
              {#each data.character.voiceSamples as sample}
                <blockquote class="voice-sample">
                  {sample}
                </blockquote>
              {/each}
            </div>
          </Card>
        {/if}

        {#if data.character.arc}
          <Card>
            <h2 class="section-title">Character Arc</h2>
            <div class="arc-info">
              <Badge>{data.character.arc.type}</Badge>
              <p><strong>Starting Point:</strong> {data.character.arc.startingPoint}</p>
              <p><strong>Destination:</strong> {data.character.arc.destination}</p>
              <p><strong>Progress:</strong> {data.character.arc.progress}%</p>
            </div>
          </Card>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Add Trait Dialog -->
<Dialog
  open={showTraitDialog}
  title="Add Trait"
  onClose={() => (showTraitDialog = false)}
>
  <form method="POST" action="?/addTrait" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showTraitDialog = false;
      resetTraitForm();
    };
  }}>
    <div class="dialog-form">
      <Select
        label="Category"
        name="category"
        bind:value={traitForm.category}
        options={traitCategoryOptions}
      />
      <TextField
        label="Name"
        name="name"
        bind:value={traitForm.name}
        required
      />
      <TextArea
        label="Description"
        name="description"
        bind:value={traitForm.description}
        rows={4}
        required
      />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showTraitDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Trait</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Add Relationship Dialog -->
<Dialog
  open={showRelationshipDialog}
  title="Add Relationship"
  onClose={() => (showRelationshipDialog = false)}
>
  <form method="POST" action="?/addRelationship" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showRelationshipDialog = false;
      resetRelationshipForm();
    };
  }}>
    <div class="dialog-form">
      <Select
        label="Character"
        name="targetId"
        bind:value={relationshipForm.targetId}
        options={data.allCharacters.map(c => ({ value: c.id, label: c.name }))}
        required
      />
      <Select
        label="Type"
        name="type"
        bind:value={relationshipForm.type}
        options={relationshipTypeOptions}
      />
      <TextArea
        label="Description"
        name="description"
        bind:value={relationshipForm.description}
        rows={4}
        required
      />
      <TextField
        label="Intensity (-100 to 100)"
        name="intensity"
        type="number"
        bind:value={relationshipForm.intensity}
        min="-100"
        max="100"
        required
      />
      <label class="checkbox-label">
        <input type="checkbox" name="mutual" bind:checked={relationshipForm.mutual} />
        Mutual relationship
      </label>

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showRelationshipDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Relationship</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Delete Confirmation -->
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete Character"
  message="Are you sure you want to delete {data.character.name}? This action cannot be undone."
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
  .character-page {
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

  .character-badges {
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

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
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

  .trait-list, .relationship-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .trait-item, .relationship-item {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .trait-header, .relationship-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .trait-description, .relationship-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-2);
  }

  .relationship-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-light);
  }

  .mutual-indicator {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .intensity {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin-left: auto;
  }

  .voice-samples {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .voice-sample {
    padding: var(--space-3);
    margin: 0;
    background-color: var(--color-bg);
    border-left: 3px solid var(--color-primary);
    border-radius: var(--radius-sm);
    font-style: italic;
  }

  .arc-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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

  .dialog-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
    margin-top: var(--space-2);
  }
</style>
