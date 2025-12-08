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
  <div class="structure-editor">
    <!-- Header -->
    <header class="editor-section-header">
      <h3 class="section-title">Structure Details</h3>
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

        <div class="form-grid">
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

          <div class="form-row">
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

        <div class="form-actions">
          <Button type="button" variant="secondary" onclick={() => (isEditing = false)}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    {:else}
      <!-- Display Mode -->
      <div class="structure-details">
        {#if structure.summary}
          <p class="detail-text">{structure.summary}</p>
        {:else}
          <p class="detail-text empty">No summary</p>
        {/if}

        <div class="detail-badges">
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
          <div class="notes-section">
            <span class="notes-label">Notes:</span>
            <p class="notes-text">{structure.notes}</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Card>

<!-- Beats Section -->
<Card>
  <div class="beats-editor">
    <header class="editor-section-header">
      <h3 class="section-title">Story Beats</h3>
      <span class="beat-count">
        {sortedBeats.filter(b => b.completed).length}/{sortedBeats.length} completed
      </span>
    </header>

    {#if sortedBeats.length > 0}
      <ul class="beats-list">
        {#each sortedBeats as beat (beat.id)}
          <li class="beat-item" class:completed={beat.completed}>
            <form method="POST" action="?/toggleBeatCompleted" use:enhance={() => {
              return async () => invalidateAll();
            }}>
              <input type="hidden" name="structureId" value={structure.id} />
              <input type="hidden" name="beatId" value={beat.id} />
              <input type="hidden" name="completed" value={(!beat.completed).toString()} />
              <button type="submit" class="beat-checkbox" aria-label={beat.completed ? 'Mark as incomplete' : 'Mark as complete'}>
                {#if beat.completed}
                  <Check size={14} />
                {/if}
              </button>
            </form>

            <span class="beat-description">{beat.description}</span>

            {#if beat.targetWordCount}
              <span class="beat-word-count">~{beat.targetWordCount}w</span>
            {/if}

            <form method="POST" action="?/removeBeat" use:enhance={() => {
              return async () => invalidateAll();
            }}>
              <input type="hidden" name="structureId" value={structure.id} />
              <input type="hidden" name="beatId" value={beat.id} />
              <button type="submit" class="beat-remove" aria-label="Remove beat">
                <X size={14} />
              </button>
            </form>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="no-beats">No beats defined yet</p>
    {/if}

    <!-- Add Beat Form -->
    <form method="POST" action="?/addBeat" class="add-beat-form" use:enhance={() => {
      return async ({ result }) => {
        if (result.type === 'success') {
          newBeatDescription = '';
          newBeatWordCount = '';
          invalidateAll();
        }
      };
    }}>
      <input type="hidden" name="structureId" value={structure.id} />

      <div class="add-beat-inputs">
        <input
          type="text"
          name="description"
          bind:value={newBeatDescription}
          placeholder="Add a beat..."
          class="beat-input"
          required
        />
        <input
          type="number"
          name="targetWordCount"
          bind:value={newBeatWordCount}
          placeholder="Words"
          class="beat-word-input"
        />
        <Button type="submit" size="sm">Add</Button>
      </div>
    </form>
  </div>
</Card>

<!-- Hook Section (for chapters) -->
{#if structure.type === 'chapter'}
  <Card>
    <div class="hook-editor">
      <header class="editor-section-header">
        <h3 class="section-title">Chapter Hook</h3>
        {#if structure.hook}
          <Badge variant="success">Defined</Badge>
        {/if}
      </header>

      <form method="POST" action="?/setHook" use:enhance={() => {
        return async () => invalidateAll();
      }}>
        <input type="hidden" name="structureId" value={structure.id} />

        <div class="form-grid">
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

        <div class="form-actions">
          <Button type="submit" size="sm">Save Hook</Button>
        </div>
      </form>
    </div>
  </Card>
{/if}

<style>
  .structure-editor,
  .beats-editor,
  .hook-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .editor-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .section-title {
    font-size: var(--text-base);
    font-weight: 600;
    margin: 0;
  }

  .beat-count {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  /* Form Styles */
  .form-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
    margin-top: var(--space-2);
  }

  /* Detail Display */
  .structure-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .detail-text {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .detail-text.empty {
    font-style: italic;
    color: var(--color-text-tertiary);
  }

  .detail-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .notes-section {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border-radius: var(--radius-sm);
  }

  .notes-label {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .notes-text {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: var(--space-1) 0 0;
    line-height: 1.5;
  }

  /* Beats List */
  .beats-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .beat-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background-color: var(--color-bg);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }

  .beat-item.completed .beat-description {
    text-decoration: line-through;
    color: var(--color-text-tertiary);
  }

  .beat-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    flex-shrink: 0;
    color: var(--color-primary);
  }

  .beat-item.completed .beat-checkbox {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .beat-description {
    flex: 1;
  }

  .beat-word-count {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    flex-shrink: 0;
  }

  .beat-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .beat-item:hover .beat-remove {
    opacity: 1;
  }

  .beat-remove:hover {
    color: var(--color-danger);
    background-color: var(--color-danger-light);
  }

  .no-beats {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    font-style: italic;
    margin: 0;
    padding: var(--space-3);
    text-align: center;
    background-color: var(--color-bg);
    border-radius: var(--radius-sm);
  }

  /* Add Beat Form */
  .add-beat-form {
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .add-beat-inputs {
    display: flex;
    gap: var(--space-2);
  }

  .beat-input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    font-family: inherit;
    font-size: var(--text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
  }

  .beat-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .beat-word-input {
    width: 80px;
    padding: var(--space-2) var(--space-3);
    font-family: inherit;
    font-size: var(--text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
  }

  .beat-word-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }
</style>
