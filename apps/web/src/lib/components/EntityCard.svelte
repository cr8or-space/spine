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
  <a {href} class="block no-underline text-inherit">
    <div class="p-4 flex flex-col gap-3">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-lg font-semibold m-0 text-text">{name}</h3>
        {#if badges.length > 0}
          <div class="flex gap-2 shrink-0">
            {#each badges as badge}
              <Badge variant={badge.variant}>{badge.text}</Badge>
            {/each}
          </div>
        {/if}
      </div>

      {#if aliases.length > 0}
        <div class="text-sm text-text-secondary">
          <span class="italic mr-1">Also known as:</span>
          {aliases.join(', ')}
        </div>
      {/if}

      <p class="text-sm text-text-secondary leading-relaxed m-0">{truncatedDescription}</p>

      {#if meta.length > 0}
        <div class="flex flex-wrap gap-4 text-xs text-text-tertiary pt-2 border-t border-border-light">
          {#each meta as item}
            <span class="flex items-center gap-1">
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
