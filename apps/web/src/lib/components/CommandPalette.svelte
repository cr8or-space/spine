<script lang="ts">
  import { Command } from 'bits-ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    Book,
    Users,
    MapPin,
    Scroll,
    GitBranch,
    Clock,
    FileText,
    BarChart3,
    Calendar,
    Settings,
    Search,
    Home,
    LayoutDashboard,
    type Icon,
  } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open = $bindable(), onClose }: Props = $props();

  let searchValue = $state('');

  // Get current project ID from URL
  const projectId = $derived($page.params.id);

  interface CommandItem {
    id: string;
    label: string;
    keywords?: string[];
    icon?: Icon;
    onSelect: () => void;
    group: string;
  }

  // Define all available commands
  const commands: CommandItem[] = $derived.by(() => {
    if (!projectId) return [];

    return [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        keywords: ['home', 'overview', 'summary'],
        icon: LayoutDashboard,
        onSelect: () => navigate(`/projects/${projectId}`),
        group: 'Navigation',
      },
      {
        id: 'nav-workspace',
        label: 'Go to Workspace',
        keywords: ['write', 'editor', 'draft', 'content'],
        icon: FileText,
        onSelect: () => navigate(`/projects/${projectId}/workspace`),
        group: 'Navigation',
      },
      {
        id: 'nav-bible',
        label: 'Go to Bible',
        keywords: ['characters', 'locations', 'world', 'lore'],
        icon: Book,
        onSelect: () => navigate(`/projects/${projectId}/bible`),
        group: 'Navigation',
      },
      {
        id: 'nav-review',
        label: 'Go to Review Queue',
        keywords: ['approve', 'edit', 'revise'],
        icon: Search,
        onSelect: () => navigate(`/projects/${projectId}/review`),
        group: 'Navigation',
      },
      {
        id: 'nav-analytics',
        label: 'Go to Analytics',
        keywords: ['stats', 'charts', 'metrics', 'tension'],
        icon: BarChart3,
        onSelect: () => navigate(`/projects/${projectId}/analytics`),
        group: 'Navigation',
      },
      {
        id: 'nav-serial',
        label: 'Go to Serial Dashboard',
        keywords: ['schedule', 'buffer', 'release', 'hooks'],
        icon: Calendar,
        onSelect: () => navigate(`/projects/${projectId}/serial`),
        group: 'Navigation',
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        keywords: ['config', 'options', 'preferences'],
        icon: Settings,
        onSelect: () => navigate(`/projects/${projectId}/settings`),
        group: 'Navigation',
      },
      {
        id: 'nav-projects',
        label: 'Go to Projects',
        keywords: ['home', 'list', 'switch'],
        icon: Home,
        onSelect: () => navigate('/'),
        group: 'Navigation',
      },

      // Bible - Characters
      {
        id: 'bible-characters',
        label: 'View Characters',
        keywords: ['people', 'cast'],
        icon: Users,
        onSelect: () => navigate(`/projects/${projectId}/bible?tab=characters`),
        group: 'Bible',
      },
      {
        id: 'bible-locations',
        label: 'View Locations',
        keywords: ['places', 'settings', 'world'],
        icon: MapPin,
        onSelect: () => navigate(`/projects/${projectId}/bible?tab=locations`),
        group: 'Bible',
      },
      {
        id: 'bible-factions',
        label: 'View Factions',
        keywords: ['groups', 'organizations'],
        icon: Users,
        onSelect: () => navigate(`/projects/${projectId}/bible?tab=factions`),
        group: 'Bible',
      },
      {
        id: 'bible-world-rules',
        label: 'View World Rules',
        keywords: ['magic', 'laws', 'constraints'],
        icon: Scroll,
        onSelect: () => navigate(`/projects/${projectId}/bible?tab=world-rules`),
        group: 'Bible',
      },
      {
        id: 'bible-plot-threads',
        label: 'View Plot Threads',
        keywords: ['storylines', 'arcs', 'plots'],
        icon: GitBranch,
        onSelect: () => navigate(`/projects/${projectId}/bible?tab=plot-threads`),
        group: 'Bible',
      },
      {
        id: 'bible-timeline',
        label: 'View Timeline',
        keywords: ['events', 'history', 'chronology'],
        icon: Clock,
        onSelect: () => navigate(`/projects/${projectId}/bible?tab=timeline`),
        group: 'Bible',
      },
    ];
  });

  // Group commands
  const groupedCommands = $derived.by(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const cmd of commands) {
      if (!groups[cmd.group]) {
        groups[cmd.group] = [];
      }
      groups[cmd.group].push(cmd);
    }
    return groups;
  });

  function navigate(path: string) {
    goto(path);
    handleClose();
  }

  function handleClose() {
    searchValue = '';
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh]"
    onclick={(e) => {
      if (e.target === e.currentTarget) handleClose();
    }}
    onkeydown={handleKeydown}
    role="presentation"
  >
    <div class="w-full max-w-lg rounded-lg border border-border bg-surface shadow-xl">
      <Command.Root
        class="flex flex-col"
        bind:value={searchValue}
        label="Command Menu"
      >
        <div class="flex items-center gap-2 border-b border-border px-3">
          <Search class="h-4 w-4 shrink-0 text-text-tertiary" />
          <Command.Input
            class="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
            placeholder="Type a command or search..."
          />
        </div>

        <Command.List class="max-h-80 overflow-auto p-2">
          <Command.Viewport class="flex flex-col gap-1">
            <Command.Empty class="px-4 py-6 text-center text-sm text-text-secondary">
              No commands found
            </Command.Empty>

            {#each Object.entries(groupedCommands) as [groupName, items]}
              <Command.Group>
                <Command.GroupHeading class="px-2 py-1.5 text-xs font-semibold text-text-tertiary">
                  {groupName}
                </Command.GroupHeading>
                <Command.GroupItems>
                  {#each items as item}
                    <Command.Item
                      value={item.id}
                      keywords={item.keywords}
                      onSelect={item.onSelect}
                      class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm data-[highlighted]:bg-surface-hover"
                    >
                      {#if item.icon}
                        {@const IconComponent = item.icon}
                        <IconComponent class="h-4 w-4 text-text-secondary" />
                      {/if}
                      <span>{item.label}</span>
                    </Command.Item>
                  {/each}
                </Command.GroupItems>
              </Command.Group>
            {/each}
          </Command.Viewport>
        </Command.List>

        <div class="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-text-tertiary">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <kbd class="rounded bg-surface-hover px-1.5 py-0.5 font-mono">↑↓</kbd>
              navigate
            </span>
            <span class="flex items-center gap-1">
              <kbd class="rounded bg-surface-hover px-1.5 py-0.5 font-mono">↵</kbd>
              select
            </span>
            <span class="flex items-center gap-1">
              <kbd class="rounded bg-surface-hover px-1.5 py-0.5 font-mono">esc</kbd>
              close
            </span>
          </div>
        </div>
      </Command.Root>
    </div>
  </div>
{/if}
