<!--
  Dialog.svelte - Accessible dialog component using Bits UI

  This component wraps Bits UI Dialog primitives to provide:
  - Focus trap within the dialog
  - Return focus to trigger on close
  - Escape key closes (configurable)
  - Backdrop click closes (configurable)
  - Proper ARIA attributes and roles
-->
<script lang="ts">
  import { Dialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: Snippet;
    footer?: Snippet;
    closeOnBackdropClick?: boolean;
    closeOnEscape?: boolean;
  }

  let {
    open = $bindable(),
    title,
    description,
    onClose,
    children,
    footer,
    closeOnBackdropClick = true,
    closeOnEscape = true,
  }: Props = $props();

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onClose();
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-backdrop" />
    <Dialog.Content
      class="dialog"
      interactOutsideBehavior={closeOnBackdropClick ? 'close' : 'ignore'}
      escapeKeydownBehavior={closeOnEscape ? 'close' : 'ignore'}
    >
      <header class="dialog-header">
        <Dialog.Title class="dialog-title">{title}</Dialog.Title>
        <Dialog.Close class="dialog-close" aria-label="Close dialog">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </Dialog.Close>
      </header>

      {#if description}
        <Dialog.Description class="dialog-description">{description}</Dialog.Description>
      {/if}

      <div class="dialog-content">
        {@render children()}
      </div>

      {#if footer}
        <footer class="dialog-footer">
          {@render footer()}
        </footer>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.dialog-backdrop) {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  :global(.dialog) {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--color-surface);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    width: calc(100% - var(--space-8));
    max-width: 480px;
    max-height: calc(100vh - var(--space-8));
    display: flex;
    flex-direction: column;
    z-index: 1001;
    animation: dialogIn 0.2s ease-out;
  }

  @keyframes dialogIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border);
  }

  :global(.dialog-title) {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
  }

  :global(.dialog-close) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  :global(.dialog-close:hover) {
    background-color: var(--color-surface-hover);
    color: var(--color-text);
  }

  :global(.dialog-close:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  :global(.dialog-description) {
    padding: 0 var(--space-6);
    margin-top: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .dialog-content {
    padding: var(--space-6);
    overflow-y: auto;
    flex: 1;
  }

  .dialog-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border);
  }
</style>
