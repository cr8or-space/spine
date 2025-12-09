<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { ArrowLeft, Check, X, Eye, EyeOff, Lock } from 'lucide-svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import DiffView from '$lib/components/review/DiffView.svelte';
  import ReviewAnnotationPanel from '$lib/components/review/ReviewAnnotationPanel.svelte';
  import LockPointVisualization from '$lib/components/review/LockPointVisualization.svelte';
  import type { ReviewComment, ParagraphAction } from '@repo/types/review';
  import { cn } from '$lib/utils/cn';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let selectedParagraph = $state<number | undefined>(undefined);
  let showDiff = $state(false);
  let showAnnotations = $state(true);

  const paragraphs = $derived(data.content.text.split('\n\n').filter(p => p.trim()));

  function getStatusVariant(status: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'draft': return 'default';
      case 'review': return 'warning';
      case 'approved': return 'success';
      case 'published': return 'info';
      default: return 'default';
    }
  }

  function getParagraphCommentCount(index: number): number {
    return data.currentReview.comments.filter(c => c.paragraphIndex === index).length;
  }

  function getParagraphIssueCount(index: number): number {
    return data.currentReview.comments.filter(
      c => c.paragraphIndex === index && c.type === 'issue' && !c.resolved
    ).length;
  }

  function hasParagraphAction(index: number): boolean {
    return data.currentReview.actions.some(a => a.paragraphIndex === index);
  }

  async function handleAddComment(comment: Omit<ReviewComment, 'id' | 'timestamp'>) {
    const formData = new FormData();
    formData.append('paragraphIndex', String(comment.paragraphIndex));
    formData.append('type', comment.type);
    formData.append('text', comment.text);

    const response = await fetch('?/addComment', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      await invalidateAll();
    }
  }

  async function handleResolveComment(commentId: string) {
    const formData = new FormData();
    formData.append('commentId', commentId);

    const response = await fetch('?/resolveComment', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      await invalidateAll();
    }
  }

  async function handleApplyAction(action: Omit<ParagraphAction, 'timestamp'>) {
    const formData = new FormData();
    formData.append('paragraphIndex', String(action.paragraphIndex));
    formData.append('action', action.action);
    if (action.reason) formData.append('reason', action.reason);
    if (action.newText) formData.append('newText', action.newText);

    const response = await fetch('?/applyAction', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      await invalidateAll();
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-surface">
    <div class="flex items-center gap-3">
      <Button
        href={`/projects/${data.project.id}/review`}
        variant="ghost"
        size="sm"
      >
        <ArrowLeft size={18} />
        Back
      </Button>

      <div class="border-l border-border h-6"></div>

      <div>
        <h1 class="text-xl font-semibold">{data.content.title}</h1>
        <p class="text-sm text-text-secondary">{data.structurePath}</p>
      </div>

      <Badge variant={getStatusVariant(data.content.status)}>
        {data.content.status}
      </Badge>

      {#if data.content.locked}
        <Badge variant="warning">
          <Lock size={14} />
          Locked
        </Badge>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if data.diff}
        <Button
          variant="ghost"
          size="sm"
          onclick={() => showDiff = !showDiff}
        >
          {#if showDiff}
            <EyeOff size={16} />
            Hide Diff
          {:else}
            <Eye size={16} />
            Show Diff
          {/if}
        </Button>
      {/if}

      <Button
        variant="ghost"
        size="sm"
        onclick={() => showAnnotations = !showAnnotations}
      >
        {#if showAnnotations}
          <EyeOff size={16} />
          Hide Panel
        {:else}
          <Eye size={16} />
          Show Panel
        {/if}
      </Button>

      <div class="border-l border-border h-6"></div>

      {#if data.content.status === 'review'}
        <form method="POST" action="?/transitionStatus" use:enhance class="inline">
          <input type="hidden" name="status" value="draft" />
          <Button type="submit" variant="ghost" size="sm">
            <X size={16} />
            Reject
          </Button>
        </form>

        <form method="POST" action="?/transitionStatus" use:enhance class="inline">
          <input type="hidden" name="status" value="approved" />
          <Button type="submit" variant="primary" size="sm">
            <Check size={16} />
            Approve
          </Button>
        </form>
      {:else if data.content.status === 'approved'}
        <form method="POST" action="?/transitionStatus" use:enhance class="inline">
          <input type="hidden" name="status" value="published" />
          <Button type="submit" variant="primary" size="sm">
            Publish
          </Button>
        </form>
      {/if}
    </div>
  </div>

  <!-- Content Area -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Diff View (if enabled) -->
      {#if showDiff && data.diff}
        <div class="border-b border-border bg-surface-hover">
          <div class="p-4 max-h-96 overflow-y-auto">
            <DiffView diff={data.diff} />
          </div>
        </div>
      {/if}

      <!-- Content Editor -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-4xl mx-auto space-y-4">
          {#each paragraphs as paragraph, index}
            {@const commentCount = getParagraphCommentCount(index)}
            {@const issueCount = getParagraphIssueCount(index)}
            {@const hasAction = hasParagraphAction(index)}

            <div
              role="button"
              tabindex="0"
              class={cn(
                'paragraph-block p-4 rounded-lg border-2 transition-all',
                selectedParagraph === index
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:border-border hover:bg-surface-hover cursor-pointer',
                issueCount > 0 && 'border-l-4 border-l-danger'
              )}
              onclick={() => selectedParagraph = index}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedParagraph = index; } }}
            >
              <!-- Paragraph Header -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-text-tertiary">¶{index + 1}</span>

                  {#if commentCount > 0}
                    <Badge variant="info" size="sm">
                      {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                    </Badge>
                  {/if}

                  {#if issueCount > 0}
                    <Badge variant="danger" size="sm">
                      {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                    </Badge>
                  {/if}

                  {#if hasAction}
                    <Badge variant="primary" size="sm">Action applied</Badge>
                  {/if}
                </div>
              </div>

              <!-- Paragraph Text -->
              <p class="text-base leading-relaxed whitespace-pre-wrap">
                {paragraph}
              </p>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Annotation Panel -->
    {#if showAnnotations}
      <div class="w-96 border-l border-border overflow-hidden">
        <ReviewAnnotationPanel
          comments={data.currentReview.comments}
          actions={data.currentReview.actions}
          {selectedParagraph}
          onAddComment={handleAddComment}
          onResolveComment={handleResolveComment}
          onApplyAction={handleApplyAction}
        />
      </div>
    {/if}
  </div>

  <!-- Lock Point Visualization (if applicable) -->
  {#if data.content.locked}
    <div class="border-t border-border bg-surface-hover">
      <div class="p-4">
        <LockPointVisualization
          contentId={data.content.id}
          lockReason={data.content.lockReason}
        />
      </div>
    </div>
  {/if}
</div>
