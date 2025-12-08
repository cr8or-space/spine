<script lang="ts">
  import type { WorldRule } from '@repo/types';
  import { Button, Card, EmptyState, Badge, Dialog, TextField, TextArea, Select, FilterSelect } from '$lib/components';
  import { enhance } from '$app/forms';
  import { Plus, Info } from 'lucide-svelte';

  interface Props {
    worldRules: WorldRule[];
    projectId: string;
    searchQuery: string;
  }

  let { worldRules, projectId, searchQuery }: Props = $props();

  let categoryFilter = $state('');
  let establishedFilter = $state('');

  const establishedOptions = [
    { value: 'true', label: 'Established' },
    { value: 'false', label: 'Draft' },
  ];

  const filteredRules = $derived(
    worldRules.filter((rule) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          rule.name.toLowerCase().includes(query) ||
          rule.rule.toLowerCase().includes(query) ||
          rule.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      // Category filter
      if (categoryFilter && rule.category !== categoryFilter) return false;
      // Established filter
      if (establishedFilter) {
        const isEstablished = establishedFilter === 'true';
        if (rule.established !== isEstablished) return false;
      }
      return true;
    })
  );

  const hasActiveFilters = $derived(!!categoryFilter || !!establishedFilter);

  function clearFilters() {
    categoryFilter = '';
    establishedFilter = '';
  }

  let showCreateDialog = $state(false);

  let createForm = $state({
    name: '',
    category: 'magic' as WorldRule['category'],
    rule: '',
    description: '',
    established: true,
    publicKnowledge: true,
    priority: 50,
  });

  const categoryOptions = [
    { value: 'magic', label: 'Magic' },
    { value: 'technology', label: 'Technology' },
    { value: 'physics', label: 'Physics' },
    { value: 'social', label: 'Social' },
    { value: 'biological', label: 'Biological' },
    { value: 'economic', label: 'Economic' },
    { value: 'political', label: 'Political' },
    { value: 'metaphysical', label: 'Metaphysical' },
    { value: 'other', label: 'Other' },
  ];

  function resetCreateForm() {
    createForm = {
      name: '',
      category: 'magic',
      rule: '',
      description: '',
      established: true,
      publicKnowledge: true,
      priority: 50,
    };
  }

  function getCategoryBadgeVariant(category: WorldRule['category']): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (category) {
      case 'magic':
        return 'primary';
      case 'technology':
        return 'info';
      case 'physics':
        return 'success';
      case 'social':
        return 'warning';
      default:
        return 'default';
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between gap-4 flex-wrap">
    <div class="flex items-center gap-4 flex-wrap">
      <span class="text-sm text-text-secondary">
        {filteredRules.length} {filteredRules.length === 1 ? 'rule' : 'rules'}
        {#if searchQuery || hasActiveFilters}
          (filtered from {worldRules.length})
        {/if}
      </span>
      <div class="flex items-center gap-2">
        <FilterSelect bind:value={categoryFilter} options={categoryOptions} allLabel="All categories" />
        <FilterSelect bind:value={establishedFilter} options={establishedOptions} allLabel="All states" />
        {#if hasActiveFilters}
          <button class="px-2 py-1 font-inherit text-xs text-text-secondary bg-transparent border-none cursor-pointer underline hover:text-text" onclick={clearFilters}>Clear</button>
        {/if}
      </div>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <Plus size={16} />
      New Rule
    </Button>
  </div>

  {#if filteredRules.length === 0}
    {#if searchQuery || hasActiveFilters}
      <EmptyState
        title="No rules found"
        description="Try adjusting your search query or filters."
      />
    {:else}
      <EmptyState
        title="No world rules yet"
        description="Define the rules that govern your story world: magic systems, physics, social norms, and more."
      >
        {#snippet action()}
          <Button onclick={() => (showCreateDialog = true)}>Create Rule</Button>
        {/snippet}
      </EmptyState>
    {/if}
  {:else}
    <div class="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4">
      {#each filteredRules as rule (rule.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/world-rule/{rule.id}" class="block no-underline text-inherit">
            <div class="p-4 flex flex-col gap-3">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-lg font-semibold m-0 text-text">{rule.name}</h3>
                <div class="flex gap-2 shrink-0">
                  <Badge variant={getCategoryBadgeVariant(rule.category)}>
                    {rule.category}
                  </Badge>
                  {#if rule.established}
                    <Badge variant="success">Established</Badge>
                  {:else}
                    <Badge variant="warning">Draft</Badge>
                  {/if}
                </div>
              </div>

              <div class="text-sm text-text font-medium leading-normal py-2 px-3 bg-bg-secondary border-l-3 border-primary rounded-sm">
                {rule.rule.length > 150
                  ? rule.rule.substring(0, 150) + '...'
                  : rule.rule}
              </div>

              {#if rule.description}
                <p class="text-sm text-text-secondary leading-normal m-0">
                  {rule.description.length > 100
                    ? rule.description.substring(0, 100) + '...'
                    : rule.description}
                </p>
              {/if}

              <div class="flex flex-wrap gap-4 text-xs text-text-tertiary pt-2 border-t border-border-light">
                <span class="flex items-center gap-1">
                  Priority: {rule.priority}/100
                </span>
                <span class="flex items-center gap-1">
                  <Info size={14} />
                  {rule.exceptions.length} exceptions
                </span>
                <span class="flex items-center gap-1">
                  {rule.publicKnowledge ? 'Public' : 'Secret'}
                </span>
              </div>
            </div>
          </a>
        </Card>
      {/each}
    </div>
  {/if}
</div>


<!-- Create World Rule Dialog -->
<Dialog
  open={showCreateDialog}
  title="Create World Rule"
  onClose={() => (showCreateDialog = false)}
>
  <form method="POST" action="?/createWorldRule" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'redirect') {
        showCreateDialog = false;
        resetCreateForm();
        window.location.href = result.location;
      } else if (result.type === 'failure') {
        console.error('Create world rule failed:', result.data);
      }
    };
  }}>
    <div class="flex flex-col gap-4">
      <TextField
        label="Name"
        name="name"
        bind:value={createForm.name}
        required
        hint="A short name for this rule"
      />

      <Select
        label="Category"
        name="category"
        bind:value={createForm.category}
        options={categoryOptions}
      />

      <TextArea
        label="Rule"
        name="rule"
        bind:value={createForm.rule}
        rows={3}
        required
        hint="The actual rule statement (e.g., 'Magic cannot create food')"
      />

      <TextArea
        label="Description"
        name="description"
        bind:value={createForm.description}
        rows={4}
        hint="Additional context or explanation"
      />

      <TextField
        label="Priority (0-100)"
        name="priority"
        type="number"
        bind:value={createForm.priority}
        min="0"
        max="100"
        hint="Higher priority rules take precedence"
      />

      <div class="flex gap-4">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="established" bind:checked={createForm.established} class="cursor-pointer" />
          Established in story
        </label>
        <input type="hidden" name="established" value={createForm.established.toString()} />

        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="publicKnowledge" bind:checked={createForm.publicKnowledge} class="cursor-pointer" />
          Public knowledge
        </label>
        <input type="hidden" name="publicKnowledge" value={createForm.publicKnowledge.toString()} />
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
        <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Create Rule</Button>
      </div>
    </div>
  </form>
</Dialog>
