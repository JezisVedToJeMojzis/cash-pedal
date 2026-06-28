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

	<!-- Compensation settings -->
	<div class="card" style="margin-top:.75rem">
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
</style>
