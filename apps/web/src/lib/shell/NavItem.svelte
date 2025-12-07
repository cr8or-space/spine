<script lang="ts">
  /**
   * NavItem - Navigation item component for use in Header or Sidebar.
   *
   * Renders a navigation link with optional icon and active state.
   *
   * Future @spine/ui candidate.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    href: string;
    active?: boolean;
    icon?: Snippet;
    children: Snippet;
    class?: string;
  }

  let { href, active = false, icon, children, class: className = '' }: Props = $props();
</script>

<a {href} class="nav-item {className}" class:active>
  {#if icon}
    <span class="nav-icon">
      {@render icon()}
    </span>
  {/if}
  <span class="nav-label">
    {@render children()}
  </span>
</a>

<style>
  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .nav-item:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text);
  }

  .nav-item.active {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
  }

  .nav-label {
    white-space: nowrap;
  }
</style>
