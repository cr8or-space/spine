<script lang="ts">
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
    Filler,
  } from 'chart.js';
  import type { TensionCurveData, TensionCurveDataPoint } from '@repo/types';

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
    Filler
  );

  interface Props {
    data: TensionCurveData;
    height?: number;
    showDivergence?: boolean;
    onPointClick?: (point: TensionCurveDataPoint) => void;
  }

  let { data, height = 300, showDivergence = true, onPointClick }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  const PLANNED_COLOR = 'rgb(99, 102, 241)';
  const ACTUAL_COLOR = 'rgb(34, 197, 94)';
  const DIVERGENCE_THRESHOLD = 15;

  function createChart() {
    if (!canvas || !data.dataPoints.length) return;

    if (chart) {
      chart.destroy();
    }

    const labels = data.dataPoints.map((p) => p.title || `Ch ${p.position}`);
    const plannedData = data.dataPoints.map((p) => p.plannedTension ?? null);
    const actualData = data.dataPoints.map((p) => p.actualTension ?? null);

    const datasets: Chart['data']['datasets'] = [
      {
        label: 'Planned',
        data: plannedData,
        borderColor: PLANNED_COLOR,
        backgroundColor: PLANNED_COLOR,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true,
      },
      {
        label: 'Actual',
        data: actualData,
        borderColor: ACTUAL_COLOR,
        backgroundColor: ACTUAL_COLOR,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true,
      },
    ];

    chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const point = data.dataPoints[idx];
                if (!point) return '';
                const lines: string[] = [];
                if (point.divergence !== undefined && showDivergence) {
                  const sign = point.divergence >= 0 ? '+' : '';
                  lines.push(`Divergence: ${sign}${point.divergence.toFixed(1)}`);
                }
                if (point.wordCount !== undefined) {
                  lines.push(`Words: ${point.wordCount.toLocaleString()}`);
                }
                if (point.contentStatus) {
                  lines.push(`Status: ${point.contentStatus}`);
                }
                return lines.join('\n');
              },
            },
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Tension',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Chapter',
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0,
            },
          },
        },
        onClick: (_event, elements) => {
          if (elements.length > 0 && onPointClick) {
            const idx = elements[0].index;
            const point = data.dataPoints[idx];
            if (point) {
              onPointClick(point);
            }
          }
        },
      },
    });
  }

  $effect(() => {
    if (data) {
      createChart();
    }
    return () => {
      if (chart) {
        chart.destroy();
        chart = null;
      }
    };
  });

  const highDivergencePoints = $derived(
    data.dataPoints.filter(
      (p) => p.divergence !== undefined && Math.abs(p.divergence) > DIVERGENCE_THRESHOLD
    )
  );
</script>

<div class="tension-curve-chart">
  <div class="chart-container" style="height: {height}px">
    <canvas bind:this={canvas}></canvas>
  </div>

  {#if showDivergence && highDivergencePoints.length > 0}
    <div class="divergence-warning">
      <span class="warning-icon">⚠</span>
      {highDivergencePoints.length} chapter{highDivergencePoints.length === 1 ? '' : 's'} with high divergence
      (&gt;{DIVERGENCE_THRESHOLD} points)
    </div>
  {/if}

  {#if data.metadata}
    <div class="chart-stats">
      <span>Avg Planned: {data.metadata.averagePlannedTension?.toFixed(1) ?? 'N/A'}</span>
      <span>Avg Actual: {data.metadata.averageActualTension?.toFixed(1) ?? 'N/A'}</span>
      <span>Avg Divergence: {data.metadata.averageAbsoluteDivergence?.toFixed(1) ?? 'N/A'}</span>
    </div>
  {/if}
</div>

<style>
  .tension-curve-chart {
    width: 100%;
  }

  .chart-container {
    position: relative;
    width: 100%;
  }

  .divergence-warning {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: rgba(239, 68, 68, 0.1);
    border-radius: 0.25rem;
    color: rgb(185, 28, 28);
    font-size: 0.875rem;
  }

  .warning-icon {
    margin-right: 0.25rem;
  }

  .chart-stats {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }
</style>
