<script lang="ts">
  /**
   * AppShell - Main application container component.
   *
   * Provides the top-level structure for the application:
   * - Full-height layout
   * - Flexible content area
   *
   * Future @spine/ui candidate.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    class?: string;
  }

  let { children, class: className = '' }: Props = $props();
</script>

<div class="app-shell {className}">
  {@render children()}
</div>

<style>
  .app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
