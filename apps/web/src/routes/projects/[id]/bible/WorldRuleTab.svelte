<script lang="ts">
  import type { WorldRule } from '@repo/types';
  import { Button, Card, EmptyState, Badge } from '$lib/components';

  interface Props {
    worldRules: WorldRule[];
    projectId: string;
    searchQuery: string;
  }

  let { worldRules, projectId, searchQuery }: Props = $props();

  const filteredRules = $derived(
    searchQuery
      ? worldRules.filter(
          (rule) =>
            rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rule.rule.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rule.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : worldRules
  );

  let showCreateDialog = $state(false);

  function getCategoryBadgeVariant(category: WorldRule['category']): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (category) {
      case 'magic':
        return 'primary';
      case 'technology':
        return 'info';
      case 'physics':
        return 'success';
      case 'social':
        return 'warning';
      default:
        return 'default';
    }
  }
</script>

<div class="world-rule-tab">
  <div class="tab-toolbar">
    <div class="toolbar-info">
      <span class="count-label">
        {filteredRules.length} {filteredRules.length === 1 ? 'rule' : 'rules'}
        {#if searchQuery}
          (filtered from {worldRules.length})
        {/if}
      </span>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New Rule
    </Button>
  </div>

  {#if filteredRules.length === 0}
    {#if searchQuery}
      <EmptyState
        title="No rules found"
        description="Try adjusting your search query."
      />
    {:else}
      <EmptyState
        title="No world rules yet"
        description="Define the rules that govern your story world: magic systems, physics, social norms, and more."
      >
        {#snippet action()}
          <Button onclick={() => (showCreateDialog = true)}>Create Rule</Button>
        {/snippet}
      </EmptyState>
    {/if}
  {:else}
    <div class="rule-grid">
      {#each filteredRules as rule (rule.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/world-rule/{rule.id}" class="rule-link">
            <div class="rule-content">
              <div class="rule-header">
                <h3 class="rule-name">{rule.name}</h3>
                <div class="rule-badges">
                  <Badge variant={getCategoryBadgeVariant(rule.category)}>
                    {rule.category}
                  </Badge>
                  {#if rule.established}
                    <Badge variant="success">Established</Badge>
                  {:else}
                    <Badge variant="warning">Draft</Badge>
                  {/if}
                </div>
              </div>

              <div class="rule-statement">
                {rule.rule.length > 150
                  ? rule.rule.substring(0, 150) + '...'
                  : rule.rule}
              </div>

              {#if rule.description}
                <p class="rule-description">
                  {rule.description.length > 100
                    ? rule.description.substring(0, 100) + '...'
                    : rule.description}
                </p>
              {/if}

              <div class="rule-meta">
                <span class="meta-item">
                  Priority: {rule.priority}/100
                </span>
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                  {rule.exceptions.length} exceptions
                </span>
                <span class="meta-item">
                  {rule.publicKnowledge ? 'Public' : 'Secret'}
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
  .world-rule-tab {
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

  .rule-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--space-4);
  }

  .rule-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .rule-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .rule-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .rule-name {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .rule-badges {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .rule-statement {
    font-size: var(--text-sm);
    color: var(--color-text);
    font-weight: 500;
    line-height: 1.5;
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-secondary);
    border-left: 3px solid var(--color-primary);
    border-radius: var(--radius-sm);
  }

  .rule-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .rule-meta {
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
