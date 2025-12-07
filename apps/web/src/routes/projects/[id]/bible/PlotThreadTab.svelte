<script lang="ts">
  import type { PlotThread } from '@repo/types';
  import { Button, Card, EmptyState, Badge } from '$lib/components';

  interface Props {
    plotThreads: PlotThread[];
    projectId: string;
    searchQuery: string;
  }

  let { plotThreads, projectId, searchQuery }: Props = $props();

  const filteredThreads = $derived(
    searchQuery
      ? plotThreads.filter(
          (thread) =>
            thread.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            thread.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : plotThreads
  );

  let showCreateDialog = $state(false);

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
    <div class="toolbar-info">
      <span class="count-label">
        {filteredThreads.length} {filteredThreads.length === 1 ? 'thread' : 'threads'}
        {#if searchQuery}
          (filtered from {plotThreads.length})
        {/if}
      </span>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New Thread
    </Button>
  </div>

  {#if filteredThreads.length === 0}
    {#if searchQuery}
      <EmptyState
        title="No plot threads found"
        description="Try adjusting your search query."
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  </svg>
                  {thread.involvedCharacters.length} characters
                </span>
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
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
  }

  .count-label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
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
</style>
