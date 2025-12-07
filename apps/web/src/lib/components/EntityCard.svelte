<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Card, Badge } from '$lib/components';

  type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

  interface BadgeConfig {
    text: string;
    variant: BadgeVariant;
  }

  interface MetaItem {
    icon?: Snippet;
    text: string;
  }

  interface Props {
    href: string;
    name: string;
    description: string;
    aliases?: string[];
    badges?: BadgeConfig[];
    meta?: MetaItem[];
    maxDescLength?: number;
  }

  let {
    href,
    name,
    description,
    aliases = [],
    badges = [],
    meta = [],
    maxDescLength = 200,
  }: Props = $props();

  const truncatedDescription = $derived(
    description.length > maxDescLength
      ? description.substring(0, maxDescLength) + '...'
      : description
  );
</script>

<Card hover padding="none">
  <a {href} class="entity-link">
    <div class="entity-content">
      <div class="entity-header">
        <h3 class="entity-name">{name}</h3>
        {#if badges.length > 0}
          <div class="entity-badges">
            {#each badges as badge}
              <Badge variant={badge.variant}>{badge.text}</Badge>
            {/each}
          </div>
        {/if}
      </div>

      {#if aliases.length > 0}
        <div class="entity-aliases">
          <span class="aliases-label">Also known as:</span>
          {aliases.join(', ')}
        </div>
      {/if}

      <p class="entity-description">{truncatedDescription}</p>

      {#if meta.length > 0}
        <div class="entity-meta">
          {#each meta as item}
            <span class="meta-item">
              {#if item.icon}
                {@render item.icon()}
              {/if}
              {item.text}
            </span>
          {/each}
        </div>
      {/if}
    </div>
  </a>
</Card>

<style>
  .entity-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .entity-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .entity-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .entity-name {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .entity-badges {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .entity-aliases {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .aliases-label {
    font-style: italic;
    margin-right: var(--space-1);
  }

  .entity-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .entity-meta {
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
