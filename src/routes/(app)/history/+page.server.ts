import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { rides } from '$lib/server/db/schema';
import { monthKey } from '$lib/format';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const rows = await db
		.select({
			id: rides.id,
			startedAt: rides.startedAt,
			distanceM: rides.distanceM,
			durationS: rides.durationS,
			earningsCents: rides.earningsCents,
			startPoint: rides.startPoint,
			endPoint: rides.endPoint
		})
		.from(rides)
		.where(eq(rides.userId, user.id))
		.orderBy(desc(rides.startedAt));

	const currentKey = monthKey(new Date());

	// This month: each ride individually.
	const currentRides = rows.filter((r) => monthKey(new Date(r.startedAt)) === currentKey);

	// All months: combined totals per month (newest first), each keeping its
	// individual rides so a past month can be expanded to edit/delete a ride.
	type Row = (typeof rows)[number];
	const totals = new Map<
		string,
		{ key: string; distanceM: number; earningsCents: number; rideCount: number; rides: Row[] }
	>();
	for (const r of rows) {
		const key = monthKey(new Date(r.startedAt));
		let m = totals.get(key);
		if (!m) {
			m = { key, distanceM: 0, earningsCents: 0, rideCount: 0, rides: [] };
			totals.set(key, m);
		}
		m.distanceM += r.distanceM;
		m.earningsCents += r.earningsCents;
		m.rideCount += 1;
		m.rides.push(r);
	}

	return {
		currentKey,
		currentRides,
		monthly: [...totals.values()],
		currency: user.currency
	};
};

export const actions: Actions = {
	// Delete one of the user's own rides (e.g. logged by mistake).
	delete: async ({ request, locals }) => {
		const user = locals.user!;
		const id = Number((await request.formData()).get('id'));
		if (id) await db.delete(rides).where(and(eq(rides.id, id), eq(rides.userId, user.id)));
		return { deleted: true };
	}
};
