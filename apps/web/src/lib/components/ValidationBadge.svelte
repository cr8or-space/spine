<script lang="ts">
  /**
   * ValidationBadge - Compact display of validation status.
   *
   * Shows pass/fail/warn counts with color coding.
   * Useful for summarizing validation results at a glance.
   */

  import { cn } from '$lib/utils/cn';

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
    class={cn(
      'inline-flex items-center gap-2 rounded-md border font-sans disabled:cursor-default',
      size === 'sm' && 'px-1 text-xs gap-1',
      size === 'md' && 'py-1 px-2 text-sm',
      overallStatus === 'fail' && 'border-danger bg-danger-light',
      overallStatus === 'warn' && 'border-warning bg-warning-light',
      overallStatus === 'pass' && 'border-success bg-success-light',
      overallStatus === 'empty' && 'border-border-light bg-surface',
      onclick && 'cursor-pointer transition-all duration-150 hover:border-primary hover:shadow-sm'
    )}
    type="button"
    onclick={onclick}
    disabled={!onclick}
    aria-label="Validation status: {passCount} passed, {failCount} failed, {warnCount} warnings"
  >
    {#if showFail}
      <span class="inline-flex items-center gap-0.5 text-danger" aria-label="{failCount} failed">
        <span class="font-semibold leading-none">✕</span>
        <span class="font-medium">{failCount}</span>
      </span>
    {/if}

    {#if showWarn}
      <span class="inline-flex items-center gap-0.5 text-warning" aria-label="{warnCount} warnings">
        <span class="font-semibold leading-none">!</span>
        <span class="font-medium">{warnCount}</span>
      </span>
    {/if}

    {#if showPass}
      <span class="inline-flex items-center gap-0.5 text-success" aria-label="{passCount} passed">
        <span class="font-semibold leading-none">✓</span>
        <span class="font-medium">{passCount}</span>
      </span>
    {/if}
  </button>
{/if}
