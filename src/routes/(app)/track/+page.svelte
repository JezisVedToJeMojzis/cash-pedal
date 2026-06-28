<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { computeEarningsCents, formatDistance, formatMoney, formatRate } from '$lib/format';
	let { form } = $props();

	const user = $derived(page.data.user!);
	const configured = $derived(
		!!user.homeAddress && !!user.officeAddress && user.commuteDistanceM != null
	);
	const perTrip = $derived(
		user.commuteDistanceM != null
			? computeEarningsCents(user.commuteDistanceM, user.rateCentsPerKm)
			: 0
	);

	const ymd = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const todayStr = ymd(new Date());

	let submitting = $state(false);
</script>

<svelte:head><title>Log a ride · CashPedal</title></svelte:head>

<div class="page">
	<h1>Log a ride</h1>

	{#if !configured}
		<div class="card" style="text-align:center">
			<p class="muted">Set your home and office addresses to log commutes with one tap.</p>
			<a class="btn" href="/profile" style="margin-top:.5rem">Set up in Profile</a>
		</div>
	{:else}
		{#if form?.error}<p class="error">{form.error}</p>{/if}

		<div class="card">
			<div class="endpoint"><span class="pin">🏠</span> <span class="addr">{user.homeAddress}</span></div>
			<div class="endpoint"><span class="pin">🏢</span> <span class="addr">{user.officeAddress}</span></div>
			<div class="commute-stats">
				<span><strong>{formatDistance(user.commuteDistanceM ?? 0)}</strong> each way</span>
				<span class="muted">·</span>
				<span style="color:var(--brand-bright);font-weight:700">{formatMoney(perTrip, user.currency)}</span>
				<span class="muted">/ trip · {formatRate(user.rateCentsPerKm, user.currency)}</span>
			</div>
		</div>

		<form
			method="POST"
			action="?/commute"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<label for="date" style="margin-top:1.25rem">Date</label>
			<input id="date" name="date" type="date" value={todayStr} max={todayStr} />

			<div class="ride-buttons">
				<button class="ride-btn" name="direction" value="to_office" disabled={submitting}>
					<span class="ride-btn-main">🚲 Home → Office</span>
					<span class="ride-btn-sub">Log {formatMoney(perTrip, user.currency)}</span>
				</button>
				<button class="ride-btn" name="direction" value="to_home" disabled={submitting}>
					<span class="ride-btn-main">🚲 Office → Home</span>
					<span class="ride-btn-sub">Log {formatMoney(perTrip, user.currency)}</span>
				</button>
			</div>
		</form>

		<p class="muted" style="font-size:.8rem;margin-top:1rem;text-align:center">
			Pick a past date if you forgot to log a ride. Manage addresses in
			<a href="/profile">Profile</a>.
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
		font-size: 1.05rem;
		font-weight: 700;
	}
	.ride-btn-sub {
		font-size: 0.8rem;
		opacity: 0.9;
		font-weight: 500;
	}
</style>
