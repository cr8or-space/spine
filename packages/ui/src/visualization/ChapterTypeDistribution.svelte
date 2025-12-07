<script lang="ts">
  import {
    Chart,
    PieController,
    BarController,
    BarElement,
    ArcElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
  } from 'chart.js';

  Chart.register(
    PieController,
    BarController,
    BarElement,
    ArcElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend
  );

  type ChapterType = 'action' | 'character' | 'worldbuilding' | 'transition' | 'climax' | 'resolution' | 'other';

  interface ChapterTypeData {
    type: ChapterType;
    count: number;
    percentage?: number;
  }

  interface Props {
    data: ChapterTypeData[];
    chartType?: 'pie' | 'bar';
    height?: number;
    showPercentages?: boolean;
    onSegmentClick?: (type: ChapterType) => void;
  }

  let {
    data,
    chartType = 'pie',
    height = 300,
    showPercentages = true,
    onSegmentClick,
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  const TYPE_COLORS: Record<ChapterType, string> = {
    action: 'rgb(239, 68, 68)',
    character: 'rgb(34, 197, 94)',
    worldbuilding: 'rgb(59, 130, 246)',
    transition: 'rgb(156, 163, 175)',
    climax: 'rgb(249, 115, 22)',
    resolution: 'rgb(168, 85, 247)',
    other: 'rgb(107, 114, 128)',
  };

  const TYPE_LABELS: Record<ChapterType, string> = {
    action: 'Action',
    character: 'Character',
    worldbuilding: 'Worldbuilding',
    transition: 'Transition',
    climax: 'Climax',
    resolution: 'Resolution',
    other: 'Other',
  };

  function createChart() {
    if (!canvas || !data.length) return;

    if (chart) {
      chart.destroy();
    }

    const labels = data.map((d) => TYPE_LABELS[d.type] || d.type);
    const values = data.map((d) => d.count);
    const colors = data.map((d) => TYPE_COLORS[d.type] || TYPE_COLORS.other);
    const total = values.reduce((a, b) => a + b, 0);

    if (chartType === 'pie') {
      chart = new Chart(canvas, {
        type: 'pie',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderColor: 'white',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed;
                  const pct = ((value / total) * 100).toFixed(1);
                  return `${context.label}: ${value} (${pct}%)`;
                },
              },
            },
          },
          onClick: (_event, elements) => {
            if (elements.length > 0 && onSegmentClick) {
              const idx = elements[0].index;
              const item = data[idx];
              if (item) {
                onSegmentClick(item.type);
              }
            }
          },
        },
      });
    } else {
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Chapters',
              data: values,
              backgroundColor: colors,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y ?? 0;
                  const pct = ((value / total) * 100).toFixed(1);
                  return `${value} chapters (${pct}%)`;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Count',
              },
              ticks: {
                stepSize: 1,
              },
            },
          },
          onClick: (_event, elements) => {
            if (elements.length > 0 && onSegmentClick) {
              const idx = elements[0].index;
              const item = data[idx];
              if (item) {
                onSegmentClick(item.type);
              }
            }
          },
        },
      });
    }
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

  const total = $derived(data.reduce((sum, d) => sum + d.count, 0));

  const dataWithPercentages = $derived(
    data.map((d) => ({
      ...d,
      percentage: total > 0 ? (d.count / total) * 100 : 0,
    }))
  );
</script>

<div class="chapter-type-distribution">
  <div class="chart-container" style="height: {height}px">
    <canvas bind:this={canvas}></canvas>
  </div>

  {#if showPercentages}
    <div class="stats-grid">
      {#each dataWithPercentages as item}
        <div class="stat-item">
          <span class="stat-color" style="background-color: {TYPE_COLORS[item.type]}"></span>
          <span class="stat-label">{TYPE_LABELS[item.type]}</span>
          <span class="stat-value">{item.count}</span>
          <span class="stat-pct">({item.percentage.toFixed(1)}%)</span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="total">
    Total: {total} chapter{total === 1 ? '' : 's'}
  </div>
</div>

<style>
  .chapter-type-distribution {
    width: 100%;
  }

  .chart-container {
    position: relative;
    width: 100%;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .stat-color {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 0.125rem;
    flex-shrink: 0;
  }

  .stat-label {
    flex: 1;
  }

  .stat-value {
    font-weight: 500;
  }

  .stat-pct {
    color: #6b7280;
  }

  .total {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
    text-align: right;
  }
</style>
