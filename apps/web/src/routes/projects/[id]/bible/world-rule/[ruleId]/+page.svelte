<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { RuleException } from '@repo/types';
  import { enhance } from '$app/forms';
  import {
    Button,
    TextField,
    TextArea,
    Select,
    Badge,
    Card,
    Dialog,
    ConfirmDialog,
  } from '$lib/components';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Edit state
  let isEditing = $state(false);
  let editForm = $state({
    name: data.worldRule.name,
    category: data.worldRule.category,
    rule: data.worldRule.rule,
    description: data.worldRule.description,
    rationale: data.worldRule.rationale || '',
    consequences: data.worldRule.consequences || '',
    priority: data.worldRule.priority,
    established: data.worldRule.established,
    publicKnowledge: data.worldRule.publicKnowledge,
  });

  // Dialog states
  let showExceptionDialog = $state(false);
  let showRelatedRuleDialog = $state(false);
  let showDeleteConfirm = $state(false);

  // Exception form
  let exceptionForm = $state({
    condition: '',
    effect: '',
    applicableTo: '',
  });

  // Related rule form
  let relatedRuleForm = $state({
    relatedRuleId: '',
  });

  const categoryOptions = [
    { value: 'magic', label: 'Magic' },
    { value: 'technology', label: 'Technology' },
    { value: 'physics', label: 'Physics' },
    { value: 'social', label: 'Social' },
    { value: 'biological', label: 'Biological' },
    { value: 'economic', label: 'Economic' },
    { value: 'other', label: 'Other' },
  ];

  function resetExceptionForm() {
    exceptionForm = { condition: '', effect: '', applicableTo: '' };
  }

  function resetRelatedRuleForm() {
    relatedRuleForm = { relatedRuleId: '' };
  }

  function getRelatedRuleName(ruleId: string): string {
    const rule = data.allWorldRules.find((r) => r.id === ruleId);
    return rule?.name || 'Unknown';
  }

  function getCategoryBadgeVariant(category: typeof data.worldRule.category): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (category) {
      case 'magic': return 'primary';
      case 'technology': return 'info';
      case 'physics': return 'success';
      case 'social': return 'warning';
      default: return 'default';
    }
  }
</script>

<svelte:head>
  <title>{data.worldRule.name} - {data.project.title} - NovelGen</title>
</svelte:head>

