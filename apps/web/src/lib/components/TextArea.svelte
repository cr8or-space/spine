<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
    label?: string;
    value: string;
    error?: string;
    hint?: string;
  }

  let {
    label,
    value = $bindable(),
    error,
    hint,
    id,
    rows = 4,
    name,
    required,
    placeholder,
    disabled,
  }: Props = $props();

  let inputId = $derived(id || `textarea-${Math.random().toString(36).slice(2, 9)}`);

  let textareaClasses = $derived(
    cn(
      'w-full px-3 py-2 text-sm bg-bg border border-border rounded-md text-text',
      'resize-y min-h-20 transition-all duration-150',
      'placeholder:text-text-tertiary',
      'focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary-light',
      error && 'border-danger focus:ring-danger-light'
    )
  );
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={inputId} class="text-sm font-medium text-text">{label}</label>
  {/if}

  <textarea
    id={inputId}
    class={textareaClasses}
    bind:value
    {rows}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
    {name}
    {required}
    {placeholder}
    {disabled}
  ></textarea>

  {#if error}
    <p id="{inputId}-error" class="text-xs text-danger m-0">{error}</p>
  {:else if hint}
    <p id="{inputId}-hint" class="text-xs text-text-secondary m-0">{hint}</p>
  {/if}
</div>
