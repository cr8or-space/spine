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
  <div class="content-editor">
    <header class="editor-header">
      <div class="header-left">
        <h3 class="section-title">Content</h3>
        {#if content}
          <Badge variant={statusVariant()}>{content.status}</Badge>
          <span class="version-info">v{content.currentVersion}</span>
        {:else}
          <Badge>New</Badge>
        {/if}
      </div>
      <div class="header-right">
        <span class="word-count">{wordCount} words</span>
        {#if content?.locked}
          <Badge variant="danger">Locked</Badge>
        {/if}
      </div>
    </header>

    <!-- Continuity Warnings -->
    {#if continuityIssues.length > 0}
      <div class="continuity-warnings">
        <header class="warnings-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span class="warnings-count">
            {continuityIssues.length} continuity {continuityIssues.length === 1 ? 'issue' : 'issues'}
          </span>
        </header>
        <ul class="warnings-list">
          {#each continuityIssues.slice(0, 5) as issue (issue.id)}
            <li class="warning-item" class:critical={issue.severity === 'critical'} class:major={issue.severity === 'major'}>
              <Badge
                variant={issue.severity === 'critical' ? 'danger' : issue.severity === 'major' ? 'warning' : 'default'}
                size="sm"
              >
                {issue.severity}
              </Badge>
              <span class="warning-text">{issue.description}</span>
            </li>
          {/each}
          {#if continuityIssues.length > 5}
            <li class="warning-more">
              +{continuityIssues.length - 5} more issues
            </li>
          {/if}
        </ul>
      </div>
    {/if}

    <!-- Editor Textarea -->
    <div class="editor-wrapper">
      <textarea
        class="editor-textarea"
        value={editorText}
        oninput={handleTextChange}
        placeholder="Start writing..."
        disabled={content?.locked}
      ></textarea>
    </div>

    <!-- Editor Actions -->
    <footer class="editor-footer">
      <div class="footer-left">
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
      <div class="footer-right">
        {#if isDirty}
          <span class="unsaved-indicator">Unsaved changes</span>
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
  <div class="generate-dialog">
    <p class="generate-description">
      Generate content for "{structure.title}" using AI. The generated text will replace the current content.
    </p>

    {#if structure.beats.length === 0}
      <div class="generate-warning">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Consider adding story beats before generating for better results.</span>
      </div>
    {/if}

    <div class="generate-form">
      <TextField
        label="Model"
        bind:value={generateOptions.model}
        hint="Leave empty to use default model"
        placeholder="e.g., gpt-4"
      />

      <div class="form-row">
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

      <label class="checkbox-label">
        <input
          type="checkbox"
          bind:checked={generateOptions.includeSelfReview}
        />
        <span>Include self-review pass</span>
      </label>
    </div>

    <div class="generate-context">
      <h4 class="context-title">Context that will be included:</h4>
      <ul class="context-list">
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

    <div class="dialog-actions">
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

<style>
  .content-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .section-title {
    font-size: var(--text-base);
    font-weight: 600;
    margin: 0;
  }

  .version-info {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .word-count {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  /* Continuity Warnings */
  .continuity-warnings {
    padding: var(--space-3);
    background-color: var(--color-warning-light);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-warning);
  }

  .warnings-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-warning);
    margin-bottom: var(--space-2);
  }

  .warnings-count {
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .warnings-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .warning-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }

  .warning-text {
    flex: 1;
    color: var(--color-text-secondary);
  }

  .warning-more {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    font-style: italic;
  }

  /* Editor Wrapper */
  .editor-wrapper {
    flex: 1;
    min-height: 400px;
  }

  .editor-textarea {
    width: 100%;
    min-height: 400px;
    padding: var(--space-4);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: var(--text-base);
    line-height: 1.8;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
    resize: vertical;
  }

  .editor-textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .editor-textarea:disabled {
    background-color: var(--color-bg);
    cursor: not-allowed;
    opacity: 0.7;
  }

  /* Editor Footer */
  .editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .footer-left,
  .footer-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .unsaved-indicator {
    font-size: var(--text-sm);
    color: var(--color-warning);
  }

  /* Generate Dialog */
  .generate-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .generate-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .generate-warning {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background-color: var(--color-warning-light);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-warning);
  }

  .generate-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .checkbox-label input {
    width: 16px;
    height: 16px;
  }

  .generate-context {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .context-title {
    font-size: var(--text-sm);
    font-weight: 500;
    margin: 0 0 var(--space-2);
    color: var(--color-text-secondary);
  }

  .context-list {
    margin: 0;
    padding-left: var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
  }

  .context-list li {
    margin-bottom: var(--space-1);
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
