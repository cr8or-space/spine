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

<div class="flex flex-1 flex-col overflow-hidden">
  <div class="flex flex-1 overflow-hidden">
    <!-- Outline Panel (Left) -->
    <aside class="flex w-[280px] min-w-[280px] flex-col border-r border-border bg-surface">
      <header class="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 class="m-0 text-sm font-semibold uppercase tracking-wide text-text-secondary">Outline</h2>
        <Button size="sm" onclick={() => openCreateDialog(null)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Button>
      </header>

      <div class="flex-1 overflow-auto p-2">
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
        <footer class="flex justify-around border-t border-border bg-bg px-4 py-3">
          <div class="flex flex-col items-center gap-1">
            <span class="text-lg font-semibold">{data.stats.chapterCount}</span>
            <span class="text-xs text-text-tertiary">Chapters</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="text-lg font-semibold">{data.stats.totalBeats}</span>
            <span class="text-xs text-text-tertiary">Beats</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="text-lg font-semibold">{data.stats.completedBeats}</span>
            <span class="text-xs text-text-tertiary">Done</span>
          </div>
        </footer>
      {/if}
    </aside>

    <!-- Main Content Area -->
    <main class="flex flex-1 flex-col overflow-hidden bg-bg">
      {#if data.selectedStructure}
        <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div class="flex items-center gap-3">
            <Badge variant={data.selectedStructure.type === 'chapter' ? 'primary' : 'default'}>
              {data.selectedStructure.type}
            </Badge>
            <h1 class="m-0 text-lg font-semibold">{data.selectedStructure.title}</h1>
          </div>
          <div class="flex gap-2">
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

        <div class="flex flex-1 overflow-hidden">
          <div class="flex flex-1 flex-col gap-6 overflow-auto p-6">
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
            <aside class="w-80 min-w-80 overflow-auto border-l border-border bg-surface">
              <AnalysisPanel
                structure={data.selectedStructure}
                content={data.selectedContent}
                onClose={() => (showAnalysisPanel = false)}
              />
            </aside>
          {/if}

          {#if showHistoryPanel}
            <aside class="w-80 min-w-80 overflow-auto border-l border-border bg-surface">
              <DraftHistory
                content={data.selectedContent}
                onClose={() => (showHistoryPanel = false)}
              />
            </aside>
          {/if}
        </div>
      {:else}
        <div class="flex flex-1 items-center justify-center p-8">
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
    <div class="flex flex-col gap-4">
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

      <div class="mt-2 flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Create</Button>
      </div>
    </div>
  </form>
</Dialog>
