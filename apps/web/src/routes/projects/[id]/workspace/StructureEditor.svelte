<script lang="ts">
  import type { Structure } from '@repo/types';
  import { Button, Card, TextField, TextArea, Select, Badge } from '$lib/components';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { Check, X } from 'lucide-svelte';

  interface Props {
    structure: Structure;
  }

  let { structure }: Props = $props();

  let isEditing = $state(false);
  let editForm = $state({
    title: structure.title,
    summary: structure.summary,
    chapterType: structure.chapterType || '',
    tensionTarget: structure.tensionTarget?.toString() || '',
    targetWordCount: structure.targetWordCount?.toString() || '',
    notes: structure.notes || '',
  });

  let newBeatDescription = $state('');
  let newBeatWordCount = $state('');

  let hookForm = $state({
    type: structure.hook?.type || '',
    description: structure.hook?.description || '',
    targetStrength: structure.hook?.targetStrength?.toString() || '',
  });

  // Reset forms when structure changes
  $effect(() => {
    editForm = {
      title: structure.title,
      summary: structure.summary,
      chapterType: structure.chapterType || '',
      tensionTarget: structure.tensionTarget?.toString() || '',
      targetWordCount: structure.targetWordCount?.toString() || '',
      notes: structure.notes || '',
    };
    hookForm = {
      type: structure.hook?.type || '',
      description: structure.hook?.description || '',
      targetStrength: structure.hook?.targetStrength?.toString() || '',
    };
  });

  const chapterTypeOptions = [
    { value: '', label: 'No type' },
    { value: 'action', label: 'Action' },
    { value: 'character', label: 'Character' },
    { value: 'worldbuilding', label: 'Worldbuilding' },
    { value: 'dialogue', label: 'Dialogue' },
    { value: 'introspection', label: 'Introspection' },
    { value: 'transition', label: 'Transition' },
    { value: 'climax', label: 'Climax' },
    { value: 'resolution', label: 'Resolution' },
  ];

  const hookTypeOptions = [
    { value: '', label: 'No hook' },
    { value: 'revelation', label: 'Revelation' },
    { value: 'decision', label: 'Decision' },
    { value: 'cliffhanger', label: 'Cliffhanger' },
    { value: 'emotional', label: 'Emotional' },
    { value: 'question', label: 'Question' },
    { value: 'twist', label: 'Twist' },
    { value: 'promise', label: 'Promise' },
  ];

  const sortedBeats = $derived(
    [...structure.beats].sort((a, b) => a.order - b.order)
  );

  function handleFormSuccess() {
    isEditing = false;
    invalidateAll();
  }
</script>

