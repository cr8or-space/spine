<script lang="ts">
  import Dialog from './Dialog.svelte';
  import Button from './Button.svelte';

  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
  }: Props = $props();
</script>

<Dialog {open} {title} onClose={onCancel}>
  <p class="message">{message}</p>

  {#snippet footer()}
    <Button variant="secondary" onclick={onCancel}>
      {cancelLabel}
    </Button>
    <Button variant={variant} onclick={onConfirm}>
      {confirmLabel}
    </Button>
  {/snippet}
</Dialog>

<style>
  .message {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.6;
  }
</style>
