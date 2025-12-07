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
  } from 'chart.js';

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend
  );

  interface QualityDataPoint {
    position: number;
    label: string;
    tension?: number;
    pacing?: number;
    hookStrength?: number;
    voiceConsistency?: number;
  }

  interface Props {
    dataPoints: QualityDataPoint[];
    height?: number;
    metrics?: ('tension' | 'pacing' | 'hookStrength' | 'voiceConsistency')[];
    onPointClick?: (point: QualityDataPoint) => void;
  }

  let {
    dataPoints,
    height = 300,
    metrics = ['tension', 'pacing', 'hookStrength'],
    onPointClick,
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  const METRIC_CONFIG: Record<
    string,
    { label: string; color: string; borderDash?: number[] }
  > = {
    tension: { label: 'Tension', color: 'rgb(239, 68, 68)' },
    pacing: { label: 'Pacing', color: 'rgb(34, 197, 94)' },
    hookStrength: { label: 'Hook Strength', color: 'rgb(59, 130, 246)' },
    voiceConsistency: {
      label: 'Voice Consistency',
      color: 'rgb(168, 85, 247)',
      borderDash: [5, 5],
    },
  };

  function createChart() {
    if (!canvas || !dataPoints.length) return;

    if (chart) {
      chart.destroy();
    }

    const labels = dataPoints.map((p) => p.label);

    const datasets = metrics
      .filter((metric) => dataPoints.some((p) => p[metric] !== undefined))
      .map((metric) => {
        const config = METRIC_CONFIG[metric];
        return {
          label: config.label,
          data: dataPoints.map((p) => p[metric] ?? null),
          borderColor: config.color,
          backgroundColor: config.color,
          borderDash: config.borderDash,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
          spanGaps: true,
        };
      });

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
              label: (context) => {
                const value = context.parsed.y;
                if (value === null) return '';
                return `${context.dataset.label}: ${value.toFixed(1)}`;
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
              text: 'Score',
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
            const point = dataPoints[idx];
            if (point) {
              onPointClick(point);
            }
          }
        },
      },
    });
  }

  $effect(() => {
    if (dataPoints) {
      createChart();
    }
    return () => {
      if (chart) {
        chart.destroy();
        chart = null;
      }
    };
  });

  function calculateAverages(): Record<string, number | null> {
    const result: Record<string, number | null> = {};
    for (const metric of metrics) {
      const values = dataPoints.map((p) => p[metric]).filter((v): v is number => v !== undefined);
      result[metric] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }
    return result;
  }

  const averages = $derived(calculateAverages());
</script>

<div class="quality-trend-chart">
  <div class="chart-container" style="height: {height}px">
    <canvas bind:this={canvas}></canvas>
  </div>

  <div class="chart-stats">
    {#each metrics as metric}
      {@const avg = averages[metric]}
      {@const config = METRIC_CONFIG[metric]}
      <span style="color: {config.color}">
        Avg {config.label}: {avg !== null ? avg.toFixed(1) : 'N/A'}
      </span>
    {/each}
  </div>
</div>

<style>
  .quality-trend-chart {
    width: 100%;
  }

  .chart-container {
    position: relative;
    width: 100%;
  }

  .chart-stats {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    flex-wrap: wrap;
  }
</style>
