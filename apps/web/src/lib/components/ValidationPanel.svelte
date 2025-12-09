<script lang="ts">
  /**
   * ValidationPanel - Display validation results grouped by phase.
   *
   * Features:
   * - Groups results by validation phase (structural, automated, computed)
   * - Navigate to source location on click
   * - Shows fix suggestions
   * - Collapsible groups
   */

  import type { ValidationResult, ValidationPhase, SpinePosition } from '@spine/types';
  import ValidationBadge from './ValidationBadge.svelte';
  import Card from './Card.svelte';

  interface Props {
    /** Validation results to display */
    results: ValidationResult[];
    /** Title for the panel */
    title?: string;
    /** Whether groups are collapsible */
    collapsible?: boolean;
    /** Initially collapsed groups */
    initiallyCollapsed?: ValidationPhase[];
    /** Handler for navigating to a validation location */
    onNavigate?: (location: SpinePosition) => void;
  }

  let {
    results,
    title = 'Validation Results',
    collapsible = true,
    initiallyCollapsed = [],
    onNavigate,
  }: Props = $props();

  // Phase labels and order
  const PHASE_INFO: Record<ValidationPhase, { label: string; description: string }> = {
    structural: {
      label: 'Structural',
      description: 'Basic structure validation (required fields, types)',
    },
    automated: {
      label: 'Automated',
      description: 'Rule-based validation (consistency, format)',
    },
    computed: {
      label: 'Computed',
      description: 'AI-assisted validation (continuity, style)',
    },
  };

  const PHASE_ORDER: ValidationPhase[] = ['structural', 'automated', 'computed'];

  // Collapsed state for each phase
  let collapsedPhases = $state<Set<ValidationPhase>>(new Set(initiallyCollapsed));

  // Group results by phase
  let groupedResults = $derived.by(() => {
    const groups = new Map<ValidationPhase, ValidationResult[]>();

    for (const phase of PHASE_ORDER) {
      groups.set(phase, []);
    }

    for (const result of results) {
      const location = result.location;
      // Group by phase based on location or default
      const phase: ValidationPhase = location ? 'automated' : 'structural';
      const phaseResults = groups.get(phase);
      if (phaseResults) {
        phaseResults.push(result);
      }
    }

    return groups;
  });

  // Count results by status for summary
  let summary = $derived.by(() => {
    let pass = 0;
    let fail = 0;
    let warn = 0;

    for (const result of results) {
      if (result.status === 'pass') pass++;
      else if (result.status === 'fail') fail++;
      else if (result.status === 'warn') warn++;
    }

    return { pass, fail, warn, total: pass + fail + warn };
  });

  // Count by phase
  function getPhaseStats(phase: ValidationPhase): { pass: number; fail: number; warn: number } {
    const phaseResults = groupedResults.get(phase) ?? [];
    return {
      pass: phaseResults.filter((r) => r.status === 'pass').length,
      fail: phaseResults.filter((r) => r.status === 'fail').length,
      warn: phaseResults.filter((r) => r.status === 'warn').length,
    };
  }

  function togglePhase(phase: ValidationPhase) {
    if (!collapsible) return;

    const newCollapsed = new Set(collapsedPhases);
    if (newCollapsed.has(phase)) {
      newCollapsed.delete(phase);
    } else {
      newCollapsed.add(phase);
    }
    collapsedPhases = newCollapsed;
  }

  function handleNavigate(location: SpinePosition | undefined) {
    if (location && onNavigate) {
      onNavigate(location);
    }
  }

  function getStatusIcon(status: 'pass' | 'fail' | 'warn'): string {
    switch (status) {
      case 'pass':
        return '✓';
      case 'fail':
        return '✕';
      case 'warn':
        return '!';
    }
  }
</script>

