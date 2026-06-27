<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';

	let { children } = $props();

	// @vite-pwa/sveltekit doesn't auto-inject these — wire them up manually.
	const webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : '';

	onMount(async () => {
		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true });
		}
	});
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html webManifestLink}
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
	<meta name="theme-color" content="#16a34a" />
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1"
	/>
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="CashPedal" />
</svelte:head>

{@render children()}
