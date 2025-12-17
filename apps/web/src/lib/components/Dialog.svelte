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
  import { X } from 'lucide-svelte';

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
    <Dialog.Overlay
      class="fixed inset-0 bg-black/50 z-[1000] animate-[fadeIn_0.15s_ease-out]"
    />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-xl shadow-lg w-[calc(100%-2rem)] max-w-[480px] max-h-[calc(100vh-2rem)] flex flex-col z-[1001] animate-[dialogIn_0.2s_ease-out]"
      interactOutsideBehavior={closeOnBackdropClick ? 'close' : 'ignore'}
      escapeKeydownBehavior={closeOnEscape ? 'close' : 'ignore'}
      role="dialog"
      aria-modal="true"
    >
      <header class="flex items-center justify-between px-6 py-4 border-b border-border">
        <Dialog.Title class="text-lg font-semibold m-0">{title}</Dialog.Title>
        <Dialog.Close
          class="flex items-center justify-center w-8 h-8 border-none bg-transparent rounded-md text-text-secondary cursor-pointer transition-all duration-150 hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          aria-label="Close dialog"
        >
          <X size={20} />
        </Dialog.Close>
      </header>

      {#if description}
        <Dialog.Description class="px-6 mt-2 text-sm text-text-secondary">
          {description}
        </Dialog.Description>
      {/if}

      <div class="p-6 overflow-y-auto flex-1">
        {@render children()}
      </div>

      {#if footer}
        <footer class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          {@render footer()}
        </footer>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
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
</style>
