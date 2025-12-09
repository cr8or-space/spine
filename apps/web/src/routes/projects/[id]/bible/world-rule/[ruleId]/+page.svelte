<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { ArrowLeft } from 'lucide-svelte';
  import {
    Button,
    TextField,
    TextArea,
    Select,
    Badge,
    Card,
    Dialog,
    ConfirmDialog,
  } from '$lib/components';

  let { data }: { data: PageData } = $props();

  // Edit state
  let isEditing = $state(false);
  let editForm = $state({
    name: '',
    category: '' as typeof data.worldRule.category,
    rule: '',
    description: '',
    rationale: '',
    consequences: '',
    priority: 0,
    established: false,
    publicKnowledge: false,
  });

  // Sync form with data when it changes
  $effect(() => {
    editForm = {
      name: data.worldRule.name,
      category: data.worldRule.category,
      rule: data.worldRule.rule,
      description: data.worldRule.description,
      rationale: data.worldRule.rationale || '',
      consequences: data.worldRule.consequences || '',
      priority: data.worldRule.priority,
      established: data.worldRule.established,
      publicKnowledge: data.worldRule.publicKnowledge,
    };
  });

  // Dialog states
  let showExceptionDialog = $state(false);
  let showRelatedRuleDialog = $state(false);
  let showDeleteConfirm = $state(false);

  // Exception form
  let exceptionForm = $state({
    condition: '',
    effect: '',
    applicableTo: '',
  });

  // Related rule form
  let relatedRuleForm = $state({
    relatedRuleId: '',
  });

  const categoryOptions = [
    { value: 'magic', label: 'Magic' },
    { value: 'technology', label: 'Technology' },
    { value: 'physics', label: 'Physics' },
    { value: 'social', label: 'Social' },
    { value: 'biological', label: 'Biological' },
    { value: 'economic', label: 'Economic' },
    { value: 'other', label: 'Other' },
  ];

  function resetExceptionForm() {
    exceptionForm = { condition: '', effect: '', applicableTo: '' };
  }

  function resetRelatedRuleForm() {
    relatedRuleForm = { relatedRuleId: '' };
  }

  function getRelatedRuleName(ruleId: string): string {
    const rule = data.allWorldRules.find((r) => r.id === ruleId);
    return rule?.name || 'Unknown';
  }

  function getCategoryBadgeVariant(category: typeof data.worldRule.category): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (category) {
      case 'magic': return 'primary';
      case 'technology': return 'info';
      case 'physics': return 'success';
      case 'social': return 'warning';
      default: return 'default';
    }
  }
</script>

<svelte:head>
  <title>{data.worldRule.name} - {data.project.title} - Spine</title>
</svelte:head>

