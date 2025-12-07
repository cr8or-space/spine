<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import type { FactionRank, FactionMember, FactionRelation } from '@repo/types';
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
    name: data.faction.name,
    description: data.faction.description,
    aliases: data.faction.aliases.join(', '),
    type: data.faction.type,
    status: data.faction.status,
    influence: data.faction.influence,
    ideology: data.faction.ideology || '',
    goals: data.faction.goals.join('\n'),
  });

  // Dialog states
  let showRankDialog = $state(false);
  let showMemberDialog = $state(false);
  let showRelationDialog = $state(false);
  let showGoalDialog = $state(false);
  let showDeleteConfirm = $state(false);

  // Rank form
  let rankForm = $state({
    name: '',
    level: 1,
    description: '',
    privileges: '',
  });

  // Member form
  let memberForm = $state({
    characterId: '',
    rank: '',
    role: '',
    joinedAt: '',
    status: 'active' as FactionMember['status'],
  });

  // Relation form
  let relationForm = $state({
    targetId: '',
    type: 'neutral' as FactionRelation['type'],
    description: '',
    public: true,
  });

  // Goal form
  let goalForm = $state({
    goal: '',
  });

  const typeOptions = [
    { value: 'government', label: 'Government' },
    { value: 'military', label: 'Military' },
    { value: 'religious', label: 'Religious' },
    { value: 'criminal', label: 'Criminal' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'guild', label: 'Guild' },
    { value: 'secret', label: 'Secret Society' },
    { value: 'organization', label: 'Organization' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'disbanded', label: 'Disbanded' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'emerging', label: 'Emerging' },
  ];

  const influenceOptions = [
    { value: 'dominant', label: 'Dominant' },
    { value: 'major', label: 'Major' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'minor', label: 'Minor' },
    { value: 'negligible', label: 'Negligible' },
  ];

  const memberStatusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'former', label: 'Former' },
    { value: 'deceased', label: 'Deceased' },
  ];

  const relationTypeOptions = [
    { value: 'ally', label: 'Ally' },
    { value: 'enemy', label: 'Enemy' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'vassal', label: 'Vassal' },
    { value: 'overlord', label: 'Overlord' },
    { value: 'rival', label: 'Rival' },
    { value: 'trade', label: 'Trade Partner' },
  ];

  function resetRankForm() {
    rankForm = { name: '', level: 1, description: '', privileges: '' };
  }

  function resetMemberForm() {
    memberForm = { characterId: '', rank: '', role: '', joinedAt: '', status: 'active' };
  }

  function resetRelationForm() {
    relationForm = { targetId: '', type: 'neutral', description: '', public: true };
  }

  function resetGoalForm() {
    goalForm = { goal: '' };
  }

  function getCharacterName(characterId: string): string {
    const character = data.allCharacters.find((c) => c.id === characterId);
    return character?.name || 'Unknown';
  }

  function getFactionName(factionId: string): string {
    const faction = data.allFactions.find((f) => f.id === factionId);
    return faction?.name || 'Unknown';
  }

  function getTypeBadgeVariant(type: typeof data.faction.type): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (type) {
      case 'government': return 'primary';
      case 'military': return 'danger';
      case 'religious': return 'info';
      case 'criminal': return 'warning';
      case 'corporate': return 'success';
      default: return 'default';
    }
  }

  function getInfluenceBadgeVariant(influence: typeof data.faction.influence): 'primary' | 'success' | 'warning' | 'info' | 'default' {
    switch (influence) {
      case 'dominant': return 'primary';
      case 'major': return 'success';
      case 'moderate': return 'info';
      case 'minor': return 'warning';
      default: return 'default';
    }
  }
</script>

<svelte:head>
  <title>{data.faction.name} - {data.project.title} - NovelGen</title>
</svelte:head>

