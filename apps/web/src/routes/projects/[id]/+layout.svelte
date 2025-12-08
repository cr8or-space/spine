<script lang="ts">
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { ArrowLeft, BookOpen, SquarePen, Settings } from 'lucide-svelte';

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

<div class="project-layout">
  <header class="project-header">
    <div class="header-left">
      <a href="/" class="back-link" title="Back to projects">
        <ArrowLeft size={20} />
      </a>
      <div class="project-info">
        <h1 class="project-title">{data.project.title}</h1>
      </div>
    </div>

    <nav class="project-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-item"
          class:active={isActive(item.href)}
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

  <main class="project-content">
    {@render children()}
  </main>
</div>

<style>
  .project-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .project-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: 0 var(--space-4);
    height: var(--header-height);
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .back-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .back-link:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text);
  }

  .project-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .project-title {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
  }

  .project-nav {
    display: flex;
    gap: var(--space-1);
  }

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

  .project-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
