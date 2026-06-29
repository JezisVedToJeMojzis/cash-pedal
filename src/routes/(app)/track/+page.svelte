<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { computeEarningsCents, formatDistance, formatMoney, formatRate } from '$lib/format';
	let { data, form } = $props();

	const user = $derived(page.data.user!);

	const routeLabel = (r: { startLabel: string; endLabel: string }) =>
		`${r.startLabel} ↔ ${r.endLabel}`;

	let selectedId = $state(0);
	$effect(() => {
		if (!data.routes.some((r) => r.id === selectedId)) selectedId = data.routes[0]?.id ?? 0;
	});
	const selected = $derived(data.routes.find((r) => r.id === selectedId));
	const perTrip = $derived(
		selected ? computeEarningsCents(selected.distanceM, user.rateCentsPerKm) : 0
	);

	const ymd = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const todayStr = ymd(new Date());

	let submitting = $state(false);
</script>

<svelte:head><title>Log a ride · CashPedal</title></svelte:head>

<div class="page">
	<h1>Log a ride</h1>

	{#if data.routes.length === 0}
		<div class="card" style="text-align:center">
			<p class="muted">Add a route (home, office, anywhere) to log rides with one tap.</p>
			<a class="btn" href="/profile" style="margin-top:.5rem">Add a route in Profile</a>
		</div>
	{:else}
		{#if form?.error}<p class="error">{form.error}</p>{/if}

		<form
			method="POST"
			action="?/log"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<label for="route">Route</label>
			<select id="route" name="routeId" bind:value={selectedId}>
				{#each data.routes as r}
					<option value={r.id}>{routeLabel(r)}</option>
				{/each}
			</select>

			{#if selected}
				<div class="card" style="margin:.3rem 0 1rem">
					<div class="endpoint">
						<span class="pin">🏠</span>
						<span class="addr"><strong>{selected.startLabel}</strong> · {selected.startAddress}</span>
					</div>
					<div class="endpoint">
						<span class="pin">🏢</span>
						<span class="addr"><strong>{selected.endLabel}</strong> · {selected.endAddress}</span>
					</div>
					<div class="commute-stats">
						<span><strong>{formatDistance(selected.distanceM)}</strong> each way</span>
						<span class="muted">·</span>
						<span style="color:var(--brand-bright);font-weight:700">{formatMoney(perTrip, user.currency)}</span>
						<span class="muted">/ trip · {formatRate(user.rateCentsPerKm, user.currency)}</span>
					</div>
				</div>

				<label for="date">Date</label>
				<input id="date" name="date" type="date" value={todayStr} max={todayStr} />

				<div class="ride-buttons">
					<button class="ride-btn" name="direction" value="forward" disabled={submitting}>
						<span class="ride-btn-main">🏠 {selected.startLabel} → 🏢 {selected.endLabel}</span>
						<span class="ride-btn-sub">Log {formatMoney(perTrip, user.currency)}</span>
					</button>
					<button class="ride-btn" name="direction" value="reverse" disabled={submitting}>
						<span class="ride-btn-main">🏢 {selected.endLabel} → 🏠 {selected.startLabel}</span>
						<span class="ride-btn-sub">Log {formatMoney(perTrip, user.currency)}</span>
					</button>
				</div>
			{/if}
		</form>

		<p class="muted" style="font-size:.8rem;margin-top:1rem;text-align:center">
			Pick a past date if you forgot to log a ride. Manage routes in <a href="/profile">Profile</a>.
		</p>
	{/if}
</div>

<style>
	.endpoint {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.3rem 0;
	}
	.endpoint .pin {
		font-size: 1.1rem;
		flex-shrink: 0;
	}
	.endpoint .addr {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.92rem;
	}
	.commute-stats {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border);
		font-size: 0.95rem;
	}
	.ride-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		margin-top: 0.5rem;
	}
	.ride-btn {
		flex-direction: column;
		gap: 0.15rem;
		padding: 1rem;
	}
	.ride-btn-main {
		font-size: 1.02rem;
		font-weight: 700;
	}
	.ride-btn-sub {
		font-size: 0.8rem;
		opacity: 0.9;
		font-weight: 500;
	}
</style>
