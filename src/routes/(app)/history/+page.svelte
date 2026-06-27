<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import {
		formatMoney,
		formatDistance,
		formatDuration,
		formatSpeed,
		monthLabel
	} from '$lib/format';
	let { data } = $props();

	const justSaved = $derived(page.url.searchParams.get('saved'));

	function confirmDelete(e: SubmitEvent) {
		if (!confirm('Delete this ride? This cannot be undone.')) e.preventDefault();
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

	{#if data.months.length === 0}
		<div class="card" style="text-align:center">
			<p class="muted">No rides yet.</p>
			<a class="btn" href="/track" style="margin-top:.5rem">Start your first ride</a>
		</div>
	{:else}
		{#each data.months as month}
			<section style="margin-top:1.25rem">
				<div style="display:flex;justify-content:space-between;align-items:baseline">
					<h2 style="margin:0">{monthLabel(month.key)}</h2>
					<strong style="color:var(--brand-bright)">{formatMoney(month.earningsCents, data.currency)}</strong>
				</div>
				<p class="muted" style="margin:.1rem 0 .6rem;font-size:.85rem">
					{formatDistance(month.distanceM)} · {month.rides.length} ride{month.rides.length === 1 ? '' : 's'}
				</p>
				<div class="card">
					{#each month.rides as ride}
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
							<form method="POST" action="?/delete" use:enhance onsubmit={confirmDelete}>
								<input type="hidden" name="id" value={ride.id} />
								<button type="submit" class="del-btn" aria-label="Delete ride" title="Delete ride">✕</button>
							</form>
						</div>
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</div>

<style>
	.del-btn {
		width: 34px;
		height: 34px;
		padding: 0;
		flex-shrink: 0;
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-muted);
		font-size: 0.9rem;
	}
	.del-btn:hover {
		filter: none;
		background: var(--danger);
		border-color: var(--danger);
		color: #fff;
	}
</style>
