<script lang="ts">
  import type { ReleasePlanningResult, ScheduledRelease } from '@repo/types';
  import { Calendar, CheckCircle, Clock, FileText } from 'lucide-svelte';

  interface Props {
    releasePlanning: ReleasePlanningResult;
    onReleaseClick?: (release: ScheduledRelease) => void;
  }

  let { releasePlanning, onReleaseClick }: Props = $props();

  function handleReleaseClick(release: ScheduledRelease) {
    if (onReleaseClick) {
      onReleaseClick(release);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getDaysUntil(dateString: string): number {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const upcomingReleases = $derived(
    releasePlanning.upcomingReleases.filter((r) => getDaysUntil(r.scheduledDate) >= 0)
  );

  const pastReleases = $derived(
    releasePlanning.upcomingReleases.filter((r) => getDaysUntil(r.scheduledDate) < 0)
  );
</script>

<div class="release-calendar space-y-4">
  <!-- Calendar header -->
  <div class="calendar-header flex items-center gap-3 mb-4">
    <Calendar size={24} class="text-primary" />
    <div>
      <h3 class="text-lg font-semibold text-text">Release Schedule</h3>
      <p class="text-sm text-text-secondary">
        Upcoming chapters scheduled for publication
      </p>
    </div>
  </div>

  <!-- Statistics -->
  <div class="calendar-stats grid grid-cols-3 gap-4">
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Next Release</div>
      <div class="text-text text-sm font-bold">
        {#if upcomingReleases.length > 0}
          {getDaysUntil(upcomingReleases[0].scheduledDate)} days
        {:else}
          N/A
        {/if}
      </div>
    </div>
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Scheduled</div>
      <div class="text-text text-lg font-bold">{upcomingReleases.length}</div>
    </div>
    <div class="stat-card border border-border rounded-md p-3">
      <div class="text-text-secondary text-sm mb-1">Published</div>
      <div class="text-text text-lg font-bold">{pastReleases.length}</div>
    </div>
  </div>

  <!-- Upcoming releases -->
  {#if upcomingReleases.length > 0}
    <div class="upcoming-releases border border-border rounded-md p-4">
      <h4 class="text-sm font-medium text-text mb-3">Upcoming Releases</h4>
      <div class="space-y-2">
        {#each upcomingReleases.slice(0, 10) as release, index}
          {@const daysUntil = getDaysUntil(release.scheduledDate)}
          {@const isNext = index === 0}
          <button
            type="button"
            class="release-item w-full text-left p-3 bg-surface-raised hover:bg-surface border border-border rounded-md transition-colors"
            class:ring-2={isNext}
            class:ring-primary={isNext}
            onclick={() => handleReleaseClick(release)}
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1">
                <div class="release-icon p-2 bg-blue-100 rounded-md">
                  <FileText size={16} class="text-blue-600" />
                </div>
                <div class="flex-1">
                  <div class="text-sm font-medium text-text">{release.chapterTitle}</div>
                  <div class="text-xs text-text-secondary">Chapter {release.chapterPosition}</div>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <div class="text-sm font-semibold text-text">{formatDate(release.scheduledDate)}</div>
                  <div class="text-xs text-text-secondary">
                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                  </div>
                </div>
                <div class="status-badge">
                  {#if release.isReady}
                    <CheckCircle size={20} class="text-green-600" />
                  {:else}
                    <Clock size={20} class="text-orange-500" />
                  {/if}
                </div>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="no-releases border border-border rounded-md p-8 text-center">
      <Calendar size={48} class="mx-auto mb-4 text-text-secondary" />
      <h3 class="text-lg font-semibold text-text mb-2">No Scheduled Releases</h3>
      <p class="text-sm text-text-secondary">
        Schedule chapters for release to see them appear here
      </p>
    </div>
  {/if}

  <!-- Recent releases -->
  {#if pastReleases.length > 0}
    <div class="recent-releases border border-border rounded-md p-4">
      <h4 class="text-sm font-medium text-text mb-3">Recently Published</h4>
      <div class="space-y-2">
        {#each pastReleases.slice(0, 5) as release}
          {@const daysAgo = Math.abs(getDaysUntil(release.scheduledDate))}
          <div class="release-item p-3 bg-surface-raised border border-border rounded-md opacity-70">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1">
                <div class="release-icon p-2 bg-green-100 rounded-md">
                  <CheckCircle size={16} class="text-green-600" />
                </div>
                <div class="flex-1">
                  <div class="text-sm font-medium text-text">{release.chapterTitle}</div>
                  <div class="text-xs text-text-secondary">Chapter {release.chapterPosition}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm text-text">{formatDate(release.scheduledDate)}</div>
                <div class="text-xs text-text-secondary">
                  {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .release-item:hover {
    transform: translateY(-1px);
  }
</style>
