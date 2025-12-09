<script lang="ts">
  import type { Structure, Content } from '@repo/types';
  import { Button, Badge } from '$lib/components';
  import { X, BarChart3, CheckCircle } from 'lucide-svelte';

  interface Props {
    structure: Structure;
    content?: Content;
    onClose: () => void;
  }

  let { structure, content, onClose }: Props = $props();

  const analysis = $derived(content?.analysis);

  const hasAnalysis = $derived(!!analysis);

  function getScoreColor(score: number): 'success' | 'warning' | 'danger' | 'default' {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'danger';
  }

  function formatScore(score: number): string {
    return Math.round(score).toString();
  }

  // Calculate divergence from target
  const tensionDivergence = $derived(() => {
    if (!analysis || structure.tensionTarget === undefined) return null;
    return analysis.tensionScore.score - structure.tensionTarget;
  });

  // Group continuity issues by severity
  const issuesBySeverity = $derived(() => {
    if (!analysis) return { critical: [], major: [], minor: [], nitpick: [] };
    const issues = analysis.continuityIssues;
    return {
      critical: issues.filter(i => i.severity === 'critical'),
      major: issues.filter(i => i.severity === 'major'),
      minor: issues.filter(i => i.severity === 'minor'),
      nitpick: issues.filter(i => i.severity === 'nitpick'),
    };
  });
</script>

