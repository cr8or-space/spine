<script lang="ts">
  import type { PageData } from './$types';
  import { Button, Badge, Dialog, TextField, TextArea, Select, EmptyState } from '$lib/components';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import OutlineTree from './OutlineTree.svelte';
  import StructureEditor from './StructureEditor.svelte';
  import ContentEditor from './ContentEditor.svelte';
  import AnalysisPanel from './AnalysisPanel.svelte';
  import DraftHistory from './DraftHistory.svelte';

  let { data }: { data: PageData } = $props();

  let showCreateDialog = $state(false);
  let createForm = $state({
    type: 'book' as 'book' | 'arc' | 'chapter' | 'scene',
    title: '',
    summary: '',
    parentId: null as string | null,
  });

  let showAnalysisPanel = $state(false);
  let showHistoryPanel = $state(false);

  // Filter type options based on parent
  const availableTypes = $derived(() => {
    if (!createForm.parentId) {
      return [{ value: 'book', label: 'Book' }];
    }
    const parent = data.allStructures.find(s => s.id === createForm.parentId);
    if (!parent) {
      return [{ value: 'book', label: 'Book' }];
    }
    switch (parent.type) {
      case 'book':
        return [
          { value: 'arc', label: 'Arc' },
          { value: 'chapter', label: 'Chapter' },
        ];
      case 'arc':
        return [{ value: 'chapter', label: 'Chapter' }];
      case 'chapter':
        return [{ value: 'scene', label: 'Scene' }];
      default:
        return [];
    }
  });

  function openCreateDialog(parentId: string | null = null) {
    createForm = {
      type: parentId ? 'chapter' : 'book',
      title: '',
      summary: '',
      parentId,
    };
    // Set default type based on parent
    if (parentId) {
      const parent = data.allStructures.find(s => s.id === parentId);
      if (parent) {
        switch (parent.type) {
          case 'book':
            createForm.type = 'chapter';
            break;
          case 'arc':
            createForm.type = 'chapter';
            break;
          case 'chapter':
            createForm.type = 'scene';
            break;
        }
      }
    }
    showCreateDialog = true;
  }

  function resetCreateForm() {
    createForm = {
      type: 'book',
      title: '',
      summary: '',
      parentId: null,
    };
  }

  function selectStructure(structureId: string) {
    goto(`/projects/${data.project.id}/workspace?structure=${structureId}`);
  }
</script>

<svelte:head>
  <title>Workspace - {data.project.title} - NovelGen</title>
</svelte:head>

