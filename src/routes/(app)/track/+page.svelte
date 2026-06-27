<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { haversine } from '$lib/geo';
	import {
		computeEarningsCents,
		formatMoney,
		formatDistance,
		formatDuration,
		formatSpeed,
		formatRate
	} from '$lib/format';
	import type { TrackPoint } from '$lib/server/db/schema';

	const user = $derived(page.data.user!);

	type Status = 'idle' | 'tracking' | 'paused' | 'saving';
	let status = $state<Status>('idle');
	let distanceM = $state(0);
	let elapsedS = $state(0);
	let error = $state('');
	let gpsReady = $state(false);
	let collapsed = $state(false); // minimise the stats panel to see more of the map
	const activeRide = $derived(status === 'tracking' || status === 'paused');

	let track: TrackPoint[] = [];
	let startedAt = 0;
	// Active (un-paused) time accounting.
	let activeMs = 0; // accumulated time from completed segments
	let segmentStart = 0; // when the current active segment began
	let resuming = false; // skip distance on the first fix after a resume
	let watchId: number | null = null;
	let timer: ReturnType<typeof setInterval> | null = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let wakeLock: any = null;

	const earningsCents = $derived(computeEarningsCents(distanceM, user.rateCentsPerKm));

	// --- Leaflet (loaded client-side only) ---
	let mapEl: HTMLDivElement;
	let map: import('leaflet').Map | null = null;
	let L: typeof import('leaflet') | null = null;
	let line: import('leaflet').Polyline | null = null;
	let marker: import('leaflet').CircleMarker | null = null;

	onMount(async () => {
		const leaflet = await import('leaflet');
		await import('leaflet/dist/leaflet.css');
		L = leaflet.default ?? leaflet;
		map = L.map(mapEl, { zoomControl: false, attributionControl: false }).setView([48.2, 16.37], 13);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
		// Centre on the user's current position if we can get one cheaply.
		navigator.geolocation?.getCurrentPosition(
			(pos) => map?.setView([pos.coords.latitude, pos.coords.longitude], 16),
			() => {},
			{ enableHighAccuracy: false, timeout: 8000 }
		);
	});

	onDestroy(() => stopWatching());

	function onPosition(pos: GeolocationPosition) {
		gpsReady = true;
		const { latitude: lat, longitude: lng, accuracy } = pos.coords;
		if (accuracy > 50) return; // too noisy, skip
		// First fix after a resume: re-anchor here without counting the gap.
		if (resuming) {
			resuming = false;
			track.push([lat, lng, Date.now()]);
			drawRoute(lat, lng);
			return;
		}
		const last = track[track.length - 1];
		if (last) {
			const step = haversine(last[0], last[1], lat, lng);
			if (step < 4) return; // jitter while ~stationary
			distanceM += step;
		}
		track.push([lat, lng, Date.now()]);
		drawRoute(lat, lng);
	}

	function drawRoute(lat: number, lng: number) {
		if (!L || !map) return;
		const latlngs = track.map((p) => [p[0], p[1]] as [number, number]);
		if (!line) {
			line = L.polyline(latlngs, { color: '#22c55e', weight: 6, opacity: 0.9 }).addTo(map);
		} else {
			line.setLatLngs(latlngs);
		}
		if (!marker) {
			marker = L.circleMarker([lat, lng], {
				radius: 8,
				color: '#fff',
				weight: 3,
				fillColor: '#16a34a',
				fillOpacity: 1
			}).addTo(map);
		} else {
			marker.setLatLng([lat, lng]);
		}
		map.setView([lat, lng], Math.max(map.getZoom(), 16));
	}

	async function acquireWakeLock() {
		try {
			wakeLock = await navigator.wakeLock?.request('screen');
		} catch {
			/* ignore */
		}
	}

	function startWatch() {
		watchId = navigator.geolocation.watchPosition(
			onPosition,
			(err) => {
				error =
					err.code === err.PERMISSION_DENIED
						? 'Location permission denied. Enable it to track your ride.'
						: 'Could not get your location. Make sure GPS is on.';
			},
			{ enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
		);
		timer = setInterval(() => {
			elapsedS = Math.round((activeMs + (Date.now() - segmentStart)) / 1000);
		}, 1000);
	}

	async function start() {
		error = '';
		if (!navigator.geolocation) {
			error = 'Geolocation is not available on this device.';
			return;
		}
		track = [];
		distanceM = 0;
		elapsedS = 0;
		activeMs = 0;
		collapsed = true; // start minimised so the map stays the focus
		startedAt = Date.now();
		segmentStart = Date.now();
		resuming = false;
		status = 'tracking';
		await acquireWakeLock();
		startWatch();
	}

	function pause() {
		// Bank the time spent in this segment, then stop sensors/timer.
		activeMs += Date.now() - segmentStart;
		elapsedS = Math.round(activeMs / 1000);
		stopWatching();
		status = 'paused';
	}

	async function resume() {
		segmentStart = Date.now();
		resuming = true; // don't count the gap travelled while paused
		status = 'tracking';
		await acquireWakeLock();
		startWatch();
	}

	function stopWatching() {
		if (watchId !== null) navigator.geolocation.clearWatch(watchId);
		watchId = null;
		if (timer) clearInterval(timer);
		timer = null;
		wakeLock?.release().catch(() => {});
		wakeLock = null;
	}

	async function stop() {
		// Guard against an accidental tap ending the ride.
		if (!confirm('Finish and save this ride?')) return;
		// Finalize active time if we're stopping mid-segment (not from a pause).
		if (status === 'tracking') activeMs += Date.now() - segmentStart;
		stopWatching();
		status = 'saving';
		try {
			const res = await fetch('/api/rides', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					startedAt: new Date(startedAt).toISOString(),
					endedAt: new Date().toISOString(),
					durationS: Math.round(activeMs / 1000),
					track
				})
			});
			if (!res.ok) throw new Error(await res.text());
			const ride = await res.json();
			await goto(`/history?saved=${ride.id}`);
		} catch (e) {
			error = 'Could not save the ride. ' + (e instanceof Error ? e.message : '');
			status = 'idle';
		}
	}

	function cancel() {
		stopWatching();
		status = 'idle';
		distanceM = 0;
		elapsedS = 0;
		activeMs = 0;
		resuming = false;
		track = [];
		if (line) {
			line.remove();
			line = null;
		}
		if (marker) {
			marker.remove();
			marker = null;
		}
	}
