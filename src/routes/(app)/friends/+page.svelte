<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
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
		<div class="card">
			<h2>Requests ({data.incoming.length})</h2>
			{#each data.incoming as r}
				<div class="list-row">
					<span>{r.otherName}</span>
					<div class="btn-row" style="width:auto">
						<form method="POST" action="?/accept" use:enhance>
							<input type="hidden" name="id" value={r.id} />
							<button type="submit" style="width:auto;padding:.5rem .9rem">Accept</button>
						</form>
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="id" value={r.id} />
							<button type="submit" class="btn-ghost" style="width:auto;padding:.5rem .9rem">Decline</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="card">
		<h2>Your friends ({data.friends.length})</h2>
		{#if data.friends.length === 0}
			<p class="muted">No friends yet. Add someone above to compare your stats.</p>
		{:else}
			{#each data.friends as f}
				<div class="list-row">
					<span>{f.otherName}</span>
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="id" value={f.id} />
						<button type="submit" class="btn-ghost" style="width:auto;padding:.4rem .8rem;font-size:.85rem">Remove</button>
					</form>
				</div>
			{/each}
		{/if}
	</div>

	{#if data.outgoing.length}
		<div class="card">
			<h2>Pending sent</h2>
			{#each data.outgoing as r}
				<div class="list-row">
					<span>{r.otherName} <span class="badge">pending</span></span>
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="id" value={r.id} />
						<button type="submit" class="btn-ghost" style="width:auto;padding:.4rem .8rem;font-size:.85rem">Cancel</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}
</div>
