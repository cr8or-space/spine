<!--
  Tabs.svelte - Accessible tabs component using Bits UI

  This component wraps Bits UI Tabs primitives to provide:
  - Arrow key navigation between tabs
  - Proper ARIA roles and attributes
  - Automatic activation on focus
  - Support for vertical and horizontal orientation
-->
<script lang="ts">
  import { Tabs } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Tab {
    id: string;
    label: string;
    count?: number;
  }

  interface Props {
    tabs: Tab[];
    active?: string;
    orientation?: 'horizontal' | 'vertical';
    children?: Snippet<[string]>;
  }

  let { tabs, active = $bindable(''), orientation = 'horizontal', children }: Props = $props();

  // Ensure active has a default value if empty
  $effect(() => {
    if (!active && tabs.length > 0) {
      active = tabs[0].id;
    }
  });

  const listBaseClasses = 'flex gap-1 overflow-x-auto';
  const listHorizontalClasses = 'border-b border-border px-4';
  const listVerticalClasses = 'flex-col border-r border-border py-4';

  const tabBaseClasses =
    'flex items-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary bg-transparent border-none border-b-2 border-transparent -mb-px cursor-pointer transition-all duration-150 whitespace-nowrap hover:text-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 focus-visible:rounded-sm data-[state=active]:text-primary data-[state=active]:border-b-primary';

  const tabVerticalClasses =
    'border-b-0 border-r-2 !-mb-0 -mr-px justify-start data-[state=active]:border-b-transparent data-[state=active]:border-r-primary';

  const countBaseClasses =
    'inline-flex items-center justify-center min-w-5 h-5 px-2 text-xs bg-bg-tertiary rounded-full';

  const countActiveClasses = 'bg-primary-light text-primary';
</script>

<Tabs.Root bind:value={active} {orientation} class="flex flex-col w-full">
  <Tabs.List
    class={cn(
      listBaseClasses,
      orientation === 'vertical' ? listVerticalClasses : listHorizontalClasses
    )}
  >
    {#each tabs as tab (tab.id)}
      <Tabs.Trigger
        value={tab.id}
        class={cn(tabBaseClasses, orientation === 'vertical' && tabVerticalClasses)}
      >
        {tab.label}
        {#if tab.count !== undefined}
          <span
            class={cn(countBaseClasses, active === tab.id && countActiveClasses)}
          >
            {tab.count}
          </span>
        {/if}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>

  {#if children}
    {#each tabs as tab (tab.id)}
      <Tabs.Content value={tab.id} class="p-4 data-[state=inactive]:hidden">
        {@render children(tab.id)}
      </Tabs.Content>
    {/each}
  {/if}
</Tabs.Root>
