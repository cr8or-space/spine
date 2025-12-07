<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    icon?: Snippet;
    action?: Snippet;
  }

  let { title, description, icon, action }: Props = $props();
</script>

<div class="empty-state">
  {#if icon}
    <div class="icon">
      {@render icon()}
    </div>
  {:else}
    <div class="icon default-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    </div>
  {/if}

  <h3 class="title">{title}</h3>

  {#if description}
    <p class="description">{description}</p>
  {/if}

  {#if action}
    <div class="action">
      {@render action()}
    </div>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-12) var(--space-4);
  }

  .icon {
    margin-bottom: var(--space-4);
  }

  .default-icon {
    color: var(--color-text-tertiary);
  }

  .title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: var(--space-2) 0 0;
    max-width: 400px;
  }

  .action {
    margin-top: var(--space-6);
  }
</style>
