<script lang="ts">
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { ArrowLeft, BookOpen, SquarePen, Settings, ClipboardCheck, BarChart3, Radio } from 'lucide-svelte';
  import { AppShell, NavRail, TopBar, NavItem } from '$lib/shell';

  interface Props {
    data: LayoutData;
    children: Snippet;
  }

  let { data, children }: Props = $props();

  const navItems = $derived([
    { href: `/projects/${data.project.id}/bible`, label: 'Bible', icon: BookOpen },
    { href: `/projects/${data.project.id}/workspace`, label: 'Workspace', icon: SquarePen },
    { href: `/projects/${data.project.id}/review`, label: 'Review', icon: ClipboardCheck },
    { href: `/projects/${data.project.id}/analytics`, label: 'Analytics', icon: BarChart3 },
    { href: `/projects/${data.project.id}/serial`, label: 'Serial', icon: Radio },
    { href: `/projects/${data.project.id}/settings`, label: 'Settings', icon: Settings },
  ]);

  function isActive(href: string): boolean {
    return $page.url.pathname.startsWith(href);
  }
</script>

<AppShell class="bg-transparent">
  <div class="flex min-h-screen">
    <NavRail>
      {#snippet header()}
        <div class="flex items-center gap-2">
          <a
            href="/"
            class="flex items-center justify-center w-9 h-9 rounded-md text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
            aria-label="Back to projects"
            title="Back to projects"
          >
            <ArrowLeft size={18} />
          </a>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-semibold text-text truncate">{data.project.title}</span>
            <span class="text-xs text-text-tertiary truncate">Project</span>
          </div>
        </div>
      {/snippet}

      {#each navItems as item}
        <NavItem href={item.href} active={isActive(item.href)} class="w-full">
          {#snippet children()}
            <span class="flex items-center gap-2">
              <item.icon size={18} />
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
      </TopBar>

      <main class="flex-1 flex flex-col">
        {@render children()}
      </main>
    </div>
  </div>
</AppShell>
