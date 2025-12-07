<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
    label?: string;
    value: string;
    error?: string;
    hint?: string;
  }

  let { label, value = $bindable(), error, hint, id, rows = 4, ...rest }: Props = $props();

  const inputId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="text-area-field" class:has-error={error}>
  {#if label}
    <label for={inputId} class="label">{label}</label>
  {/if}

  <textarea
    id={inputId}
    class="textarea"
    bind:value
    {rows}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
    {...rest}
  ></textarea>

  {#if error}
    <p id="{inputId}-error" class="error-text">{error}</p>
  {:else if hint}
    <p id="{inputId}-hint" class="hint-text">{hint}</p>
  {/if}
</div>

<style>
  .text-area-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .textarea {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-family: inherit;
    font-size: var(--text-sm);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    resize: vertical;
    min-height: 80px;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .textarea::placeholder {
    color: var(--color-text-tertiary);
  }

  .textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .has-error .textarea {
    border-color: var(--color-danger);
  }

  .has-error .textarea:focus {
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