<Card>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <header class="flex items-center justify-between gap-2">
      <h3 class="m-0 text-base font-semibold">Structure Details</h3>
      {#if !isEditing}
        <Button variant="ghost" size="sm" onclick={() => (isEditing = true)}>Edit</Button>
      {/if}
    </header>

    {#if isEditing}
      <!-- Edit Form -->
      <form method="POST" action="?/updateStructure" use:enhance={() => {
        return async ({ result }) => {
          if (result.type === 'success') {
            handleFormSuccess();
          }
        };
      }}>
        <input type="hidden" name="structureId" value={structure.id} />

        <div class="flex flex-col gap-4">
          <TextField
            label="Title"
            name="title"
            bind:value={editForm.title}
            required
          />

          <TextArea
            label="Summary"
            name="summary"
            bind:value={editForm.summary}
            rows={3}
          />

          {#if structure.type === 'chapter'}
            <Select
              label="Chapter Type"
              name="chapterType"
              bind:value={editForm.chapterType}
              options={chapterTypeOptions}
            />
          {/if}

          <div class="grid grid-cols-2 gap-4">
            <TextField
              label="Tension Target (0-100)"
              name="tensionTarget"
              bind:value={editForm.tensionTarget}
              type="number"
              hint="Expected tension level"
            />

            <TextField
              label="Target Word Count"
              name="targetWordCount"
              bind:value={editForm.targetWordCount}
              type="number"
            />
          </div>

          <TextArea
            label="Notes"
            name="notes"
            bind:value={editForm.notes}
            rows={2}
            hint="Author notes (not included in generation)"
          />
        </div>

        <div class="mt-2 flex justify-end gap-3 border-t border-border pt-3">
          <Button type="button" variant="secondary" onclick={() => (isEditing = false)}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    {:else}
      <!-- Display Mode -->
      <div class="flex flex-col gap-3">
        {#if structure.summary}
          <p class="m-0 text-sm leading-relaxed text-text-secondary">{structure.summary}</p>
        {:else}
          <p class="m-0 text-sm italic text-text-tertiary">No summary</p>
        {/if}

        <div class="flex flex-wrap gap-2">
          {#if structure.chapterType}
            <Badge>{structure.chapterType}</Badge>
          {/if}
          {#if structure.tensionTarget !== undefined}
            <Badge variant="warning">Tension: {structure.tensionTarget}</Badge>
          {/if}
          {#if structure.targetWordCount}
            <Badge variant="info">{structure.targetWordCount} words</Badge>
          {/if}
        </div>

        {#if structure.notes}
          <div class="rounded-sm bg-bg p-3">
            <span class="text-xs font-medium uppercase tracking-wide text-text-tertiary">Notes:</span>
            <p class="m-0 mt-1 text-sm leading-relaxed text-text-secondary">{structure.notes}</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Card>

<!-- Beats Section -->
<Card>
  <div class="flex flex-col gap-4">
    <header class="flex items-center justify-between gap-2">
      <h3 class="m-0 text-base font-semibold">Story Beats</h3>
      <span class="text-sm text-text-secondary">
        {sortedBeats.filter(b => b.completed).length}/{sortedBeats.length} completed
      </span>
    </header>

    {#if sortedBeats.length > 0}
      <ul class="m-0 flex list-none flex-col gap-2 p-0">
        {#each sortedBeats as beat (beat.id)}
          <li class="group flex items-center gap-2 rounded-sm bg-bg p-2 text-sm">
            <form method="POST" action="?/toggleBeatCompleted" use:enhance={() => {
              return async () => invalidateAll();
            }}>
              <input type="hidden" name="structureId" value={structure.id} />
              <input type="hidden" name="beatId" value={beat.id} />
              <input type="hidden" name="completed" value={(!beat.completed).toString()} />
              <button type="submit" class="flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-sm border-2 p-0 {beat.completed ? 'border-primary bg-primary text-white' : 'border-border bg-transparent text-primary'}" aria-label={beat.completed ? 'Mark as incomplete' : 'Mark as complete'}>
                {#if beat.completed}
                  <Check size={14} />
                {/if}
              </button>
            </form>

            <span class="flex-1 {beat.completed ? 'text-text-tertiary line-through' : ''}">{beat.description}</span>

            {#if beat.targetWordCount}
              <span class="shrink-0 text-xs text-text-tertiary">~{beat.targetWordCount}w</span>
            {/if}

            <form method="POST" action="?/removeBeat" use:enhance={() => {
              return async () => invalidateAll();
            }}>
              <input type="hidden" name="structureId" value={structure.id} />
              <input type="hidden" name="beatId" value={beat.id} />
              <button type="submit" class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-text-tertiary opacity-0 transition-opacity duration-150 hover:bg-danger-light hover:text-danger group-hover:opacity-100" aria-label="Remove beat">
                <X size={14} />
              </button>
            </form>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="m-0 rounded-sm bg-bg p-3 text-center text-sm italic text-text-tertiary">No beats defined yet</p>
    {/if}

    <!-- Add Beat Form -->
    <form method="POST" action="?/addBeat" class="border-t border-border pt-3" use:enhance={() => {
      return async ({ result }) => {
        if (result.type === 'success') {
          newBeatDescription = '';
          newBeatWordCount = '';
          invalidateAll();
        }
      };
    }}>
      <input type="hidden" name="structureId" value={structure.id} />

      <div class="flex gap-2">
        <input
          type="text"
          name="description"
          bind:value={newBeatDescription}
          placeholder="Add a beat..."
          class="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-sans text-sm focus:border-primary focus:outline-none"
          required
        />
        <input
          type="number"
          name="targetWordCount"
          bind:value={newBeatWordCount}
          placeholder="Words"
          class="w-20 rounded-md border border-border bg-surface px-3 py-2 font-sans text-sm focus:border-primary focus:outline-none"
        />
        <Button type="submit" size="sm">Add</Button>
      </div>
    </form>
  </div>
</Card>

<!-- Hook Section (for chapters) -->
{#if structure.type === 'chapter'}
  <Card>
    <div class="flex flex-col gap-4">
      <header class="flex items-center justify-between gap-2">
        <h3 class="m-0 text-base font-semibold">Chapter Hook</h3>
        {#if structure.hook}
          <Badge variant="success">Defined</Badge>
        {/if}
      </header>

      <form method="POST" action="?/setHook" use:enhance={() => {
        return async () => invalidateAll();
      }}>
        <input type="hidden" name="structureId" value={structure.id} />

        <div class="flex flex-col gap-4">
          <Select
            label="Hook Type"
            name="hookType"
            bind:value={hookForm.type}
            options={hookTypeOptions}
          />

          {#if hookForm.type}
            <TextArea
              label="Hook Description"
              name="hookDescription"
              bind:value={hookForm.description}
              rows={2}
              hint="What happens at the end of this chapter?"
            />

            <TextField
              label="Target Strength (0-100)"
              name="hookTargetStrength"
              bind:value={hookForm.targetStrength}
              type="number"
              hint="How strong should this hook be?"
            />
          {/if}
        </div>

        <div class="mt-2 flex justify-end gap-3 border-t border-border pt-3">
          <Button type="submit" size="sm">Save Hook</Button>
        </div>
      </form>
    </div>
  </Card>
{/if}
