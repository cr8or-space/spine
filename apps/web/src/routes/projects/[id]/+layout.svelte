<script lang="ts">
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { ArrowLeft, BookOpen, SquarePen, Settings } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    data: LayoutData;
    children: Snippet;
  }

  let { data, children }: Props = $props();

  const navItems = $derived([
    { href: `/projects/${data.project.id}/bible`, label: 'Bible', icon: 'book' },
    { href: `/projects/${data.project.id}/workspace`, label: 'Workspace', icon: 'edit' },
    { href: `/projects/${data.project.id}/settings`, label: 'Settings', icon: 'settings' },
  ]);

  function isActive(href: string): boolean {
    return $page.url.pathname.startsWith(href);
  }
</script>

<div class="min-h-screen flex flex-col">
  <header class="flex items-center justify-between gap-4 px-4 h-14 bg-surface border-b border-border">
    <div class="flex items-center gap-3">
      <a
        href="/"
        class="back-link flex items-center justify-center w-9 h-9 rounded-md text-text-secondary transition-all duration-150 hover:bg-surface-hover hover:text-text"
        title="Back to projects"
      >
        <ArrowLeft size={20} />
      </a>
      <div class="flex items-center gap-2">
        <h1 class="project-title text-lg font-semibold m-0">{data.project.title}</h1>
      </div>
    </div>

    <nav class="flex gap-1">
      {#each navItems as item}
        <a
          href={item.href}
          class={cn(
            'nav-item flex items-center gap-2 py-2 px-4 text-sm font-medium text-text-secondary no-underline rounded-md transition-all duration-150',
            'hover:bg-surface-hover hover:text-text',
            isActive(item.href) && 'active bg-primary-light text-primary'
          )}
        >
          {#if item.icon === 'book'}
            <BookOpen size={18} />
          {:else if item.icon === 'edit'}
            <SquarePen size={18} />
          {:else if item.icon === 'settings'}
            <Settings size={18} />
          {/if}
          {item.label}
        </a>
      {/each}
    </nav>
  </header>

  <main class="flex-1 flex flex-col">
    {@render children()}
  </main>
</div>
