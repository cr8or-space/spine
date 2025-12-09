<script lang="ts">
  import type { BufferStatus, BufferDepletion, DeadlineStatus } from '@repo/types';
  import { AlertTriangle, CheckCircle, Clock, TrendingDown } from 'lucide-svelte';

  interface Props {
    bufferStatus: BufferStatus;
    depletion: BufferDepletion;
    deadlineStatus: DeadlineStatus;
  }

  let { bufferStatus, depletion, deadlineStatus }: Props = $props();

  const bufferPercentage = $derived(
    bufferStatus.minimumBuffer > 0
      ? Math.min(100, (bufferStatus.bufferSize / bufferStatus.minimumBuffer) * 100)
      : 100
  );

  const urgencyColor = $derived.by(() => {
    if (deadlineStatus.urgency === 'critical') return 'text-red-600';
    if (deadlineStatus.urgency === 'warning') return 'text-orange-500';
    return 'text-green-600';
  });

  const bufferColor = $derived.by(() => {
    if (!bufferStatus.isHealthy) return 'bg-red-500';
    if (bufferPercentage < 150) return 'bg-orange-500';
    return 'bg-green-500';
  });
</script>

<div class="buffer-status space-y-4">
  <!-- Buffer gauge -->
  <div class="buffer-gauge">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-medium text-text">Release Buffer</h3>
      <span class="text-2xl font-bold text-text">
        {bufferStatus.bufferSize}
        <span class="text-sm font-normal text-text-secondary">
          / {bufferStatus.minimumBuffer} min
        </span>
      </span>
    </div>

    <!-- Progress bar -->
    <div class="relative h-8 bg-surface-raised border border-border rounded-md overflow-hidden">
      <div
        class="absolute inset-y-0 left-0 transition-all duration-300 {bufferColor}"
        style="width: {bufferPercentage}%"
      ></div>
      <div class="relative z-10 h-full flex items-center justify-center">
        <span class="text-xs font-medium text-white drop-shadow">
          {bufferPercentage.toFixed(0)}%
        </span>
      </div>
    </div>

    <!-- Buffer breakdown -->
    <div class="grid grid-cols-3 gap-4 mt-3 text-sm">
      <div class="stat-item">
        <span class="stat-label text-text-secondary">Approved</span>
        <span class="stat-value text-lg font-semibold text-text">
          {bufferStatus.approvedCount}
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label text-text-secondary">Scheduled</span>
        <span class="stat-value text-lg font-semibold text-text">
          {bufferStatus.scheduledCount}
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label text-text-secondary">Published</span>
        <span class="stat-value text-lg font-semibold text-text">
          {bufferStatus.publishedCount}
        </span>
      </div>
    </div>
  </div>

  <!-- Deadline status -->
  <div class="deadline-status border border-border rounded-md p-4">
    <div class="flex items-start gap-3">
      <Clock class={urgencyColor} size={20} />
      <div class="flex-1">
        <h4 class="text-sm font-medium text-text mb-1">Next Deadline</h4>
        <p class="text-sm text-text-secondary mb-2">{deadlineStatus.statusDescription}</p>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-text-secondary">Days until: </span>
            <span class="font-semibold text-text">{deadlineStatus.daysUntilDeadline}</span>
          </div>
          <div>
            <span class="text-text-secondary">Required rate: </span>
            <span class="font-semibold text-text">
              {deadlineStatus.requiredChaptersPerWeek.toFixed(1)} ch/week
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Depletion projection -->
  {#if depletion.depletionDays !== null}
    <div class="depletion-projection border border-border rounded-md p-4">
      <div class="flex items-start gap-3">
        <TrendingDown class="text-orange-500" size={20} />
        <div class="flex-1">
          <h4 class="text-sm font-medium text-text mb-1">Buffer Depletion</h4>
          <p class="text-sm text-text-secondary">
            Buffer will deplete in <span class="font-semibold text-text">{depletion.depletionDays} days</span>
            {#if depletion.depletionDate}
              (on {new Date(depletion.depletionDate).toLocaleDateString()})
            {/if}
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Warnings -->
  {#if bufferStatus.warnings.length > 0}
    <div class="warnings space-y-2">
      {#each bufferStatus.warnings as warning}
        <div class="warning-item flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <AlertTriangle class="text-orange-500 flex-shrink-0" size={16} />
          <p class="text-sm text-orange-900">{warning}</p>
        </div>
      {/each}
    </div>
  {:else if bufferStatus.isHealthy}
    <div class="success-item flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
      <CheckCircle class="text-green-600 flex-shrink-0" size={16} />
      <p class="text-sm text-green-900">Buffer is healthy and above minimum threshold</p>
    </div>
  {/if}
</div>

<style>
  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
</style>
