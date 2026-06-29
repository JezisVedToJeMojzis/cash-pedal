<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import CompanyInput from '$lib/components/CompanyInput.svelte';
	import { formatMoney, formatDistance } from '$lib/format';
	let { data, form } = $props();

	const user = $derived(page.data.user!);
	const rateMajor = $derived((user.rateCentsPerKm / 100).toFixed(2));
	const memberSince = $derived(
		new Date(user.createdAt).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	);
	function msg(section: string) {
		return form?.section === section ? form : null;
	}

	let tab = $state<'ride' | 'account'>('ride');
	// Keep the right tab open when an action returns a message.
	$effect(() => {
		const s = form?.section;
		if (s === 'settings' || s === 'route') tab = 'ride';
		else if (s === 'company' || s === 'account' || s === 'password') tab = 'account';
	});

	// Route add/edit form state.
	const shortAddr = (a: string) => a.split(',')[0].trim();
	const routeLabel = (r: { startLabel: string; endLabel: string }) =>
		`${r.startLabel} ↔ ${r.endLabel}`;

	let routeLoading = $state(false);
	let routeFormOpen = $state(false);
	let fId = $state(0);
	let fStartLabel = $state('Home');
	let fEndLabel = $state('Office');
	let fStart = $state('');
	let fEnd = $state('');
	function openAddRoute() {
		fId = 0;
		fStartLabel = 'Home';
		fEndLabel = 'Office';
		fStart = '';
		fEnd = '';
		routeFormOpen = true;
	}
	function openEditRoute(r: {
		id: number;
		startLabel: string;
		endLabel: string;
		startAddress: string;
		endAddress: string;
	}) {
		fId = r.id;
		fStartLabel = r.startLabel;
		fEndLabel = r.endLabel;
		fStart = r.startAddress;
		fEnd = r.endAddress;
		routeFormOpen = true;
	}
</script>

<svelte:head><title>Profile · CashPedal</title></svelte:head>

