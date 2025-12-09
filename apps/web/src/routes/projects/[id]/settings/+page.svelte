<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import { Button, Card, TextField, Select, TextArea } from '$lib/components';
  import { goto } from '$app/navigation';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state
  let title = $state(data.project.title);
  let format = $state(data.project.format);
  let author = $state(data.project.metadata.author || '');
  let description = $state(data.project.metadata.description || '');

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

<div class="settings-page">
  <div class="settings-container">
    <header class="page-header">
      <h1 class="page-title">Project Settings</h1>
      <p class="page-description">Configure your project metadata and preferences</p>
    </header>

    <Card>
      <form method="POST" action="?/update" use:enhance>
        <div class="form-section">
          <h2 class="section-title">Basic Information</h2>

          <div class="form-fields">
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
          <p class="form-error">{form.error}</p>
        {/if}

        {#if form?.success}
          <p class="form-success">Settings saved successfully!</p>
        {/if}

        <div class="form-actions">
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
      <div class="form-section">
        <h2 class="section-title">Project Statistics</h2>

        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Created</span>
            <span class="stat-value">{new Date(data.project.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Last Modified</span>
            <span class="stat-value">{new Date(data.project.updatedAt).toLocaleDateString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Project ID</span>
            <span class="stat-value stat-mono">{data.project.id}</span>
          </div>
        </div>
      </div>
    </Card>
  </div>
</div>

<style>
  .settings-page {
    flex: 1;
    padding: var(--space-6);
    background-color: var(--color-bg);
  }

  .settings-container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .page-header {
    margin-bottom: var(--space-2);
  }

  .page-title {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin: 0 0 var(--space-2);
  }

  .page-description {
    font-size: var(--text-base);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .section-title {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border-light);
  }

  .form-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-error {
    padding: var(--space-3);
    background-color: var(--color-danger-light);
    color: var(--color-danger);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    margin: var(--space-4) 0 0;
  }

  .form-success {
    padding: var(--space-3);
    background-color: var(--color-success-light);
    color: var(--color-success);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    margin: var(--space-4) 0 0;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stat-label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .stat-value {
    font-size: var(--text-base);
    color: var(--color-text);
  }

  .stat-mono {
    font-family: monospace;
    font-size: var(--text-sm);
  }
</style>
