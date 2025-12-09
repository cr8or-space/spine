<script lang="ts">
  import type { ReviewComment, ParagraphAction } from '@repo/types';
  import { MessageSquare, AlertCircle, Lightbulb, ThumbsUp, Check, X, RefreshCw, Edit3 } from 'lucide-svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import TextArea from '$lib/components/TextArea.svelte';
  import Select from '$lib/components/Select.svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    comments?: ReviewComment[];
    actions?: ParagraphAction[];
    selectedParagraph?: number;
    onAddComment?: (comment: Omit<ReviewComment, 'id' | 'timestamp'>) => void;
    onResolveComment?: (commentId: string) => void;
    onApplyAction?: (action: Omit<ParagraphAction, 'timestamp'>) => void;
    class?: string;
  }

  let {
    comments = [],
    actions = [],
    selectedParagraph = undefined,
    onAddComment,
    onResolveComment,
    onApplyAction,
    class: className
  }: Props = $props();

  let showCommentDialog = $state(false);
  let showActionDialog = $state(false);
  let commentText = $state('');
  let commentType = $state<'note' | 'issue' | 'suggestion' | 'praise'>('note');
  let actionType = $state<'accept' | 'reject' | 'regenerate' | 'edit'>('accept');
  let actionReason = $state('');
  let editedText = $state('');

  const filteredComments = $derived(
    selectedParagraph !== undefined
      ? comments.filter(c => c.paragraphIndex === selectedParagraph)
      : comments
  );

  const filteredActions = $derived(
    selectedParagraph !== undefined
      ? actions.filter(a => a.paragraphIndex === selectedParagraph)
      : actions
  );

  function getCommentVariant(type: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
    switch (type) {
      case 'issue': return 'danger';
      case 'suggestion': return 'info';
      case 'praise': return 'success';
      default: return 'default';
    }
  }

  function handleAddComment() {
    if (!commentText.trim() || !onAddComment || selectedParagraph === undefined) return;

    onAddComment({
      paragraphIndex: selectedParagraph,
      type: commentType,
      text: commentText,
      resolved: false,
    });

    commentText = '';
    showCommentDialog = false;
  }

  function handleApplyAction() {
    if (!onApplyAction || selectedParagraph === undefined) return;

    const action: Omit<ParagraphAction, 'timestamp'> = {
      paragraphIndex: selectedParagraph,
      action: actionType,
      reason: actionReason || undefined,
    };

    if (actionType === 'edit' && editedText.trim()) {
      action.newText = editedText;
    }

    onApplyAction(action);

    actionReason = '';
    editedText = '';
    showActionDialog = false;
  }

  function formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }
</script>

