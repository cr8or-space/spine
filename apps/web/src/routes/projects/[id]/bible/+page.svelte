<script lang="ts">
  import type { PageData } from './$types';
  import { Tabs, SearchInput } from '$lib/components';
  import CharacterTab from './CharacterTab.svelte';
  import LocationTab from './LocationTab.svelte';
  import FactionTab from './FactionTab.svelte';
  import WorldRuleTab from './WorldRuleTab.svelte';
  import PlotThreadTab from './PlotThreadTab.svelte';
  import TimelineTab from './TimelineTab.svelte';

  let { data }: { data: PageData } = $props();

  let activeTab = $state('characters');
  let searchQuery = $state('');

  const tabs = [
    { id: 'characters', label: 'Characters', count: data.bible.characters.length },
    { id: 'locations', label: 'Locations', count: data.bible.locations.length },
    { id: 'factions', label: 'Factions', count: data.bible.factions.length },
    { id: 'world-rules', label: 'World Rules', count: data.bible.worldRules.length },
    { id: 'plot-threads', label: 'Plot Threads', count: data.bible.plotThreads.length },
    { id: 'timeline', label: 'Timeline', count: data.bible.timelineEvents.length },
  ];
</script>

<svelte:head>
  <title>Bible - {data.project.title} - Spine</title>
</svelte:head>

<div class="flex-1 flex flex-col overflow-hidden">
  <header class="py-6 px-6 pb-4 border-b border-border bg-surface">
    <div class="mb-4">
      <h1 class="text-2xl font-bold m-0 mb-2">Story Bible</h1>
      <p class="text-sm text-text-secondary m-0">
        Manage characters, locations, factions, rules, and storylines for your project
      </p>
    </div>
    <div class="max-w-md">
      <SearchInput
        bind:value={searchQuery}
        placeholder="Search bible entries..."
      />
    </div>
  </header>

  <div class="flex-1 flex flex-col overflow-hidden">
    <Tabs bind:active={activeTab} {tabs} />

    <div class="flex-1 overflow-auto p-6 bg-bg">
      {#if activeTab === 'characters'}
        <CharacterTab
          characters={data.bible.characters}
          projectId={data.project.id}
          {searchQuery}
        />
      {:else if activeTab === 'locations'}
        <LocationTab
          locations={data.bible.locations}
          projectId={data.project.id}
          {searchQuery}
        />
      {:else if activeTab === 'factions'}
        <FactionTab
          factions={data.bible.factions}
          projectId={data.project.id}
          {searchQuery}
        />
      {:else if activeTab === 'world-rules'}
        <WorldRuleTab
          worldRules={data.bible.worldRules}
          projectId={data.project.id}
          {searchQuery}
        />
      {:else if activeTab === 'plot-threads'}
        <PlotThreadTab
          plotThreads={data.bible.plotThreads}
          projectId={data.project.id}
          {searchQuery}
        />
      {:else if activeTab === 'timeline'}
        <TimelineTab
          timelineEvents={data.bible.timelineEvents}
          projectId={data.project.id}
          {searchQuery}
        />
      {/if}
    </div>
  </div>
</div>
