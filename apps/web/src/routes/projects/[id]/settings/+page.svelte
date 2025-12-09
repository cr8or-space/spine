<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import { Button, Card, TextField, Select, TextArea } from '$lib/components';
  import { goto } from '$app/navigation';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state - initialized empty, synced via $effect
  let title = $state('');
  let format = $state('' as typeof data.project.format);
  let author = $state('');
  let description = $state('');

  // Sync form with data when it changes
  $effect(() => {
    title = data.project.title;
    format = data.project.format;
    author = data.project.metadata.author || '';
    description = data.project.metadata.description || '';
  });

  const formatOptions = [
    { value: 'web-serial', label: 'Web Serial' },
    { value: 'light-novel', label: 'Light Novel' },
    { value: 'short', label: 'Short Story' },
  ];

  function handleCancel() {
    goto(`/projects/${data.project.id}/bible`);
  }
</script>

<svelte:head>
  <title>Settings - {data.project.title} - Spine</title>
</svelte:head>

<div class="flex-1 p-6 bg-bg">
  <div class="max-w-3xl mx-auto flex flex-col gap-6">
    <header class="mb-2">
      <h1 class="text-2xl font-bold m-0 mb-2">Project Settings</h1>
      <p class="text-base text-text-secondary m-0">Configure your project metadata and preferences</p>
    </header>

    <Card>
      <form method="POST" action="?/update" use:enhance>
        <div class="flex flex-col gap-4">
          <h2 class="text-lg font-semibold m-0 pb-3 border-b border-border-light">Basic Information</h2>

          <div class="flex flex-col gap-4">
            <TextField
              label="Project Title"
              name="title"
              bind:value={title}
              placeholder="My Web Serial"
              required
            />

            <Select
              label="Format"
              name="format"
              bind:value={format}
              options={formatOptions}
            />

            <TextField
              label="Author"
              name="author"
              bind:value={author}
              placeholder="Your name"
            />

            <TextArea
              label="Description"
              name="description"
              bind:value={description}
              placeholder="A brief description of your project..."
              rows={4}
            />
          </div>
        </div>

        {#if form?.error}
          <p class="p-3 bg-danger-light text-danger rounded-md text-sm mt-4">{form.error}</p>
        {/if}

        {#if form?.success}
          <p class="p-3 bg-success-light text-success rounded-md text-sm mt-4">Settings saved successfully!</p>
        {/if}

        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onclick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Card>

    <Card>
      <div class="flex flex-col gap-4">
        <h2 class="text-lg font-semibold m-0 pb-3 border-b border-border-light">Project Statistics</h2>

        <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <div class="flex flex-col gap-1">
            <span class="text-sm text-text-secondary font-medium">Created</span>
            <span class="text-base text-text">{new Date(data.project.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-sm text-text-secondary font-medium">Last Modified</span>
            <span class="text-base text-text">{new Date(data.project.updatedAt).toLocaleDateString()}</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-sm text-text-secondary font-medium">Project ID</span>
            <span class="text-sm text-text font-mono">{data.project.id}</span>
          </div>
        </div>
      </div>
    </Card>
  </div>
</div>
