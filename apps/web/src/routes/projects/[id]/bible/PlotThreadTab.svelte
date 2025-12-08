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

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between gap-4 flex-wrap">
    <div class="flex items-center gap-4 flex-wrap">
      <span class="text-sm text-text-secondary">
        {filteredThreads.length} {filteredThreads.length === 1 ? 'thread' : 'threads'}
        {#if searchQuery || hasActiveFilters}
          (filtered from {plotThreads.length})
        {/if}
      </span>
      <div class="flex items-center gap-2">
        <FilterSelect bind:value={typeFilter} options={typeOptions} allLabel="All types" />
        <FilterSelect bind:value={statusFilter} options={statusOptions} allLabel="All statuses" />
        <FilterSelect bind:value={scopeFilter} options={scopeOptions} allLabel="All scopes" />
        {#if hasActiveFilters}
          <button class="px-2 py-1 font-inherit text-xs text-text-secondary bg-transparent border-none cursor-pointer underline hover:text-text" onclick={clearFilters}>Clear</button>
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
    <div class="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4">
      {#each filteredThreads as thread (thread.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/plot-thread/{thread.id}" class="block no-underline text-inherit">
            <div class="p-4 flex flex-col gap-3">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-lg font-semibold m-0 text-text">{thread.name}</h3>
                <div class="flex gap-2 shrink-0">
                  <Badge variant={getTypeBadgeVariant(thread.type)}>
                    {thread.type}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(thread.status)}>
                    {thread.status}
                  </Badge>
                </div>
              </div>

              <p class="text-sm text-text-secondary leading-normal m-0">
                {thread.description.length > 200
                  ? thread.description.substring(0, 200) + '...'
                  : thread.description}
              </p>

              <div class="flex flex-wrap gap-4 text-xs text-text-tertiary pt-2 border-t border-border-light">
                <span class="flex items-center gap-1">
                  Scope: {thread.scope}
                </span>
                <span class="flex items-center gap-1">
                  Priority: {thread.priority}/100
                </span>
                <span class="flex items-center gap-1">
                  <Users size={14} />
                  {thread.involvedCharacters.length} characters
                </span>
                <span class="flex items-center gap-1">
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
    <div class="flex flex-col gap-4">
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

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
        <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Create Thread</Button>
      </div>
    </div>
  </form>
</Dialog>
