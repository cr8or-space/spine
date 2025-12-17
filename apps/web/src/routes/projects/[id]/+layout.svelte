<script lang="ts">
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { ArrowLeft, BookOpen, SquarePen, Settings, ClipboardCheck, BarChart3, Radio, Command as CommandIcon, LayoutDashboard } from 'lucide-svelte';
  import { AppShell, NavRail, TopBar, NavItem } from '$lib/shell';
  import { CommandPalette } from '$lib/components';
  import { onMount } from 'svelte';

  interface Props {
    data: LayoutData;
    children: Snippet;
  }

  let { data, children }: Props = $props();

  // Command palette state
  let commandPaletteOpen = $state(false);

  const navItems = $derived([
    { href: `/projects/${data.project.id}`, label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: `/projects/${data.project.id}/workspace`, label: 'Workspace', icon: SquarePen },
    { href: `/projects/${data.project.id}/bible`, label: 'Bible', icon: BookOpen },
    { href: `/projects/${data.project.id}/review`, label: 'Review', icon: ClipboardCheck },
    { href: `/projects/${data.project.id}/analytics`, label: 'Analytics', icon: BarChart3 },
    { href: `/projects/${data.project.id}/serial`, label: 'Serial', icon: Radio },
    { href: `/projects/${data.project.id}/settings`, label: 'Settings', icon: Settings },
  ]);

  function isActive(href: string, exact = false): boolean {
    if (exact) {
      return $page.url.pathname === href;
    }
    return $page.url.pathname.startsWith(href);
  }

  // Global keyboard shortcut handler
  function handleKeydown(e: KeyboardEvent) {
    // Ctrl/Cmd + K to open command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      commandPaletteOpen = !commandPaletteOpen;
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<AppShell class="bg-transparent">
  <div class="flex min-h-screen">
    <NavRail>
      {#snippet header()}
        <div class="flex items-center gap-2">
          <a
            href="/"
            class="back-link flex items-center justify-center w-9 h-9 rounded-md text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
            aria-label="Back to projects"
            title="Back to projects"
            data-testid="back-to-projects"
          >
            <ArrowLeft size={18} />
          </a>
          <div class="flex flex-col min-w-0">
            <span class="project-title text-sm font-semibold text-text truncate" data-testid="project-title">{data.project.title}</span>
            <span class="text-xs text-text-tertiary truncate">Project</span>
          </div>
        </div>
      {/snippet}

      {#each navItems as item}
        <NavItem href={item.href} active={isActive(item.href, item.exact)} class="w-full">
          {#snippet children()}
            {@const IconComponent = item.icon}
            <span class="flex items-center gap-2">
              <IconComponent size={18} />
              <span>{item.label}</span>
            </span>
          {/snippet}
        </NavItem>
      {/each}
    </NavRail>

    <div class="flex-1 flex flex-col min-w-0">
      <TopBar>
        {#snippet left()}
          <div class="flex items-center gap-2">
            <span class="text-sm text-text-secondary">Project</span>
            <span class="text-base font-semibold text-text truncate">{data.project.title}</span>
          </div>
        {/snippet}
        {#snippet right()}
          <button
            class="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
            onclick={() => (commandPaletteOpen = true)}
            aria-label="Open command palette"
          >
            <CommandIcon size={14} />
            <span class="hidden sm:inline">Command</span>
            <kbd class="ml-1 hidden rounded bg-surface-hover px-1.5 py-0.5 text-xs font-mono sm:inline">⌘K</kbd>
          </button>
        {/snippet}
      </TopBar>

      <main class="flex-1 flex flex-col">
        {@render children()}
      </main>
    </div>
  </div>
</AppShell>

<!-- Command Palette -->
<CommandPalette
  bind:open={commandPaletteOpen}
  onClose={() => (commandPaletteOpen = false)}
/>
