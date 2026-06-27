<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatMoney, formatDistance, monthLabel } from '$lib/format';
	let { data } = $props();

	let scope = $state<'friends' | 'company'>('friends');

	const entries = $derived(
		scope === 'company' && data.company ? data.company : data.friends
	);
	// Always ranked by money earned (km shown as a secondary stat).
	const ranked = $derived(
		[...entries].sort((a, b) => b.earningsCents - a.earningsCents || b.distanceM - a.distanceM)
	);

	function rankClass(i: number) {
		return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
	}
	// Narrow the relation field, present only on company-scope entries.
	function relationOf(e: unknown): string | undefined {
		return (e as { relation?: string }).relation;
	}
</script>

<svelte:head><title>Leaderboard · CashPedal</title></svelte:head>

<div class="page">
	<h1>Leaderboard</h1>
	<p class="muted" style="margin-top:-.3rem">{monthLabel(data.month)} · by earnings · resets on the 1st</p>

	<!-- Scope: friends vs company -->
	<div class="btn-row" style="margin:.5rem 0 1rem">
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
		<div class="card">
			{#each ranked as entry, i (entry.userId)}
				<div class="list-row">
					<span class="rank {rankClass(i)}">{i + 1}</span>
					<div style="flex:1;min-width:0">
						<div>
							{entry.name}
							{#if entry.userId === data.meId}<span class="badge">you</span>{/if}
						</div>
						<div class="muted" style="font-size:.8rem">
							{entry.rideCount} ride{entry.rideCount === 1 ? '' : 's'}
						</div>
					</div>

					{#if scope === 'company'}
						{#if relationOf(entry) === 'none'}
							<form method="POST" action="?/add" use:enhance>
								<input type="hidden" name="userId" value={entry.userId} />
								<button type="submit" class="btn-ghost add-btn">+ Add</button>
							</form>
						{:else if relationOf(entry) === 'pending'}
							<span class="badge">requested</span>
						{:else if relationOf(entry) === 'friend'}
							<span class="badge">friend</span>
						{/if}
					{/if}

					<div style="text-align:right">
						<div style="font-weight:800;color:var(--brand-bright)">
							{formatMoney(entry.earningsCents, entry.currency)}
						</div>
						<div class="muted" style="font-size:.85rem">{formatDistance(entry.distanceM)}</div>
					</div>
				</div>
			{/each}
		</div>

		<p class="muted" style="font-size:.8rem;margin-top:1rem">
			Ranked by money earned this month · earnings shown in each rider's own currency.
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
</style>