<div class={cn('review-annotation-panel flex flex-col h-full bg-surface', className)}>
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b border-border">
    <h3 class="text-lg font-semibold">
      {selectedParagraph !== undefined ? `Paragraph ${selectedParagraph + 1}` : 'All Comments'}
    </h3>

    {#if selectedParagraph !== undefined}
      <div class="flex gap-2">
        <Button size="sm" variant="ghost" onclick={() => showCommentDialog = true}>
          <MessageSquare size={16} />
          Comment
        </Button>
        <Button size="sm" variant="primary" onclick={() => showActionDialog = true}>
          <Check size={16} />
          Action
        </Button>
      </div>
    {/if}
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <!-- Comments Section -->
    {#if filteredComments.length > 0}
      <div class="space-y-3">
        <h4 class="text-sm font-semibold text-text-secondary">Comments</h4>
        {#each filteredComments as comment (comment.id)}
          <Card class="p-3">
            <div class="flex items-start gap-3">
              {#if comment.type === 'issue'}
                <AlertCircle size={18} class="mt-0.5 text-text-secondary" />
              {:else if comment.type === 'suggestion'}
                <Lightbulb size={18} class="mt-0.5 text-text-secondary" />
              {:else if comment.type === 'praise'}
                <ThumbsUp size={18} class="mt-0.5 text-text-secondary" />
              {:else}
                <MessageSquare size={18} class="mt-0.5 text-text-secondary" />
              {/if}

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <Badge variant={getCommentVariant(comment.type)} size="sm">
                    {comment.type}
                  </Badge>
                  {#if comment.resolved}
                    <Badge variant="success" size="sm">Resolved</Badge>
                  {/if}
                  <span class="text-xs text-text-tertiary">
                    Para {comment.paragraphIndex + 1}
                  </span>
                </div>

                <p class="text-sm text-text whitespace-pre-wrap">{comment.text}</p>

                <div class="flex items-center justify-between mt-2">
                  <span class="text-xs text-text-tertiary">
                    {formatTimestamp(comment.timestamp)}
                  </span>

                  {#if !comment.resolved && onResolveComment}
                    <Button
                      size="sm"
                      variant="ghost"
                      onclick={() => onResolveComment?.(comment.id)}
                    >
                      <Check size={14} />
                      Resolve
                    </Button>
                  {/if}
                </div>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}

    <!-- Actions Section -->
    {#if filteredActions.length > 0}
      <div class="space-y-3">
        <h4 class="text-sm font-semibold text-text-secondary">Actions</h4>
        {#each filteredActions as action}
          <Card class="p-3">
            <div class="flex items-start gap-3">
              {#if action.action === 'accept'}
                <Check size={18} class="mt-0.5 text-text-secondary" />
              {:else if action.action === 'reject'}
                <X size={18} class="mt-0.5 text-text-secondary" />
              {:else if action.action === 'regenerate'}
                <RefreshCw size={18} class="mt-0.5 text-text-secondary" />
              {:else}
                <Edit3 size={18} class="mt-0.5 text-text-secondary" />
              {/if}

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <Badge variant="primary" size="sm">
                    {action.action}
                  </Badge>
                  <span class="text-xs text-text-tertiary">
                    Para {action.paragraphIndex + 1}
                  </span>
                </div>

                {#if action.reason}
                  <p class="text-sm text-text-secondary mb-1">{action.reason}</p>
                {/if}

                {#if action.newText}
                  <div class="mt-2 p-2 bg-surface-hover rounded text-sm">
                    <p class="text-xs text-text-tertiary mb-1">New text:</p>
                    <p class="text-text whitespace-pre-wrap">{action.newText}</p>
                  </div>
                {/if}

                <span class="text-xs text-text-tertiary mt-2 block">
                  {formatTimestamp(action.timestamp)}
                </span>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}

    {#if filteredComments.length === 0 && filteredActions.length === 0}
      <div class="flex flex-col items-center justify-center h-64 text-center">
        <MessageSquare size={48} class="text-text-tertiary mb-3" />
        <p class="text-text-secondary">
          {selectedParagraph !== undefined
            ? 'No comments or actions for this paragraph'
            : 'No comments or actions yet'}
        </p>
        {#if selectedParagraph !== undefined}
          <p class="text-sm text-text-tertiary mt-2">
            Click "Comment" or "Action" to add feedback
          </p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Add Comment Dialog -->
<Dialog bind:open={showCommentDialog} title="Add Comment">
  <div class="space-y-4">
    <Select
      bind:value={commentType}
      label="Comment Type"
      options={[
        { value: 'note', label: 'Note' },
        { value: 'issue', label: 'Issue' },
        { value: 'suggestion', label: 'Suggestion' },
        { value: 'praise', label: 'Praise' },
      ]}
    />

    <TextArea
      bind:value={commentText}
      label="Comment"
      placeholder="Enter your comment..."
      rows={4}
    />

    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={() => showCommentDialog = false}>
        Cancel
      </Button>
      <Button variant="primary" onclick={handleAddComment}>
        Add Comment
      </Button>
    </div>
  </div>
</Dialog>

<!-- Apply Action Dialog -->
<Dialog bind:open={showActionDialog} title="Apply Action">
  <div class="space-y-4">
    <Select
      bind:value={actionType}
      label="Action Type"
      options={[
        { value: 'accept', label: 'Accept' },
        { value: 'reject', label: 'Reject' },
        { value: 'regenerate', label: 'Regenerate' },
        { value: 'edit', label: 'Edit' },
      ]}
    />

    <TextArea
      bind:value={actionReason}
      label="Reason (optional)"
      placeholder="Why are you taking this action?"
      rows={2}
    />

    {#if actionType === 'edit'}
      <TextArea
        bind:value={editedText}
        label="New Text"
        placeholder="Enter the edited paragraph text..."
        rows={6}
      />
    {/if}

    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={() => showActionDialog = false}>
        Cancel
      </Button>
      <Button variant="primary" onclick={handleApplyAction}>
        Apply
      </Button>
    </div>
  </div>
</Dialog>
