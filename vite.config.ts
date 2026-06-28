import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			// Serve the manifest + service worker on the dev server too, so the app
			// is installable (standalone) when testing locally, not just in prod.
			devOptions: {
				enabled: true,
				type: 'module',
				suppressWarnings: true
			},
			manifest: {
				id: '/',
				name: 'CashPedal — Bike Commute Tracker',
				short_name: 'CashPedal',
				description: 'Track your bike commutes and the compensation you earn per kilometre.',
				theme_color: '#16a34a',
				background_color: '#0f172a',
				display: 'standalone',
				display_override: ['standalone'],
				orientation: 'portrait',
				start_url: '/',
				scope: '/',
				icons: [
					{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/icons/icon-512-maskable.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}']
			}
		})
	]
});
