<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatMoney, formatDistance, monthLabel } from '$lib/format';
	let { data } = $props();

	let scope = $state<'friends' | 'company'>('friends');
	let sortBy = $state<'earnings' | 'distance'>('earnings');

	const entries = $derived(scope === 'company' && data.company ? data.company : data.friends);
	const ranked = $derived(
		[...entries].sort((a, b) =>
			sortBy === 'earnings'
				? b.earningsCents - a.earningsCents || b.distanceM - a.distanceM
				: b.distanceM - a.distanceM || b.earningsCents - a.earningsCents
		)
	);

	function rankClass(i: number) {
		return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
	}
	// Narrow optional fields present only on certain scopes.
	function relationOf(e: unknown): string | undefined {
		return (e as { relation?: string }).relation;
	}
	function isCoworker(e: unknown): boolean {
		return (e as { coworker?: boolean }).coworker === true;
	}
</script>

<svelte:head><title>Leaderboard · CashPedal</title></svelte:head>

<div class="page">
	<h1>Leaderboard</h1>
	<p class="muted" style="margin-top:-.3rem">
		{monthLabel(data.month)} · by {sortBy === 'earnings' ? 'earnings' : 'distance'} · resets on the 1st
	</p>

	<!-- Scope: friends vs company -->
	<div class="btn-row" style="margin:.5rem 0 .85rem">
		<button class:btn-ghost={scope !== 'friends'} onclick={() => (scope = 'friends')}>Friends</button>
		<button
			class:btn-ghost={scope !== 'company'}
			onclick={() => (scope = 'company')}
			disabled={!data.company}
		>
			{data.companyName ?? 'Company'}
		</button>
	</div>

	{#if scope === 'company' && !data.company}
		<div class="card"><p class="muted">Set your company in your profile to see the company board.</p></div>
	{:else}
		<!-- Elegant sort switch -->
		<div class="sort-row">
			<span class="muted" style="font-size:.8rem">Rank by</span>
			<div class="seg" role="group" aria-label="Rank by">
				<button class:on={sortBy === 'earnings'} onclick={() => (sortBy = 'earnings')}>Earned</button>
				<button class:on={sortBy === 'distance'} onclick={() => (sortBy = 'distance')}>Distance</button>
			</div>
		</div>

		<div class="card">
			{#each ranked as entry, i (entry.userId)}
				<div class="list-row">
					<span class="rank {rankClass(i)}">{i + 1}</span>
					<div style="flex:1;min-width:0">
						<div>
							{entry.name}
							{#if entry.userId === data.meId}
								<span class="badge">you</span>
							{:else if scope === 'friends' && isCoworker(entry)}
								<span class="badge">coworker</span>
							{:else if scope === 'company' && relationOf(entry) === 'friend'}
								<span class="badge">friend</span>
							{:else if scope === 'company' && relationOf(entry) === 'pending'}
								<span class="badge">requested</span>
							{/if}
						</div>
						<div class="muted" style="font-size:.8rem">
							{entry.rideCount} ride{entry.rideCount === 1 ? '' : 's'}
						</div>
					</div>

					{#if scope === 'company' && relationOf(entry) === 'none'}
						<form method="POST" action="?/add" use:enhance>
							<input type="hidden" name="userId" value={entry.userId} />
							<button type="submit" class="btn-ghost add-btn">+ Add</button>
						</form>
					{/if}

					<div style="text-align:right">
						{#if sortBy === 'earnings'}
							<div class="primary">{formatMoney(entry.earningsCents, entry.currency)}</div>
							<div class="secondary">{formatDistance(entry.distanceM)}</div>
						{:else}
							<div class="primary">{formatDistance(entry.distanceM)}</div>
							<div class="secondary">{formatMoney(entry.earningsCents, entry.currency)}</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<p class="muted" style="font-size:.8rem;margin-top:1rem">
			Ranked by {sortBy === 'earnings' ? 'money earned' : 'distance ridden'} this month · earnings shown
			in each rider's own currency.
		</p>
	{/if}
</div>

<style>
	.add-btn {
		width: auto;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
		white-space: nowrap;
	}
	.sort-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 0 1rem;
	}
	/* Compact segmented switch */
	.seg {
		display: inline-flex;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 3px;
		gap: 2px;
	}
	.seg button {
		width: auto;
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.35rem 0.85rem;
		border-radius: 999px;
	}
	.seg button:hover {
		filter: none;
		color: var(--text);
	}
	.seg button.on {
		background: var(--brand);
		color: #fff;
	}
	.primary {
		font-weight: 800;
		line-height: 1.15;
		color: var(--brand-bright);
	}
	.secondary {
		color: var(--text-muted);
		font-size: 0.85rem;
	}
</style>
