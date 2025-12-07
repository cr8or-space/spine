<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import { Select } from 'bits-ui';
  import { Check, ChevronDown } from 'lucide-svelte';

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

  let { label, value = $bindable(), options, error, hint, id, name, required, disabled }: Props =
    $props();

  const inputId = id || `select-${Math.random().toString(36).slice(2, 9)}`;

  const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');

  function handleValueChange(newValue: string | undefined) {
    if (newValue !== undefined) {
      value = newValue;
    }
  }
</script>

<div class="select-field" class:has-error={error}>
  {#if label}
    <label for={inputId} class="label">{label}</label>
  {/if}

  <!-- Hidden input for form submission -->
  <input type="hidden" {name} {value} />

  <Select.Root
    type="single"
    {disabled}
    value={value}
    onValueChange={handleValueChange}
    items={options}
  >
    <Select.Trigger
      id={inputId}
      class="select-trigger"
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
      aria-required={required}
    >
      <span class="select-value">{selectedLabel || 'Select...'}</span>
      <ChevronDown size={16} class="select-icon" />
    </Select.Trigger>
    <Select.Portal>
      <Select.Content class="select-content">
        <Select.Viewport class="select-viewport">
          {#each options as option}
            <Select.Item value={option.value} label={option.label} class="select-item">
              {#snippet children({ selected })}
                <span class="select-item-text">{option.label}</span>
                {#if selected}
                  <Check size={16} class="select-check" />
                {/if}
              {/snippet}
            </Select.Item>
          {/each}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>

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

  :global(.select-trigger) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-family: inherit;
    font-size: var(--text-sm);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  :global(.select-trigger:focus) {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  :global(.select-trigger[data-disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .has-error :global(.select-trigger) {
    border-color: var(--color-danger);
  }

  .has-error :global(.select-trigger:focus) {
    box-shadow: 0 0 0 3px var(--color-danger-light);
  }

  .select-value {
    flex: 1;
    text-align: left;
  }

  :global(.select-icon) {
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  :global(.select-content) {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 1002;
    overflow: hidden;
    width: var(--bits-select-anchor-width);
    max-height: var(--bits-select-content-available-height, 300px);
  }

  :global(.select-viewport) {
    padding: var(--space-1);
  }

  :global(.select-item) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    border-radius: var(--radius-sm);
    cursor: pointer;
    outline: none;
  }

  :global(.select-item[data-highlighted]) {
    background-color: var(--color-surface-hover);
  }

  :global(.select-item[data-state='checked']) {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
  }

  :global(.select-item[data-disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .select-item-text {
    flex: 1;
  }

  :global(.select-check) {
    color: var(--color-primary);
    flex-shrink: 0;
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
