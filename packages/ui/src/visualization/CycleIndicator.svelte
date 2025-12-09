<script lang="ts">
  import type { CycleEnforcementResult, CycleDataPoint } from '@repo/types';
  import { AlertTriangle, TrendingUp } from 'lucide-svelte';

  interface Props {
    cycleEnforcement: CycleEnforcementResult;
    onChapterClick?: (dataPoint: CycleDataPoint) => void;
  }

  let { cycleEnforcement, onChapterClick }: Props = $props();

  const phaseColors: Record<string, string> = {
    setup: '#3b82f6',
    rising: '#8b5cf6',
    escalating: '#f59e0b',
    peak: '#ef4444',
    falling: '#ec4899',
    recovery: '#10b981',
  };

  function getDeviationColor(deviation: number | undefined): string {
    if (deviation === undefined) return 'text-gray-400';
    const abs = Math.abs(deviation);
    if (abs < 5) return 'text-green-600';
    if (abs < 10) return 'text-orange-500';
    return 'text-red-600';
  }

  function handleChapterClick(dataPoint: CycleDataPoint) {
    if (onChapterClick) {
      onChapterClick(dataPoint);
    }
  }
</script>

<div class="cycle-indicator space-y-4">
  <!-- Current cycle phase -->
  <div class="cycle-phase border border-border rounded-md p-4">
    <h3 class="text-sm font-medium text-text mb-3">Current Cycle Phase</h3>
    <div class="flex items-center gap-4">
      <div class="flex-1">
        <div class="text-2xl font-bold text-text mb-1">
          Cycle {cycleEnforcement.phaseInfo.currentCycle}
        </div>
        <div class="text-sm text-text-secondary">
          Position {cycleEnforcement.phaseInfo.currentPosition} of {cycleEnforcement.phaseInfo.cycleLength}
        </div>
      </div>
      <div
        class="phase-badge px-4 py-2 rounded-md text-white font-medium"
        style="background-color: {phaseColors[cycleEnforcement.phaseInfo.currentPhase] || '#6b7280'}"
      >
        {cycleEnforcement.phaseInfo.phaseDescription}
      </div>
    </div>
  </div>

  <!-- Cycle statistics -->
  <div class="cycle-stats grid grid-cols-3 gap-4">
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Avg Deviation</div>
      <div class="text-text text-lg font-bold">
        {cycleEnforcement.stats.averageDeviation.toFixed(1)}
      </div>
    </div>
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Compliance Rate</div>
      <div class="text-text text-lg font-bold">
        {cycleEnforcement.stats.complianceRate.toFixed(0)}%
      </div>
    </div>
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Violations</div>
      <div class="text-text text-lg font-bold">
        {cycleEnforcement.violations.length}
      </div>
    </div>
  </div>

  <!-- Cycle visualization -->
  <div class="cycle-visualization border border-border rounded-md p-4">
    <h4 class="text-sm font-medium text-text mb-3">Tension Cycle Pattern</h4>

    <!-- Cycle grid -->
    <div class="grid gap-2" style="grid-template-columns: repeat({cycleEnforcement.phaseInfo.cycleLength}, 1fr);">
      {#each Array.from({ length: cycleEnforcement.phaseInfo.cycleLength }, (_, i) => i) as index}
        {@const position = index + 1}
        {@const isCurrent = position === cycleEnforcement.phaseInfo.currentPosition}
        <div
          class="cycle-position border border-border rounded-md p-3 text-center"
          class:ring-2={isCurrent}
          class:ring-primary={isCurrent}
        >
          <div class="text-xs text-text-secondary mb-1">Pos {position}</div>
          <div class="text-lg font-bold text-text">
            {cycleEnforcement.phaseInfo.tensionTargets[index]}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Recent chapters performance -->
  <div class="recent-performance border border-border rounded-md p-4">
    <h4 class="text-sm font-medium text-text mb-3">Recent Chapters vs. Cycle Targets</h4>
    <div class="space-y-2">
      {#each cycleEnforcement.dataPoints.slice(-10).reverse() as dataPoint}
        <button
          type="button"
          class="chapter-item w-full text-left p-3 bg-surface-raised hover:bg-surface border border-border rounded-md transition-colors"
          onclick={() => handleChapterClick(dataPoint)}
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="text-sm font-medium text-text">{dataPoint.title}</div>
              <div class="text-xs text-text-secondary">
                Cycle {dataPoint.cycleNumber}, Position {dataPoint.cyclePosition}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-xs text-text-secondary">Target</div>
                <div class="text-sm font-semibold text-text">{dataPoint.targetTension}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-text-secondary">Actual</div>
                <div class="text-sm font-semibold text-text">
                  {dataPoint.actualTension?.toFixed(0) || dataPoint.plannedTension?.toFixed(0) || '-'}
                </div>
              </div>
              {#if dataPoint.deviationFromTarget !== undefined}
                <div class="text-right">
                  <div class="text-xs text-text-secondary">Deviation</div>
                  <div class="text-sm font-semibold {getDeviationColor(dataPoint.deviationFromTarget)}">
                    {dataPoint.deviationFromTarget > 0 ? '+' : ''}{dataPoint.deviationFromTarget.toFixed(0)}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Violations -->
  {#if cycleEnforcement.violations.length > 0}
    <div class="violations border border-orange-200 bg-orange-50 rounded-md p-4">
      <div class="flex items-start gap-3">
        <AlertTriangle class="text-orange-500 flex-shrink-0" size={20} />
        <div class="flex-1">
          <h4 class="text-sm font-medium text-orange-900 mb-2">Cycle Violations</h4>
          <div class="space-y-2">
            {#each cycleEnforcement.violations as violation}
              <div class="violation-item text-sm text-orange-800">
                <span class="font-medium">{violation.chapterTitle}:</span>
                {violation.description}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Rebalancing suggestions -->
  {#if cycleEnforcement.suggestions.length > 0}
    <div class="suggestions border border-blue-200 bg-blue-50 rounded-md p-4">
      <div class="flex items-start gap-3">
        <TrendingUp class="text-blue-600 flex-shrink-0" size={20} />
        <div class="flex-1">
          <h4 class="text-sm font-medium text-blue-900 mb-2">Rebalancing Suggestions</h4>
          <div class="space-y-2">
            {#each cycleEnforcement.suggestions as suggestion}
              <div class="suggestion-item text-sm text-blue-800">
                <span class="font-medium">{suggestion.chapterTitle}:</span>
                Adjust from {suggestion.currentTension} to {suggestion.suggestedTension}
                ({suggestion.reason})
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Warnings -->
  {#if cycleEnforcement.warnings.length > 0}
    <div class="warnings space-y-2">
      {#each cycleEnforcement.warnings as warning}
        <div class="warning-item flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <AlertTriangle class="text-orange-500 flex-shrink-0" size={16} />
          <p class="text-sm text-orange-900">{warning}</p>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .chapter-item:hover {
    transform: translateY(-1px);
  }
</style>
