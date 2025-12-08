<script lang="ts">
  import { Select } from 'bits-ui';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    label?: string;
    value: string;
    options: Option[];
    error?: string;
    hint?: string;
    id?: string;
    name?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
  }

  let {
    label,
    value = $bindable(),
    options,
    error,
    hint,
    id,
    name,
    required,
    disabled,
    placeholder = 'Select an option...',
  }: Props = $props();

  const inputId = id || `select-${Math.random().toString(36).slice(2, 9)}`;

  let selectedLabel = $derived(options.find((opt) => opt.value === value)?.label ?? placeholder);

  // Transform options for Bits UI
  let items = $derived(options.map((opt) => ({ value: opt.value, label: opt.label })));

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

  <Select.Root
    type="single"
    {items}
    {name}
    {required}
    {disabled}
    onValueChange={handleValueChange}
  >
    <Select.Trigger
      id={inputId}
      class="select-trigger"
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
    >
      <span class="select-value" class:placeholder={!value}>{selectedLabel}</span>
      <svg
        class="select-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content class="select-content">
        <Select.Viewport class="select-viewport">
          {#each options as option (option.value)}
            <Select.Item value={option.value} label={option.label} class="select-item">
              {#snippet children({ selected })}
                <span class="select-item-text">{option.label}</span>
                {#if selected}
                  <svg
                    class="select-check"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
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

  :global(.select-trigger:hover) {
    border-color: var(--color-text-tertiary);
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-value.placeholder {
    color: var(--color-text-tertiary);
  }

  .select-icon {
    flex-shrink: 0;
    color: var(--color-text-secondary);
    transition: transform var(--transition-fast);
  }

  :global(.select-trigger[data-state='open']) .select-icon {
    transform: rotate(180deg);
  }

  :global(.select-content) {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 1002;
    animation: selectIn 0.15s ease-out;
    overflow: hidden;
  }

  @keyframes selectIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  :global(.select-viewport) {
    padding: var(--space-1);
    max-height: 300px;
    overflow-y: auto;
  }

  :global(.select-item) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  :global(.select-item:hover),
  :global(.select-item[data-highlighted]) {
    background-color: var(--color-surface-hover);
  }

  :global(.select-item[data-state='checked']) {
    color: var(--color-primary);
  }

  :global(.select-item:focus-visible) {
    outline: none;
    background-color: var(--color-surface-hover);
  }

  .select-item-text {
    flex: 1;
  }

  .select-check {
    flex-shrink: 0;
    color: var(--color-primary);
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
