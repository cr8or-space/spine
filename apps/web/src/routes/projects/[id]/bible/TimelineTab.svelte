<script lang="ts">
  import type { TimelineEvent } from '@repo/types';
  import { Button, Card, EmptyState, Badge, Dialog, TextField, TextArea, Select, FilterSelect } from '$lib/components';
  import { enhance } from '$app/forms';
  import { Plus, Clock, Users, MapPin } from 'lucide-svelte';

  interface Props {
    timelineEvents: TimelineEvent[];
    projectId: string;
    searchQuery: string;
  }

  let { timelineEvents, projectId, searchQuery }: Props = $props();

  let typeFilter = $state('');
  let significanceFilter = $state('');

  const filteredEvents = $derived(
    timelineEvents.filter((event) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          event.name.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      // Type filter
      if (typeFilter && event.type !== typeFilter) return false;
      // Significance filter
      if (significanceFilter && event.significance !== significanceFilter) return false;
      return true;
    })
  );

  const hasActiveFilters = $derived(!!typeFilter || !!significanceFilter);

  function clearFilters() {
    typeFilter = '';
    significanceFilter = '';
  }

  let showCreateDialog = $state(false);

  let createForm = $state({
    name: '',
    description: '',
    type: 'current' as TimelineEvent['type'],
    significance: 'moderate' as TimelineEvent['significance'],
    date: '',
    storyTime: '',
    chapterNumber: '',
    approximate: false,
    revealed: true,
  });

  const typeOptions = [
    { value: 'backstory', label: 'Backstory' },
    { value: 'flashback', label: 'Flashback' },
    { value: 'current', label: 'Current' },
    { value: 'flashforward', label: 'Flashforward' },
    { value: 'prophecy', label: 'Prophecy' },
    { value: 'hypothetical', label: 'Hypothetical' },
  ];

  const significanceOptions = [
    { value: 'critical', label: 'Critical' },
    { value: 'major', label: 'Major' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'minor', label: 'Minor' },
    { value: 'background', label: 'Background' },
  ];

  function resetCreateForm() {
    createForm = {
      name: '',
      description: '',
      type: 'current',
      significance: 'moderate',
      date: '',
      storyTime: '',
      chapterNumber: '',
      approximate: false,
      revealed: true,
    };
  }

  function getTypeBadgeVariant(type: TimelineEvent['type']): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (type) {
      case 'current':
        return 'success';
      case 'backstory':
        return 'info';
      case 'flashback':
        return 'warning';
      case 'flashforward':
      case 'prophecy':
        return 'primary';
      default:
        return 'default';
    }
  }

  function getSignificanceBadgeVariant(significance: TimelineEvent['significance']): 'danger' | 'primary' | 'warning' | 'info' | 'default' {
    switch (significance) {
      case 'critical':
        return 'danger';
      case 'major':
        return 'primary';
      case 'moderate':
        return 'warning';
      case 'minor':
        return 'info';
      default:
        return 'default';
    }
  }

  function formatTimelinePosition(event: TimelineEvent): string {
    const { position } = event;
    if (position.date) return position.date;
    if (position.storyTime) return position.storyTime;
    if (position.chapterNumber) return `Chapter ${position.chapterNumber}`;
    return 'Unknown time';
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between gap-4 flex-wrap">
    <div class="flex items-center gap-4 flex-wrap">
      <span class="text-sm text-text-secondary">
        {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        {#if searchQuery || hasActiveFilters}
          (filtered from {timelineEvents.length})
        {/if}
      </span>
      <div class="flex items-center gap-2">
        <FilterSelect bind:value={typeFilter} options={typeOptions} allLabel="All types" />
        <FilterSelect bind:value={significanceFilter} options={significanceOptions} allLabel="All significance" />
        {#if hasActiveFilters}
          <button class="px-2 py-1 font-inherit text-xs text-text-secondary bg-transparent border-none cursor-pointer underline hover:text-text" onclick={clearFilters}>Clear</button>
        {/if}
      </div>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <Plus size={16} />
      New Event
    </Button>
  </div>

  {#if filteredEvents.length === 0}
    {#if searchQuery || hasActiveFilters}
      <EmptyState
        title="No timeline events found"
        description="Try adjusting your search query or filters."
      />
    {:else}
      <EmptyState
        title="No timeline events yet"
        description="Track what happens when in your story, including backstory and key moments."
      >
        {#snippet action()}
          <Button onclick={() => (showCreateDialog = true)}>Create Event</Button>
        {/snippet}
      </EmptyState>
    {/if}
  {:else}
    <div class="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4">
      {#each filteredEvents as event (event.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/timeline/{event.id}" class="block no-underline text-inherit">
            <div class="p-4 flex flex-col gap-3">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-lg font-semibold m-0 text-text">{event.name}</h3>
                <div class="flex gap-2 shrink-0">
                  <Badge variant={getTypeBadgeVariant(event.type)}>
                    {event.type}
                  </Badge>
                  <Badge variant={getSignificanceBadgeVariant(event.significance)}>
                    {event.significance}
                  </Badge>
                </div>
              </div>

              <div class="flex items-center gap-2 text-sm text-text-secondary font-medium">
                <Clock size={14} />
                {formatTimelinePosition(event)}
                {#if event.position.approximate}
                  <Badge size="sm" variant="warning">~</Badge>
                {/if}
              </div>

              <p class="text-sm text-text-secondary leading-normal m-0">
                {event.description.length > 200
                  ? event.description.substring(0, 200) + '...'
                  : event.description}
              </p>

              <div class="flex flex-wrap gap-4 text-xs text-text-tertiary pt-2 border-t border-border-light">
                <span class="flex items-center gap-1">
                  <Users size={14} />
                  {event.involvedCharacters.length} characters
                </span>
                <span class="flex items-center gap-1">
                  <MapPin size={14} />
                  {event.locations.length} locations
                </span>
                <span class="flex items-center gap-1">
                  {event.revealed ? 'Revealed' : 'Hidden'}
                </span>
              </div>
            </div>
          </a>
        </Card>
      {/each}
    </div>
  {/if}
</div>


<!-- Create Timeline Event Dialog -->
<Dialog
  open={showCreateDialog}
  title="Create Timeline Event"
  onClose={() => (showCreateDialog = false)}
>
  <form method="POST" action="?/createTimelineEvent" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'redirect') {
        showCreateDialog = false;
        resetCreateForm();
        window.location.href = result.location;
      } else if (result.type === 'failure') {
        console.error('Create timeline event failed:', result.data);
      }
    };
  }}>
    <div class="flex flex-col gap-4">
      <TextField
        label="Name"
        name="name"
        bind:value={createForm.name}
        required
      />

      <Select
        label="Type"
        name="type"
        bind:value={createForm.type}
        options={typeOptions}
      />

      <Select
        label="Significance"
        name="significance"
        bind:value={createForm.significance}
        options={significanceOptions}
      />

      <div class="grid grid-cols-2 gap-4">
        <TextField
          label="Date (in-world)"
          name="date"
          bind:value={createForm.date}
          hint="e.g., Year 1042, Day of Fire"
        />

        <TextField
          label="Story Time"
          name="storyTime"
          bind:value={createForm.storyTime}
          hint="e.g., Before the war, 5 years ago"
        />

        <TextField
          label="Chapter Number"
          name="chapterNumber"
          type="number"
          bind:value={createForm.chapterNumber}
          hint="When this is revealed"
        />

        <div class="flex gap-4">
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" bind:checked={createForm.approximate} class="cursor-pointer" />
            Approximate time
          </label>
          <input type="hidden" name="approximate" value={createForm.approximate.toString()} />
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" bind:checked={createForm.revealed} class="cursor-pointer" />
        Already revealed in story
      </label>
      <input type="hidden" name="revealed" value={createForm.revealed.toString()} />

      <TextArea
        label="Description"
        name="description"
        bind:value={createForm.description}
        rows={6}
        required
      />

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
        <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Create Event</Button>
      </div>
    </div>
  </form>
</Dialog>
