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

<div class="tree-node" style="--depth: {depth}">
  <div
    class="tree-item"
    class:selected={isSelected}
    onclick={handleSelect}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(); }}
    role="button"
    tabindex="0"
  >
    <!-- Expand/Collapse Toggle -->
    {#if hasChildren}
      <span
        class="expand-toggle"
        onclick={toggleExpand}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(e); }}}
        role="button"
        tabindex="0"
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <ChevronRight size={12} class={isExpanded ? 'expanded' : ''} />
      </span>
    {:else}
      <span class="expand-spacer"></span>
    {/if}

    <!-- Type Icon -->
    <TypeIcon class="type-icon" size={14} />

    <!-- Title -->
    <span class="tree-title">{structure.title}</span>

    <!-- Indicators -->
    <span class="tree-indicators">
      {#if structure.beats.length > 0}
        <span class="beat-count" title="{structure.beats.length} beats">
          {structure.beats.filter(b => b.completed).length}/{structure.beats.length}
        </span>
      {/if}
      {#if structure.hook}
        <Image class="hook-indicator" size={12} aria-label="Has hook" />
      {/if}
      {#if structure.tensionTarget !== undefined}
        <span class="tension-indicator" title="Tension target: {structure.tensionTarget}">
          {structure.tensionTarget}
        </span>
      {/if}
    </span>

    <!-- Add Child Button -->
    {#if canAddChildren(structure.type)}
      <span
        class="add-child-btn"
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
    <div class="tree-children">
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

<style>
  .tree-node {
    display: flex;
    flex-direction: column;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    padding-left: calc(var(--space-2) + var(--depth) * var(--space-4));
    width: 100%;
    border: none;
    background: none;
    font-family: inherit;
    font-size: var(--text-sm);
    color: var(--color-text);
    text-align: left;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background-color var(--transition-fast);
  }

  .tree-item:hover {
    background-color: var(--color-surface-hover);
  }

  .tree-item.selected {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
  }

  .expand-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    background: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    flex-shrink: 0;
  }

  .expand-toggle :global(svg) {
    transition: transform var(--transition-fast);
  }

  .expand-toggle :global(.expanded) {
    transform: rotate(90deg);
  }

  .expand-spacer {
    width: 16px;
    flex-shrink: 0;
  }

  .tree-item :global(.type-icon) {
    flex-shrink: 0;
    color: var(--color-text-secondary);
  }

  .tree-item.selected :global(.type-icon) {
    color: var(--color-primary);
  }

  .tree-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tree-indicators {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .beat-count {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    background-color: var(--color-bg);
    padding: 0 var(--space-1);
    border-radius: var(--radius-sm);
  }

  .tree-indicators :global(.hook-indicator) {
    color: var(--color-success);
  }

  .tension-indicator {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-warning);
    min-width: 20px;
    text-align: center;
  }

  .add-child-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    background: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .tree-item:hover .add-child-btn {
    display: flex;
  }

  .add-child-btn:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-primary);
  }

  .tree-children {
    display: flex;
    flex-direction: column;
  }
</style>
