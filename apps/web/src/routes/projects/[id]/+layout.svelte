<script lang="ts">
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';

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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          {:else if item.icon === 'edit'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          {:else if item.icon === 'settings'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
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