<div class="faction-page">
  <header class="page-header">
    <div class="header-left">
      <a href="/projects/{data.project.id}/bible" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Bible
      </a>
      <h1 class="page-title">{data.faction.name}</h1>
      <div class="faction-badges">
        <Badge variant={getTypeBadgeVariant(data.faction.type)}>
          {data.faction.type}
        </Badge>
        <Badge variant={getInfluenceBadgeVariant(data.faction.influence)}>
          {data.faction.influence}
        </Badge>
        <Badge variant={data.faction.status === 'active' ? 'success' : 'warning'}>
          {data.faction.status}
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
              label="Type"
              name="type"
              bind:value={editForm.type}
              options={typeOptions}
            />

            <Select
              label="Status"
              name="status"
              bind:value={editForm.status}
              options={statusOptions}
            />

            <Select
              label="Influence"
              name="influence"
              bind:value={editForm.influence}
              options={influenceOptions}
            />

            <TextField
              label="Aliases (comma-separated)"
              name="aliases-display"
              bind:value={editForm.aliases}
            />

            <input
              type="hidden"
              name="aliases"
              value={JSON.stringify(editForm.aliases.split(',').map(a => a.trim()).filter(Boolean))}
            />

            <TextField
              label="Ideology"
              name="ideology"
              bind:value={editForm.ideology}
            />

            <div class="form-full-width">
              <TextArea
                label="Description"
                name="description"
                bind:value={editForm.description}
                rows={6}
                required
              />
            </div>

            <div class="form-full-width">
              <TextArea
                label="Goals (one per line)"
                name="goals-display"
                bind:value={editForm.goals}
                rows={4}
              />
              <input
                type="hidden"
                name="goals"
                value={JSON.stringify(editForm.goals.split('\n').map(g => g.trim()).filter(Boolean))}
              />
            </div>
          </div>

          <div class="form-actions">
            <Button type="button" variant="secondary" onclick={() => {
              isEditing = false;
              editForm = {
                name: data.faction.name,
                description: data.faction.description,
                aliases: data.faction.aliases.join(', '),
                type: data.faction.type,
                status: data.faction.status,
                influence: data.faction.influence,
                ideology: data.faction.ideology || '',
                goals: data.faction.goals.join('\n'),
              };
            }}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Card>
    {:else}
      <div class="detail-grid">
        <Card>
          <h2 class="section-title">Basic Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Name</span>
              <span class="info-value">{data.faction.name}</span>
            </div>
            {#if data.faction.aliases.length > 0}
              <div class="info-item">
                <span class="info-label">Also known as</span>
                <span class="info-value">{data.faction.aliases.join(', ')}</span>
              </div>
            {/if}
            {#if data.faction.ideology}
              <div class="info-item">
                <span class="info-label">Ideology</span>
                <span class="info-value">{data.faction.ideology}</span>
              </div>
            {/if}
            <div class="info-item full-width">
              <span class="info-label">Description</span>
              <p class="info-value">{data.faction.description}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="section-header">
            <h2 class="section-title">Goals ({data.faction.goals.length})</h2>
            <Button size="sm" onclick={() => {
              resetGoalForm();
              showGoalDialog = true;
            }}>Add Goal</Button>
          </div>

          {#if data.faction.goals.length === 0}
            <p class="empty-message">No goals defined yet.</p>
          {:else}
            <ul class="goal-list">
              {#each data.faction.goals as goal, i}
                <li class="goal-item">
                  <span>{goal}</span>
                  <form method="POST" action="?/removeGoal" use:enhance>
                    <input type="hidden" name="goalIndex" value={i} />
                    <Button type="submit" size="sm" variant="danger">Remove</Button>
                  </form>
                </li>
              {/each}
            </ul>
          {/if}
        </Card>

        <Card>
          <div class="section-header">
            <h2 class="section-title">Ranks ({data.faction.ranks.length})</h2>
            <Button size="sm" onclick={() => {
              resetRankForm();
              showRankDialog = true;
            }}>Add Rank</Button>
          </div>

          {#if data.faction.ranks.length === 0}
            <p class="empty-message">No ranks defined yet.</p>
          {:else}
            <div class="rank-list">
              {#each data.faction.ranks.sort((a, b) => b.level - a.level) as rank}
                <div class="rank-item">
                  <div class="rank-header">
                    <Badge size="sm" variant="info">Level {rank.level}</Badge>
                    <strong>{rank.name}</strong>
                  </div>
                  <p class="rank-description">{rank.description}</p>
                  {#if rank.privileges.length > 0}
                    <div class="rank-privileges">
                      <span class="privileges-label">Privileges:</span>
                      {rank.privileges.join(', ')}
                    </div>
                  {/if}
                  <form method="POST" action="?/removeRank" use:enhance>
                    <input type="hidden" name="rankName" value={rank.name} />
                    <Button type="submit" size="sm" variant="danger">Remove</Button>
                  </form>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <Card>
          <div class="section-header">
            <h2 class="section-title">Members ({data.faction.members.length})</h2>
            <Button size="sm" onclick={() => {
              resetMemberForm();
              showMemberDialog = true;
            }}>Add Member</Button>
          </div>

          {#if data.faction.members.length === 0}
            <p class="empty-message">No members yet.</p>
          {:else}
            <div class="member-list">
              {#each data.faction.members as member}
                <div class="member-item">
                  <div class="member-header">
                    <a href="/projects/{data.project.id}/bible/character/{member.characterId}" class="member-name">
                      {getCharacterName(member.characterId)}
                    </a>
                    <Badge size="sm">{member.rank}</Badge>
                    <Badge size="sm" variant={member.status === 'active' ? 'success' : 'warning'}>
                      {member.status}
                    </Badge>
                  </div>
                  {#if member.role}
                    <p class="member-role">Role: {member.role}</p>
                  {/if}
                  <form method="POST" action="?/removeMember" use:enhance>
                    <input type="hidden" name="characterId" value={member.characterId} />
                    <Button type="submit" size="sm" variant="danger">Remove</Button>
                  </form>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <Card>
          <div class="section-header">
            <h2 class="section-title">Relations ({data.faction.relations.length})</h2>
            <Button size="sm" onclick={() => {
              resetRelationForm();
              showRelationDialog = true;
            }}>Add Relation</Button>
          </div>

          {#if data.faction.relations.length === 0}
            <p class="empty-message">No relations defined yet.</p>
          {:else}
            <div class="relation-list">
              {#each data.faction.relations as relation}
                <div class="relation-item">
                  <div class="relation-header">
                    <Badge size="sm" variant={relation.type === 'ally' ? 'success' : relation.type === 'enemy' ? 'danger' : 'info'}>
                      {relation.type}
                    </Badge>
                    <a href="/projects/{data.project.id}/bible/faction/{relation.targetId}" class="relation-target">
                      {getFactionName(relation.targetId)}
                    </a>
                    {#if !relation.public}
                      <Badge size="sm" variant="warning">Secret</Badge>
                    {/if}
                  </div>
                  <p class="relation-description">{relation.description}</p>
                  <form method="POST" action="?/removeRelation" use:enhance>
                    <input type="hidden" name="targetId" value={relation.targetId} />
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

<!-- Add Rank Dialog -->
<Dialog
  open={showRankDialog}
  title="Add Rank"
  onClose={() => (showRankDialog = false)}
>
  <form method="POST" action="?/addRank" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showRankDialog = false;
      resetRankForm();
    };
  }}>
    <div class="dialog-form">
      <TextField
        label="Name"
        name="name"
        bind:value={rankForm.name}
        required
      />
      <TextField
        label="Level"
        name="level"
        type="number"
        bind:value={rankForm.level}
        min="1"
        required
        hint="Higher levels = more authority"
      />
      <TextArea
        label="Description"
        name="description"
        bind:value={rankForm.description}
        rows={3}
        required
      />
      <TextField
        label="Privileges (comma-separated)"
        name="privileges-display"
        bind:value={rankForm.privileges}
      />
      <input
        type="hidden"
        name="privileges"
        value={JSON.stringify(rankForm.privileges.split(',').map(p => p.trim()).filter(Boolean))}
      />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showRankDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Rank</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Add Member Dialog -->
<Dialog
  open={showMemberDialog}
  title="Add Member"
  onClose={() => (showMemberDialog = false)}
>
  <form method="POST" action="?/addMember" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showMemberDialog = false;
      resetMemberForm();
    };
  }}>
    <div class="dialog-form">
      <Select
        label="Character"
        name="characterId"
        bind:value={memberForm.characterId}
        options={data.allCharacters.map(c => ({ value: c.id, label: c.name }))}
        required
      />
      <Select
        label="Rank"
        name="rank"
        bind:value={memberForm.rank}
        options={data.faction.ranks.map(r => ({ value: r.name, label: r.name }))}
        required
      />
      <TextField
        label="Role"
        name="role"
        bind:value={memberForm.role}
        hint="Specific position or title"
      />
      <TextField
        label="Joined At"
        name="joinedAt"
        bind:value={memberForm.joinedAt}
        hint="When did they join?"
      />
      <Select
        label="Status"
        name="status"
        bind:value={memberForm.status}
        options={memberStatusOptions}
      />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showMemberDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Member</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Add Relation Dialog -->
<Dialog
  open={showRelationDialog}
  title="Add Faction Relation"
  onClose={() => (showRelationDialog = false)}
>
  <form method="POST" action="?/addRelation" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showRelationDialog = false;
      resetRelationForm();
    };
  }}>
    <div class="dialog-form">
      <Select
        label="Target Faction"
        name="targetId"
        bind:value={relationForm.targetId}
        options={data.allFactions.map(f => ({ value: f.id, label: f.name }))}
        required
      />
      <Select
        label="Relation Type"
        name="type"
        bind:value={relationForm.type}
        options={relationTypeOptions}
      />
      <TextArea
        label="Description"
        name="description"
        bind:value={relationForm.description}
        rows={3}
        required
      />
      <label class="checkbox-label">
        <input type="checkbox" name="public-checkbox" bind:checked={relationForm.public} />
        Publicly known
      </label>
      <input type="hidden" name="public" value={relationForm.public.toString()} />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showRelationDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Relation</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Add Goal Dialog -->
<Dialog
  open={showGoalDialog}
  title="Add Goal"
  onClose={() => (showGoalDialog = false)}
>
  <form method="POST" action="?/addGoal" use:enhance={() => {
    return async ({ update }) => {
      await update();
      showGoalDialog = false;
      resetGoalForm();
    };
  }}>
    <div class="dialog-form">
      <TextArea
        label="Goal"
        name="goal"
        bind:value={goalForm.goal}
        rows={3}
        required
      />

      <div class="dialog-actions">
        <Button type="button" variant="secondary" onclick={() => (showGoalDialog = false)}>
          Cancel
        </Button>
        <Button type="submit">Add Goal</Button>
      </div>
    </div>
  </form>
</Dialog>

<!-- Delete Confirmation -->
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete Faction"
  message="Are you sure you want to delete {data.faction.name}? This action cannot be undone."
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
  .faction-page {
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

  .faction-badges {
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

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
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
  }

  .goal-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .goal-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .rank-list, .member-list, .relation-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .rank-item, .member-item, .relation-item {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .rank-header, .member-header, .relation-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .rank-description, .relation-description {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-2);
  }

  .rank-privileges {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-2);
  }

  .privileges-label {
    font-weight: 600;
  }

  .member-name, .relation-target {
    font-weight: 600;
    color: var(--color-primary);
    text-decoration: none;
  }

  .member-name:hover, .relation-target:hover {
    text-decoration: underline;
  }

  .member-role {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-2);
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
</style>
