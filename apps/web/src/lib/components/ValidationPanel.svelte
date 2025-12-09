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
  import { cn } from '$lib/utils/cn';

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

<div class="flex flex-col gap-4">
  <header class="flex items-center justify-between pb-3 border-b border-border">
    <h3 class="text-lg font-semibold text-text">{title}</h3>
    <ValidationBadge
      passCount={summary.pass}
      failCount={summary.fail}
      warnCount={summary.warn}
    />
  </header>

  {#if summary.total === 0}
    <div class="text-center py-8 text-text-secondary">
      <p>No validation results to display.</p>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each PHASE_ORDER as phase}
        {@const phaseResults = groupedResults.get(phase) ?? []}
        {@const stats = getPhaseStats(phase)}
        {@const isCollapsed = collapsedPhases.has(phase)}
        {@const hasResults = phaseResults.length > 0}

        {#if hasResults}
          <div class="flex flex-col">
            <button
              class={cn(
                'flex items-center justify-between py-2 px-3 bg-bg-secondary border border-border rounded-md w-full text-left',
                collapsible && 'cursor-pointer transition-colors duration-150 hover:bg-surface-hover',
                !collapsible && 'cursor-default'
              )}
              type="button"
              onclick={() => togglePhase(phase)}
              disabled={!collapsible}
              aria-expanded={!isCollapsed}
            >
              <div class="flex items-center gap-2">
                {#if collapsible}
                  <span class={cn(
                    'text-xs transition-transform duration-150',
                    isCollapsed && '-rotate-90'
                  )}>
                    ▼
                  </span>
                {/if}
                <span class="font-semibold text-text">{PHASE_INFO[phase].label}</span>
                <span class="text-text-secondary text-sm">({phaseResults.length})</span>
              </div>
              <ValidationBadge
                passCount={stats.pass}
                failCount={stats.fail}
                warnCount={stats.warn}
                size="sm"
              />
            </button>

            {#if !isCollapsed}
              <ul class="list-none p-0 mt-2 flex flex-col gap-2" role="list">
                {#each phaseResults as result}
                  <li class="m-0">
                    <Card padding="sm">
                      <div class="flex flex-col gap-2">
                        <div class="flex items-start gap-2">
                          <span
                            class={cn(
                              'font-bold text-sm w-6 text-center shrink-0',
                              result.status === 'pass' && 'text-success',
                              result.status === 'fail' && 'text-danger',
                              result.status === 'warn' && 'text-warning'
                            )}
                            aria-label={result.status}
                          >
                            {getStatusIcon(result.status)}
                          </span>
                          <span class="text-text leading-relaxed">{result.message}</span>
                        </div>

                        {#if result.location}
                          <button
                            class={cn(
                              'inline-flex items-center gap-1 py-1 px-2 text-sm text-primary bg-transparent border border-border rounded-sm cursor-pointer transition-all duration-150 w-fit',
                              onNavigate && 'hover:bg-primary-light hover:border-primary',
                              !onNavigate && 'cursor-default opacity-60'
                            )}
                            type="button"
                            onclick={() => handleNavigate(result.location)}
                            disabled={!onNavigate}
                          >
                            📍 Node: {result.location.nodeId}
                          </button>
                        {/if}

                        {#if result.fix}
                          <div class="flex flex-col gap-1 p-2 bg-bg-secondary rounded-sm text-sm">
                            <span class="font-semibold text-text-secondary">Suggested fix:</span>
                            <span class="text-text">{result.fix}</span>
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
