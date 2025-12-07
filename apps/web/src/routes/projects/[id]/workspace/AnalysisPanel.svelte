<script lang="ts">
  import type { Structure, Content } from '@repo/types';
  import { Button, Badge } from '$lib/components';

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

<div class="analysis-panel">
  <header class="panel-header">
    <h3 class="panel-title">Analysis</h3>
    <button class="close-btn" onclick={onClose} aria-label="Close panel">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  </header>

  <div class="panel-content">
    {#if !content}
      <div class="no-content">
        <p>No content to analyze yet.</p>
        <p class="hint">Write or generate content first.</p>
      </div>
    {:else if !hasAnalysis}
      <div class="no-analysis">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
        <p>No analysis available</p>
        <p class="hint">Analysis runs automatically after content is generated or saved.</p>
        <Button size="sm" variant="secondary" disabled>
          Run Analysis
        </Button>
      </div>
    {:else}
      <!-- Score Cards -->
      <div class="score-cards">
        <!-- Tension Score -->
        <div class="score-card">
          <div class="score-header">
            <span class="score-label">Tension</span>
            <Badge variant={getScoreColor(analysis.tensionScore.score)}>
              {formatScore(analysis.tensionScore.score)}
            </Badge>
          </div>
          <p class="score-explanation">{analysis.tensionScore.explanation}</p>
          {#if tensionDivergence() !== null}
            <div class="divergence" class:positive={tensionDivergence()! > 0} class:negative={tensionDivergence()! < 0}>
              {tensionDivergence()! > 0 ? '+' : ''}{formatScore(tensionDivergence()!)} from target ({structure.tensionTarget})
            </div>
          {/if}
        </div>

        <!-- Pace Score -->
        <div class="score-card">
          <div class="score-header">
            <span class="score-label">Pacing</span>
            <Badge variant={getScoreColor(analysis.paceScore.score)}>
              {formatScore(analysis.paceScore.score)}
            </Badge>
          </div>
          <p class="score-explanation">{analysis.paceScore.explanation}</p>
        </div>

        <!-- Hook Score (if chapter) -->
        {#if analysis.hookStrength}
          <div class="score-card">
            <div class="score-header">
              <span class="score-label">Hook Strength</span>
              <Badge variant={getScoreColor(analysis.hookStrength.score)}>
                {formatScore(analysis.hookStrength.score)}
              </Badge>
            </div>
            <p class="score-explanation">{analysis.hookStrength.explanation}</p>
          </div>
        {/if}
      </div>

      <!-- Stats -->
      <div class="stats-section">
        <h4 class="section-title">Statistics</h4>
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-value">{analysis.wordCount.toLocaleString()}</span>
            <span class="stat-label">Words</span>
          </div>
          <div class="stat">
            <span class="stat-value">{analysis.readingTime}</span>
            <span class="stat-label">Min read</span>
          </div>
          <div class="stat">
            <span class="stat-value">{analysis.characterAppearances.length}</span>
            <span class="stat-label">Characters</span>
          </div>
          <div class="stat">
            <span class="stat-value">{analysis.locationAppearances.length}</span>
            <span class="stat-label">Locations</span>
          </div>
        </div>
      </div>

      <!-- Character Appearances -->
      {#if analysis.characterAppearances.length > 0}
        <div class="appearances-section">
          <h4 class="section-title">Character Appearances</h4>
          <ul class="appearances-list">
            {#each analysis.characterAppearances as appearance}
              <li class="appearance-item">
                <span class="character-id">{appearance.characterId}</span>
                <Badge size="sm" variant={appearance.type === 'pov' ? 'primary' : appearance.type === 'scene' ? 'success' : 'default'}>
                  {appearance.type}
                </Badge>
                {#if appearance.dialogueLines}
                  <span class="dialogue-count">{appearance.dialogueLines} lines</span>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Continuity Issues -->
      {#if analysis.continuityIssues.length > 0}
        <div class="issues-section">
          <h4 class="section-title">
            Continuity Issues
            <Badge variant="warning">{analysis.continuityIssues.length}</Badge>
          </h4>

          {#if issuesBySeverity().critical.length > 0}
            <div class="issue-group">
              <h5 class="issue-group-title">
                <Badge variant="danger" size="sm">Critical</Badge>
              </h5>
              <ul class="issues-list">
                {#each issuesBySeverity().critical as issue (issue.id)}
                  <li class="issue-item">
                    <p class="issue-description">{issue.description}</p>
                    {#if issue.suggestion}
                      <p class="issue-suggestion">Suggestion: {issue.suggestion}</p>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if issuesBySeverity().major.length > 0}
            <div class="issue-group">
              <h5 class="issue-group-title">
                <Badge variant="warning" size="sm">Major</Badge>
              </h5>
              <ul class="issues-list">
                {#each issuesBySeverity().major as issue (issue.id)}
                  <li class="issue-item">
                    <p class="issue-description">{issue.description}</p>
                    {#if issue.suggestion}
                      <p class="issue-suggestion">Suggestion: {issue.suggestion}</p>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if issuesBySeverity().minor.length + issuesBySeverity().nitpick.length > 0}
            <details class="minor-issues">
              <summary>
                {issuesBySeverity().minor.length + issuesBySeverity().nitpick.length} minor issues
              </summary>
              <ul class="issues-list">
                {#each [...issuesBySeverity().minor, ...issuesBySeverity().nitpick] as issue (issue.id)}
                  <li class="issue-item minor">
                    <Badge size="sm">{issue.severity}</Badge>
                    <p class="issue-description">{issue.description}</p>
                  </li>
                {/each}
              </ul>
            </details>
          {/if}
        </div>
      {:else}
        <div class="no-issues">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>No continuity issues detected</span>
        </div>
      {/if}

      <!-- Analysis Metadata -->
      <div class="analysis-meta">
        <span class="meta-item">Analyzed: {new Date(analysis.analyzedAt).toLocaleString()}</span>
        {#if analysis.modelId}
          <span class="meta-item">Model: {analysis.modelId}</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .analysis-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .panel-title {
    font-size: var(--text-sm);
    font-weight: 600;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
  }

  .close-btn:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text);
  }

  .panel-content {
    flex: 1;
    overflow: auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* Empty States */
  .no-content,
  .no-analysis {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-8) var(--space-4);
    color: var(--color-text-secondary);
  }

  .no-content p,
  .no-analysis p {
    margin: 0;
    font-size: var(--text-sm);
  }

  .hint {
    color: var(--color-text-tertiary);
    font-size: var(--text-xs);
    margin-top: var(--space-1);
  }

  .no-analysis svg {
    margin-bottom: var(--space-3);
    color: var(--color-text-tertiary);
  }

  /* Score Cards */
  .score-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .score-card {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .score-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .score-label {
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .score-explanation {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.4;
  }

  .divergence {
    font-size: var(--text-xs);
    margin-top: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
  }

  .divergence.positive {
    color: var(--color-warning);
  }

  .divergence.negative {
    color: var(--color-info);
  }

  /* Stats */
  .stats-section {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .section-title {
    font-size: var(--text-sm);
    font-weight: 500;
    margin: 0 0 var(--space-3);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .stat-value {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }

  /* Appearances */
  .appearances-section {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .appearances-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .appearance-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }

  .character-id {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dialogue-count {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }

  /* Issues */
  .issues-section {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .issue-group {
    margin-bottom: var(--space-3);
  }

  .issue-group-title {
    font-size: var(--text-xs);
    font-weight: 500;
    margin: 0 0 var(--space-2);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .issues-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .issue-item {
    padding: var(--space-2);
    background-color: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  .issue-item.minor {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .issue-description {
    font-size: var(--text-xs);
    margin: 0;
    line-height: 1.4;
  }

  .issue-suggestion {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    margin: var(--space-1) 0 0;
    font-style: italic;
  }

  .minor-issues {
    margin-top: var(--space-2);
  }

  .minor-issues summary {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    cursor: pointer;
    padding: var(--space-1) 0;
  }

  .minor-issues summary:hover {
    color: var(--color-text-secondary);
  }

  .no-issues {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background-color: var(--color-success-light);
    border-radius: var(--radius-md);
    color: var(--color-success);
    font-size: var(--text-sm);
  }

  /* Meta */
  .analysis-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .meta-item {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }
</style>
