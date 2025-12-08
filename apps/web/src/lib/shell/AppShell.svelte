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
  import { cn } from '$lib/utils/cn';

  interface Props {
    children: Snippet;
    class?: string;
  }

  let { children, class: className = '' }: Props = $props();
</script>

<div class={cn('min-h-screen flex flex-col', className)}>
  {@render children()}
</div>
