<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import {
		formatMoney,
		formatDistance,
		formatDuration,
		formatSpeed,
		monthLabel
	} from '$lib/format';
	let { data } = $props();

	const justSaved = $derived(page.url.searchParams.get('saved'));

	let view = $state<'month' | 'all'>('month');

	const currentTotal = $derived(
		data.currentRides.reduce(
			(acc, r) => {
				acc.distanceM += r.distanceM;
				acc.earningsCents += r.earningsCents;
				return acc;
			},
			{ distanceM: 0, earningsCents: 0 }
		)
	);

	let showDelete = $state(false);
	let pendingDeleteId = $state<number | null>(null);
	let deleteForm: HTMLFormElement;
	function openDelete(id: number) {
		pendingDeleteId = id;
		showDelete = true;
	}

	function rideTime(d: string | Date) {
		return new Date(d).toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head><title>History · CashPedal</title></svelte:head>

<div class="page">
	<h1>History</h1>

	{#if justSaved}
		<p class="success">✓ Ride saved! Nice work.</p>
	{/if}

	{#if data.monthly.length === 0}
		<div class="card" style="text-align:center">
			<p class="muted">No rides yet.</p>
			<a class="btn" href="/track" style="margin-top:.5rem">Start your first ride</a>
		</div>
	{:else}
		<div class="btn-row" style="margin:.5rem 0 1rem">
			<button class:btn-ghost={view !== 'month'} onclick={() => (view = 'month')}>This month</button>
			<button class:btn-ghost={view !== 'all'} onclick={() => (view = 'all')}>All months</button>
		</div>

		{#if view === 'month'}
			<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.5rem">
				<h2 style="margin:0">{monthLabel(data.currentKey)}</h2>
				<strong style="color:var(--brand-bright)">{formatMoney(currentTotal.earningsCents, data.currency)}</strong>
			</div>

			{#if data.currentRides.length === 0}
				<div class="card"><p class="muted" style="margin:0">No rides this month yet.</p></div>
			{:else}
				<p class="muted" style="margin:0 0 .6rem;font-size:.85rem">
					{formatDistance(currentTotal.distanceM)} · {data.currentRides.length} ride{data.currentRides
						.length === 1
						? ''
						: 's'}
				</p>
				<div class="card">
					{#each data.currentRides as ride}
						<div class="list-row">
							<div style="flex:1;min-width:0">
								<div>{rideTime(ride.startedAt)}</div>
								<div class="muted" style="font-size:.8rem">
									{formatDistance(ride.distanceM)} · {formatDuration(ride.durationS)} · {formatSpeed(
										ride.distanceM,
										ride.durationS
									)}
								</div>
							</div>
							<strong>{formatMoney(ride.earningsCents, data.currency)}</strong>
							<button
								type="button"
								class="del-btn"
								aria-label="Delete ride"
								title="Delete ride"
								onclick={() => openDelete(ride.id)}
							>
								<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
									stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
								</svg>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			<!-- All months: combined totals per month -->
			<div class="card">
				{#each data.monthly as m}
					<div class="list-row">
						<div style="flex:1;min-width:0">
							<div>
								{monthLabel(m.key)}
								{#if m.key === data.currentKey}<span class="badge">current</span>{/if}
							</div>
							<div class="muted" style="font-size:.8rem">
								{formatDistance(m.distanceM)} · {m.rideCount} ride{m.rideCount === 1 ? '' : 's'}
							</div>
						</div>
						<strong style="color:var(--brand-bright)">{formatMoney(m.earningsCents, data.currency)}</strong>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<form
	bind:this={deleteForm}
	method="POST"
	action="?/delete"
	use:enhance={() => async ({ update }) => {
		await update();
		pendingDeleteId = null;
	}}
	style="display:none"
>
	<input type="hidden" name="id" value={pendingDeleteId} />
</form>

<ConfirmDialog
	bind:open={showDelete}
	title="Delete ride?"
	message="This permanently removes the ride from your history."
	confirmLabel="Delete"
	danger
	onconfirm={() => deleteForm.requestSubmit()}
/>

<style>
	.del-btn {
		width: 34px;
		height: 34px;
		padding: 0;
		flex-shrink: 0;
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-muted);
	}
	.del-btn:hover {
		filter: none;
		background: var(--danger);
		border-color: var(--danger);
		color: #fff;
	}
</style>