</script>

<svelte:head><title>Ride · CashPedal</title></svelte:head>

{#snippet pauseIcon()}
	<svg class="ctrl-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<rect x="6" y="5" width="4" height="14" rx="1.5" />
		<rect x="14" y="5" width="4" height="14" rx="1.5" />
	</svg>
{/snippet}
{#snippet playIcon()}
	<svg class="ctrl-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.7-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2Z" />
	</svg>
{/snippet}
{#snippet stopIcon()}
	<svg class="ctrl-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<rect x="6" y="6" width="12" height="12" rx="2.5" />
	</svg>
{/snippet}

<div class="track-wrap">
	<div class="map" bind:this={mapEl}></div>

	<div class="overlay">
		{#if error}<p class="error" style="background:var(--bg-card);padding:.6rem;border-radius:10px">{error}</p>{/if}

		<div class="card hud" class:collapsed>
			{#if activeRide}
				<button
					class="hud-toggle"
					onclick={() => (collapsed = !collapsed)}
					aria-label={collapsed ? 'Expand stats' : 'Minimise stats'}
					title={collapsed ? 'Expand stats' : 'Minimise to see the map'}
				>
					<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
						stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
						style="transform: rotate({collapsed ? 0 : 180}deg); transition: transform .2s">
						<path d="M6 15l6-6 6 6" />
					</svg>
				</button>
			{/if}

			{#if collapsed && activeRide}
				<!-- Minimised: one compact row + controls, map stays visible -->
				<div class="hud-compact">
					<div class="hud-compact-stats">
						<span
							class="rec-dot"
							class:paused={status === 'paused'}
							class:searching={status === 'tracking' && !gpsReady}
							title={status === 'paused' ? 'Paused' : gpsReady ? 'Recording' : 'Acquiring GPS…'}
						></span>
						<strong>{formatDistance(distanceM)}</strong>
						<span class="muted">{formatDuration(elapsedS)}</span>
						<strong style="color:var(--brand-bright)">{formatMoney(earningsCents, user.currency)}</strong>
						{#if status === 'paused'}<span class="badge" style="color:var(--gold)">Paused</span>{/if}
					</div>
					<div class="hud-compact-actions">
						{#if status === 'tracking'}
							<button class="btn-ghost icon-btn" onclick={pause} aria-label="Pause">
								{@render pauseIcon()}
							</button>
						{:else}
							<button class="icon-btn" onclick={resume} aria-label="Resume">
								{@render playIcon()}
							</button>
						{/if}
						<button class="btn-danger icon-btn" onclick={stop} aria-label="Finish">
							{@render stopIcon()}
						</button>
					</div>
				</div>
			{:else}
				<!-- Maximised: full stats -->
				<div class="big-number">{formatMoney(earningsCents, user.currency)}</div>
				<div class="muted" style="margin-top:.2rem">earned · {formatRate(user.rateCentsPerKm, user.currency)}</div>

				<div class="stat-grid" style="margin-top:.9rem">
					<div class="stat">
						<div class="value">{formatDistance(distanceM)}</div>
						<div class="label">Distance</div>
					</div>
					<div class="stat">
						<div class="value">{formatDuration(elapsedS)}</div>
						<div class="label">Time</div>
					</div>
					<div class="stat">
						<div class="value">{formatSpeed(distanceM, elapsedS)}</div>
						<div class="label">Avg speed</div>
					</div>
					<div class="stat">
						<div
							class="value"
							style="color:{status === 'paused'
								? 'var(--gold)'
								: gpsReady
									? 'var(--brand-bright)'
									: 'var(--text-muted)'}"
						>
							{status === 'paused'
								? 'Paused'
								: status === 'idle'
									? '—'
									: gpsReady
										? 'GPS ✓'
										: 'GPS…'}
						</div>
						<div class="label">{status === 'paused' ? 'Status' : 'Signal'}</div>
					</div>
				</div>

				{#if status === 'idle'}
					<button onclick={start} style="margin-top:.9rem">{@render playIcon()} Start ride</button>
					{#if user.rateCentsPerKm === 0}
						<p class="muted" style="text-align:center;margin:.6rem 0 0;font-size:.8rem">
							Tip: set your €/km rate in <a href="/profile">Profile</a> to track earnings.
						</p>
					{/if}
				{:else if status === 'tracking'}
					<div class="btn-row" style="margin-top:.9rem">
						<button class="btn-ghost" onclick={pause}>{@render pauseIcon()} Pause</button>
						<button class="btn-danger" onclick={stop}>{@render stopIcon()} Finish</button>
					</div>
					<button class="btn-text" onclick={cancel}>Discard ride</button>
				{:else if status === 'paused'}
					<div class="btn-row" style="margin-top:.9rem">
						<button onclick={resume}>{@render playIcon()} Resume</button>
						<button class="btn-danger" onclick={stop}>{@render stopIcon()} Finish</button>
					</div>
					<button class="btn-text" onclick={cancel}>Discard ride</button>
				{:else}
					<button disabled style="margin-top:.9rem">Saving…</button>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.track-wrap {
		position: fixed;
		inset: 0;
		bottom: calc(var(--nav-h) + var(--safe-bottom));
	}
	.map {
		position: absolute;
		inset: 0;
		background: var(--bg-soft);
		z-index: 0;
	}
	.overlay {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 0.75rem;
		z-index: 500;
	}
	.hud {
		max-width: 560px;
		margin: 0 auto;
		text-align: center;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
		transition: padding 0.15s ease;
	}
	.hud.collapsed {
		padding: 0.55rem 0.85rem 0.7rem;
	}
	/* Minimise/maximise handle */
	.hud-toggle {
		width: 100%;
		height: auto;
		background: transparent;
		border: none;
		padding: 0 0 0.25rem;
		margin: -0.35rem 0 0;
		color: var(--text-muted);
	}
	.hud-toggle:hover {
		filter: none;
		color: var(--text);
	}
	/* Compact (minimised) layout */
	.hud-compact {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
	}
	.hud-compact-stats {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		flex-wrap: wrap;
		text-align: left;
		font-size: 1.05rem;
		font-variant-numeric: tabular-nums;
	}
	/* Live recording indicator shown while minimised */
	.rec-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--brand-bright);
		flex-shrink: 0;
		animation: rec-pulse 1.4s ease-in-out infinite;
	}
	.rec-dot.searching {
		background: var(--text-muted);
		animation: none;
	}
	.rec-dot.paused {
		background: var(--gold);
		animation: none;
	}
	@keyframes rec-pulse {
		0%,
		100% {
			opacity: 1;
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
		}
		50% {
			opacity: 0.6;
			box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
		}
	}
	.hud-compact-actions {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}
	.icon-btn {
		width: auto;
		padding: 0.5rem 0.9rem;
	}
	.ctrl-icon {
		width: 18px;
		height: 18px;
		display: block;
		flex-shrink: 0;
	}
	.icon-btn .ctrl-icon {
		width: 20px;
		height: 20px;
	}
	.btn-text {
		margin-top: 0.5rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 0.85rem;
	}
	.btn-text:hover {
		filter: none;
		color: var(--danger);
	}
	:global(.leaflet-container) {
		font-family: inherit;
	}
</style>
