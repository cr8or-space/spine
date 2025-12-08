<script lang="ts">
  import type { Structure } from '@repo/types';
  import OutlineTree from './OutlineTree.svelte';

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

  function getTypeIcon(type: Structure['type']): string {
    switch (type) {
      case 'book':
        return 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
      case 'arc':
        return 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V17H6.5a2.5 2.5 0 0 0-2.5 2.5zM4 19.5V6.5A2.5 2.5 0 0 1 6.5 4H20v13H6.5a2.5 2.5 0 0 0-2.5 2.5z';
      case 'chapter':
        return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8';
      case 'scene':
        return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6';
      default:
        return '';
    }
  }

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
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="transition-transform duration-150 {isExpanded ? 'rotate-90' : ''}"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
    {:else}
      <span class="w-4 shrink-0"></span>
    {/if}

    <!-- Type Icon -->
    <svg
      class="shrink-0 {isSelected ? 'text-primary' : 'text-text-secondary'}"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d={getTypeIcon(structure.type)} />
    </svg>

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
        <svg
          class="text-success"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-label="Has hook"
        >
          <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
          <path d="M14 3v6h6" />
          <path d="m12 12 4 6H8l4-6Z" />
        </svg>
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
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
