<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { Clock, AlertCircle, FileText, CheckCircle2, XCircle, ClipboardCheck } from 'lucide-svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import TextField from '$lib/components/TextField.svelte';
  import Select from '$lib/components/Select.svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let searchTerm = $state('');
  let statusFilter = $state<string>('all');
  let sortBy = $state<'priority' | 'age' | 'issues'>('priority');
  let selectedIds = $state<Set<string>>(new Set());

  const filteredQueue = $derived(() => {
    let items = data.queue;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(term) ||
        item.structurePath.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      items = items.filter(item => item.status === statusFilter);
    }

    // Sort
    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority - a.priority;
        case 'age':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'issues':
          return b.issueCount - a.issueCount;
        default:
          return 0;
      }
    });

    return items;
  });

  function toggleSelection(id: string) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    selectedIds = selectedIds;
  }

  function toggleAll() {
    if (selectedIds.size === filteredQueue().length) {
      selectedIds.clear();
    } else {
      selectedIds = new Set(filteredQueue().map(item => item.contentId));
    }
    selectedIds = selectedIds;
  }

  function getStatusVariant(status: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'draft': return 'default';
      case 'review': return 'warning';
      case 'approved': return 'success';
      case 'published': return 'info';
      default: return 'default';
    }
  }

  function getPriorityColor(priority: number): string {
    if (priority >= 40) return 'text-danger';
    if (priority >= 30) return 'text-warning';
    return 'text-text-secondary';
  }

  function formatAge(date: string): string {
    const now = new Date();
    const updated = new Date(date);
    const hours = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-bold">Review Queue</h1>
      <Badge variant="info">{filteredQueue().length} items</Badge>
    </div>

    {#if selectedIds.size > 0}
      <div class="flex items-center gap-2">
        <span class="text-sm text-text-secondary">{selectedIds.size} selected</span>
        <form method="POST" action="?/bulkApprove" use:enhance>
          {#each Array.from(selectedIds) as id}
            <input type="hidden" name="contentId" value={id} />
          {/each}
          <Button type="submit" size="sm" variant="primary">
            <CheckCircle2 size={16} />
            Approve Selected
          </Button>
        </form>
      </div>
    {/if}
  </div>

  <!-- Filters -->
  <div class="flex items-center gap-3 px-6 py-3 bg-surface-hover border-b border-border">
    <TextField
      bind:value={searchTerm}
      placeholder="Search by title or path..."
      class="flex-1"
    />

    <Select
      bind:value={statusFilter}
      options={[
        { value: 'all', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'review', label: 'In Review' },
        { value: 'approved', label: 'Approved' },
      ]}
      class="w-40"
    />

    <Select
      bind:value={sortBy}
      options={[
        { value: 'priority', label: 'Priority' },
        { value: 'age', label: 'Age' },
        { value: 'issues', label: 'Issues' },
      ]}
      class="w-40"
    />

    <Button
      variant="ghost"
      size="sm"
      onclick={() => toggleAll()}
    >
      {selectedIds.size === filteredQueue().length ? 'Deselect All' : 'Select All'}
    </Button>
  </div>

  <!-- Queue List -->
  <div class="flex-1 overflow-y-auto px-6 py-4">
    {#if filteredQueue().length === 0}
      <div class="flex flex-col items-center justify-center h-64 text-center">
        <ClipboardCheck size={48} class="text-text-tertiary mb-3" />
        <p class="text-lg font-medium text-text-secondary">No items to review</p>
        <p class="text-sm text-text-tertiary mt-1">
          {searchTerm || statusFilter !== 'all'
            ? 'Try adjusting your filters'
            : 'All caught up!'}
        </p>
      </div>
    {:else}
      <div class="grid gap-3">
        {#each filteredQueue() as item (item.contentId)}
          <Card hover class="p-4">
            <div class="flex items-start gap-4">
              <!-- Checkbox -->
              <input
                type="checkbox"
                checked={selectedIds.has(item.contentId)}
                onchange={() => toggleSelection(item.contentId)}
                class="mt-1 w-4 h-4 rounded border-border"
              />

              <!-- Content Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3 mb-2">
                  <div class="flex-1 min-w-0">
                    <a
                      href={`/projects/${data.project.id}/review/${item.contentId}`}
                      class="text-lg font-semibold text-text hover:text-primary no-underline"
                    >
                      {item.title}
                    </a>
                    <p class="text-sm text-text-secondary mt-1">
                      {item.structurePath}
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <Badge variant={getStatusVariant(item.status)}>
                      {item.status}
                    </Badge>
                    <span class={cn('text-sm font-medium', getPriorityColor(item.priority))}>
                      P{item.priority}
                    </span>
                  </div>
                </div>

                <!-- Metadata -->
                <div class="flex items-center gap-4 text-sm text-text-secondary">
                  <div class="flex items-center gap-1">
                    <FileText size={14} />
                    <span>{item.wordCount.toLocaleString()} words</span>
                  </div>

                  {#if item.issueCount > 0}
                    <div class="flex items-center gap-1 text-warning">
                      <AlertCircle size={14} />
                      <span>{item.issueCount} {item.issueCount === 1 ? 'issue' : 'issues'}</span>
                    </div>
                  {/if}

                  <div class="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{formatAge(item.updatedAt)}</span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 mt-3">
                  <Button
                    href={`/projects/${data.project.id}/review/${item.contentId}`}
                    size="sm"
                    variant="primary"
                  >
                    Review
                  </Button>

                  {#if item.status === 'review'}
                    <form method="POST" action="?/transitionStatus" use:enhance class="inline">
                      <input type="hidden" name="contentId" value={item.contentId} />
                      <input type="hidden" name="status" value="approved" />
                      <Button type="submit" size="sm" variant="ghost">
                        <CheckCircle2 size={16} />
                        Approve
                      </Button>
                    </form>

                    <form method="POST" action="?/transitionStatus" use:enhance class="inline">
                      <input type="hidden" name="contentId" value={item.contentId} />
                      <input type="hidden" name="status" value="draft" />
                      <Button type="submit" size="sm" variant="ghost">
                        <XCircle size={16} />
                        Reject
                      </Button>
                    </form>
                  {/if}
                </div>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  </div>
</div>
