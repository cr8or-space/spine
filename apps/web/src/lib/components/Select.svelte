<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import { ChevronDown } from 'lucide-svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface Props extends Omit<HTMLSelectAttributes, 'value'> {
    label?: string;
    value: string;
    options: Option[];
    error?: string;
    hint?: string;
  }

  let { label, value = $bindable(), options, error, hint, id, name, required, disabled }: Props = $props();

  const inputId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="select-field" class:has-error={error}>
  {#if label}
    <label for={inputId} class="label">{label}</label>
  {/if}

  <div class="select-wrapper">
    <select
      id={inputId}
      class="select"
      bind:value
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
      {name}
      {required}
      {disabled}
    >
      {#each options as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <ChevronDown class="select-icon" size={16} />
  </div>

  {#if error}
    <p id="{inputId}-error" class="error-text">{error}</p>
  {:else if hint}
    <p id="{inputId}-hint" class="hint-text">{hint}</p>
  {/if}
</div>

<style>
  .select-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .select-wrapper {
    position: relative;
  }

  .select {
    width: 100%;
    padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
    font-family: inherit;
    font-size: var(--text-sm);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    appearance: none;
    cursor: pointer;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .select-wrapper :global(.select-icon) {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--color-text-secondary);
  }

  .has-error .select {
    border-color: var(--color-danger);
  }

  .has-error .select:focus {
    box-shadow: 0 0 0 3px var(--color-danger-light);
  }

  .error-text {
    font-size: var(--text-xs);
    color: var(--color-danger);
    margin: 0;
  }

  .hint-text {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }
</style>
