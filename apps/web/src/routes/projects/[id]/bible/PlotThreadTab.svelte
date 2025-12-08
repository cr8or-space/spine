<script lang="ts">
  import type { PlotThread } from '@repo/types';
  import { Button, Card, EmptyState, Badge, Dialog, TextField, TextArea, Select, FilterSelect } from '$lib/components';
  import { enhance } from '$app/forms';
  import { Plus, Users, CheckCircle } from 'lucide-svelte';

  interface Props {
    plotThreads: PlotThread[];
    projectId: string;
    searchQuery: string;
  }

  let { plotThreads, projectId, searchQuery }: Props = $props();

  let typeFilter = $state('');
  let statusFilter = $state('');
  let scopeFilter = $state('');

  const filteredThreads = $derived(
    plotThreads.filter((thread) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          thread.name.toLowerCase().includes(query) ||
          thread.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      // Type filter
      if (typeFilter && thread.type !== typeFilter) return false;
      // Status filter
      if (statusFilter && thread.status !== statusFilter) return false;
      // Scope filter
      if (scopeFilter && thread.scope !== scopeFilter) return false;
      return true;
    })
  );

  const hasActiveFilters = $derived(!!typeFilter || !!statusFilter || !!scopeFilter);

  function clearFilters() {
    typeFilter = '';
    statusFilter = '';
    scopeFilter = '';
  }

  let showCreateDialog = $state(false);

  let createForm = $state({
    name: '',
    description: '',
    type: 'subplot' as PlotThread['type'],
    status: 'active' as PlotThread['status'],
    scope: 'arc' as PlotThread['scope'],
    priority: 50,
  });

  const typeOptions = [
    { value: 'main-plot', label: 'Main Plot' },
    { value: 'subplot', label: 'Subplot' },
    { value: 'mystery', label: 'Mystery' },
    { value: 'romance', label: 'Romance' },
    { value: 'conflict', label: 'Conflict' },
    { value: 'character-arc', label: 'Character Arc' },
    { value: 'worldbuilding', label: 'Worldbuilding' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'planned', label: 'Planned' },
    { value: 'active', label: 'Active' },
    { value: 'dormant', label: 'Dormant' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'abandoned', label: 'Abandoned' },
  ];

  const scopeOptions = [
    { value: 'scene', label: 'Scene' },
    { value: 'chapter', label: 'Chapter' },
    { value: 'arc', label: 'Arc' },
    { value: 'book', label: 'Book' },
    { value: 'series', label: 'Series' },
  ];

  function resetCreateForm() {
    createForm = {
      name: '',
      description: '',
      type: 'subplot',
      status: 'active',
      scope: 'arc',
      priority: 50,
    };
  }

  function getTypeBadgeVariant(type: PlotThread['type']): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (type) {
      case 'main-plot':
        return 'primary';
      case 'subplot':
        return 'success';
      case 'mystery':
        return 'info';
      case 'romance':
        return 'warning';
      case 'character-arc':
        return 'info';
      default:
        return 'default';
    }
  }

  function getStatusBadgeVariant(status: PlotThread['status']): 'success' | 'info' | 'warning' | 'default' {
    switch (status) {
      case 'active':
        return 'success';
      case 'dormant':
        return 'warning';
      case 'resolved':
        return 'info';
      default:
        return 'default';
    }
  }
</script>

<div class="plot-thread-tab">
  <div class="tab-toolbar">
    <div class="toolbar-left">
      <span class="count-label">
        {filteredThreads.length} {filteredThreads.length === 1 ? 'thread' : 'threads'}
        {#if searchQuery || hasActiveFilters}
          (filtered from {plotThreads.length})
        {/if}
      </span>
      <div class="filter-controls">
        <FilterSelect bind:value={typeFilter} options={typeOptions} allLabel="All types" />
        <FilterSelect bind:value={statusFilter} options={statusOptions} allLabel="All statuses" />
        <FilterSelect bind:value={scopeFilter} options={scopeOptions} allLabel="All scopes" />
        {#if hasActiveFilters}
          <button class="clear-filters" onclick={clearFilters}>Clear</button>
        {/if}
      </div>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <Plus size={16} />
      New Thread
    </Button>
  </div>

  {#if filteredThreads.length === 0}
    {#if searchQuery || hasActiveFilters}
      <EmptyState
        title="No plot threads found"
        description="Try adjusting your search query or filters."
      />
    {:else}
      <EmptyState
        title="No plot threads yet"
        description="Track ongoing storylines, mysteries, conflicts, and character arcs."
      >
        {#snippet action()}
          <Button onclick={() => (showCreateDialog = true)}>Create Thread</Button>
        {/snippet}
      </EmptyState>
    {/if}
  {:else}
    <div class="thread-grid">
      {#each filteredThreads as thread (thread.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/plot-thread/{thread.id}" class="thread-link">
            <div class="thread-content">
              <div class="thread-header">
                <h3 class="thread-name">{thread.name}</h3>
                <div class="thread-badges">
                  <Badge variant={getTypeBadgeVariant(thread.type)}>
                    {thread.type}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(thread.status)}>
                    {thread.status}
                  </Badge>
                </div>
              </div>

              <p class="thread-description">
                {thread.description.length > 200
                  ? thread.description.substring(0, 200) + '...'
                  : thread.description}
              </p>

              <div class="thread-meta">
                <span class="meta-item">
                  Scope: {thread.scope}
                </span>
                <span class="meta-item">
                  Priority: {thread.priority}/100
                </span>
                <span class="meta-item">
                  <Users size={14} />
                  {thread.involvedCharacters.length} characters
                </span>
                <span class="meta-item">
                  <CheckCircle size={14} />
                  {thread.promises.filter(p => p.status === 'fulfilled').length}/{thread.promises.length} promises
                </span>
              </div>
            </div>
          </a>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<style>
  .plot-thread-tab {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .tab-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .count-label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .clear-filters {
    padding: var(--space-1) var(--space-2);
    font-family: inherit;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
  }

  .clear-filters:hover {
    color: var(--color-text);
  }

  .thread-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--space-4);
  }

  .thread-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .thread-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .thread-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .thread-name {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .thread-badges {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .thread-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .thread-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-light);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

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

<!-- Create Plot Thread Dialog -->
<Dialog
  open={showCreateDialog}
  title="Create Plot Thread"
  onClose={() => (showCreateDialog = false)}
>
  <form method="POST" action="?/createPlotThread" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'redirect') {
        showCreateDialog = false;
        resetCreateForm();
        window.location.href = result.location;
      } else if (result.type === 'failure') {
        console.error('Create plot thread failed:', result.data);
      }
    };
  }}>
    <div class="dialog-form">
      <TextField
        label="Name"
        name="name"
        bind:value={createForm.name}
        required
      />

      <Select
        label="Type"
        name="type"
        bind:value={createForm.type}
        options={typeOptions}
      />

      <Select
        label="Status"
        name="status"
        bind:value={createForm.status}
        options={statusOptions}
      />

      <Select
        label="Scope"
        name="scope"
        bind:value={createForm.scope}
        options={scopeOptions}
        hint="How long does this thread span?"
      />

      <TextField
        label="Priority (0-100)"
        name="priority"
        type="number"
        bind:value={createForm.priority}
        min="0"
        max="100"
        hint="Higher priority threads are more central to the story"
      />

      <TextArea
        label="Description"
        name="description"
        bind:value={createForm.description}
        rows={6}
        required
      />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Create Thread</Button>
      </div>
    </div>
  </form>
</Dialog>
