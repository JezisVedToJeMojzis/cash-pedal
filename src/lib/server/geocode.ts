import { haversine } from '$lib/geo';

const UA = 'CashPedal/1.0 (bike commute compensation tracker)';

export interface GeoPoint {
	lat: number;
	lng: number;
	label: string;
}

/** Geocode a free-text address to coordinates via OpenStreetMap Nominatim. */
export async function geocode(address: string): Promise<GeoPoint | null> {
	const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
	try {
		const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
		if (!res.ok) return null;
		const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
		const r = data?.[0];
		if (!r) return null;
		const lat = parseFloat(r.lat);
		const lng = parseFloat(r.lon);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
		return { lat, lng, label: r.display_name };
	} catch {
		return null;
	}
}

/**
 * Cycling route distance (metres) between two points via BRouter (free, no key,
 * bike-aware). Returns null if the routing service can't be reached/parsed.
 */
export async function bikeRouteDistanceM(a: GeoPoint, b: GeoPoint): Promise<number | null> {
	const url = `https://brouter.de/brouter?lonlats=${a.lng},${a.lat}|${b.lng},${b.lat}&profile=trekking&alternativeidx=0&format=geojson`;
	try {
		const res = await fetch(url, { headers: { 'User-Agent': UA } });
		if (!res.ok) return null;
		const data = (await res.json()) as {
			features?: Array<{ properties?: Record<string, string> }>;
		};
		const len = data?.features?.[0]?.properties?.['track-length'];
		const m = parseFloat(String(len));
		return Number.isFinite(m) && m > 0 ? m : null;
	} catch {
		return null;
	}
}

export interface CommuteResult {
	home: GeoPoint;
	office: GeoPoint;
	distanceM: number;
	/** True when we fell back to straight-line distance (routing unavailable). */
	approximate: boolean;
}

/**
 * Geocode both addresses and compute the cycling distance between them. Falls
 * back to straight-line distance if the routing service is unavailable.
 * Returns a string error code if either address can't be geocoded.
 */
export async function resolveCommute(
	homeAddress: string,
	officeAddress: string
): Promise<CommuteResult | { error: 'home' | 'office' }> {
	const home = await geocode(homeAddress);
	if (!home) return { error: 'home' };
	const office = await geocode(officeAddress);
	if (!office) return { error: 'office' };

	const routed = await bikeRouteDistanceM(home, office);
	const distanceM = routed ?? haversine(home.lat, home.lng, office.lat, office.lng);
	return { home, office, distanceM, approximate: routed === null };
}
