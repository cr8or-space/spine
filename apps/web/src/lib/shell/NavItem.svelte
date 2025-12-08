<script lang="ts">
  /**
   * NavItem - Navigation item component for use in Header or Sidebar.
   *
   * Renders a navigation link with optional icon and active state.
   *
   * Future @spine/ui candidate.
   */
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    href: string;
    active?: boolean;
    icon?: Snippet;
    children: Snippet;
    class?: string;
  }

  let { href, active = false, icon, children, class: className = '' }: Props = $props();
</script>

<a
  {href}
  class={cn(
    'flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary no-underline rounded-md transition-all duration-150',
    'hover:bg-surface-hover hover:text-text',
    active && 'bg-primary-light text-primary',
    className
  )}
>
  {#if icon}
    <span class="flex items-center justify-center w-[18px] h-[18px]">
      {@render icon()}
    </span>
  {/if}
  <span class="whitespace-nowrap">
    {@render children()}
  </span>
</a>