<div class="flex-1 flex flex-col overflow-hidden">
  <header class="flex items-center justify-between p-6 border-b border-border bg-surface">
    <div class="flex flex-col gap-2">
      <a href="/projects/{data.project.id}/bible" class="flex items-center gap-1 text-sm text-text-secondary no-underline transition-colors duration-150 hover:text-primary">
        <ArrowLeft size={20} />
        Back to Bible
      </a>
      <h1 class="text-2xl font-bold m-0">{data.worldRule.name}</h1>
      <div class="flex gap-2">
        <Badge variant={getCategoryBadgeVariant(data.worldRule.category)}>
          {data.worldRule.category}
        </Badge>
        <Badge variant={data.worldRule.established ? 'success' : 'warning'}>
          {data.worldRule.established ? 'Established' : 'Draft'}
        </Badge>
        <Badge variant={data.worldRule.publicKnowledge ? 'info' : 'warning'}>
          {data.worldRule.publicKnowledge ? 'Public' : 'Secret'}
        </Badge>
      </div>
    </div>
    <div class="flex gap-2">
      {#if !isEditing}
        <Button variant="secondary" onclick={() => (isEditing = true)}>Edit</Button>
        <Button variant="danger" onclick={() => (showDeleteConfirm = true)}>Delete</Button>
      {/if}
    </div>
  </header>

  <div class="flex-1 overflow-auto p-6 bg-bg">
    {#if isEditing}
      <Card>
        <form method="POST" action="?/update" use:enhance={() => {
          return async ({ update }) => {
            await update();
            isEditing = false;
          };
        }}>
          <div class="grid grid-cols-2 gap-4">
            <TextField
              label="Name"
              name="name"
              bind:value={editForm.name}
              required
            />

            <Select
              label="Category"
              name="category"
              bind:value={editForm.category}
              options={categoryOptions}
            />

            <TextField
              label="Priority (0-100)"
              name="priority"
              type="number"
              bind:value={editForm.priority}
              min="0"
              max="100"
            />

            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" bind:checked={editForm.established} class="cursor-pointer" />
                Established in story
              </label>
              <input type="hidden" name="established" value={editForm.established.toString()} />

              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" bind:checked={editForm.publicKnowledge} class="cursor-pointer" />
                Public knowledge
              </label>
              <input type="hidden" name="publicKnowledge" value={editForm.publicKnowledge.toString()} />
            </div>

            <div class="col-span-2">
              <TextArea
                label="Rule"
                name="rule"
                bind:value={editForm.rule}
                rows={3}
                required
                hint="The actual rule statement"
              />
            </div>

            <div class="col-span-2">
              <TextArea
                label="Description"
                name="description"
                bind:value={editForm.description}
                rows={4}
              />
            </div>

            <div class="col-span-2">
              <TextArea
                label="Rationale"
                name="rationale"
                bind:value={editForm.rationale}
                rows={3}
                hint="Why does this rule exist in the world?"
              />
            </div>

            <div class="col-span-2">
              <TextArea
                label="Consequences"
                name="consequences"
                bind:value={editForm.consequences}
                rows={3}
                hint="What happens when this rule is broken or applied?"
              />
            </div>

            <input
              type="hidden"
              name="exceptions"
              value={JSON.stringify(data.worldRule.exceptions)}
            />

            <input
              type="hidden"
              name="relatedRules"
              value={JSON.stringify(data.worldRule.relatedRules || [])}
            />
          </div>

          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onclick={() => {
              isEditing = false;
              editForm = {
                name: data.worldRule.name,
                category: data.worldRule.category,
                rule: data.worldRule.rule,
                description: data.worldRule.description,
                rationale: data.worldRule.rationale || '',
                consequences: data.worldRule.consequences || '',
                priority: data.worldRule.priority,
                established: data.worldRule.established,
                publicKnowledge: data.worldRule.publicKnowledge,
              };
            }}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Card>
    {:else}
      <div class="grid gap-4 max-w-screen-xl">
        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Rule Statement</h2>
          <div class="text-lg font-medium p-4 bg-bg-secondary border-l-4 border-l-primary rounded-sm mb-4">
            {data.worldRule.rule}
          </div>
          <div class="text-sm text-text-secondary">
            <span>Priority: {data.worldRule.priority}/100</span>
          </div>
        </Card>

        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Details</h2>
          <div class="grid gap-4">
            {#if data.worldRule.description}
              <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-text-secondary">Description</span>
                <p class="text-sm text-text m-0 leading-relaxed">{data.worldRule.description}</p>
              </div>
            {/if}
            {#if data.worldRule.rationale}
              <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-text-secondary">Rationale</span>
                <p class="text-sm text-text m-0 leading-relaxed">{data.worldRule.rationale}</p>
              </div>
            {/if}
            {#if data.worldRule.consequences}
              <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-text-secondary">Consequences</span>
                <p class="text-sm text-text m-0 leading-relaxed">{data.worldRule.consequences}</p>
              </div>
            {/if}
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold m-0">Exceptions ({data.worldRule.exceptions.length})</h2>
            <Button size="sm" onclick={() => {
              resetExceptionForm();
              showExceptionDialog = true;
            }}>Add Exception</Button>
          </div>

          {#if data.worldRule.exceptions.length === 0}
            <p class="text-text-secondary text-sm m-0">No exceptions defined yet.</p>
          {:else}
            <div class="flex flex-col gap-3">
              {#each data.worldRule.exceptions as exception, i}
                <div class="p-3 bg-bg border border-border rounded-md">
                  <div class="text-sm mb-2">
                    <span class="font-semibold text-text-secondary mr-1">When:</span>
                    {exception.condition}
                  </div>
                  <div class="text-sm mb-2">
                    <span class="font-semibold text-text-secondary mr-1">Then:</span>
                    {exception.effect}
                  </div>
                  {#if exception.applicableTo && exception.applicableTo.length > 0}
                    <div class="text-sm mb-2">
                      <span class="font-semibold text-text-secondary mr-1">Applies to:</span>
                      {exception.applicableTo.join(', ')}
                    </div>
                  {/if}
                  <form method="POST" action="?/removeException" use:enhance>
                    <input type="hidden" name="exceptionIndex" value={i} />
                    <Button type="submit" size="sm" variant="danger">Remove</Button>
                  </form>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <Card>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold m-0">Related Rules ({data.worldRule.relatedRules?.length || 0})</h2>
            <Button size="sm" onclick={() => {
              resetRelatedRuleForm();
              showRelatedRuleDialog = true;
            }}>Add Related</Button>
          </div>

          {#if !data.worldRule.relatedRules || data.worldRule.relatedRules.length === 0}
            <p class="text-text-secondary text-sm m-0">No related rules yet.</p>
          {:else}
            <div class="flex flex-col gap-2">
              {#each data.worldRule.relatedRules as relatedId}
                <div class="flex items-center justify-between p-3 bg-bg border border-border rounded-md">
                  <a href="/projects/{data.project.id}/bible/world-rule/{relatedId}" class="font-medium text-primary no-underline hover:underline">
                    {getRelatedRuleName(relatedId)}
                  </a>
                  <form method="POST" action="?/removeRelatedRule" use:enhance>
                    <input type="hidden" name="relatedRuleId" value={relatedId} />
                    <Button type="submit" size="sm" variant="danger">Remove</Button>
                  </form>
                </div>
              {/each}
            </div>
          {/if}
        </Card>
      </div>
    {/if}
  </div>
</div>

<!-- Add Exception Dialog -->
<Dialog
  open={showExceptionDialog}
  title="Add Exception"
  onClose={() => (showExceptionDialog = false)}
>
  <form method="POST" action="?/addException" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showExceptionDialog = false;
      resetExceptionForm();
    };
  }}>
    <div class="flex flex-col gap-4">
      <TextArea
        label="Condition"
        name="condition"
        bind:value={exceptionForm.condition}
        rows={2}
        required
        hint="When does this exception apply?"
      />
      <TextArea
        label="Effect"
        name="effect"
        bind:value={exceptionForm.effect}
        rows={2}
        required
        hint="What happens instead?"
      />
      <TextField
        label="Applicable To (comma-separated)"
        name="applicableTo-display"
        bind:value={exceptionForm.applicableTo}
        hint="Characters, locations, or situations"
      />
      <input
        type="hidden"
        name="applicableTo"
        value={JSON.stringify(exceptionForm.applicableTo.split(',').map(a => a.trim()).filter(Boolean))}
      />

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
        <Button type="button" variant="secondary" onclick={() => (showExceptionDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Exception</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Add Related Rule Dialog -->
<Dialog
  open={showRelatedRuleDialog}
  title="Add Related Rule"
  onClose={() => (showRelatedRuleDialog = false)}
>
  <form method="POST" action="?/addRelatedRule" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showRelatedRuleDialog = false;
      resetRelatedRuleForm();
    };
  }}>
    <div class="flex flex-col gap-4">
      <Select
        label="Related Rule"
        name="relatedRuleId"
        bind:value={relatedRuleForm.relatedRuleId}
        options={data.allWorldRules.map(r => ({ value: r.id, label: r.name }))}
        required
      />

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
        <Button type="button" variant="secondary" onclick={() => (showRelatedRuleDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Related Rule</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Delete Confirmation -->
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete World Rule"
  message="Are you sure you want to delete {data.worldRule.name}? This action cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  onConfirm={() => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '?/delete';
    document.body.appendChild(form);
    form.submit();
  }}
  onCancel={() => (showDeleteConfirm = false)}
/>
