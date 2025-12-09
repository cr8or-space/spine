<script lang="ts">
  import type { MysteryTrackingData } from '@repo/types';
  import { AlertTriangle, CheckCircle, Eye, Layers } from 'lucide-svelte';

  interface Props {
    mysteries: MysteryTrackingData[];
    onMysteryClick?: (mystery: MysteryTrackingData) => void;
  }

  let { mysteries, onMysteryClick }: Props = $props();

  const layerColors: Record<string, string> = {
    surface: '#3b82f6',
    intermediate: '#8b5cf6',
    deep: '#f59e0b',
    meta: '#ef4444',
  };

  const statusColors: Record<string, string> = {
    planted: '#6b7280',
    developing: '#3b82f6',
    climaxing: '#f59e0b',
    resolving: '#10b981',
    resolved: '#22c55e',
    abandoned: '#ef4444',
  };

  function handleMysteryClick(mystery: MysteryTrackingData) {
    if (onMysteryClick) {
      onMysteryClick(mystery);
    }
  }

  const groupedByLayer = $derived.by(() => {
    const groups: Record<string, MysteryTrackingData[]> = {
      surface: [],
      intermediate: [],
      deep: [],
      meta: [],
    };
    mysteries.forEach((m) => {
      groups[m.layer].push(m);
    });
    return groups;
  });

  const activeMysteries = $derived(
    mysteries.filter((m) => m.status !== 'resolved' && m.status !== 'abandoned')
  );

  const resolvedMysteries = $derived(
    mysteries.filter((m) => m.status === 'resolved')
  );

  const unfulfilledCluesCount = $derived(
    mysteries.reduce((sum, m) => sum + m.summary.unfulfilledClues, 0)
  );
</script>

<div class="mystery-board space-y-4">
  <!-- Overview stats -->
  <div class="overview-stats grid grid-cols-4 gap-4">
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Total Mysteries</div>
      <div class="text-text text-lg font-bold">{mysteries.length}</div>
    </div>
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Active</div>
      <div class="text-text text-lg font-bold">{activeMysteries.length}</div>
    </div>
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Resolved</div>
      <div class="text-text text-lg font-bold">{resolvedMysteries.length}</div>
    </div>
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Unfulfilled Clues</div>
      <div class="text-text text-lg font-bold {unfulfilledCluesCount > 0 ? 'text-orange-500' : 'text-green-600'}">
        {unfulfilledCluesCount}
      </div>
    </div>
  </div>

  <!-- Mysteries by layer -->
  {#each Object.entries(groupedByLayer) as [layer, layerMysteries]}
    {#if layerMysteries.length > 0}
      <div class="layer-section border border-border rounded-md p-4">
        <div class="layer-header flex items-center gap-2 mb-3">
          <Layers size={20} style="color: {layerColors[layer]}" />
          <h3 class="text-sm font-medium text-text capitalize">{layer} Layer</h3>
          <span class="text-xs text-text-secondary">({layerMysteries.length})</span>
        </div>

        <div class="space-y-2">
          {#each layerMysteries as mystery}
            <button
              type="button"
              class="mystery-card w-full text-left p-4 bg-surface-raised hover:bg-surface border border-border rounded-md transition-colors"
              onclick={() => handleMysteryClick(mystery)}
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-text mb-1">{mystery.mysteryName}</h4>
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-block px-2 py-1 text-xs font-medium rounded-md text-white"
                      style="background-color: {statusColors[mystery.status]}"
                    >
                      {mystery.status}
                    </span>
                    <span
                      class="inline-block px-2 py-1 text-xs font-medium rounded-md text-white"
                      style="background-color: {layerColors[mystery.layer]}"
                    >
                      {mystery.layer}
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="flex items-center gap-1 text-xs text-text-secondary mb-1">
                    <Eye size={12} />
                    <span>Suspense: {mystery.summary.suspenseRating}</span>
                  </div>
                  {#if mystery.status === 'resolved'}
                    <div class="flex items-center gap-1 text-xs text-text-secondary">
                      <CheckCircle size={12} />
                      <span>Satisfaction: {mystery.summary.satisfactionRating}</span>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Timeline -->
              <div class="timeline flex items-center gap-2 text-xs text-text-secondary mb-2">
                {#if mystery.planted}
                  <div>Planted: Ch {mystery.planted.chapterNumber}</div>
                {/if}
                {#if mystery.climax}
                  <div>• Climax: Ch {mystery.climax.chapterNumber}</div>
                {/if}
                {#if mystery.resolution}
                  <div>• Resolved: Ch {mystery.resolution.chapterNumber}</div>
                {/if}
              </div>

              <!-- Clue summary -->
              <div class="clue-summary grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span class="text-text-secondary">Total clues:</span>
                  <span class="font-medium text-text ml-1">{mystery.summary.totalClues}</span>
                </div>
                <div>
                  <span class="text-text-secondary">Direct:</span>
                  <span class="font-medium text-text ml-1">{mystery.summary.directClues}</span>
                </div>
                <div>
                  <span class="text-text-secondary">Indirect:</span>
                  <span class="font-medium text-text ml-1">{mystery.summary.indirectClues}</span>
                </div>
                <div>
                  <span class="text-text-secondary">Red herrings:</span>
                  <span class="font-medium text-text ml-1">{mystery.summary.redHerringCount}</span>
                </div>
              </div>

              <!-- Clue density -->
              {#if mystery.summary.averageChaptersPerClue}
                <div class="clue-density text-xs text-text-secondary mt-2">
                  Clue density: 1 clue per {mystery.summary.averageChaptersPerClue.toFixed(1)} chapters
                </div>
              {/if}

              <!-- Unfulfilled clues warning -->
              {#if mystery.summary.unfulfilledClues > 0}
                <div class="unfulfilled-warning flex items-center gap-2 mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                  <AlertTriangle class="text-orange-500 flex-shrink-0" size={14} />
                  <div class="text-xs text-orange-900">
                    {mystery.summary.unfulfilledClues} unfulfilled clue(s):
                    {mystery.summary.unfulfilled.join(', ')}
                  </div>
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/each}

  <!-- Empty state -->
  {#if mysteries.length === 0}
    <div class="empty-state border border-border rounded-md p-8 text-center">
      <Eye size={48} class="mx-auto mb-4 text-text-secondary" />
      <h3 class="text-lg font-semibold text-text mb-2">No Mysteries Tracked</h3>
      <p class="text-sm text-text-secondary">
        Create plot threads with type "mystery" to see mystery tracking analytics
      </p>
    </div>
  {/if}
</div>

<style>
  .mystery-card:hover {
    transform: translateY(-1px);
  }
</style>
