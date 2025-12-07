<script lang="ts">
  import type { CharacterPresenceHeatmap } from '@repo/types';

  interface Props {
    data: CharacterPresenceHeatmap;
    cellSize?: number;
    showLegend?: boolean;
    onCellClick?: (characterId: string, position: number, intensity: number) => void;
  }

  let { data, cellSize = 24, showLegend = true, onCellClick }: Props = $props();

  const INTENSITY_COLORS = [
    'var(--heatmap-absent, #f3f4f6)',
    'var(--heatmap-mention, #bfdbfe)',
    'var(--heatmap-scene, #60a5fa)',
    'var(--heatmap-pov, #1d4ed8)',
  ];

  const INTENSITY_LABELS: Record<number, string> = {
    0: 'Absent',
    1: 'Mention',
    2: 'Scene',
    3: 'POV',
  };


  function handleCellClick(charIdx: number, posIdx: number) {
    if (!onCellClick) return;
    const characterId = data.characterIds[charIdx];
    const position = data.positions[posIdx];
    const intensity = data.matrix[charIdx][posIdx];
    if (characterId !== undefined && position !== undefined && intensity !== undefined) {
      onCellClick(characterId, position, intensity);
    }
  }

  function getCellTitle(charIdx: number, posIdx: number): string {
    const charName = data.characterNames[charIdx];
    const chapter = data.titles[posIdx] || `Ch ${data.positions[posIdx]}`;
    const intensity = data.matrix[charIdx][posIdx];
    const presence = INTENSITY_LABELS[intensity] || 'Unknown';
    return `${charName} - ${chapter}: ${presence}`;
  }

  const gridWidth = $derived(data.positions.length * cellSize);
</script>

<div class="character-heatmap">
  {#if showLegend}
    <div class="legend">
      {#each Object.entries(INTENSITY_LABELS) as [intensity, label]}
        <div class="legend-item">
          <span
            class="legend-color"
            style="background-color: {INTENSITY_COLORS[Number(intensity)]}"
          ></span>
          <span class="legend-label">{label}</span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="heatmap-container">
    <div class="character-labels">
      {#each data.characterNames as name}
        <div class="character-label" style="height: {cellSize}px">{name}</div>
      {/each}
    </div>

    <div class="grid-wrapper">
      <div class="chapter-labels" style="width: {gridWidth}px">
        {#each data.titles as title, idx}
          <div class="chapter-label" style="width: {cellSize}px" title={title}>
            {data.positions[idx]}
          </div>
        {/each}
      </div>

      <div class="grid" style="width: {gridWidth}px">
        {#each data.matrix as row, charIdx}
          <div class="row" style="height: {cellSize}px">
            {#each row as intensity, posIdx}
              <button
                class="cell"
                style="
                  width: {cellSize}px;
                  height: {cellSize}px;
                  background-color: {INTENSITY_COLORS[intensity]};
                "
                title={getCellTitle(charIdx, posIdx)}
                onclick={() => handleCellClick(charIdx, posIdx)}
                disabled={!onCellClick}
              ></button>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .character-heatmap {
    width: 100%;
    overflow: hidden;
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

  .legend-color {
    width: 1rem;
    height: 1rem;
    border-radius: 0.125rem;
    border: 1px solid #d1d5db;
  }

  .legend-label {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .heatmap-container {
    display: flex;
    overflow-x: auto;
  }

  .character-labels {
    flex-shrink: 0;
    padding-right: 0.5rem;
    padding-top: 1.5rem;
  }

  .character-label {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    padding-right: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  .grid-wrapper {
    overflow-x: auto;
  }

  .chapter-labels {
    display: flex;
    height: 1.5rem;
  }

  .chapter-label {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    color: #6b7280;
  }

  .grid {
    display: flex;
    flex-direction: column;
  }

  .row {
    display: flex;
  }

  .cell {
    border: 1px solid white;
    cursor: pointer;
    padding: 0;
    transition: transform 0.1s;
  }

  .cell:hover:not(:disabled) {
    transform: scale(1.1);
    z-index: 1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .cell:disabled {
    cursor: default;
  }
</style>
