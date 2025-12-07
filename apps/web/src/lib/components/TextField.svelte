<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLInputAttributes, 'value'> {
    label?: string;
    value: string;
    error?: string;
    hint?: string;
  }

  let { label, value = $bindable(), error, hint, id, ...rest }: Props = $props();

  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="text-field" class:has-error={error}>
  {#if label}
    <label for={inputId} class="label">{label}</label>
  {/if}

  <input
    id={inputId}
    class="input"
    bind:value
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
    {...rest}
  />

  {#if error}
    <p id="{inputId}-error" class="error-text">{error}</p>
  {:else if hint}
    <p id="{inputId}-hint" class="hint-text">{hint}</p>
  {/if}
</div>

<style>
  .text-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-family: inherit;
    font-size: var(--text-sm);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .input::placeholder {
    color: var(--color-text-tertiary);
  }

  .input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .has-error .input {
    border-color: var(--color-danger);
  }

  .has-error .input:focus {
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
