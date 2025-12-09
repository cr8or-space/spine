<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import {
    TensionCurveChart,
    CharacterHeatmap,
    PlotThreadGantt,
    QualityTrendChart,
    ChapterTypeDistribution,
  } from '@repo/ui/visualization';
  import { BarChart3, Users, Network, TrendingUp, PieChart } from 'lucide-svelte';
  import type { Structure, TensionCurveDataPoint, PlotThreadTrackingData, QualityDataPoint } from '@repo/types';

  let { data }: { data: PageData } = $props();

  // Get available structures for filtering
  const availableStructures = $derived(
    data.structureTree.filter((s: Structure) => s.type === 'book' || s.type === 'arc')
  );

  // Handle structure selection
  function selectStructure(structureId: string) {
    const url = new URL($page.url);
    url.searchParams.set('structure', structureId);
    window.location.href = url.toString();
  }

  // Handle tension curve point click
  function handleTensionPointClick(point: TensionCurveDataPoint) {
    if (point.structureId) {
      window.location.href = `/projects/${data.project.id}/workspace?structure=${point.structureId}`;
    }
  }

  // Handle character heatmap cell click
  function handleCharacterCellClick(characterId: string, position: number, intensity: number) {
    console.log('Character cell clicked:', { characterId, position, intensity });
    // Could navigate to specific chapter or character detail
  }

  // Handle plot thread click
  function handlePlotThreadClick(thread: PlotThreadTrackingData) {
    if (thread.threadId) {
      window.location.href = `/projects/${data.project.id}/bible?tab=plot-threads`;
    }
  }

  // Handle quality trend point click
  function handleQualityPointClick(point: QualityDataPoint) {
    console.log('Quality point clicked:', point);
    // Could navigate to specific chapter
  }

  // Handle chapter type segment click
  function handleChapterTypeClick(type: string) {
    console.log('Chapter type clicked:', type);
    // Could filter structure view by chapter type
  }
</script>

