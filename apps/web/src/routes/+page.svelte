<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import type { ProjectFormat } from '@repo/types';
  import { Button, Card, Dialog, TextField, Select, TextArea, EmptyState, ConfirmDialog } from '$lib/components';
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

<div class="page">
  <header class="header">
    <div class="header-content">
      <h1 class="logo">Spine</h1>
      <p class="tagline">AI-assisted web serial creation</p>
    </div>
  </header>

  <main class="main">
    <div class="toolbar">
      <h2 class="section-title">Projects</h2>
      <Button onclick={openCreateDialog}>
        <Plus size={16} />
        New Project
      </Button>
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
      <div class="projects-grid">
        {#each data.projects as project}
          <Card hover padding="none">
            <a href="/projects/{project.id}/bible" class="project-link">
              <div class="project-content">
                <div class="project-header">
                  <h3 class="project-title">{project.title}</h3>
                  <span class="project-format">{getFormatLabel(project.format)}</span>
                </div>

                <div class="project-stats">
                  <span class="stat">
                    <BookOpen size={14} />
                    {project.chapterCount} chapters
                  </span>
                  <span class="stat">
                    <Type size={14} />
                    {formatWordCount(project.wordCount)} words
                  </span>
                </div>

                <div class="project-meta">
                  <span class="last-modified">
                    Last modified {formatDate(project.lastModified)}
                  </span>
                </div>
              </div>
            </a>
            <div class="project-actions">
              <a href="/projects/{project.id}/settings" class="action-btn" title="Settings">
                <Settings size={16} />
              </a>
              <button
                class="action-btn danger"
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

<!-- Create Project Dialog -->
<Dialog open={showCreateDialog} title="Create New Project" onClose={closeCreateDialog}>
  <form method="POST" action="?/create" use:enhance>
    <div class="form-fields">
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
      <p class="form-error">{form.error}</p>
    {/if}

    <div class="form-actions">
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

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .header {
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-8) var(--space-4);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
  }

  .logo {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--color-primary);
    margin: 0;
  }

  .tagline {
    font-size: var(--text-base);
    color: var(--color-text-secondary);
    margin: var(--space-2) 0 0;
  }

  .main {
    flex: 1;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-6);
  }

  .section-title {
    font-size: var(--text-xl);
    font-weight: 600;
    margin: 0;
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-4);
  }

  .project-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .project-content {
    padding: var(--space-4);
  }

  .project-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .project-title {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .project-format {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    background-color: var(--color-bg-tertiary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }

  .project-stats {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-3);
  }

  .stat {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .project-meta {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }

  .project-actions {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--color-border-light);
    background-color: var(--color-bg-secondary);
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-decoration: none;
  }

  .action-btn:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text);
  }

  .action-btn.danger:hover {
    background-color: var(--color-danger-light);
    color: var(--color-danger);
  }

  .form-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-error {
    margin-top: var(--space-4);
    padding: var(--space-3);
    background-color: var(--color-danger-light);
    color: var(--color-danger);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }
</style>
