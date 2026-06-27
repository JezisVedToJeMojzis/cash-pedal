<script lang="ts">
	import { formatMoney, formatDistance, monthLabel } from '$lib/format';
	import type { LeaderEntry } from '$lib/server/stats';
	let { data } = $props();

	let scope = $state<'friends' | 'company'>('friends');
	let sortBy = $state<'distance' | 'earnings'>('distance');

	const entries = $derived<LeaderEntry[]>(
		scope === 'company' && data.company ? data.company : data.friends
	);
	const ranked = $derived(
		[...entries].sort((a, b) =>
			sortBy === 'distance' ? b.distanceM - a.distanceM : b.earningsCents - a.earningsCents
		)
	);

	function rankClass(i: number) {
		return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
	}
</script>

<svelte:head><title>Leaderboard · CashPedal</title></svelte:head>

<div class="page">
	<h1>Leaderboard</h1>
	<p class="muted" style="margin-top:-.3rem">{monthLabel(data.month)} · resets on the 1st</p>

	<!-- Scope: friends vs company -->
	<div class="btn-row" style="margin:.5rem 0">
		<button class:btn-ghost={scope !== 'friends'} onclick={() => (scope = 'friends')}>
			Friends
		</button>
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
		<!-- Sort: km vs earnings -->
		<div class="btn-row" style="margin:0 0 1rem">
			<button class:btn-ghost={sortBy !== 'distance'} onclick={() => (sortBy = 'distance')}>
				Most km
			</button>
			<button class:btn-ghost={sortBy !== 'earnings'} onclick={() => (sortBy = 'earnings')}>
				Most earned
			</button>
		</div>

		<div class="card">
			{#each ranked as entry, i (entry.userId)}
				<div class="list-row">
					<div style="display:flex;align-items:center;gap:.6rem">
						<span class="rank {rankClass(i)}">{i + 1}</span>
						<div>
							<div>
								{entry.name}
								{#if entry.userId === data.meId}<span class="badge">you</span>{/if}
							</div>
							<div class="muted" style="font-size:.8rem">
								{entry.rideCount} ride{entry.rideCount === 1 ? '' : 's'}
							</div>
						</div>
					</div>
					<div style="text-align:right">
						<div style="font-weight:700">
							{sortBy === 'distance'
								? formatDistance(entry.distanceM)
								: formatMoney(entry.earningsCents, entry.currency)}
						</div>
						<div class="muted" style="font-size:.8rem">
							{sortBy === 'distance'
								? formatMoney(entry.earningsCents, entry.currency)
								: formatDistance(entry.distanceM)}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<p class="muted" style="font-size:.8rem;margin-top:1rem">
			Earnings are shown in each rider's own currency.
		</p>
	{/if}
</div>