<div class="workspace-page">
  <div class="workspace-layout">
    <!-- Outline Panel (Left) -->
    <aside class="outline-panel">
      <header class="panel-header">
        <h2 class="panel-title">Outline</h2>
        <Button size="sm" onclick={() => openCreateDialog(null)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Button>
      </header>

      <div class="outline-content">
        {#if data.structureTree}
          <OutlineTree
            structure={data.structureTree}
            selectedId={data.selectedStructure?.id}
            onSelect={selectStructure}
            onCreateChild={openCreateDialog}
          />
        {:else}
          <EmptyState
            title="No outline yet"
            description="Create your first book to start planning your story."
          >
            {#snippet action()}
              <Button size="sm" onclick={() => openCreateDialog(null)}>Create Book</Button>
            {/snippet}
          </EmptyState>
        {/if}
      </div>

      {#if data.stats.bookCount > 0}
        <footer class="outline-stats">
          <div class="stat">
            <span class="stat-value">{data.stats.chapterCount}</span>
            <span class="stat-label">Chapters</span>
          </div>
          <div class="stat">
            <span class="stat-value">{data.stats.totalBeats}</span>
            <span class="stat-label">Beats</span>
          </div>
          <div class="stat">
            <span class="stat-value">{data.stats.completedBeats}</span>
            <span class="stat-label">Done</span>
          </div>
        </footer>
      {/if}
    </aside>

    <!-- Main Content Area -->
    <main class="main-panel">
      {#if data.selectedStructure}
        <header class="editor-header">
          <div class="editor-header-left">
            <Badge variant={data.selectedStructure.type === 'chapter' ? 'primary' : 'default'}>
              {data.selectedStructure.type}
            </Badge>
            <h1 class="editor-title">{data.selectedStructure.title}</h1>
          </div>
          <div class="editor-header-actions">
            <Button
              variant="ghost"
              size="sm"
              onclick={() => (showHistoryPanel = !showHistoryPanel)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => (showAnalysisPanel = !showAnalysisPanel)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
              Analysis
            </Button>
          </div>
        </header>

        <div class="editor-content">
          <div class="editor-main">
            <!-- Structure Editor for metadata, beats, hooks -->
            <StructureEditor
              structure={data.selectedStructure}
            />

            <!-- Content Editor for actual prose -->
            {#if data.selectedStructure.type === 'chapter' || data.selectedStructure.type === 'scene'}
              <ContentEditor
                structure={data.selectedStructure}
                content={data.selectedContent}
                bible={data.bible}
              />
            {/if}
          </div>

          <!-- Side Panels -->
          {#if showAnalysisPanel}
            <aside class="side-panel analysis-panel">
              <AnalysisPanel
                structure={data.selectedStructure}
                content={data.selectedContent}
                onClose={() => (showAnalysisPanel = false)}
              />
            </aside>
          {/if}

          {#if showHistoryPanel}
            <aside class="side-panel history-panel">
              <DraftHistory
                content={data.selectedContent}
                onClose={() => (showHistoryPanel = false)}
              />
            </aside>
          {/if}
        </div>
      {:else}
        <div class="no-selection">
          <EmptyState
            title="Select a structure"
            description="Choose a book, chapter, or scene from the outline to start writing."
          >
            {#snippet action()}
              {#if data.structureTree}
                <Button onclick={() => selectStructure(data.structureTree!.id)}>
                  Open {data.structureTree.title}
                </Button>
              {:else}
                <Button onclick={() => openCreateDialog(null)}>Create Book</Button>
              {/if}
            {/snippet}
          </EmptyState>
        </div>
      {/if}
    </main>
  </div>
</div>

<!-- Create Structure Dialog -->
<Dialog
  open={showCreateDialog}
  title="Create Structure"
  onClose={() => (showCreateDialog = false)}
>
  <form method="POST" action="?/createStructure" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'redirect') {
        showCreateDialog = false;
        resetCreateForm();
        goto(result.location);
      } else if (result.type === 'failure') {
        console.error('Create structure failed:', result.data);
      }
    };
  }}>
    <div class="dialog-form">
      <input type="hidden" name="parentId" value={createForm.parentId || ''} />

      <Select
        label="Type"
        name="type"
        bind:value={createForm.type}
        options={availableTypes()}
      />

      <TextField
        label="Title"
        name="title"
        bind:value={createForm.title}
        required
      />

      <TextArea
        label="Summary"
        name="summary"
        bind:value={createForm.summary}
        rows={4}
        hint="Brief description of this section"
      />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Create</Button>
      </div>
    </div>
  </form>
</Dialog>

<style>
  .workspace-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .workspace-layout {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  /* Outline Panel */
  .outline-panel {
    width: 280px;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface);
    border-right: 1px solid var(--color-border);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .panel-title {
    font-size: var(--text-sm);
    font-weight: 600;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
  }

  .outline-content {
    flex: 1;
    overflow: auto;
    padding: var(--space-2);
  }

  .outline-stats {
    display: flex;
    justify-content: space-around;
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--color-border);
    background-color: var(--color-bg);
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .stat-value {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }

  /* Main Panel */
  .main-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--color-bg);
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-6);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-surface);
  }

  .editor-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .editor-title {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
  }

  .editor-header-actions {
    display: flex;
    gap: var(--space-2);
  }

  .editor-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .editor-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    padding: var(--space-6);
    gap: var(--space-6);
  }

  /* Side Panels */
  .side-panel {
    width: 320px;
    min-width: 320px;
    border-left: 1px solid var(--color-border);
    background-color: var(--color-surface);
    overflow: auto;
  }

  /* No Selection State */
  .no-selection {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
  }

  /* Dialog Form */
  .dialog-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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