<div class="validation-panel">
  <header class="panel-header">
    <h3 class="panel-title">{title}</h3>
    <ValidationBadge
      passCount={summary.pass}
      failCount={summary.fail}
      warnCount={summary.warn}
    />
  </header>

  {#if summary.total === 0}
    <div class="empty-state">
      <p>No validation results to display.</p>
    </div>
  {:else}
    <div class="phase-groups">
      {#each PHASE_ORDER as phase}
        {@const phaseResults = groupedResults.get(phase) ?? []}
        {@const stats = getPhaseStats(phase)}
        {@const isCollapsed = collapsedPhases.has(phase)}
        {@const hasResults = phaseResults.length > 0}

        {#if hasResults}
          <div class="phase-group">
            <button
              class="phase-header"
              class:collapsible
              type="button"
              onclick={() => togglePhase(phase)}
              disabled={!collapsible}
              aria-expanded={!isCollapsed}
            >
              <div class="phase-info">
                {#if collapsible}
                  <span class="collapse-icon" class:collapsed={isCollapsed}>
                    ▼
                  </span>
                {/if}
                <span class="phase-label">{PHASE_INFO[phase].label}</span>
                <span class="phase-count">({phaseResults.length})</span>
              </div>
              <ValidationBadge
                passCount={stats.pass}
                failCount={stats.fail}
                warnCount={stats.warn}
                size="sm"
              />
            </button>

            {#if !isCollapsed}
              <ul class="result-list" role="list">
                {#each phaseResults as result}
                  <li class="result-item status-{result.status}">
                    <Card padding="sm">
                      <div class="result-content">
                        <div class="result-header">
                          <span
                            class="status-icon status-{result.status}"
                            aria-label={result.status}
                          >
                            {getStatusIcon(result.status)}
                          </span>
                          <span class="result-message">{result.message}</span>
                        </div>

                        {#if result.location}
                          <button
                            class="location-link"
                            type="button"
                            onclick={() => handleNavigate(result.location)}
                            disabled={!onNavigate}
                          >
                            📍 Node: {result.location.nodeId}
                          </button>
                        {/if}

                        {#if result.fix}
                          <div class="fix-suggestion">
                            <span class="fix-label">Suggested fix:</span>
                            <span class="fix-text">{result.fix}</span>
                          </div>
                        {/if}
                      </div>
                    </Card>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .validation-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .panel-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .empty-state {
    text-align: center;
    padding: var(--space-8);
    color: var(--color-text-secondary);
  }

  .phase-groups {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .phase-group {
    display: flex;
    flex-direction: column;
  }

  .phase-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: default;
    width: 100%;
    text-align: left;
  }

  .phase-header.collapsible {
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .phase-header.collapsible:hover:not(:disabled) {
    background-color: var(--color-surface-hover);
  }

  .phase-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .collapse-icon {
    font-size: var(--text-xs);
    transition: transform var(--transition-fast);
  }

  .collapse-icon.collapsed {
    transform: rotate(-90deg);
  }

  .phase-label {
    font-weight: 600;
    color: var(--color-text);
  }

  .phase-count {
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
  }

  .result-list {
    list-style: none;
    padding: 0;
    margin: var(--space-2) 0 0 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .result-item {
    margin: 0;
  }

  .result-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .result-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .status-icon {
    font-weight: 700;
    font-size: var(--text-sm);
    width: 1.5em;
    text-align: center;
    flex-shrink: 0;
  }

  .status-icon.status-pass {
    color: var(--color-success);
  }

  .status-icon.status-fail {
    color: var(--color-danger);
  }

  .status-icon.status-warn {
    color: var(--color-warning);
  }

  .result-message {
    color: var(--color-text);
    line-height: 1.4;
  }

  .location-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-primary);
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    width: fit-content;
  }

  .location-link:not(:disabled):hover {
    background-color: var(--color-primary-light);
    border-color: var(--color-primary);
  }

  .location-link:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .fix-suggestion {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }

  .fix-label {
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .fix-text {
    color: var(--color-text);
  }
</style>
