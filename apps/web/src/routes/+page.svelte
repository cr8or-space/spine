<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import type { ProjectFormat } from '@repo/types';
  import { Button, Card, Dialog, TextField, Select, TextArea, EmptyState, ConfirmDialog } from '$lib/components';
  import { AppShell, TopBar } from '$lib/shell';
  import { Plus, BookOpen, Type, Settings, Trash2 } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreateDialog = $state(false);
  let showDeleteConfirm = $state(false);
  let projectToDelete = $state<string | null>(null);
  let projectToDeleteTitle = $state<string>('');

  // Form state
  let newTitle = $state('');
  let newFormat = $state<ProjectFormat>('web-serial');
  let newAuthor = $state('');
  let newDescription = $state('');

  const formatOptions = [
    { value: 'web-serial', label: 'Web Serial' },
    { value: 'light-novel', label: 'Light Novel' },
    { value: 'short', label: 'Short Story' },
  ];

  function openCreateDialog() {
    newTitle = '';
    newFormat = 'web-serial';
    newAuthor = '';
    newDescription = '';
    showCreateDialog = true;
  }

  function closeCreateDialog() {
    showCreateDialog = false;
  }

  function openDeleteConfirm(id: string, title: string) {
    projectToDelete = id;
    projectToDeleteTitle = title;
    showDeleteConfirm = true;
  }

  function closeDeleteConfirm() {
    showDeleteConfirm = false;
    projectToDelete = null;
    projectToDeleteTitle = '';
  }

  function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatWordCount(count: number): string {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  }

  function getFormatLabel(format: ProjectFormat): string {
    switch (format) {
      case 'web-serial':
        return 'Web Serial';
      case 'light-novel':
        return 'Light Novel';
      case 'short':
        return 'Short Story';
      default:
        return format;
    }
  }
</script>

<svelte:head>
  <title>Spine - Projects</title>
</svelte:head>

<AppShell class="bg-transparent">
  <div class="min-h-screen flex flex-col">
    <TopBar>
      {#snippet left()}
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-md bg-primary-light/40 text-primary flex items-center justify-center font-semibold">
            S
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-text-tertiary m-0">Spine</p>
            <p class="text-sm font-semibold text-text m-0">Projects</p>
          </div>
        </div>
      {/snippet}

      {#snippet right()}
        <Button onclick={openCreateDialog}>
          <Plus size={16} />
          New Project
        </Button>
      {/snippet}
    </TopBar>

    <main class="flex-1 max-w-6xl w-full mx-auto py-10 px-6 space-y-6">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold m-0">Your projects</h1>
          <p class="text-sm text-text-secondary m-0">Create, continue, or manage your serials.</p>
        </div>
        {#if data.projects.length > 0}
          <Button variant="secondary" onclick={openCreateDialog}>
            <Plus size={14} />
            Create
          </Button>
        {/if}
      </div>

      {#if data.projects.length === 0}
        <EmptyState
          title="No projects yet"
          description="Create your first project to start writing your web serial with AI assistance."
        >
          {#snippet action()}
            <Button onclick={openCreateDialog}>Create Your First Project</Button>
          {/snippet}
        </EmptyState>
      {:else}
        <div class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {#each data.projects as project}
            <Card hover padding="none" class="border-border bg-surface/90">
              <a href="/projects/{project.id}/bible" class="project-link block no-underline text-inherit">
                <div class="p-4 space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="project-title text-lg font-semibold m-0 text-text truncate">{project.title}</h3>
                    <span class="text-xs text-text-secondary bg-surface-hover py-1 px-2 rounded-sm whitespace-nowrap border border-border">
                      {getFormatLabel(project.format)}
                    </span>
                  </div>

                  <div class="project-stats flex gap-4 text-sm text-text-secondary">
                    <span class="flex items-center gap-1">
                      <BookOpen size={14} />
                      {project.chapterCount} chapters
                    </span>
                    <span class="flex items-center gap-1">
                      <Type size={14} />
                      {formatWordCount(project.wordCount)} words
                    </span>
                  </div>

                  <div class="text-xs text-text-tertiary">
                    Last modified {formatDate(project.lastModified)}
                  </div>
                </div>
              </a>
              <div class="flex gap-1 py-2 px-4 border-t border-border bg-surface-muted">
                <a
                  href="/projects/{project.id}/settings"
                  class="flex items-center justify-center w-9 h-9 rounded-md text-text-secondary hover:bg-surface-hover hover:text-text transition-all duration-150 no-underline"
                  title="Settings"
                >
                  <Settings size={16} />
                </a>
                <button
                  class="flex items-center justify-center w-9 h-9 rounded-md text-text-secondary bg-transparent border-none cursor-pointer hover:bg-danger-light/40 hover:text-danger transition-all duration-150"
                  title="Delete"
                  onclick={() => openDeleteConfirm(project.id, project.title)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          {/each}
        </div>
      {/if}
    </main>
  </div>
</AppShell>

<!-- Create Project Dialog -->
<Dialog open={showCreateDialog} title="Create New Project" onClose={closeCreateDialog}>
  <form method="POST" action="?/create" use:enhance>
    <div class="flex flex-col gap-4">
      <TextField
        label="Project Title"
        name="title"
        bind:value={newTitle}
        placeholder="My Web Serial"
        required
      />

      <Select
        label="Format"
        name="format"
        bind:value={newFormat}
        options={formatOptions}
      />

      <TextField
        label="Author"
        name="author"
        bind:value={newAuthor}
        placeholder="Your name"
      />

      <TextArea
        label="Description"
        name="description"
        bind:value={newDescription}
        placeholder="A brief description of your project..."
        rows={3}
      />
    </div>

    {#if form?.error}
      <p class="mt-4 p-3 bg-danger-light text-danger rounded-md text-sm">{form.error}</p>
    {/if}

    <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
      <Button type="button" variant="secondary" onclick={closeCreateDialog}>
        Cancel
      </Button>
      <Button type="submit">
        Create Project
      </Button>
    </div>
  </form>
</Dialog>

<!-- Delete Confirmation Dialog -->
{#if projectToDelete}
  <form method="POST" action="?/delete" use:enhance={() => {
    return async ({ update }) => {
      closeDeleteConfirm();
      await update();
    };
  }}>
    <input type="hidden" name="projectId" value={projectToDelete} />
    <ConfirmDialog
      open={showDeleteConfirm}
      title="Delete Project"
      message="Are you sure you want to delete '{projectToDeleteTitle}'? This action cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      onConfirm={() => {
        const form = document.querySelector('form[action="?/delete"]') as HTMLFormElement;
        form?.requestSubmit();
      }}
      onCancel={closeDeleteConfirm}
    />
  </form>
{/if}
