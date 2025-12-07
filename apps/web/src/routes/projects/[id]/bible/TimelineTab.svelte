<script lang="ts">
  import type { TimelineEvent } from '@repo/types';
  import { Button, Card, EmptyState, Badge, Dialog, TextField, TextArea, Select } from '$lib/components';
  import { enhance } from '$app/forms';

  interface Props {
    timelineEvents: TimelineEvent[];
    projectId: string;
    searchQuery: string;
  }

  let { timelineEvents, projectId, searchQuery }: Props = $props();

  const filteredEvents = $derived(
    searchQuery
      ? timelineEvents.filter(
          (event) =>
            event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : timelineEvents
  );

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

<div class="timeline-tab">
  <div class="tab-toolbar">
    <div class="toolbar-info">
      <span class="count-label">
        {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        {#if searchQuery}
          (filtered from {timelineEvents.length})
        {/if}
      </span>
    </div>
    <Button onclick={() => (showCreateDialog = true)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New Event
    </Button>
  </div>

  {#if filteredEvents.length === 0}
    {#if searchQuery}
      <EmptyState
        title="No timeline events found"
        description="Try adjusting your search query."
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
    <div class="event-grid">
      {#each filteredEvents as event (event.id)}
        <Card hover padding="none">
          <a href="/projects/{projectId}/bible/timeline/{event.id}" class="event-link">
            <div class="event-content">
              <div class="event-header">
                <h3 class="event-name">{event.name}</h3>
                <div class="event-badges">
                  <Badge variant={getTypeBadgeVariant(event.type)}>
                    {event.type}
                  </Badge>
                  <Badge variant={getSignificanceBadgeVariant(event.significance)}>
                    {event.significance}
                  </Badge>
                </div>
              </div>

              <div class="event-time">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {formatTimelinePosition(event)}
                {#if event.position.approximate}
                  <Badge size="sm" variant="warning">~</Badge>
                {/if}
              </div>

              <p class="event-description">
                {event.description.length > 200
                  ? event.description.substring(0, 200) + '...'
                  : event.description}
              </p>

              <div class="event-meta">
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  </svg>
                  {event.involvedCharacters.length} characters
                </span>
                <span class="meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  </svg>
                  {event.locations.length} locations
                </span>
                <span class="meta-item">
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

<style>
  .timeline-tab {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .tab-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .count-label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .event-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--space-4);
  }

  .event-link {
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .event-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .event-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .event-name {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .event-badges {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .event-time {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .event-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .event-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-light);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .dialog-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  .checkbox-group {
    display: flex;
    gap: var(--space-4);
  }

  .position-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .position-group-full {
    grid-column: 1 / -1;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
    margin-top: var(--space-2);
  }
</style>

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
    <div class="dialog-form">
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

      <div class="position-group">
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

        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={createForm.approximate} />
            Approximate time
          </label>
          <input type="hidden" name="approximate" value={createForm.approximate.toString()} />
        </div>
      </div>

      <label class="checkbox-label">
        <input type="checkbox" bind:checked={createForm.revealed} />
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

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showCreateDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Create Event</Button>
      </div>
    </div>
  </form>
</Dialog>
