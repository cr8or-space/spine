<!--
  Select.svelte - Accessible select component using Bits UI

  This component wraps Bits UI Select primitives to provide:
  - Keyboard navigation (arrows, home, end)
  - Typeahead search
  - Proper ARIA attributes and roles
  - Portal-based dropdown for proper z-index handling
-->
<script lang="ts">
  import { Select } from 'bits-ui';
  import { cn } from '$lib/utils/cn';

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

  let selectedLabel = $derived(
    options.find((opt) => opt.value === value)?.label ?? placeholder
  );

  // Transform options for Bits UI
  let items = $derived(options.map((opt) => ({ value: opt.value, label: opt.label })));

  function handleValueChange(newValue: string | undefined) {
    if (newValue !== undefined) {
      value = newValue;
    }
  }

  const triggerClasses = cn(
    'flex items-center justify-between w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text cursor-pointer transition-all duration-150',
    'hover:border-text-tertiary',
    'focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary-light',
    'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
    error && 'border-danger focus:ring-danger-light'
  );
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={inputId} class="text-sm font-medium text-text">{label}</label>
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
      class={triggerClasses}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
    >
      <span
        class={cn(
          'flex-1 text-left overflow-hidden text-ellipsis whitespace-nowrap',
          !value && 'text-text-tertiary'
        )}
      >
        {selectedLabel}
      </span>
      <svg
        class="shrink-0 text-text-secondary transition-transform duration-150 [[data-state=open]_&]:rotate-180"
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
      <Select.Content
        class="bg-surface border border-border rounded-md shadow-lg z-[1002] overflow-hidden animate-[selectIn_0.15s_ease-out]"
      >
        <Select.Viewport class="p-1 max-h-[300px] overflow-y-auto">
          {#each options as option (option.value)}
            <Select.Item
              value={option.value}
              label={option.label}
              class="flex items-center justify-between px-3 py-2 text-sm text-text rounded-sm cursor-pointer transition-colors duration-150 hover:bg-surface-hover data-[highlighted]:bg-surface-hover data-[state=checked]:text-primary focus-visible:outline-none focus-visible:bg-surface-hover"
            >
              {#snippet children({ selected })}
                <span class="flex-1">{option.label}</span>
                {#if selected}
                  <svg
                    class="shrink-0 text-primary"
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
    <p id="{inputId}-error" class="text-xs text-danger m-0">{error}</p>
  {:else if hint}
    <p id="{inputId}-hint" class="text-xs text-text-secondary m-0">{hint}</p>
  {/if}
</div>

<style>
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
</style>
