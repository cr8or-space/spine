<script lang="ts">
  import type { HookManagementResult, HookDataPoint } from '@repo/types';
  import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';

  interface Props {
    hookManagement: HookManagementResult;
    onHookClick?: (hook: HookDataPoint) => void;
  }

  let { hookManagement, onHookClick }: Props = $props();

  const hookTypeColors: Record<string, string> = {
    revelation: '#3b82f6',
    decision: '#8b5cf6',
    cliffhanger: '#ef4444',
    emotional: '#ec4899',
    question: '#f59e0b',
    twist: '#10b981',
    promise: '#06b6d4',
    none: '#6b7280',
  };

  const trendColor = $derived.by(() => {
    if (hookManagement.strengthTrend.trend === 'improving') return 'text-green-600';
    if (hookManagement.strengthTrend.trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  });

  function handleHookClick(hook: HookDataPoint) {
    if (onHookClick) {
      onHookClick(hook);
    }
  }
</script>

<div class="hook-patterns space-y-4">
  <!-- Hook variety score -->
  <div class="variety-score border border-border rounded-md p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-text">Hook Variety</h3>
      <span class="text-2xl font-bold text-text">
        {hookManagement.varietyScore.toFixed(0)}
        <span class="text-sm font-normal text-text-secondary">/ 100</span>
      </span>
    </div>

    <!-- Variety progress bar -->
    <div class="relative h-6 bg-surface-raised border border-border rounded-md overflow-hidden">
      <div
        class="absolute inset-y-0 left-0 transition-all duration-300"
        class:bg-green-500={hookManagement.varietyScore >= 70}
        class:bg-orange-500={hookManagement.varietyScore >= 40 && hookManagement.varietyScore < 70}
        class:bg-red-500={hookManagement.varietyScore < 40}
        style="width: {hookManagement.varietyScore}%"
      ></div>
    </div>
  </div>

  <!-- Strength trend -->
  <div class="strength-trend border border-border rounded-md p-4">
    <div class="flex items-start gap-3">
      {#if hookManagement.strengthTrend.trend === 'improving'}
        <TrendingUp class={trendColor} size={20} />
      {:else if hookManagement.strengthTrend.trend === 'declining'}
        <TrendingDown class={trendColor} size={20} />
      {:else}
        <Minus class={trendColor} size={20} />
      {/if}
      <div class="flex-1">
        <h4 class="text-sm font-medium text-text mb-1">Strength Trend</h4>
        <p class="text-sm text-text-secondary capitalize mb-2">
          {hookManagement.strengthTrend.trend}
          {#if Math.abs(hookManagement.strengthTrend.slope) > 0.1}
            ({hookManagement.strengthTrend.slope > 0 ? '+' : ''}{hookManagement.strengthTrend.slope.toFixed(2)} per chapter)
          {/if}
        </p>
        <div class="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span class="text-text-secondary">Average: </span>
            <span class="font-semibold text-text">{hookManagement.strengthTrend.average.toFixed(1)}</span>
          </div>
          <div>
            <span class="text-text-secondary">Min: </span>
            <span class="font-semibold text-text">{hookManagement.strengthTrend.min}</span>
          </div>
          <div>
            <span class="text-text-secondary">Max: </span>
            <span class="font-semibold text-text">{hookManagement.strengthTrend.max}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Hook type distribution -->
  <div class="hook-distribution border border-border rounded-md p-4">
    <h4 class="text-sm font-medium text-text mb-3">Hook Type Distribution</h4>
    <div class="space-y-2">
      {#each Object.entries(hookManagement.distribution) as [type, count]}
        {@const percentage = hookManagement.dataPoints.length > 0 ? (count / hookManagement.dataPoints.length) * 100 : 0}
        <div class="distribution-item">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-text capitalize">{type.replace('_', ' ')}</span>
            <span class="text-sm font-medium text-text">{count} ({percentage.toFixed(0)}%)</span>
          </div>
          <div class="relative h-2 bg-surface-raised rounded-full overflow-hidden">
            <div
              class="absolute inset-y-0 left-0 transition-all duration-300 rounded-full"
              style="width: {percentage}%; background-color: {hookTypeColors[type] || '#6b7280'}"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Recent hooks timeline -->
  <div class="recent-hooks border border-border rounded-md p-4">
    <h4 class="text-sm font-medium text-text mb-3">Recent Hooks</h4>
    <div class="space-y-2">
      {#each hookManagement.dataPoints.slice(-10).reverse() as hook}
        <button
          type="button"
          class="hook-item w-full text-left p-3 bg-surface-raised hover:bg-surface border border-border rounded-md transition-colors"
          onclick={() => handleHookClick(hook)}
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-medium text-text">{hook.title || `Chapter ${hook.position}`}</span>
            <div class="flex items-center gap-2">
              <span
                class="inline-block px-2 py-1 text-xs font-medium rounded-md text-white"
                style="background-color: {hookTypeColors[hook.hookType] || '#6b7280'}"
              >
                {hook.hookType}
              </span>
              <span class="text-sm font-semibold text-text">{hook.strength}</span>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Weak hooks warning -->
  {#if hookManagement.strengthTrend.weakHooks.length > 0}
    <div class="weak-hooks border border-orange-200 bg-orange-50 rounded-md p-4">
      <div class="flex items-start gap-3">
        <AlertTriangle class="text-orange-500 flex-shrink-0" size={20} />
        <div class="flex-1">
          <h4 class="text-sm font-medium text-orange-900 mb-1">Weak Hooks Detected</h4>
          <p class="text-sm text-orange-800 mb-2">
            {hookManagement.strengthTrend.weakHooks.length} chapter(s) with hooks below 60 strength
          </p>
          <div class="space-y-1">
            {#each hookManagement.strengthTrend.weakHooks as weak}
              <div class="text-sm text-orange-800">
                Chapter {weak.position}: {weak.strength}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Variety warnings -->
  {#if hookManagement.warnings.length > 0}
    <div class="warnings space-y-2">
      {#each hookManagement.warnings as warning}
        <div class="warning-item flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <AlertTriangle class="text-orange-500 flex-shrink-0" size={16} />
          <p class="text-sm text-orange-900">{warning}</p>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Suggested next hook type -->
  {#if hookManagement.suggestedNextHookType}
    <div class="suggestion border border-border rounded-md p-4 bg-blue-50">
      <h4 class="text-sm font-medium text-blue-900 mb-1">Suggested Next Hook</h4>
      <p class="text-sm text-blue-800">
        Consider using a
        <span
          class="inline-block px-2 py-1 mx-1 text-xs font-medium rounded-md text-white"
          style="background-color: {hookTypeColors[hookManagement.suggestedNextHookType] || '#6b7280'}"
        >
          {hookManagement.suggestedNextHookType}
        </span>
        hook for better variety
      </p>
    </div>
  {/if}
</div>

<style>
  .hook-item:hover {
    transform: translateY(-1px);
  }
</style>