<div class="flex h-full flex-col">
  <header class="flex items-center justify-between border-b border-border px-4 py-3">
    <h3 class="m-0 text-sm font-semibold uppercase tracking-wide text-text-secondary">Analysis</h3>
    <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-text-tertiary hover:bg-surface-hover hover:text-text" onclick={onClose} aria-label="Close panel">
      <X size={16} />
    </button>
  </header>

  <div class="flex flex-1 flex-col gap-4 overflow-auto p-4">
    {#if !content}
      <div class="flex flex-col items-center justify-center px-4 py-8 text-center text-text-secondary">
        <p class="m-0 text-sm">No content to analyze yet.</p>
        <p class="mt-1 text-xs text-text-tertiary">Write or generate content first.</p>
      </div>
    {:else if !hasAnalysis}
      <div class="flex flex-col items-center justify-center px-4 py-8 text-center text-text-secondary">
        <BarChart3 class="mb-3 text-text-tertiary" size={32} strokeWidth={1.5} />
        <p class="m-0 text-sm">No analysis available</p>
        <p class="mt-1 text-xs text-text-tertiary">Analysis runs automatically after content is generated or saved.</p>
        <Button size="sm" variant="secondary" disabled>
          Run Analysis
        </Button>
      </div>
    {:else}
      <!-- Score Cards -->
      <div class="flex flex-col gap-3">
        <!-- Tension Score -->
        <div class="rounded-md bg-bg p-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-medium">Tension</span>
            <Badge variant={getScoreColor(analysis.tensionScore.score)}>
              {formatScore(analysis.tensionScore.score)}
            </Badge>
          </div>
          <p class="m-0 text-xs leading-snug text-text-secondary">{analysis.tensionScore.explanation}</p>
          {#if tensionDivergence() !== null}
            <div class="mt-2 rounded-sm bg-surface px-2 py-1 text-xs {tensionDivergence()! > 0 ? 'text-warning' : 'text-info'}">
              {tensionDivergence()! > 0 ? '+' : ''}{formatScore(tensionDivergence()!)} from target ({structure.tensionTarget})
            </div>
          {/if}
        </div>

        <!-- Pace Score -->
        <div class="rounded-md bg-bg p-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-medium">Pacing</span>
            <Badge variant={getScoreColor(analysis.paceScore.score)}>
              {formatScore(analysis.paceScore.score)}
            </Badge>
          </div>
          <p class="m-0 text-xs leading-snug text-text-secondary">{analysis.paceScore.explanation}</p>
        </div>

        <!-- Hook Score (if chapter) -->
        {#if analysis.hookStrength}
          <div class="rounded-md bg-bg p-3">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-medium">Hook Strength</span>
              <Badge variant={getScoreColor(analysis.hookStrength.score)}>
                {formatScore(analysis.hookStrength.score)}
              </Badge>
            </div>
            <p class="m-0 text-xs leading-snug text-text-secondary">{analysis.hookStrength.explanation}</p>
          </div>
        {/if}
      </div>

      <!-- Stats -->
      <div class="rounded-md bg-bg p-3">
        <h4 class="m-0 mb-3 flex items-center gap-2 text-sm font-medium">Statistics</h4>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col items-center text-center">
            <span class="text-lg font-semibold">{analysis.wordCount.toLocaleString()}</span>
            <span class="text-xs text-text-tertiary">Words</span>
          </div>
          <div class="flex flex-col items-center text-center">
            <span class="text-lg font-semibold">{analysis.readingTime}</span>
            <span class="text-xs text-text-tertiary">Min read</span>
          </div>
          <div class="flex flex-col items-center text-center">
            <span class="text-lg font-semibold">{analysis.characterAppearances.length}</span>
            <span class="text-xs text-text-tertiary">Characters</span>
          </div>
          <div class="flex flex-col items-center text-center">
            <span class="text-lg font-semibold">{analysis.locationAppearances.length}</span>
            <span class="text-xs text-text-tertiary">Locations</span>
          </div>
        </div>
      </div>

      <!-- Character Appearances -->
      {#if analysis.characterAppearances.length > 0}
        <div class="rounded-md bg-bg p-3">
          <h4 class="m-0 mb-3 flex items-center gap-2 text-sm font-medium">Character Appearances</h4>
          <ul class="m-0 flex list-none flex-col gap-2 p-0">
            {#each analysis.characterAppearances as appearance}
              <li class="flex items-center gap-2 text-sm">
                <span class="flex-1 truncate">{appearance.characterId}</span>
                <Badge size="sm" variant={appearance.type === 'pov' ? 'primary' : appearance.type === 'scene' ? 'success' : 'default'}>
                  {appearance.type}
                </Badge>
                {#if appearance.dialogueLines}
                  <span class="text-xs text-text-tertiary">{appearance.dialogueLines} lines</span>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Continuity Issues -->
      {#if analysis.continuityIssues.length > 0}
        <div class="rounded-md bg-bg p-3">
          <h4 class="m-0 mb-3 flex items-center gap-2 text-sm font-medium">
            Continuity Issues
            <Badge variant="warning">{analysis.continuityIssues.length}</Badge>
          </h4>

          {#if issuesBySeverity().critical.length > 0}
            <div class="mb-3">
              <h5 class="m-0 mb-2 flex items-center gap-2 text-xs font-medium">
                <Badge variant="danger" size="sm">Critical</Badge>
              </h5>
              <ul class="m-0 flex list-none flex-col gap-2 p-0">
                {#each issuesBySeverity().critical as issue (issue.id)}
                  <li class="rounded-sm bg-surface p-2">
                    <p class="m-0 text-xs leading-snug">{issue.description}</p>
                    {#if issue.suggestion}
                      <p class="m-0 mt-1 text-xs italic text-text-tertiary">Suggestion: {issue.suggestion}</p>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if issuesBySeverity().major.length > 0}
            <div class="mb-3">
              <h5 class="m-0 mb-2 flex items-center gap-2 text-xs font-medium">
                <Badge variant="warning" size="sm">Major</Badge>
              </h5>
              <ul class="m-0 flex list-none flex-col gap-2 p-0">
                {#each issuesBySeverity().major as issue (issue.id)}
                  <li class="rounded-sm bg-surface p-2">
                    <p class="m-0 text-xs leading-snug">{issue.description}</p>
                    {#if issue.suggestion}
                      <p class="m-0 mt-1 text-xs italic text-text-tertiary">Suggestion: {issue.suggestion}</p>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if issuesBySeverity().minor.length + issuesBySeverity().nitpick.length > 0}
            <details class="mt-2">
              <summary class="cursor-pointer py-1 text-xs text-text-tertiary hover:text-text-secondary">
                {issuesBySeverity().minor.length + issuesBySeverity().nitpick.length} minor issues
              </summary>
              <ul class="m-0 flex list-none flex-col gap-2 p-0">
                {#each [...issuesBySeverity().minor, ...issuesBySeverity().nitpick] as issue (issue.id)}
                  <li class="flex items-start gap-2 rounded-sm bg-surface p-2">
                    <Badge size="sm">{issue.severity}</Badge>
                    <p class="m-0 text-xs leading-snug">{issue.description}</p>
                  </li>
                {/each}
              </ul>
            </details>
          {/if}
        </div>
      {:else}
        <div class="flex items-center gap-2 rounded-md bg-success-light p-3 text-sm text-success">
          <CheckCircle size={20} />
          <span>No continuity issues detected</span>
        </div>
      {/if}

      <!-- Analysis Metadata -->
      <div class="flex flex-col gap-1 border-t border-border pt-3">
        <span class="text-xs text-text-tertiary">Analyzed: {new Date(analysis.analyzedAt).toLocaleString()}</span>
        {#if analysis.modelId}
          <span class="text-xs text-text-tertiary">Model: {analysis.modelId}</span>
        {/if}
      </div>
    {/if}
  </div>
</div>
