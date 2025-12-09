<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import {
    BufferStatus,
    HookPatterns,
    CycleIndicator,
    MysteryBoard,
    ReleaseCalendar,
  } from '@repo/ui/visualization';
  import { Calendar, Zap, TrendingUp, Eye, Radio } from 'lucide-svelte';
  import type { Structure, HookDataPoint, CycleDataPoint, MysteryTrackingData, ScheduledRelease } from '@repo/types';

  let { data }: { data: PageData } = $props();

  // Get available structures for filtering
  const availableStructures = $derived(
    data.structureTree.filter((s: Structure) => s.type === 'book' || s.type === 'arc')
  );

  // Handle structure selection
  function selectStructure(structureId: string) {
    const url = new URL($page.url);
    url.searchParams.set('structure', structureId);
    window.location.href = url.toString();
  }

  // Handle hook click
  function handleHookClick(hook: HookDataPoint) {
    if (hook.contentId) {
      window.location.href = `/projects/${data.project.id}/workspace?content=${hook.contentId}`;
    }
  }

  // Handle cycle chapter click
  function handleCycleChapterClick(dataPoint: CycleDataPoint) {
    if (dataPoint.structureId) {
      window.location.href = `/projects/${data.project.id}/workspace?structure=${dataPoint.structureId}`;
    }
  }

  // Handle mystery click
  function handleMysteryClick(mystery: MysteryTrackingData) {
    if (mystery.threadId) {
      window.location.href = `/projects/${data.project.id}/bible?tab=plot-threads`;
    }
  }

  // Handle release click
  function handleReleaseClick(release: ScheduledRelease) {
    if (release.structureId) {
      window.location.href = `/projects/${data.project.id}/workspace?structure=${release.structureId}`;
    }
  }
</script>

<div class="serial-dashboard flex flex-col h-full overflow-auto">
  <!-- Header -->
  <div class="sticky top-0 z-10 bg-surface border-b border-border px-6 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text mb-1">Serial Dashboard</h1>
        <p class="text-sm text-text-secondary">
          {#if data.rootStructure}
            Viewing serial analytics for: <span class="font-medium text-text">{data.rootStructure.title}</span>
          {:else}
            No structure selected
          {/if}
        </p>
      </div>

      <!-- Structure selector -->
      {#if availableStructures.length > 0}
        <div class="flex items-center gap-2">
          <label for="structure-select" class="text-sm font-medium text-text-secondary">
            Structure:
          </label>
          <select
            id="structure-select"
            class="structure-select px-3 py-2 bg-surface border border-border rounded-md text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
            value={data.rootStructure?.id || ''}
            onchange={(e) => selectStructure(e.currentTarget.value)}
          >
            {#each availableStructures as structure}
              <option value={structure.id}>{structure.title} ({structure.type})</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
  </div>

  <!-- Main content -->
  <div class="flex-1 p-6">
    {#if !data.rootStructure}
      <!-- Empty state -->
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <Radio size={48} class="mx-auto mb-4 text-text-secondary" />
          <h2 class="text-xl font-semibold text-text mb-2">No Structure Available</h2>
          <p class="text-text-secondary max-w-md">
            Create a book or arc structure in the workspace to view serial analytics.
          </p>
        </div>
      </div>
    {:else}
      <div class="space-y-6">
        <!-- Release Calendar Section -->
        {#if data.releasePlanning}
          <section class="serial-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <Calendar size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Release Calendar</h2>
                <p class="text-sm text-text-secondary">
                  Upcoming publication schedule and deadlines
                </p>
              </div>
            </div>
            <div class="section-content">
              <ReleaseCalendar
                releasePlanning={data.releasePlanning}
                onReleaseClick={handleReleaseClick}
              />
            </div>
          </section>
        {/if}

        <!-- Buffer Status Section -->
        {#if data.releasePlanning}
          <section class="serial-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <Zap size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Buffer Status</h2>
                <p class="text-sm text-text-secondary">
                  Release buffer health and depletion projection
                </p>
              </div>
            </div>
            <div class="section-content">
              <BufferStatus
                bufferStatus={data.releasePlanning.bufferStatus}
                depletion={data.releasePlanning.depletion}
                deadlineStatus={data.releasePlanning.deadlineStatus}
              />
            </div>
          </section>
        {/if}

        <!-- Hook Patterns Section -->
        {#if data.hookManagement}
          <section class="serial-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <Zap size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Hook Patterns</h2>
                <p class="text-sm text-text-secondary">
                  Chapter-ending hook analysis and variety tracking
                </p>
              </div>
            </div>
            <div class="section-content">
              <HookPatterns
                hookManagement={data.hookManagement}
                onHookClick={handleHookClick}
              />
            </div>
          </section>
        {/if}

        <!-- Cycle Indicator Section -->
        {#if data.cycleEnforcement}
          <section class="serial-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <TrendingUp size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Tension Cycle Enforcement</h2>
                <p class="text-sm text-text-secondary">
                  Tracking adherence to configured tension cycles
                </p>
              </div>
            </div>
            <div class="section-content">
              <CycleIndicator
                cycleEnforcement={data.cycleEnforcement}
                onChapterClick={handleCycleChapterClick}
              />
            </div>
          </section>
        {/if}

        <!-- Mystery Board Section -->
        {#if data.mysteryTracking.length > 0}
          <section class="serial-section bg-surface-raised border border-border rounded-lg p-6">
            <div class="section-header flex items-center gap-3 mb-4">
              <Eye size={24} class="text-primary" />
              <div>
                <h2 class="text-lg font-semibold text-text">Mystery Board</h2>
                <p class="text-sm text-text-secondary">
                  Mystery lifecycle tracking and clue management
                </p>
              </div>
            </div>
            <div class="section-content">
              <MysteryBoard
                mysteries={data.mysteryTracking}
                onMysteryClick={handleMysteryClick}
              />
            </div>
          </section>
        {/if}

        <!-- Empty state for no serial data -->
        {#if !data.hookManagement && !data.cycleEnforcement && !data.releasePlanning}
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <Radio size={48} class="mx-auto mb-4 text-text-secondary" />
              <h2 class="text-xl font-semibold text-text mb-2">No Serial Analytics Data Available</h2>
              <p class="text-text-secondary max-w-md">
                Create chapters and generate content in the workspace to see serial analytics.
              </p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .serial-dashboard {
    background: var(--color-background, #ffffff);
  }

  .section-header {
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    padding-bottom: 1rem;
  }
</style>
