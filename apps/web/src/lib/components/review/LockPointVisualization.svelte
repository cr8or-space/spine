<script lang="ts">
  import { Lock, Shield, AlertTriangle } from 'lucide-svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Card from '$lib/components/Card.svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    lockReason?: string;
    lockType?: 'cascade-protection' | 'full-lock';
    class?: string;
  }

  let {
    lockReason,
    lockType = 'full-lock',
    class: className
  }: Props = $props();
</script>

<Card class={cn('lock-point-visualization', className)}>
  <div class="flex items-start gap-4">
    <div class={cn('p-3 rounded-lg bg-surface-hover', lockType === 'cascade-protection' ? 'text-warning' : 'text-danger')}>
      {#if lockType === 'cascade-protection'}
        <Shield size={24} />
      {:else}
        <Lock size={24} />
      {/if}
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-2">
        <h4 class="text-lg font-semibold">
          {lockType === 'cascade-protection' ? 'Cascade Protection' : 'Full Lock'}
        </h4>
        <Badge variant={lockType === 'cascade-protection' ? 'warning' : 'danger'} size="sm">
          {lockType === 'cascade-protection' ? 'Protected' : 'Locked'}
        </Badge>
      </div>

      <p class="text-sm text-text-secondary mb-3">
        {lockType === 'cascade-protection'
          ? 'This content is protected from revision cascades but can be manually edited.'
          : 'This content is fully locked and cannot be modified.'}
      </p>

      {#if lockReason}
        <div class="p-3 bg-surface-hover rounded-lg border-l-4 border-l-primary">
          <p class="text-sm font-medium text-text-secondary mb-1">Reason:</p>
          <p class="text-sm text-text">{lockReason}</p>
        </div>
      {/if}

      {#if lockType === 'cascade-protection'}
        <div class="flex items-start gap-2 mt-3 p-2 bg-warning/10 rounded text-sm">
          <AlertTriangle size={16} class="text-warning mt-0.5 flex-shrink-0" />
          <p class="text-text-secondary">
            Changes to earlier content will not automatically propagate to this content.
            You'll need to manually update it if needed.
          </p>
        </div>
      {:else}
        <div class="flex items-start gap-2 mt-3 p-2 bg-danger/10 rounded text-sm">
          <AlertTriangle size={16} class="text-danger mt-0.5 flex-shrink-0" />
          <p class="text-text-secondary">
            This content cannot be edited or deleted. Remove the lock first if changes are needed.
          </p>
        </div>
      {/if}
    </div>
  </div>
</Card>
