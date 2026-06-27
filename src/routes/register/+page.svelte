<script lang="ts">
	import { enhance } from '$app/forms';
	import CompanyInput from '$lib/components/CompanyInput.svelte';
	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Sign up · CashPedal</title></svelte:head>

<div class="center-screen">
	<h1 class="brand-title">🚲 Cash<span class="leaf">Pedal</span></h1>
	<p class="muted" style="text-align:center;margin-top:0">Track your bike commute compensation</p>

	<div class="card" style="margin-top:1.5rem">
		<h2>Create account</h2>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
		>
			<label for="name">Name</label>
			<input id="name" name="name" autocomplete="username" value={form?.name ?? ''} required />

			<label for="password">Password</label>
			<input id="password" name="password" type="password" autocomplete="new-password" required />

			<label for="company">Company (optional)</label>
			<CompanyInput value={form?.company ?? ''} placeholder="Start typing — pick if it exists" />

			<button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Sign up'}</button>
		</form>
	</div>

	<p class="muted" style="text-align:center;margin-top:1rem">
		Already have an account? <a href="/login">Log in</a>
	</p>
</div>
