<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	const tabs = [
		{
			href: '/track',
			label: 'Ride',
			icon: `<path d="M5.5 18.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.5 15h6l3.5-6h3M9 9h4l3 6"/><circle cx="12" cy="5" r="1.4"/>`
		},
		{
			href: '/history',
			label: 'History',
			icon: `<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/><path d="M12 8v4l3 2"/>`
		},
		{
			href: '/leaderboard',
			label: 'Board',
			icon: `<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/>`
		},
		{
			href: '/friends',
			label: 'Friends',
			icon: `<circle cx="9" cy="8" r="3"/><path d="M4 20a5 5 0 0 1 10 0M16 6a3 3 0 0 1 0 6M20 20a5 5 0 0 0-4-4.9"/>`
		},
		{
			href: '/profile',
			label: 'Profile',
			icon: `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`
		}
	];

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

{@render children()}

<nav class="bottom-nav">
	{#each tabs as tab}
		<a href={tab.href} class:active={isActive(tab.href)} aria-label={tab.label}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
				stroke-linecap="round" stroke-linejoin="round">
				{@html tab.icon}
			</svg>
			<span>{tab.label}</span>
		</a>
	{/each}
</nav>
