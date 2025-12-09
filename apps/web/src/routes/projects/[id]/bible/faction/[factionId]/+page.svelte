<script lang="ts">
  import type { PageData } from './$types';
  import type { FactionMember, FactionRelation } from '@repo/types';
  import { enhance } from '$app/forms';
  import { ArrowLeft } from 'lucide-svelte';
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

  let { data }: { data: PageData } = $props();

  // Edit state
  let isEditing = $state(false);
  let editForm = $state({
    name: '',
    description: '',
    aliases: '',
    type: '' as typeof data.faction.type,
    status: '' as typeof data.faction.status,
    influence: '' as typeof data.faction.influence,
    ideology: '',
    goals: '',
  });

  // Sync form with data when it changes
  $effect(() => {
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
  <title>{data.faction.name} - {data.project.title} - Spine</title>
</svelte:head>

<div class="flex-1 flex flex-col overflow-hidden">
  <header class="flex items-center justify-between p-6 border-b border-border bg-surface">
    <div class="flex flex-col gap-2">
      <a href="/projects/{data.project.id}/bible" class="flex items-center gap-1 text-sm text-text-secondary no-underline transition-colors duration-150 hover:text-primary">
        <ArrowLeft size={20} />
        Back to Bible
      </a>
      <h1 class="text-2xl font-bold m-0">{data.faction.name}</h1>
      <div class="flex gap-2">
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
    <div class="flex gap-2">
      {#if !isEditing}
        <Button variant="secondary" onclick={() => (isEditing = true)}>Edit</Button>
        <Button variant="danger" onclick={() => (showDeleteConfirm = true)}>Delete</Button>
      {/if}
    </div>
  </header>

  <div class="flex-1 overflow-auto p-6 bg-bg">
    {#if isEditing}
      <Card>
        <form method="POST" action="?/update" use:enhance={() => {
          return async ({ update }) => {
            await update();
            isEditing = false;
          };
        }}>
          <div class="grid grid-cols-2 gap-4">
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

            <div class="col-span-2">
              <TextArea
                label="Description"
                name="description"
                bind:value={editForm.description}
                rows={6}
                required
              />
            </div>

            <div class="col-span-2">
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

          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
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
      <div class="grid gap-4 max-w-screen-xl">
        <Card>
          <h2 class="text-lg font-semibold m-0 mb-4">Basic Information</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold uppercase text-text-secondary">Name</span>
              <span class="text-sm text-text m-0">{data.faction.name}</span>
            </div>
            {#if data.faction.aliases.length > 0}
              <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-text-secondary">Also known as</span>
                <span class="text-sm text-text m-0">{data.faction.aliases.join(', ')}</span>
              </div>
            {/if}
            {#if data.faction.ideology}
              <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-text-secondary">Ideology</span>
                <span class="text-sm text-text m-0">{data.faction.ideology}</span>
              </div>
            {/if}
            <div class="flex flex-col gap-1 col-span-2">
              <span class="text-xs font-semibold uppercase text-text-secondary">Description</span>
              <p class="text-sm text-text m-0">{data.faction.description}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold m-0">Goals ({data.faction.goals.length})</h2>
            <Button size="sm" onclick={() => {
              resetGoalForm();
              showGoalDialog = true;
            }}>Add Goal</Button>
          </div>

          {#if data.faction.goals.length === 0}
            <p class="text-text-secondary text-sm m-0">No goals defined yet.</p>
          {:else}
            <ul class="list-none p-0 m-0 flex flex-col gap-2">
              {#each data.faction.goals as goal, i}
                <li class="flex items-center justify-between p-3 bg-bg border border-border rounded-md">
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
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold m-0">Ranks ({data.faction.ranks.length})</h2>
            <Button size="sm" onclick={() => {
              resetRankForm();
              showRankDialog = true;
            }}>Add Rank</Button>
          </div>

          {#if data.faction.ranks.length === 0}
            <p class="text-text-secondary text-sm m-0">No ranks defined yet.</p>
          {:else}
            <div class="flex flex-col gap-3">
              {#each data.faction.ranks.sort((a, b) => b.level - a.level) as rank}
                <div class="p-3 bg-bg border border-border rounded-md">
                  <div class="flex items-center gap-2 mb-2">
                    <Badge size="sm" variant="info">Level {rank.level}</Badge>
                    <strong>{rank.name}</strong>
                  </div>
                  <p class="text-sm text-text-secondary m-0 mb-2">{rank.description}</p>
                  {#if rank.privileges.length > 0}
                    <div class="text-xs text-text-tertiary mb-2">
                      <span class="font-semibold">Privileges:</span>
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
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold m-0">Members ({data.faction.members.length})</h2>
            <Button size="sm" onclick={() => {
              resetMemberForm();
              showMemberDialog = true;
            }}>Add Member</Button>
          </div>

          {#if data.faction.members.length === 0}
            <p class="text-text-secondary text-sm m-0">No members yet.</p>
          {:else}
            <div class="flex flex-col gap-3">
              {#each data.faction.members as member}
                <div class="p-3 bg-bg border border-border rounded-md">
                  <div class="flex items-center gap-2 mb-2">
                    <a href="/projects/{data.project.id}/bible/character/{member.characterId}" class="font-semibold text-primary no-underline hover:underline">
                      {getCharacterName(member.characterId)}
                    </a>
                    <Badge size="sm">{member.rank}</Badge>
                    <Badge size="sm" variant={member.status === 'active' ? 'success' : 'warning'}>
                      {member.status}
                    </Badge>
                  </div>
                  {#if member.role}
                    <p class="text-sm text-text-secondary m-0 mb-2">Role: {member.role}</p>
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
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold m-0">Relations ({data.faction.relations.length})</h2>
            <Button size="sm" onclick={() => {
              resetRelationForm();
              showRelationDialog = true;
            }}>Add Relation</Button>
          </div>

          {#if data.faction.relations.length === 0}
            <p class="text-text-secondary text-sm m-0">No relations defined yet.</p>
          {:else}
            <div class="flex flex-col gap-3">
              {#each data.faction.relations as relation}
                <div class="p-3 bg-bg border border-border rounded-md">
                  <div class="flex items-center gap-2 mb-2">
                    <Badge size="sm" variant={relation.type === 'ally' ? 'success' : relation.type === 'enemy' ? 'danger' : 'info'}>
                      {relation.type}
                    </Badge>
                    <a href="/projects/{data.project.id}/bible/faction/{relation.targetId}" class="font-semibold text-primary no-underline hover:underline">
                      {getFactionName(relation.targetId)}
                    </a>
                    {#if !relation.public}
                      <Badge size="sm" variant="warning">Secret</Badge>
                    {/if}
                  </div>
                  <p class="text-sm text-text-secondary m-0 mb-2">{relation.description}</p>
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
    <div class="flex flex-col gap-4">
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

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
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
    <div class="flex flex-col gap-4">
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

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
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
    <div class="flex flex-col gap-4">
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
      <label class="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" name="public-checkbox" bind:checked={relationForm.public} class="cursor-pointer" />
        Publicly known
      </label>
      <input type="hidden" name="public" value={relationForm.public.toString()} />

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
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
    <div class="flex flex-col gap-4">
      <TextArea
        label="Goal"
        name="goal"
        bind:value={goalForm.goal}
        rows={3}
        required
      />

      <div class="flex justify-end gap-3 pt-4 border-t border-border mt-2">
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
