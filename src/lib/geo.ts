import type { TrackPoint } from './server/db/schema';

const R = 6371000; // Earth radius in metres

/** Great-circle distance in metres between two [lat, lng] points. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}

/** Sum the distance of a recorded track in metres. */
export function trackDistance(track: TrackPoint[]): number {
	let total = 0;
	for (let i = 1; i < track.length; i++) {
		total += haversine(track[i - 1][0], track[i - 1][1], track[i][0], track[i][1]);
	}
	return total;
}
