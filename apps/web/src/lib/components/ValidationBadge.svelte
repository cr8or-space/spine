<script lang="ts">
  /**
   * ValidationBadge - Compact display of validation status.
   *
   * Shows pass/fail/warn counts with color coding.
   * Useful for summarizing validation results at a glance.
   */

  interface Props {
    /** Number of passing validations */
    passCount?: number;
    /** Number of failing validations */
    failCount?: number;
    /** Number of warning validations */
    warnCount?: number;
    /** Size variant */
    size?: 'sm' | 'md';
    /** Show zero counts */
    showZero?: boolean;
    /** Click handler for interactive badges */
    onclick?: () => void;
  }

  let {
    passCount = 0,
    failCount = 0,
    warnCount = 0,
    size = 'md',
    showZero = false,
    onclick,
  }: Props = $props();

  // Computed overall status
  let overallStatus = $derived.by(() => {
    if (failCount > 0) return 'fail';
    if (warnCount > 0) return 'warn';
    if (passCount > 0) return 'pass';
    return 'empty';
  });

  // Whether to show each count
  let showPass = $derived(showZero || passCount > 0);
  let showFail = $derived(showZero || failCount > 0);
  let showWarn = $derived(showZero || warnCount > 0);

  // Total count for single-number display
  let total = $derived(passCount + failCount + warnCount);
  let hasAny = $derived(total > 0);
</script>

{#if hasAny || showZero}
  <button
    class="validation-badge badge-{size} status-{overallStatus}"
    class:interactive={!!onclick}
    type="button"
    onclick={onclick}
    disabled={!onclick}
    aria-label="Validation status: {passCount} passed, {failCount} failed, {warnCount} warnings"
  >
    {#if showFail}
      <span class="count count-fail" aria-label="{failCount} failed">
        <span class="icon">✕</span>
        <span class="value">{failCount}</span>
      </span>
    {/if}

    {#if showWarn}
      <span class="count count-warn" aria-label="{warnCount} warnings">
        <span class="icon">!</span>
        <span class="value">{warnCount}</span>
      </span>
    {/if}

    {#if showPass}
      <span class="count count-pass" aria-label="{passCount} passed">
        <span class="icon">✓</span>
        <span class="value">{passCount}</span>
      </span>
    {/if}
  </button>
{/if}

<style>
  .validation-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    font-family: var(--font-sans);
  }

  .validation-badge:disabled {
    cursor: default;
  }

  .validation-badge.interactive:not(:disabled) {
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .validation-badge.interactive:not(:disabled):hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-sm);
  }

  .badge-sm {
    padding: 0 var(--space-1);
    font-size: var(--text-xs);
    gap: var(--space-1);
  }

  .badge-md {
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
  }

  /* Overall status border colors */
  .status-fail {
    border-color: var(--color-danger);
    background-color: var(--color-danger-light);
  }

  .status-warn {
    border-color: var(--color-warning);
    background-color: var(--color-warning-light);
  }

  .status-pass {
    border-color: var(--color-success);
    background-color: var(--color-success-light);
  }

  .status-empty {
    border-color: var(--color-border-light);
  }

  .count {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .icon {
    font-weight: 600;
    line-height: 1;
  }

  .value {
    font-weight: 500;
  }

  .count-fail {
    color: var(--color-danger);
  }

  .count-warn {
    color: var(--color-warning);
  }

  .count-pass {
    color: var(--color-success);
  }
</style>