<div class="page">
	<h1>Profile</h1>

	<div class="card">
		<div style="display:flex;align-items:center;gap:.9rem">
			<div class="avatar">{user.name.charAt(0).toUpperCase()}</div>
			<div>
				<div style="font-size:1.25rem;font-weight:700">{user.name}</div>
				<div class="muted" style="font-size:.85rem">
					{user.companyName ? `🏢 ${user.companyName}` : 'No company set'}
				</div>
				<div class="muted" style="font-size:.8rem">Account created {memberSince}</div>
			</div>
		</div>

		<div class="stat-grid" style="margin-top:1rem">
			<div class="stat">
				<div class="value">{data.totals.rides}</div>
				<div class="label">Rides</div>
			</div>
			<div class="stat">
				<div class="value">{formatDistance(data.totals.distanceM)}</div>
				<div class="label">Total distance</div>
			</div>
		</div>
		<div class="stat" style="margin-top:.75rem">
			<div class="value" style="color:var(--brand-bright)">
				{formatMoney(data.totals.earningsCents, user.currency)}
			</div>
			<div class="label">Earned all-time</div>
		</div>
	</div>

	<!-- Tabs: Ride vs Account settings -->
	<div class="btn-row" style="margin:1rem 0">
		<button class:btn-ghost={tab !== 'ride'} onclick={() => (tab = 'ride')}>Ride settings</button>
		<button class:btn-ghost={tab !== 'account'} onclick={() => (tab = 'account')}>Account</button>
	</div>

	{#if tab === 'ride'}
	<!-- Compensation settings -->
	<div class="card">
		<h2>Compensation</h2>
		{#if msg('settings')?.error}<p class="error">{msg('settings')!.error}</p>{/if}
		{#if msg('settings')?.saved}<p class="success">✓ Saved</p>{/if}
		<form method="POST" action="?/settings" use:enhance>
			<label for="rate">Rate ({user.currency} per km)</label>
			<input id="rate" name="rate" type="number" step="0.01" min="0" value={rateMajor} inputmode="decimal" />

			<label for="currency">Currency</label>
			<select id="currency" name="currency" value={user.currency}>
				{#each data.currencies as c}
					<option value={c} selected={c === user.currency}>{c}</option>
				{/each}
			</select>

			<button type="submit">Save</button>
		</form>
	</div>

	<!-- Routes -->
	<div class="card">
		<h2>Routes</h2>
		<p class="muted" style="font-size:.82rem;margin:-.3rem 0 .8rem">
			Add the trips you cycle (home↔office, partner's place, …) so you can log them with one tap. We
			work out the cycling distance, or set your own.
		</p>

		{#if msg('route')?.error}<p class="error">{msg('route')!.error}</p>{/if}
		{#if msg('route')?.saved}<p class="success">✓ Route saved — {formatDistance(msg('route')!.distanceM ?? 0)}{msg('route')!.approximate ? ' (approx.)' : ''}</p>{/if}

		{#if data.routes.length === 0}
			<p class="muted">No routes yet.</p>
		{:else}
			{#each data.routes as r}
				<div class="route-row">
					<div style="flex:1;min-width:0">
						<div style="font-weight:600">🏠 {r.startLabel} → 🏢 {r.endLabel}</div>
						<div class="muted" style="font-size:.78rem">
							{shortAddr(r.startAddress)} → {shortAddr(r.endAddress)} · {formatDistance(r.distanceM)}
						</div>
					</div>
					<button type="button" class="mini-btn btn-ghost" onclick={() => openEditRoute(r)}>Edit</button>
					<form method="POST" action="?/deleteRoute" use:enhance>
						<input type="hidden" name="routeId" value={r.id} />
						<button type="submit" class="mini-btn btn-ghost">Delete</button>
					</form>
				</div>
			{/each}
		{/if}

		{#if routeFormOpen}
			<form
				method="POST"
				action="?/route"
				style="margin-top:1rem;border-top:1px solid var(--border);padding-top:1rem"
				use:enhance={() => {
					routeLoading = true;
					return async ({ result, update }) => {
						await update();
						routeLoading = false;
						if (result.type === 'success') routeFormOpen = false;
					};
				}}
			>
				<input type="hidden" name="routeId" value={fId} />
				<label for="rslabel">🏠 Start name</label>
				<input id="rslabel" name="startLabel" value={fStartLabel} placeholder="Home" autocomplete="off" />
				<label for="rstart">Start address</label>
				<input id="rstart" name="startAddress" value={fStart} placeholder="Street, city, country" autocomplete="off" />
				<label for="relabel">🏢 Office name</label>
				<input id="relabel" name="endLabel" value={fEndLabel} placeholder="Office" autocomplete="off" />
				<label for="rend">Office address</label>
				<input id="rend" name="endAddress" value={fEnd} placeholder="Street, city, country" autocomplete="off" />
				<label for="rdist">Distance override (km) — optional</label>
				<input id="rdist" name="distanceKm" type="number" step="0.01" min="0" inputmode="decimal" placeholder="Leave blank to auto-calc the bike route" />
				<p class="muted" style="font-size:.8rem;margin:-.4rem 0 .9rem">
					Set this to use your own figure (e.g. from Google Maps).
				</p>
				<div class="btn-row">
					<button type="button" class="btn-ghost" onclick={() => (routeFormOpen = false)}>Cancel</button>
					<button type="submit" disabled={routeLoading}>{routeLoading ? 'Finding route…' : 'Save route'}</button>
				</div>
			</form>
		{:else}
			<button class="btn-ghost" style="margin-top:.75rem" onclick={openAddRoute}>+ Add a route</button>
		{/if}
	</div>
	{:else}
	<!-- Company -->
	<div class="card">
		<h2>Company</h2>
		{#if msg('company')?.error}<p class="error">{msg('company')!.error}</p>{/if}
		{#if msg('company')?.saved}<p class="success">✓ Company updated</p>{/if}
		<form method="POST" action="?/company" use:enhance>
			<label for="company">Your company</label>
			<CompanyInput value={user.companyName ?? ''} placeholder="Start typing — pick if it exists" />
			<p class="muted" style="font-size:.8rem;margin:-.4rem 0 .9rem">
				Leave empty to remove. Determines your company leaderboard.
			</p>
			<button type="submit">Save company</button>
		</form>
	</div>

	<!-- Account: change username -->
	<div class="card">
		<h2>Change username</h2>
		{#if msg('account')?.error}<p class="error">{msg('account')!.error}</p>{/if}
		{#if msg('account')?.saved}<p class="success">✓ Username updated</p>{/if}
		<form method="POST" action="?/account" use:enhance>
			<label for="newname">New username</label>
			<input id="newname" name="name" value={user.name} autocomplete="username" />
			<button type="submit">Update username</button>
		</form>
	</div>

	<!-- Account: change password -->
	<div class="card">
		<h2>Change password</h2>
		{#if msg('password')?.error}<p class="error">{msg('password')!.error}</p>{/if}
		{#if msg('password')?.saved}<p class="success">✓ Password updated</p>{/if}
		<form method="POST" action="?/password" use:enhance>
			<label for="current">Current password</label>
			<input id="current" name="current" type="password" autocomplete="current-password" />
			<label for="next">New password</label>
			<input id="next" name="next" type="password" autocomplete="new-password" />
			<button type="submit">Update password</button>
		</form>
	</div>

		<form method="POST" action="?/logout" use:enhance style="margin-top:.75rem">
			<button class="btn-ghost" type="submit">Log out</button>
		</form>
	{/if}
</div>

<style>
	.avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--brand);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 800;
		flex-shrink: 0;
	}
	.route-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--border);
	}
	.route-row:last-of-type {
		border-bottom: none;
	}
	.mini-btn {
		width: auto;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
		flex-shrink: 0;
	}
</style>
