<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Log in · CashPedal</title></svelte:head>

<div class="center-screen">
	<h1 class="brand-title">🚲 Cash<span class="leaf">Pedal</span></h1>
	<p class="muted" style="text-align:center;margin-top:0">Track your bike commute compensation</p>

	<div class="card" style="margin-top:1.5rem">
		<h2>Log in</h2>
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
			<input id="password" name="password" type="password" autocomplete="current-password" required />

			<button type="submit" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
		</form>
	</div>

	<p class="muted" style="text-align:center;margin-top:1rem">
		No account yet? <a href="/register">Sign up</a>
	</p>
</div>
