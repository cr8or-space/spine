<script lang="ts">
  import type { ContentDiff } from '@repo/types/content';
  import { cn } from '$lib/utils/cn';
  import Badge from '$lib/components/Badge.svelte';
  import { FileText, Plus, Minus } from 'lucide-svelte';

  interface Props {
    diff: ContentDiff;
    showWordDiff?: boolean;
    class?: string;
  }

  let { diff, showWordDiff = false, class: className }: Props = $props();

  function getHunkColor(type: 'add' | 'remove' | 'context'): string {
    switch (type) {
      case 'add': return 'bg-success/10 border-l-2 border-success';
      case 'remove': return 'bg-danger/10 border-l-2 border-danger';
      default: return '';
    }
  }

  function getWordDiffClass(type: 'add' | 'remove' | 'unchanged'): string {
    switch (type) {
      case 'add': return 'bg-success text-white px-1 rounded';
      case 'remove': return 'bg-danger text-white px-1 rounded line-through';
      default: return '';
    }
  }
</script>

<div class={cn('diff-view flex flex-col gap-4', className)}>
  <!-- Stats Header -->
  <div class="flex items-center justify-between p-4 bg-surface-hover rounded-lg border border-border">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <FileText size={18} class="text-text-secondary" />
        <span class="text-sm font-medium">Version {diff.fromVersion} → {diff.toVersion}</span>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1 text-success">
          <Plus size={16} />
          <span class="text-sm font-medium">+{diff.stats.additions}</span>
        </div>
        <div class="flex items-center gap-1 text-danger">
          <Minus size={16} />
          <span class="text-sm font-medium">-{diff.stats.deletions}</span>
        </div>
      </div>

      <Badge variant={diff.stats.changePercent > 50 ? 'warning' : 'info'}>
        {diff.stats.changePercent.toFixed(0)}% changed
      </Badge>
    </div>

    {#if diff.timeDelta}
      <div class="text-sm text-text-secondary">
        {new Date(diff.timeDelta).toLocaleString()}
      </div>
    {/if}
  </div>

  <!-- Diff Content -->
  {#if showWordDiff && diff.wordDiff}
    <!-- Word-level diff (inline view) -->
    <div class="p-4 bg-surface rounded-lg border border-border">
      <h3 class="text-sm font-semibold mb-3">Changes</h3>
      <div class="prose max-w-none">
        {#each diff.wordDiff as word}
          <span class={getWordDiffClass(word.type)}>
            {word.value}
          </span>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Line-level diff (side-by-side hunks) -->
    <div class="space-y-2">
      {#each diff.hunks as hunk}
        <div class="diff-hunk rounded-lg border border-border overflow-hidden">
          <!-- Hunk header -->
          <div class="px-3 py-2 bg-surface-hover text-xs font-mono text-text-secondary border-b border-border">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </div>

          <!-- Hunk lines -->
          <div class="divide-y divide-border">
            {#each hunk.lines as line}
              <div class={cn('flex', getHunkColor(line.type))}>
                <!-- Line number column -->
                <div class="flex">
                  {#if line.type !== 'add'}
                    <div class="w-12 px-2 py-1 text-xs font-mono text-text-tertiary text-right select-none">
                      {line.oldLineNumber || ''}
                    </div>
                  {:else}
                    <div class="w-12 px-2 py-1 bg-success/5"></div>
                  {/if}

                  {#if line.type !== 'remove'}
                    <div class="w-12 px-2 py-1 text-xs font-mono text-text-tertiary text-right select-none border-l border-border">
                      {line.newLineNumber || ''}
                    </div>
                  {:else}
                    <div class="w-12 px-2 py-1 bg-danger/5 border-l border-border"></div>
                  {/if}
                </div>

                <!-- Content column -->
                <div class="flex-1 px-3 py-1">
                  <div class="flex items-start gap-2">
                    {#if line.type === 'add'}
                      <span class="text-success select-none">+</span>
                    {:else if line.type === 'remove'}
                      <span class="text-danger select-none">-</span>
                    {:else}
                      <span class="text-text-tertiary select-none"> </span>
                    {/if}
                    <pre class="flex-1 text-sm font-mono whitespace-pre-wrap m-0">{line.content}</pre>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .diff-view :global(.prose) {
    color: var(--color-text);
  }
</style>
