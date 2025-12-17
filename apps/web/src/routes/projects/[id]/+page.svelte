<script lang="ts">
  import type { PageData } from './$types';
  import {
    FileText,
    CheckCircle,
    Clock,
    BarChart3,
    Users,
    MapPin,
    Scroll,
    GitBranch,
    Calendar,
    ArrowRight,
    BookOpen,
    AlertTriangle,
  } from 'lucide-svelte';
  import { Button, Card, Badge, StatCard, PageSection, EmptyState } from '$lib/components';

  let { data }: { data: PageData } = $props();

  // Determine most recent chapter for "Continue Writing" CTA
  const continueChapter = $derived(data.recentChapters[0]);

  // Buffer health status
  const bufferHealth = $derived.by(() => {
    if (!data.bufferStatus) return null;
    const { approvedCount, targetBuffer, daysUntilDepletion } = data.bufferStatus;
    if (daysUntilDepletion !== null && daysUntilDepletion <= 7) return 'critical';
    if (approvedCount < targetBuffer) return 'warning';
    return 'healthy';
  });

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }
</script>

<svelte:head>
  <title>Dashboard - {data.project.title} - Spine</title>
</svelte:head>

<div class="flex flex-col gap-6 p-6 bg-bg min-h-full">
  <!-- Welcome & Quick Action -->
  <PageSection>
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold m-0 mb-1">Welcome back</h1>
        <p class="text-text-secondary m-0">Here's what's happening with {data.project.title}</p>
      </div>

      {#if continueChapter}
        <Button href="/projects/{data.project.id}/workspace?structure={continueChapter.id}">
          <FileText size={18} />
          Continue Writing
          <ArrowRight size={16} />
        </Button>
      {:else}
        <Button href="/projects/{data.project.id}/workspace">
          <FileText size={18} />
          Start Writing
          <ArrowRight size={16} />
        </Button>
      {/if}
    </div>
  </PageSection>

  <!-- Stats Overview -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard
      title="Total Words"
      value={formatNumber(data.wordCounts.total)}
      icon={FileText}
    />
    <StatCard
      title="Published"
      value={formatNumber(data.wordCounts.published)}
      icon={CheckCircle}
      variant="success"
    />
    <StatCard
      title="In Review"
      value={data.statusCounts.in_review.toString()}
      icon={Clock}
      variant={data.statusCounts.in_review > 0 ? 'warning' : 'default'}
    />
    <StatCard
      title="Chapters"
      value={data.structureCount.toString()}
      icon={BookOpen}
    />
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left Column: Recent & Review -->
    <div class="lg:col-span-2 flex flex-col gap-6">
      <!-- Recent Chapters -->
      <Card>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold m-0">Recent Chapters</h2>
          <a
            href="/projects/{data.project.id}/workspace"
            class="text-sm text-primary hover:underline"
          >
            View all
          </a>
        </div>

        {#if data.recentChapters.length === 0}
          <EmptyState
            title="No chapters yet"
            description="Create your first chapter to start writing."
          >
            {#snippet action()}
              <Button href="/projects/{data.project.id}/workspace" size="sm">
                Go to Workspace
              </Button>
            {/snippet}
          </EmptyState>
        {:else}
          <div class="flex flex-col gap-2">
            {#each data.recentChapters as chapter}
              <a
                href="/projects/{data.project.id}/workspace?structure={chapter.id}"
                class="flex items-center justify-between p-3 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
              >
                <div class="flex items-center gap-3">
                  <FileText size={18} class="text-text-tertiary" />
                  <span class="font-medium text-text">{chapter.title}</span>
                </div>
                <span class="text-xs text-text-tertiary">{formatDate(chapter.updatedAt)}</span>
              </a>
            {/each}
          </div>
        {/if}
      </Card>

      <!-- Review Queue -->
      <Card>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold m-0">Review Queue</h2>
          <a
            href="/projects/{data.project.id}/review"
            class="text-sm text-primary hover:underline"
          >
            View all
          </a>
        </div>

        {#if data.reviewQueue.length === 0}
          <EmptyState
            title="Review queue is empty"
            description="No content waiting for review."
          />
        {:else}
          <div class="flex flex-col gap-2">
            {#each data.reviewQueue as item}
              <a
                href="/projects/{data.project.id}/review/{item.id}"
                class="flex items-center justify-between p-3 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
              >
                <div class="flex items-center gap-3">
                  <Clock size={18} class="text-warning" />
                  <span class="font-medium text-text">{item.title}</span>
                </div>
                <Badge variant={item.status === 'in_review' ? 'warning' : 'default'}>
                  {item.status.replace('_', ' ')}
                </Badge>
              </a>
            {/each}
          </div>
        {/if}
      </Card>
    </div>

    <!-- Right Column: Buffer & Bible -->
    <div class="flex flex-col gap-6">
      <!-- Buffer Status -->
      {#if data.bufferStatus}
        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Release Buffer</h2>

          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="text-text-secondary">Ready chapters</span>
              <span class="font-semibold">
                {data.bufferStatus.approvedCount} / {data.bufferStatus.targetBuffer}
              </span>
            </div>

            <!-- Progress bar -->
            <div class="h-2 rounded-full bg-bg overflow-hidden">
              <div
                class="h-full rounded-full transition-all {bufferHealth === 'critical'
                  ? 'bg-danger'
                  : bufferHealth === 'warning'
                    ? 'bg-warning'
                    : 'bg-success'}"
                style="width: {Math.min((data.bufferStatus.approvedCount / data.bufferStatus.targetBuffer) * 100, 100)}%"
              ></div>
            </div>

            {#if data.bufferStatus.daysUntilDepletion !== null}
              <div class="flex items-center gap-2 text-sm {bufferHealth === 'critical' ? 'text-danger' : 'text-text-secondary'}">
                {#if bufferHealth === 'critical'}
                  <AlertTriangle size={16} />
                {/if}
                <span>
                  {data.bufferStatus.daysUntilDepletion} days until buffer depletes
                </span>
              </div>
            {/if}

            <a
              href="/projects/{data.project.id}/serial"
              class="text-sm text-primary hover:underline"
            >
              View serial dashboard →
            </a>
          </div>
        </Card>
      {/if}

      <!-- Bible Overview -->
      <Card>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold m-0">Story Bible</h2>
          <a
            href="/projects/{data.project.id}/bible"
            class="text-sm text-primary hover:underline"
          >
            View all
          </a>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <a
            href="/projects/{data.project.id}/bible?tab=characters"
            class="flex items-center gap-2 p-2 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
          >
            <Users size={16} class="text-text-tertiary" />
            <span class="text-sm text-text">{data.entityCounts.characters} Characters</span>
          </a>
          <a
            href="/projects/{data.project.id}/bible?tab=locations"
            class="flex items-center gap-2 p-2 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
          >
            <MapPin size={16} class="text-text-tertiary" />
            <span class="text-sm text-text">{data.entityCounts.locations} Locations</span>
          </a>
          <a
            href="/projects/{data.project.id}/bible?tab=factions"
            class="flex items-center gap-2 p-2 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
          >
            <Users size={16} class="text-text-tertiary" />
            <span class="text-sm text-text">{data.entityCounts.factions} Factions</span>
          </a>
          <a
            href="/projects/{data.project.id}/bible?tab=world-rules"
            class="flex items-center gap-2 p-2 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
          >
            <Scroll size={16} class="text-text-tertiary" />
            <span class="text-sm text-text">{data.entityCounts.worldRules} Rules</span>
          </a>
          <a
            href="/projects/{data.project.id}/bible?tab=plot-threads"
            class="flex items-center gap-2 p-2 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
          >
            <GitBranch size={16} class="text-text-tertiary" />
            <span class="text-sm text-text">{data.entityCounts.plotThreads} Threads</span>
          </a>
          <a
            href="/projects/{data.project.id}/bible?tab=timeline"
            class="flex items-center gap-2 p-2 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
          >
            <Calendar size={16} class="text-text-tertiary" />
            <span class="text-sm text-text">{data.entityCounts.timelineEvents} Events</span>
          </a>
        </div>
      </Card>

      <!-- Quick Links -->
      <Card>
        <h2 class="text-lg font-semibold m-0 mb-4">Quick Actions</h2>
        <div class="flex flex-col gap-2">
          <a
            href="/projects/{data.project.id}/workspace"
            class="flex items-center gap-3 p-2 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
          >
            <FileText size={16} class="text-text-tertiary" />
            <span class="text-sm text-text">Open Workspace</span>
          </a>
          <a
            href="/projects/{data.project.id}/analytics"
            class="flex items-center gap-3 p-2 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
          >
            <BarChart3 size={16} class="text-text-tertiary" />
            <span class="text-sm text-text">View Analytics</span>
          </a>
          <a
            href="/projects/{data.project.id}/settings"
            class="flex items-center gap-3 p-2 rounded-md bg-bg hover:bg-surface-hover transition-colors no-underline"
          >
            <Clock size={16} class="text-text-tertiary" />
            <span class="text-sm text-text">Project Settings</span>
          </a>
        </div>
      </Card>
    </div>
  </div>
</div>
