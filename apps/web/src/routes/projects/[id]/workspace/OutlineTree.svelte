<script lang="ts">
  import type { Structure } from '@repo/types';
  import OutlineTree from './OutlineTree.svelte';
  import { ChevronRight, BookOpen, Library, FileText, File, Image, Plus } from 'lucide-svelte';

  interface Props {
    structure: Structure;
    selectedId?: string;
    onSelect: (id: string) => void;
    onCreateChild: (parentId: string | null) => void;
    depth?: number;
  }

  let { structure, selectedId, onSelect, onCreateChild, depth = 0 }: Props = $props();

  let isExpanded = $state(true);

  const hasChildren = $derived(structure.children.length > 0);
  const isSelected = $derived(structure.id === selectedId);

  const sortedChildren = $derived(
    [...structure.children].sort((a, b) => a.order - b.order)
  );

  function toggleExpand(e: Event) {
    e.stopPropagation();
    isExpanded = !isExpanded;
  }

  function handleSelect() {
    onSelect(structure.id);
  }

  function handleCreateChild(e: Event) {
    e.stopPropagation();
    onCreateChild(structure.id);
  }

  const TypeIcon = $derived.by(() => {
    switch (structure.type) {
      case 'book':
        return BookOpen;
      case 'arc':
        return Library;
      case 'chapter':
        return FileText;
      case 'scene':
        return File;
      default:
        return File;
    }
  });

  function canAddChildren(type: Structure['type']): boolean {
    return type !== 'scene';
  }
</script>

<div class="flex flex-col" style="--depth: {depth}">
  <div
    class="group flex w-full cursor-pointer items-center gap-1 rounded-sm border-none bg-transparent py-1 pr-2 text-left font-sans text-sm text-text transition-colors duration-150 hover:bg-surface-hover {isSelected ? 'bg-primary-light text-primary' : ''}"
    style="padding-left: calc(0.5rem + {depth} * 1rem)"
    onclick={handleSelect}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(); }}
    role="button"
    tabindex="0"
  >
    <!-- Expand/Collapse Toggle -->
    {#if hasChildren}
      <span
        class="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-text-tertiary"
        onclick={toggleExpand}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(e); }}}
        role="button"
        tabindex="0"
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <ChevronRight size={12} class="transition-transform duration-150 {isExpanded ? 'rotate-90' : ''}" />
      </span>
    {:else}
      <span class="w-4 shrink-0"></span>
    {/if}

    <!-- Type Icon -->
    <TypeIcon class="shrink-0 {isSelected ? 'text-primary' : 'text-text-secondary'}" size={14} />

    <!-- Title -->
    <span class="flex-1 truncate">{structure.title}</span>

    <!-- Indicators -->
    <span class="flex shrink-0 items-center gap-2">
      {#if structure.beats.length > 0}
        <span class="rounded-sm bg-bg px-1 text-xs text-text-tertiary" title="{structure.beats.length} beats">
          {structure.beats.filter(b => b.completed).length}/{structure.beats.length}
        </span>
      {/if}
      {#if structure.hook}
        <Image class="text-success" size={12} aria-label="Has hook" />
      {/if}
      {#if structure.tensionTarget !== undefined}
        <span class="min-w-5 text-center text-xs font-medium text-warning" title="Tension target: {structure.tensionTarget}">
          {structure.tensionTarget}
        </span>
      {/if}
    </span>

    <!-- Add Child Button -->
    {#if canAddChildren(structure.type)}
      <span
        class="hidden h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-text-tertiary hover:bg-surface-hover hover:text-primary group-hover:flex"
        onclick={handleCreateChild}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCreateChild(e); }}}
        role="button"
        tabindex="0"
        aria-label="Add child"
      >
        <Plus size={12} />
      </span>
    {/if}
  </div>

  <!-- Children -->
  {#if hasChildren && isExpanded}
    <div class="flex flex-col">
      {#each sortedChildren as child (child.id)}
        <OutlineTree
          structure={child}
          {selectedId}
          {onSelect}
          {onCreateChild}
          depth={depth + 1}
        />
      {/each}
    </div>
  {/if}
</div>
