<script lang="ts">
  import type { Content, ContentVersion } from '@repo/types';
  import { Button, Badge, Dialog } from '$lib/components';
  import { invalidateAll } from '$app/navigation';
  import { X, Clock } from 'lucide-svelte';

  interface Props {
    content?: Content;
    onClose: () => void;
  }

  let { content, onClose }: Props = $props();

  let selectedVersion: ContentVersion | null = $state(null);
  let showRollbackConfirm = $state(false);
  let rollbackTarget: number | null = $state(null);

  const sortedVersions = $derived(
    content?.versions ? [...content.versions].sort((a, b) => b.version - a.version) : []
  );

  function getSourceLabel(source: ContentVersion['source']): string {
    switch (source) {
      case 'generated':
        return 'Generated';
      case 'edited':
        return 'Edited';
      case 'imported':
        return 'Imported';
      case 'rollback':
        return 'Rollback';
      default:
        return source;
    }
  }

  function getSourceVariant(source: ContentVersion['source']): 'default' | 'primary' | 'success' | 'warning' | 'info' {
    switch (source) {
      case 'generated':
        return 'primary';
      case 'edited':
        return 'success';
      case 'imported':
        return 'info';
      case 'rollback':
        return 'warning';
      default:
        return 'default';
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function previewVersion(version: ContentVersion) {
    selectedVersion = version;
  }

  function closePreview() {
    selectedVersion = null;
  }

  function confirmRollback(version: number) {
    rollbackTarget = version;
    showRollbackConfirm = true;
  }

  async function executeRollback() {
    if (!content || !rollbackTarget) return;

    const formData = new FormData();
    formData.append('contentId', content.id);
    formData.append('targetVersion', rollbackTarget.toString());

    try {
      const response = await fetch(`?/rollbackContent`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await invalidateAll();
        showRollbackConfirm = false;
        rollbackTarget = null;
      }
    } catch (err) {
      console.error('Rollback failed:', err);
    }
  }
</script>

<div class="flex h-full flex-col">
  <header class="flex items-center justify-between border-b border-border px-4 py-3">
    <h3 class="m-0 text-sm font-semibold uppercase tracking-wide text-text-secondary">History</h3>
    <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-text-tertiary hover:bg-surface-hover hover:text-text" onclick={onClose} aria-label="Close panel">
      <X size={16} />
    </button>
  </header>

  <div class="flex flex-1 flex-col gap-4 overflow-auto p-4">
    {#if !content}
      <div class="flex flex-col items-center justify-center px-4 py-8 text-center text-text-secondary">
        <Clock class="mb-3 text-text-tertiary" size={32} strokeWidth={1.5} />
        <p class="m-0 text-sm">No content history yet</p>
        <p class="mt-1 text-xs text-text-tertiary">Save some content to start tracking versions.</p>
      </div>
    {:else if sortedVersions.length === 0}
      <div class="flex flex-col items-center justify-center px-4 py-8 text-center text-text-secondary">
        <p class="m-0 text-sm">No versions available</p>
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each sortedVersions as version (version.version)}
          <div class="rounded-md border p-3 {version.version === content.currentVersion ? 'border-primary bg-primary-light' : 'border-transparent bg-bg'}">
            <div class="mb-2 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold">v{version.version}</span>
                {#if version.version === content.currentVersion}
                  <Badge size="sm" variant="primary">Current</Badge>
                {/if}
                <Badge size="sm" variant={getSourceVariant(version.source)}>
                  {getSourceLabel(version.source)}
                </Badge>
              </div>
              <span class="text-xs text-text-tertiary">{formatDate(version.createdAt)}</span>
            </div>

            <div class="mb-2 flex flex-wrap gap-2 text-xs text-text-secondary">
              <span class="rounded-sm bg-surface px-2 py-1">{version.wordCount.toLocaleString()} words</span>
              {#if version.metadata?.editDescription}
                <span class="min-w-full flex-1 italic">{version.metadata.editDescription}</span>
              {/if}
              {#if version.metadata?.modelId}
                <span class="text-text-tertiary">{version.metadata.modelId}</span>
              {/if}
            </div>

            <div class="flex gap-2">
              <Button size="sm" variant="ghost" onclick={() => previewVersion(version)}>
                Preview
              </Button>
              {#if version.version !== content.currentVersion}
                <Button size="sm" variant="ghost" onclick={() => confirmRollback(version.version)}>
                  Restore
                </Button>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="flex flex-wrap gap-3 border-t border-border pt-3">
        <span class="text-xs text-text-tertiary">{sortedVersions.length} versions</span>
        <span class="text-xs text-text-tertiary">
          {sortedVersions.filter(v => v.source === 'generated').length} generated
        </span>
        <span class="text-xs text-text-tertiary">
          {sortedVersions.filter(v => v.source === 'edited').length} edited
        </span>
      </div>
    {/if}
  </div>
</div>

<!-- Version Preview Dialog -->
<Dialog
  open={!!selectedVersion}
  title="Version {selectedVersion?.version} Preview"
  onClose={closePreview}
>
  {#if selectedVersion}
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <Badge variant={getSourceVariant(selectedVersion.source)}>
          {getSourceLabel(selectedVersion.source)}
        </Badge>
        <span class="text-sm text-text-secondary">{formatDate(selectedVersion.createdAt)}</span>
        <span class="text-sm text-text-secondary">{selectedVersion.wordCount.toLocaleString()} words</span>
      </div>

      <div class="max-h-[400px] overflow-auto rounded-md border border-border bg-bg p-4">
        <pre class="m-0 whitespace-pre-wrap font-serif text-sm leading-relaxed">{selectedVersion.text}</pre>
      </div>

      <div class="flex justify-end gap-3 border-t border-border pt-3">
        <Button variant="secondary" onclick={closePreview}>Close</Button>
        {#if content && selectedVersion.version !== content.currentVersion}
          <Button onclick={() => {
            closePreview();
            confirmRollback(selectedVersion!.version);
          }}>
            Restore This Version
          </Button>
        {/if}
      </div>
    </div>
  {/if}
</Dialog>

<!-- Rollback Confirmation Dialog -->
<Dialog
  open={showRollbackConfirm}
  title="Restore Version"
  onClose={() => (showRollbackConfirm = false)}
>
  <div class="flex flex-col gap-4">
    <p class="m-0 text-sm">
      Are you sure you want to restore version {rollbackTarget}? This will create a new version based on the selected version's content.
    </p>
    <p class="m-0 rounded-md bg-bg p-3 text-sm text-text-secondary">
      The current content will not be deleted - it will remain in the version history.
    </p>
    <div class="flex justify-end gap-3 border-t border-border pt-3">
      <Button variant="secondary" onclick={() => (showRollbackConfirm = false)}>
        Cancel
      </Button>
      <Button onclick={executeRollback}>
        Restore Version
      </Button>
    </div>
  </div>
</Dialog>
