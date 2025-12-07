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
  <title>Bible - {data.project.title} - NovelGen</title>
</svelte:head>

<div class="bible-page">
  <header class="bible-header">
    <div class="header-content">
      <h1 class="page-title">Story Bible</h1>
      <p class="page-description">
        Manage characters, locations, factions, rules, and storylines for your project
      </p>
    </div>
    <div class="header-search">
      <SearchInput
        bind:value={searchQuery}
        placeholder="Search bible entries..."
      />
    </div>
  </header>

  <div class="bible-content">
    <Tabs bind:active={activeTab} {tabs} />

    <div class="tab-content">
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

<style>
  .bible-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .bible-header {
    padding: var(--space-6) var(--space-6) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-surface);
  }

  .header-content {
    margin-bottom: var(--space-4);
  }

  .page-title {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin: 0 0 var(--space-2);
  }

  .page-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .header-search {
    max-width: 400px;
  }

  .bible-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tab-content {
    flex: 1;
    overflow: auto;
    padding: var(--space-6);
    background-color: var(--color-bg);
  }
</style>
