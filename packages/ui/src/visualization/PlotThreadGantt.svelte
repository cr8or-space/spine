<script lang="ts">
  import type { PlotThreadTrackingData, ThreadTouchType } from '@repo/types';

  interface Props {
    threads: PlotThreadTrackingData[];
    totalChapters: number;
    rowHeight?: number;
    showDangling?: boolean;
    onThreadClick?: (thread: PlotThreadTrackingData) => void;
  }

  let {
    threads,
    totalChapters,
    rowHeight = 32,
    showDangling = true,
    onThreadClick,
  }: Props = $props();

  const TOUCH_COLORS: Record<ThreadTouchType, string> = {
    introduction: 'var(--gantt-intro, #22c55e)',
    development: 'var(--gantt-dev, #3b82f6)',
    complication: 'var(--gantt-comp, #f59e0b)',
    climax: 'var(--gantt-climax, #ef4444)',
    resolution: 'var(--gantt-resolve, #8b5cf6)',
  };

  const STATUS_COLORS: Record<string, string> = {
    planned: '#9ca3af',
    active: '#3b82f6',
    dormant: '#f59e0b',
    resolved: '#22c55e',
    abandoned: '#ef4444',
  };

  function getThreadSpan(
    thread: PlotThreadTrackingData
  ): { start: number; end: number } | null {
    const first = thread.summary.firstTouchPosition;
    const last = thread.summary.lastTouchPosition;
    if (first === undefined) return null;
    return {
      start: first,
      end: last ?? first,
    };
  }

  function getTouchPosition(position: number): number {
    return ((position - 1) / totalChapters) * 100;
  }

  function getSpanWidth(start: number, end: number): number {
    return ((end - start + 1) / totalChapters) * 100;
  }

  const sortedThreads = $derived(
    [...threads].sort((a, b) => {
      const aStart = a.summary.firstTouchPosition ?? Infinity;
      const bStart = b.summary.firstTouchPosition ?? Infinity;
      if (aStart !== bStart) return aStart - bStart;
      return b.priority - a.priority;
    })
  );

  const danglingThreads = $derived(threads.filter((t) => t.summary.isDangling));

  const chapterIndices = $derived(
    Array.from({ length: totalChapters }, (_, i) => i)
  );
</script>

<div class="plot-thread-gantt">
  <div class="legend">
    {#each Object.entries(TOUCH_COLORS) as [type, color]}
      <div class="legend-item">
        <span class="legend-marker" style="background-color: {color}"></span>
        <span class="legend-label">{type}</span>
      </div>
    {/each}
  </div>

  <div class="gantt-container">
    <div class="thread-labels">
      {#each sortedThreads as thread}
        <button
          class="thread-label"
          class:dangling={thread.summary.isDangling}
          style="height: {rowHeight}px"
          onclick={() => onThreadClick?.(thread)}
          disabled={!onThreadClick}
        >
          <span
            class="status-dot"
            style="background-color: {STATUS_COLORS[thread.status]}"
            title={thread.status}
          ></span>
          <span class="thread-name" title={thread.threadName}>{thread.threadName}</span>
        </button>
      {/each}
    </div>

    <div class="chart-area">
      <div class="chapter-grid">
        {#each chapterIndices as idx}
          <div
            class="grid-line"
            style="left: {((idx + 1) / totalChapters) * 100}%"
          ></div>
        {/each}
      </div>

      <div class="rows">
        {#each sortedThreads as thread}
          {@const span = getThreadSpan(thread)}
          <div class="thread-row" style="height: {rowHeight}px">
            {#if span}
              <div
                class="thread-span"
                style="
                  left: {getTouchPosition(span.start)}%;
                  width: {getSpanWidth(span.start, span.end)}%;
                "
              >
                {#each thread.statusPoints as point}
                  <div
                    class="touch-marker"
                    style="
                      left: {((point.position - span.start) / (span.end - span.start + 1)) * 100}%;
                      background-color: {TOUCH_COLORS[point.touchType]};
                    "
                    title="{point.title}: {point.touchType}"
                  ></div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <div class="chapter-labels">
        {#each [1, Math.floor(totalChapters / 4), Math.floor(totalChapters / 2), Math.floor((totalChapters * 3) / 4), totalChapters] as pos}
          <span class="chapter-label" style="left: {((pos - 0.5) / totalChapters) * 100}%">
            {pos}
          </span>
        {/each}
      </div>
    </div>
  </div>

  {#if showDangling && danglingThreads.length > 0}
    <div class="dangling-warning">
      <span class="warning-icon">⚠</span>
      {danglingThreads.length} dangling thread{danglingThreads.length === 1 ? '' : 's'}:
      {danglingThreads.map((t) => t.threadName).join(', ')}
    </div>
  {/if}
</div>

<style>
  .plot-thread-gantt {
    width: 100%;
  }

  .legend {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .legend-marker {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
  }

  .legend-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: capitalize;
  }

  .gantt-container {
    display: flex;
    overflow-x: auto;
  }

  .thread-labels {
    flex-shrink: 0;
    padding-right: 0.5rem;
    border-right: 1px solid #e5e7eb;
  }

  .thread-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.5rem;
    font-size: 0.75rem;
    white-space: nowrap;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .thread-label:disabled {
    cursor: default;
  }

  .thread-label.dangling {
    background-color: rgba(239, 68, 68, 0.1);
  }

  .status-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .thread-name {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chart-area {
    flex: 1;
    min-width: 400px;
    position: relative;
    padding-bottom: 1.5rem;
  }

  .chapter-grid {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 1.5rem;
    pointer-events: none;
  }

  .grid-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: #f3f4f6;
  }

  .rows {
    position: relative;
  }

  .thread-row {
    position: relative;
    border-bottom: 1px solid #f3f4f6;
  }

  .thread-span {
    position: absolute;
    top: 25%;
    height: 50%;
    background-color: rgba(59, 130, 246, 0.2);
    border-radius: 0.25rem;
  }

  .touch-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .chapter-labels {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1.5rem;
  }

  .chapter-label {
    position: absolute;
    transform: translateX(-50%);
    font-size: 0.625rem;
    color: #9ca3af;
  }

  .dangling-warning {
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
</style>
