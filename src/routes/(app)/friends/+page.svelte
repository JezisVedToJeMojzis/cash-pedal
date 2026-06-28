<script lang="ts">
	import { enhance } from '$app/forms';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	let { data, form } = $props();

	let showRemove = $state(false);
	let pendingRemove = $state<{ id: number; name: string } | null>(null);
	let removeForm: HTMLFormElement;
	function openRemove(id: number, name: string) {
		pendingRemove = { id, name };
		showRemove = true;
	}

	const initial = (n: string) => n.charAt(0).toUpperCase();
</script>

<svelte:head><title>Friends · CashPedal</title></svelte:head>

<div class="page">
	<h1>Friends</h1>

	<div class="card">
		<h2>Add a friend</h2>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		{#if form?.added}<p class="success">✓ Request sent to {form.added}</p>{/if}
		<form method="POST" action="?/add" use:enhance class="field-inline">
			<div style="flex:1">
				<label for="name">Their name</label>
				<input id="name" name="name" placeholder="Exact name" style="margin-bottom:0" />
			</div>
			<button type="submit" style="width:auto;white-space:nowrap">Send</button>
		</form>
	</div>

	{#if data.incoming.length}
		<h2 class="section-title">Requests ({data.incoming.length})</h2>
		{#each data.incoming as r}
			<div class="friend-row">
				<div class="avatar-sm">{initial(r.otherName)}</div>
				<span class="friend-name">{r.otherName}</span>
				<div class="btn-row" style="width:auto;gap:.4rem">
					<form method="POST" action="?/accept" use:enhance>
						<input type="hidden" name="id" value={r.id} />
						<button type="submit" class="row-btn">Accept</button>
					</form>
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="id" value={r.id} />
						<button type="submit" class="btn-ghost row-btn">Decline</button>
					</form>
				</div>
			</div>
		{/each}
	{/if}

	<h2 class="section-title">Your friends ({data.friends.length})</h2>
	{#if data.friends.length === 0}
		<div class="card"><p class="muted" style="margin:0">No friends yet. Add someone above to compare your stats.</p></div>
	{:else}
		{#each data.friends as f}
			<div class="friend-row">
				<div class="avatar-sm">{initial(f.otherName)}</div>
				<span class="friend-name">{f.otherName}</span>
				<button class="btn-ghost row-btn" onclick={() => openRemove(f.id, f.otherName)}>Remove</button>
			</div>
		{/each}
	{/if}

	{#if data.outgoing.length}
		<h2 class="section-title">Pending sent</h2>
		{#each data.outgoing as r}
			<div class="friend-row">
				<div class="avatar-sm">{initial(r.otherName)}</div>
				<span class="friend-name">{r.otherName} <span class="badge">pending</span></span>
				<form method="POST" action="?/remove" use:enhance>
					<input type="hidden" name="id" value={r.id} />
					<button type="submit" class="btn-ghost row-btn">Cancel</button>
				</form>
			</div>
		{/each}
	{/if}
</div>

<form bind:this={removeForm} method="POST" action="?/remove" use:enhance style="display:none">
	<input type="hidden" name="id" value={pendingRemove?.id} />
</form>

<ConfirmDialog
	bind:open={showRemove}
	title="Remove friend?"
	message={pendingRemove ? `Remove ${pendingRemove.name} from your friends?` : ''}
	confirmLabel="Remove"
	danger
	onconfirm={() => removeForm.requestSubmit()}
/>

<style>
	.section-title {
		margin: 1.5rem 0 0.6rem;
		font-size: 1.05rem;
	}
	.friend-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.65rem 0.8rem;
		margin-bottom: 0.6rem;
	}
	.avatar-sm {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: var(--brand);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		flex-shrink: 0;
	}
	.friend-name {
		flex: 1;
		min-width: 0;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.row-btn {
		width: auto;
		padding: 0.45rem 0.85rem;
		font-size: 0.85rem;
	}
</style>
