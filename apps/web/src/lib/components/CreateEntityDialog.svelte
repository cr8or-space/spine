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
  <div class="flex flex-col gap-4">
    {@render children()}

    <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
      <Button type="button" variant="secondary" onclick={onClose}>
        Cancel
      </Button>
      <Button type="submit">{buttonLabel}</Button>
    </div>
  </div>
</Dialog>