<div class="world-rule-page">
  <header class="page-header">
    <div class="header-left">
      <a href="/projects/{data.project.id}/bible" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Bible
      </a>
      <h1 class="page-title">{data.worldRule.name}</h1>
      <div class="rule-badges">
        <Badge variant={getCategoryBadgeVariant(data.worldRule.category)}>
          {data.worldRule.category}
        </Badge>
        <Badge variant={data.worldRule.established ? 'success' : 'warning'}>
          {data.worldRule.established ? 'Established' : 'Draft'}
        </Badge>
        <Badge variant={data.worldRule.publicKnowledge ? 'info' : 'warning'}>
          {data.worldRule.publicKnowledge ? 'Public' : 'Secret'}
        </Badge>
      </div>
    </div>
    <div class="header-actions">
      {#if !isEditing}
        <Button variant="secondary" onclick={() => (isEditing = true)}>Edit</Button>
        <Button variant="danger" onclick={() => (showDeleteConfirm = true)}>Delete</Button>
      {/if}
    </div>
  </header>

  <div class="page-content">
    {#if isEditing}
      <Card>
        <form method="POST" action="?/update" use:enhance={() => {
          return async ({ update }) => {
            await update();
            isEditing = false;
          };
        }}>
          <div class="form-grid">
            <TextField
              label="Name"
              name="name"
              bind:value={editForm.name}
              required
            />

            <Select
              label="Category"
              name="category"
              bind:value={editForm.category}
              options={categoryOptions}
            />

            <TextField
              label="Priority (0-100)"
              name="priority"
              type="number"
              bind:value={editForm.priority}
              min="0"
              max="100"
            />

            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={editForm.established} />
                Established in story
              </label>
              <input type="hidden" name="established" value={editForm.established.toString()} />

              <label class="checkbox-label">
                <input type="checkbox" bind:checked={editForm.publicKnowledge} />
                Public knowledge
              </label>
              <input type="hidden" name="publicKnowledge" value={editForm.publicKnowledge.toString()} />
            </div>

            <div class="form-full-width">
              <TextArea
                label="Rule"
                name="rule"
                bind:value={editForm.rule}
                rows={3}
                required
                hint="The actual rule statement"
              />
            </div>

            <div class="form-full-width">
              <TextArea
                label="Description"
                name="description"
                bind:value={editForm.description}
                rows={4}
              />
            </div>

            <div class="form-full-width">
              <TextArea
                label="Rationale"
                name="rationale"
                bind:value={editForm.rationale}
                rows={3}
                hint="Why does this rule exist in the world?"
              />
            </div>

            <div class="form-full-width">
              <TextArea
                label="Consequences"
                name="consequences"
                bind:value={editForm.consequences}
                rows={3}
                hint="What happens when this rule is broken or applied?"
              />
            </div>

            <input
              type="hidden"
              name="exceptions"
              value={JSON.stringify(data.worldRule.exceptions)}
            />

            <input
              type="hidden"
              name="relatedRules"
              value={JSON.stringify(data.worldRule.relatedRules || [])}
            />
          </div>

          <div class="form-actions">
            <Button type="button" variant="secondary" onclick={() => {
              isEditing = false;
              editForm = {
                name: data.worldRule.name,
                category: data.worldRule.category,
                rule: data.worldRule.rule,
                description: data.worldRule.description,
                rationale: data.worldRule.rationale || '',
                consequences: data.worldRule.consequences || '',
                priority: data.worldRule.priority,
                established: data.worldRule.established,
                publicKnowledge: data.worldRule.publicKnowledge,
              };
            }}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Card>
    {:else}
      <div class="detail-grid">
        <Card>
          <h2 class="section-title">Rule Statement</h2>
          <div class="rule-statement">
            {data.worldRule.rule}
          </div>
          <div class="rule-meta">
            <span>Priority: {data.worldRule.priority}/100</span>
          </div>
        </Card>

        <Card>
          <h2 class="section-title">Details</h2>
          <div class="info-grid">
            {#if data.worldRule.description}
              <div class="info-item full-width">
                <span class="info-label">Description</span>
                <p class="info-value">{data.worldRule.description}</p>
              </div>
            {/if}
            {#if data.worldRule.rationale}
              <div class="info-item full-width">
                <span class="info-label">Rationale</span>
                <p class="info-value">{data.worldRule.rationale}</p>
              </div>
            {/if}
            {#if data.worldRule.consequences}
              <div class="info-item full-width">
                <span class="info-label">Consequences</span>
                <p class="info-value">{data.worldRule.consequences}</p>
              </div>
            {/if}
          </div>
        </Card>

        <Card>
          <div class="section-header">
            <h2 class="section-title">Exceptions ({data.worldRule.exceptions.length})</h2>
            <Button size="sm" onclick={() => {
              resetExceptionForm();
              showExceptionDialog = true;
            }}>Add Exception</Button>
          </div>

          {#if data.worldRule.exceptions.length === 0}
            <p class="empty-message">No exceptions defined yet.</p>
          {:else}
            <div class="exception-list">
              {#each data.worldRule.exceptions as exception, i}
                <div class="exception-item">
                  <div class="exception-condition">
                    <span class="exception-label">When:</span>
                    {exception.condition}
                  </div>
                  <div class="exception-effect">
                    <span class="exception-label">Then:</span>
                    {exception.effect}
                  </div>
                  {#if exception.applicableTo && exception.applicableTo.length > 0}
                    <div class="exception-applicable">
                      <span class="exception-label">Applies to:</span>
                      {exception.applicableTo.join(', ')}
                    </div>
                  {/if}
                  <form method="POST" action="?/removeException" use:enhance>
                    <input type="hidden" name="exceptionIndex" value={i} />
                    <Button type="submit" size="sm" variant="danger">Remove</Button>
                  </form>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <Card>
          <div class="section-header">
            <h2 class="section-title">Related Rules ({data.worldRule.relatedRules?.length || 0})</h2>
            <Button size="sm" onclick={() => {
              resetRelatedRuleForm();
              showRelatedRuleDialog = true;
            }}>Add Related</Button>
          </div>

          {#if !data.worldRule.relatedRules || data.worldRule.relatedRules.length === 0}
            <p class="empty-message">No related rules yet.</p>
          {:else}
            <div class="related-list">
              {#each data.worldRule.relatedRules as relatedId}
                <div class="related-item">
                  <a href="/projects/{data.project.id}/bible/world-rule/{relatedId}" class="related-link">
                    {getRelatedRuleName(relatedId)}
                  </a>
                  <form method="POST" action="?/removeRelatedRule" use:enhance>
                    <input type="hidden" name="relatedRuleId" value={relatedId} />
                    <Button type="submit" size="sm" variant="danger">Remove</Button>
                  </form>
                </div>
              {/each}
            </div>
          {/if}
        </Card>
      </div>
    {/if}
  </div>
</div>

<!-- Add Exception Dialog -->
<Dialog
  open={showExceptionDialog}
  title="Add Exception"
  onClose={() => (showExceptionDialog = false)}
>
  <form method="POST" action="?/addException" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showExceptionDialog = false;
      resetExceptionForm();
    };
  }}>
    <div class="dialog-form">
      <TextArea
        label="Condition"
        name="condition"
        bind:value={exceptionForm.condition}
        rows={2}
        required
        hint="When does this exception apply?"
      />
      <TextArea
        label="Effect"
        name="effect"
        bind:value={exceptionForm.effect}
        rows={2}
        required
        hint="What happens instead?"
      />
      <TextField
        label="Applicable To (comma-separated)"
        name="applicableTo-display"
        bind:value={exceptionForm.applicableTo}
        hint="Characters, locations, or situations"
      />
      <input
        type="hidden"
        name="applicableTo"
        value={JSON.stringify(exceptionForm.applicableTo.split(',').map(a => a.trim()).filter(Boolean))}
      />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showExceptionDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Exception</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Add Related Rule Dialog -->
<Dialog
  open={showRelatedRuleDialog}
  title="Add Related Rule"
  onClose={() => (showRelatedRuleDialog = false)}
>
  <form method="POST" action="?/addRelatedRule" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showRelatedRuleDialog = false;
      resetRelatedRuleForm();
    };
  }}>
    <div class="dialog-form">
      <Select
        label="Related Rule"
        name="relatedRuleId"
        bind:value={relatedRuleForm.relatedRuleId}
        options={data.allWorldRules.map(r => ({ value: r.id, label: r.name }))}
        required
      />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showRelatedRuleDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Related Rule</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Delete Confirmation -->
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete World Rule"
  message="Are you sure you want to delete {data.worldRule.name}? This action cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  onConfirm={() => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '?/delete';
    document.body.appendChild(form);
    form.submit();
  }}
  onCancel={() => (showDeleteConfirm = false)}
/>

<style>
  .world-rule-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-surface);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  .back-link:hover {
    color: var(--color-primary);
  }

  .page-title {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin: 0;
  }

  .rule-badges {
    display: flex;
    gap: var(--space-2);
  }

  .header-actions {
    display: flex;
    gap: var(--space-2);
  }

  .page-content {
    flex: 1;
    overflow: auto;
    padding: var(--space-6);
    background-color: var(--color-bg);
  }

  .detail-grid {
    display: grid;
    gap: var(--space-4);
    max-width: 1200px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .section-title {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0 0 var(--space-4);
  }

  .rule-statement {
    font-size: var(--text-lg);
    font-weight: 500;
    padding: var(--space-4);
    background-color: var(--color-bg-secondary);
    border-left: 4px solid var(--color-primary);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-4);
  }

  .rule-meta {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .info-grid {
    display: grid;
    gap: var(--space-4);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .info-item.full-width {
    grid-column: 1 / -1;
  }

  .info-label {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .info-value {
    font-size: var(--text-sm);
    color: var(--color-text);
    margin: 0;
    line-height: 1.6;
  }

  .exception-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .exception-item {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .exception-condition, .exception-effect, .exception-applicable {
    font-size: var(--text-sm);
    margin-bottom: var(--space-2);
  }

  .exception-label {
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-right: var(--space-1);
  }

  .related-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .related-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .related-link {
    font-weight: 500;
    color: var(--color-primary);
    text-decoration: none;
  }

  .related-link:hover {
    text-decoration: underline;
  }

  .empty-message {
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    margin: 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .form-full-width {
    grid-column: 1 / -1;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
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
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