<div class="analytics-container flex flex-col h-full overflow-auto">
  <!-- Header -->
  <div class="sticky top-0 z-10 bg-surface border-b border-border px-6 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text mb-1">Analytics Dashboard</h1>
        <p class="text-sm text-text-secondary">
          {#if data.rootStructure}
            Viewing analytics for: <span class="font-medium text-text">{data.rootStructure.title}</span>
          {:else}
            No structure selected
          {/if}
        </p>
      </div>

      <!-- Structure selector -->
      {#if availableStructures.length > 0}
        <div class="flex items-center gap-2">
          <label for="structure-select" class="text-sm font-medium text-text-secondary">
            Structure:
          </label>
          <select
            id="structure-select"
            class="structure-select px-3 py-2 bg-surface border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
            value={data.rootStructure?.id || ''}
            onchange={(e) => selectStructure(e.currentTarget.value)}
          >
            {#each availableStructures as structure}
              <option value={structure.id}>{structure.title} ({structure.type})</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
  </div>

  <!-- Main content -->
  <div class="flex-1 p-6">
    {#if !data.rootStructure}
      <!-- Empty state -->
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <BarChart3 size={48} class="mx-auto mb-4 text-text-secondary" />
          <h2 class="text-xl font-semibold text-text mb-2">No Structure Available</h2>
          <p class="text-text-secondary max-w-md">
            Create a book or arc structure in the workspace to view analytics.
          </p>
        </div>
      </div>
    {:else}
      <div class="space-y-6">
        <!-- Tension Curve Section -->
        {#if data.tensionCurve && data.tensionCurve.dataPoints.length > 0}
          <section class="analytics-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <TrendingUp size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Tension Curve</h2>
                <p class="text-sm text-text-secondary">
                  Planned vs. actual tension across chapters
                </p>
              </div>
            </div>
            <div class="section-content">
              <TensionCurveChart
                data={data.tensionCurve}
                height={300}
                showDivergence={true}
                onPointClick={handleTensionPointClick}
              />
            </div>
            <div class="section-stats mt-4 grid grid-cols-3 gap-4 text-sm">
              <div class="stat-item">
                <span class="stat-label text-text-secondary">Avg. Planned Tension</span>
                <span class="stat-value text-lg font-semibold text-text">
                  {data.tensionCurve.metadata.averagePlannedTension?.toFixed(1) || 'N/A'}
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label text-text-secondary">Avg. Actual Tension</span>
                <span class="stat-value text-lg font-semibold text-text">
                  {data.tensionCurve.metadata.averageActualTension?.toFixed(1) || 'N/A'}
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label text-text-secondary">Avg. Divergence</span>
                <span class="stat-value text-lg font-semibold text-text">
                  {data.tensionCurve.metadata.averageAbsoluteDivergence?.toFixed(1) || 'N/A'}
                </span>
              </div>
            </div>
          </section>
        {/if}

        <!-- Quality Trends Section -->
        {#if data.qualityTrends.length > 0}
          <section class="analytics-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <TrendingUp size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Quality Metrics</h2>
                <p class="text-sm text-text-secondary">
                  Multi-dimensional quality tracking across chapters
                </p>
              </div>
            </div>
            <div class="section-content">
              <QualityTrendChart
                dataPoints={data.qualityTrends}
                height={300}
                metrics={['tension', 'pacing', 'hookStrength']}
                onPointClick={handleQualityPointClick}
              />
            </div>
          </section>
        {/if}

        <!-- Character Presence Heatmap Section -->
        {#if data.characterHeatmap && data.characterHeatmap.characterIds.length > 0}
          <section class="analytics-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <Users size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Character Presence</h2>
                <p class="text-sm text-text-secondary">
                  Heatmap showing character appearances across chapters
                </p>
              </div>
            </div>
            <div class="section-content">
              <CharacterHeatmap
                data={data.characterHeatmap}
                cellSize={24}
                showLegend={true}
                onCellClick={handleCharacterCellClick}
              />
            </div>
          </section>
        {/if}

        <!-- Plot Thread Timeline Section -->
        {#if data.plotThreadTracking.length > 0}
          <section class="analytics-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <Network size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Plot Thread Timeline</h2>
                <p class="text-sm text-text-secondary">
                  Gantt chart showing plot thread lifecycle and touches
                </p>
              </div>
            </div>
            <div class="section-content">
              {#if data.tensionCurve}
                <PlotThreadGantt
                  threads={data.plotThreadTracking}
                  totalChapters={data.tensionCurve.dataPoints.length}
                  rowHeight={32}
                  showDangling={true}
                  onThreadClick={handlePlotThreadClick}
                />
              {/if}
            </div>
          </section>
        {/if}

        <!-- Chapter Type Distribution Section -->
        {#if data.chapterTypeData.length > 0}
          <section class="analytics-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <PieChart size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Chapter Type Distribution</h2>
                <p class="text-sm text-text-secondary">
                  Breakdown of chapter types in your narrative
                </p>
              </div>
            </div>
            <div class="section-content">
              <ChapterTypeDistribution
                data={data.chapterTypeData}
                chartType="pie"
                height={300}
                showPercentages={true}
                onSegmentClick={handleChapterTypeClick}
              />
            </div>
          </section>
        {/if}

        <!-- Empty state for no analytics data -->
        {#if !data.tensionCurve && !data.characterHeatmap && data.plotThreadTracking.length === 0}
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <BarChart3 size={48} class="mx-auto mb-4 text-text-secondary" />
              <h2 class="text-xl font-semibold text-text mb-2">No Analytics Data Available</h2>
              <p class="text-text-secondary max-w-md">
                Create chapters and generate content in the workspace to see analytics.
              </p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .analytics-container {
    background: var(--color-background, #ffffff);
  }

  .section-header {
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    padding-bottom: 1rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
</style>
