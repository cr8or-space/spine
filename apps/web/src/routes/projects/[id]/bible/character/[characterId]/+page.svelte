<script lang="ts">
  import type { PageData } from './$types';
  import type { Trait, Relationship } from '@repo/types';
  import { enhance } from '$app/forms';
  import { ArrowLeft } from 'lucide-svelte';
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
    name: '',
    description: '',
    aliases: '',
    role: '' as 'protagonist' | 'antagonist' | 'major' | 'supporting' | 'minor',
    status: '' as 'active' | 'deceased' | 'absent' | 'unknown',
    voiceSamples: '',
  });

  // Sync form with data when it changes
  $effect(() => {
    editForm = {
      name: data.character.name,
      description: data.character.description,
      aliases: data.character.aliases.join(', '),
      role: data.character.role,
      status: data.character.status,
      voiceSamples: data.character.voiceSamples.join('\n\n---\n\n'),
    };
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
  <title>{data.character.name} - {data.project.title} - Spine</title>
</svelte:head>

<div class="flex-1 flex flex-col overflow-hidden">
  <header class="flex items-center justify-between p-6 border-b border-border bg-surface">
    <div class="flex flex-col gap-2">
      <a href="/projects/{data.project.id}/bible" class="flex items-center gap-1 text-sm text-text-secondary no-underline transition-colors duration-150 hover:text-primary">
        <ArrowLeft size={20} />
        Back to Bible
      </a>
      <h1 class="text-2xl font-bold m-0">{data.character.name}</h1>
      <div class="flex gap-2">
        <Badge variant={data.character.role === 'protagonist' ? 'primary' : 'default'}>
          {data.character.role}
        </Badge>
        <Badge variant={data.character.status === 'active' ? 'success' : 'warning'}>
          {data.character.status}
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

          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
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
      <div class="grid gap-4 max-w-screen-xl">
        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Basic Information</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-text-secondary">Name</span>
              <span class="text-sm text-text m-0">{data.character.name}</span>
            </div>
            {#if data.character.aliases.length > 0}
              <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-text-secondary">Also known as</span>
                <span class="text-sm text-text m-0">{data.character.aliases.join(', ')}</span>
              </div>
            {/if}
            <div class="flex flex-col gap-1 col-span-2">
              <span class="text-xs font-semibold uppercase text-text-secondary">Description</span>
              <p class="text-sm text-text m-0">{data.character.description}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold m-0">Traits ({data.character.traits.length})</h2>
            <Button size="sm" onclick={() => {
              resetTraitForm();
              showTraitDialog = true;
            }}>Add Trait</Button>
          </div>

          {#if data.character.traits.length === 0}
            <p class="text-text-secondary text-sm m-0">No traits defined yet.</p>
          {:else}
            <div class="flex flex-col gap-3">
              {#each data.character.traits as trait}
                <div class="p-3 bg-bg border border-border rounded-md">
                  <div class="flex items-center gap-2 mb-2">
                    <Badge size="sm" variant="info">{trait.category}</Badge>
                    <strong>{trait.name}</strong>
                  </div>
                  <p class="text-sm text-text-secondary m-0 mb-2">{trait.description}</p>
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
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold m-0">Relationships ({data.character.relationships.length})</h2>
            <Button size="sm" onclick={() => {
              resetRelationshipForm();
              showRelationshipDialog = true;
            }}>Add Relationship</Button>
          </div>

          {#if data.character.relationships.length === 0}
            <p class="text-text-secondary text-sm m-0">No relationships defined yet.</p>
          {:else}
            <div class="flex flex-col gap-3">
              {#each data.character.relationships as rel}
                <div class="p-3 bg-bg border border-border rounded-md">
                  <div class="flex items-center gap-2 mb-2">
                    <Badge size="sm">{rel.type}</Badge>
                    <strong>{getRelationshipTargetName(rel.targetId)}</strong>
                    <span class="text-xs text-text-secondary ml-auto">Intensity: {rel.intensity}</span>
                  </div>
                  <p class="text-sm text-text-secondary m-0 mb-2">{rel.description}</p>
                  <div class="flex items-center justify-between mt-2 pt-2 border-t border-border-light">
                    <span class="text-xs text-text-secondary">{rel.mutual ? '↔️ Mutual' : '→ One-sided'}</span>
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
            <h2 class="text-lg font-semibold m-0 mb-4">Voice Samples ({data.character.voiceSamples.length})</h2>
            <div class="flex flex-col gap-3">
              {#each data.character.voiceSamples as sample}
                <blockquote class="p-3 m-0 bg-bg border-l-[3px] border-l-primary rounded-sm italic">
                  {sample}
                </blockquote>
              {/each}
            </div>
          </Card>
        {/if}

        {#if data.character.arc}
          <Card>
            <h2 class="text-lg font-semibold m-0 mb-4">Character Arc</h2>
            <div class="flex flex-col gap-2">
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
    <div class="flex flex-col gap-4">
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

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
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
    <div class="flex flex-col gap-4">
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
      <label class="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" name="mutual" bind:checked={relationshipForm.mutual} class="cursor-pointer" />
        Mutual relationship
      </label>

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
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
