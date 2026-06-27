import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { rides } from '$lib/server/db/schema';
import { monthKey } from '$lib/format';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const rows = await db
		.select({
			id: rides.id,
			startedAt: rides.startedAt,
			distanceM: rides.distanceM,
			durationS: rides.durationS,
			earningsCents: rides.earningsCents
		})
		.from(rides)
		.where(eq(rides.userId, user.id))
		.orderBy(desc(rides.startedAt));

	// Group rides by calendar month with running totals.
	const months = new Map<
		string,
		{ key: string; distanceM: number; earningsCents: number; rides: typeof rows }
	>();
	for (const r of rows) {
		const key = monthKey(new Date(r.startedAt));
		let m = months.get(key);
		if (!m) {
			m = { key, distanceM: 0, earningsCents: 0, rides: [] };
			months.set(key, m);
		}
		m.distanceM += r.distanceM;
		m.earningsCents += r.earningsCents;
		m.rides.push(r);
	}

	return {
		months: [...months.values()],
		totalRides: rows.length,
		currency: user.currency
	};
};
