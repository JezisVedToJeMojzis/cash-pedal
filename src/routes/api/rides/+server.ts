import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rides, type TrackPoint } from '$lib/server/db/schema';
import { trackDistance } from '$lib/geo';
import { computeEarningsCents } from '$lib/format';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Not logged in');

	const body = await request.json().catch(() => null);
	if (!body || !Array.isArray(body.track)) throw error(400, 'Invalid ride data');

	// Validate & sanitise the track to [lat, lng, t] number triples.
	const track: TrackPoint[] = [];
	for (const p of body.track) {
		if (
			Array.isArray(p) &&
			p.length >= 3 &&
			Number.isFinite(p[0]) &&
			Number.isFinite(p[1]) &&
			Math.abs(p[0]) <= 90 &&
			Math.abs(p[1]) <= 180
		) {
			track.push([p[0], p[1], Number(p[2]) || Date.now()]);
		}
	}

	const startedAt = body.startedAt ? new Date(body.startedAt) : new Date();
	const endedAt = body.endedAt ? new Date(body.endedAt) : new Date();
	const wallClockS = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
	// Prefer the client's measured active (un-paused) duration; clamp to wall-clock.
	const durationS =
		Number.isFinite(body.durationS) && body.durationS >= 0
			? Math.min(Math.round(body.durationS), wallClockS)
			: wallClockS;

	// Server is the source of truth for distance and earnings.
	const distanceM = trackDistance(track);
	const earningsCents = computeEarningsCents(distanceM, user.rateCentsPerKm);

	const [ride] = await db
		.insert(rides)
		.values({
			userId: user.id,
			startedAt,
			endedAt,
			distanceM,
			durationS,
			rateCentsPerKm: user.rateCentsPerKm,
			earningsCents,
			track
		})
		.returning({ id: rides.id });

	return json({ id: ride.id, distanceM, durationS, earningsCents });
};
