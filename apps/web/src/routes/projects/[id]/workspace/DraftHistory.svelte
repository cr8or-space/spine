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

<div class="history-panel">
  <header class="panel-header">
    <h3 class="panel-title">History</h3>
    <button class="close-btn" onclick={onClose} aria-label="Close panel">
      <X size={16} />
    </button>
  </header>

  <div class="panel-content">
    {#if !content}
      <div class="no-content">
        <Clock size={32} strokeWidth={1.5} />
        <p>No content history yet</p>
        <p class="hint">Save some content to start tracking versions.</p>
      </div>
    {:else if sortedVersions.length === 0}
      <div class="no-content">
        <p>No versions available</p>
      </div>
    {:else}
      <div class="versions-list">
        {#each sortedVersions as version (version.version)}
          <div
            class="version-item"
            class:current={version.version === content.currentVersion}
          >
            <div class="version-header">
              <div class="version-info">
                <span class="version-number">v{version.version}</span>
                {#if version.version === content.currentVersion}
                  <Badge size="sm" variant="primary">Current</Badge>
                {/if}
                <Badge size="sm" variant={getSourceVariant(version.source)}>
                  {getSourceLabel(version.source)}
                </Badge>
              </div>
              <span class="version-date">{formatDate(version.createdAt)}</span>
            </div>

            <div class="version-stats">
              <span class="stat">{version.wordCount.toLocaleString()} words</span>
              {#if version.metadata?.editDescription}
                <span class="description">{version.metadata.editDescription}</span>
              {/if}
              {#if version.metadata?.modelId}
                <span class="model">{version.metadata.modelId}</span>
              {/if}
            </div>

            <div class="version-actions">
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

      <div class="history-stats">
        <span class="stats-item">{sortedVersions.length} versions</span>
        <span class="stats-item">
          {sortedVersions.filter(v => v.source === 'generated').length} generated
        </span>
        <span class="stats-item">
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
    <div class="preview-dialog">
      <div class="preview-meta">
        <Badge variant={getSourceVariant(selectedVersion.source)}>
          {getSourceLabel(selectedVersion.source)}
        </Badge>
        <span class="preview-date">{formatDate(selectedVersion.createdAt)}</span>
        <span class="preview-words">{selectedVersion.wordCount.toLocaleString()} words</span>
      </div>

      <div class="preview-content">
        <pre class="preview-text">{selectedVersion.text}</pre>
      </div>

      <div class="preview-actions">
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
  <div class="rollback-dialog">
    <p class="rollback-warning">
      Are you sure you want to restore version {rollbackTarget}? This will create a new version based on the selected version's content.
    </p>
    <p class="rollback-note">
      The current content will not be deleted - it will remain in the version history.
    </p>
    <div class="rollback-actions">
      <Button variant="secondary" onclick={() => (showRollbackConfirm = false)}>
        Cancel
      </Button>
      <Button onclick={executeRollback}>
        Restore Version
      </Button>
    </div>
  </div>
</Dialog>

<style>
  .history-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .panel-title {
    font-size: var(--text-sm);
    font-weight: 600;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
  }

  .close-btn:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text);
  }

  .panel-content {
    flex: 1;
    overflow: auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* No Content State */
  .no-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-8) var(--space-4);
    color: var(--color-text-secondary);
  }

  .no-content :global(svg) {
    margin-bottom: var(--space-3);
    color: var(--color-text-tertiary);
  }

  .no-content p {
    margin: 0;
    font-size: var(--text-sm);
  }

  .hint {
    color: var(--color-text-tertiary);
    font-size: var(--text-xs);
    margin-top: var(--space-1);
  }

  /* Versions List */
  .versions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .version-item {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
  }

  .version-item.current {
    border-color: var(--color-primary);
    background-color: var(--color-primary-light);
  }

  .version-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .version-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .version-number {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .version-date {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }

  .version-stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
  }

  .version-stats .stat {
    padding: var(--space-1) var(--space-2);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  .version-stats .description {
    flex: 1;
    min-width: 100%;
    font-style: italic;
  }

  .version-stats .model {
    color: var(--color-text-tertiary);
  }

  .version-actions {
    display: flex;
    gap: var(--space-2);
  }

  .history-stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .stats-item {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }

  /* Preview Dialog */
  .preview-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .preview-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .preview-date,
  .preview-words {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .preview-content {
    max-height: 400px;
    overflow: auto;
    padding: var(--space-4);
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }

  .preview-text {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: var(--text-sm);
    line-height: 1.8;
    white-space: pre-wrap;
    margin: 0;
  }

  .preview-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  /* Rollback Dialog */
  .rollback-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .rollback-warning {
    font-size: var(--text-sm);
    margin: 0;
  }

  .rollback-note {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
    padding: var(--space-3);
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .rollback-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }
</style>
