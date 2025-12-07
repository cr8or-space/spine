<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Dialog, Button } from '$lib/components';

  interface Props {
    open: boolean;
    title: string;
    onClose: () => void;
    children: Snippet;
    submitLabel?: string;
  }

  let { open, title, onClose, children, submitLabel }: Props = $props();

  const buttonLabel = $derived(submitLabel ?? title);
</script>

<Dialog {open} {title} {onClose}>
  <div class="dialog-form">
    {@render children()}

    <div class="dialog-actions">
      <Button type="button" variant="secondary" onclick={onClose}>
        Cancel
      </Button>
      <Button type="submit">{buttonLabel}</Button>
    </div>
  </div>
</Dialog>

<style>
  .dialog-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
    margin-top: var(--space-2);
  }
</style>
