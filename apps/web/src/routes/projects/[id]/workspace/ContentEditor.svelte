<script lang="ts">
  import type { Structure, Content, Bible } from '@repo/types';
  import { Button, Card, Badge, TextField, Dialog } from '$lib/components';
  import { invalidateAll } from '$app/navigation';

  interface Props {
    structure: Structure;
    content?: Content;
    bible: Bible;
  }

  let { structure, content, bible }: Props = $props();

  let editorText = $state(content?.text || '');
  let isDirty = $state(false);
  let isSaving = $state(false);
  let showGenerateDialog = $state(false);

  // Generation controls
  let generateOptions = $state({
    model: '',
    temperature: '0.7',
    targetWordCount: structure.targetWordCount?.toString() || '2000',
    styleGuidance: '',
    includeSelfReview: true,
  });

  // Track dirty state
  $effect(() => {
    isDirty = editorText !== (content?.text || '');
  });

  // Reset editor when structure changes
  $effect(() => {
    editorText = content?.text || '';
  });

  const wordCount = $derived(
    editorText.trim() ? editorText.trim().split(/\s+/).length : 0
  );

  const statusVariant = $derived(() => {
    if (!content) return 'default';
    switch (content.status) {
      case 'draft':
        return 'default';
      case 'review':
        return 'warning';
      case 'approved':
        return 'success';
      case 'published':
        return 'info';
      default:
        return 'default';
    }
  });

  // Continuity warnings from analysis
  const continuityIssues = $derived(
    content?.analysis?.continuityIssues.filter(i => !i.reviewed && !i.falsePositive) || []
  );

  function handleTextChange(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    editorText = target.value;
  }

  async function handleSave() {
    isSaving = true;
    const formData = new FormData();
    formData.append('structureId', structure.id);
    if (content?.id) {
      formData.append('contentId', content.id);
    }
    formData.append('text', editorText);

    try {
      const response = await fetch(`?/saveContent`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await invalidateAll();
        isDirty = false;
      }
    } finally {
      isSaving = false;
    }
  }

  // Keyboard shortcut for save
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (isDirty) {
        handleSave();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<Card>
  <div class="flex flex-col gap-4">
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h3 class="m-0 text-base font-semibold">Content</h3>
        {#if content}
          <Badge variant={statusVariant()}>{content.status}</Badge>
          <span class="text-sm text-text-tertiary">v{content.currentVersion}</span>
        {:else}
          <Badge>New</Badge>
        {/if}
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-text-secondary">{wordCount} words</span>
        {#if content?.locked}
          <Badge variant="danger">Locked</Badge>
        {/if}
      </div>
    </header>

    <!-- Continuity Warnings -->
    {#if continuityIssues.length > 0}
      <div class="rounded-md border border-warning bg-warning-light p-3">
        <header class="mb-2 flex items-center gap-2 text-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span class="text-sm font-medium">
            {continuityIssues.length} continuity {continuityIssues.length === 1 ? 'issue' : 'issues'}
          </span>
        </header>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          {#each continuityIssues.slice(0, 5) as issue (issue.id)}
            <li class="flex items-start gap-2 text-sm">
              <Badge
                variant={issue.severity === 'critical' ? 'danger' : issue.severity === 'major' ? 'warning' : 'default'}
                size="sm"
              >
                {issue.severity}
              </Badge>
              <span class="flex-1 text-text-secondary">{issue.description}</span>
            </li>
          {/each}
          {#if continuityIssues.length > 5}
            <li class="text-sm italic text-text-tertiary">
              +{continuityIssues.length - 5} more issues
            </li>
          {/if}
        </ul>
      </div>
    {/if}

    <!-- Editor Textarea -->
    <div class="min-h-[400px] flex-1">
      <textarea
        class="min-h-[400px] w-full resize-y rounded-md border border-border bg-surface p-4 font-serif text-base leading-relaxed focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-light disabled:cursor-not-allowed disabled:bg-bg disabled:opacity-70"
        value={editorText}
        oninput={handleTextChange}
        placeholder="Start writing..."
        disabled={content?.locked}
      ></textarea>
    </div>

    <!-- Editor Actions -->
    <footer class="flex items-center justify-between border-t border-border pt-3">
      <div class="flex items-center gap-3">
        <Button
          variant="secondary"
          onclick={() => (showGenerateDialog = true)}
          disabled={content?.locked}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Generate
        </Button>
      </div>
      <div class="flex items-center gap-3">
        {#if isDirty}
          <span class="text-sm text-warning">Unsaved changes</span>
        {/if}
        <Button
          onclick={handleSave}
          disabled={!isDirty || isSaving || content?.locked}
          loading={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </footer>
  </div>
</Card>

<!-- Generate Dialog -->
<Dialog
  open={showGenerateDialog}
  title="Generate Content"
  onClose={() => (showGenerateDialog = false)}
>
  <div class="flex flex-col gap-4">
    <p class="m-0 text-sm text-text-secondary">
      Generate content for "{structure.title}" using AI. The generated text will replace the current content.
    </p>

    {#if structure.beats.length === 0}
      <div class="flex items-center gap-2 rounded-md bg-warning-light p-3 text-sm text-warning">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Consider adding story beats before generating for better results.</span>
      </div>
    {/if}

    <div class="flex flex-col gap-4">
      <TextField
        label="Model"
        bind:value={generateOptions.model}
        hint="Leave empty to use default model"
        placeholder="e.g., gpt-4"
      />

      <div class="grid grid-cols-2 gap-4">
        <TextField
          label="Temperature"
          type="number"
          bind:value={generateOptions.temperature}
          hint="0 = focused, 2 = creative"
        />

        <TextField
          label="Target Words"
          type="number"
          bind:value={generateOptions.targetWordCount}
        />
      </div>

      <TextField
        label="Style Guidance"
        bind:value={generateOptions.styleGuidance}
        hint="Optional style hints for generation"
        placeholder="e.g., fast-paced, atmospheric"
      />

      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          bind:checked={generateOptions.includeSelfReview}
          class="h-4 w-4"
        />
        <span>Include self-review pass</span>
      </label>
    </div>

    <div class="rounded-md bg-bg p-3">
      <h4 class="m-0 mb-2 text-sm font-medium text-text-secondary">Context that will be included:</h4>
      <ul class="m-0 pl-4 text-sm text-text-tertiary [&>li]:mb-1">
        <li>{bible.characters.length} characters</li>
        <li>{bible.locations.length} locations</li>
        <li>{bible.worldRules.length} world rules</li>
        <li>{structure.beats.length} beats to hit</li>
        {#if structure.hook}
          <li>Hook: {structure.hook.type}</li>
        {/if}
        {#if structure.tensionTarget !== undefined}
          <li>Tension target: {structure.tensionTarget}/100</li>
        {/if}
      </ul>
    </div>

    <div class="mt-2 flex justify-end gap-3 border-t border-border pt-4">
      <Button variant="secondary" onclick={() => (showGenerateDialog = false)}>
        Cancel
      </Button>
      <Button onclick={() => {
        // TODO: Implement actual generation call
        alert('Generation not yet implemented - requires LLM endpoint configuration');
        showGenerateDialog = false;
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        Generate Draft
      </Button>
    </div>
  </div>
</Dialog>
