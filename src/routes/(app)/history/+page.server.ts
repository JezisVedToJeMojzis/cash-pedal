import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { rides } from '$lib/server/db/schema';
import { computeEarningsCents, monthKey } from '$lib/format';
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
			manual: rides.manual
		})
		.from(rides)
		.where(eq(rides.userId, user.id))
		.orderBy(desc(rides.startedAt));

	const currentKey = monthKey(new Date());

	// This month: each ride individually.
	const currentRides = rows.filter((r) => monthKey(new Date(r.startedAt)) === currentKey);

	// All months: combined totals per month (newest first).
	const totals = new Map<string, { key: string; distanceM: number; earningsCents: number; rideCount: number }>();
	for (const r of rows) {
		const key = monthKey(new Date(r.startedAt));
		let m = totals.get(key);
		if (!m) {
			m = { key, distanceM: 0, earningsCents: 0, rideCount: 0 };
			totals.set(key, m);
		}
		m.distanceM += r.distanceM;
		m.earningsCents += r.earningsCents;
		m.rideCount += 1;
	}

	return {
		currentKey,
		currentRides,
		monthly: [...totals.values()],
		currency: user.currency
	};
};

export const actions: Actions = {
	// Delete one of the user's own rides (e.g. recorded by mistake).
	delete: async ({ request, locals }) => {
		const user = locals.user!;
		const id = Number((await request.formData()).get('id'));
		if (id) await db.delete(rides).where(and(eq(rides.id, id), eq(rides.userId, user.id)));
		return { deleted: true };
	},

	// Add a ride by hand (forgot to start tracking). Current month only.
	manual: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const km = parseFloat(String(form.get('distance') ?? '').replace(',', '.'));
		const dateStr = String(form.get('date') ?? '');

		if (!Number.isFinite(km) || km <= 0) {
			return fail(400, { manualError: 'Enter a distance greater than 0.' });
		}
		const [y, m, d] = dateStr.split('-').map(Number);
		if (!y || !m || !d) return fail(400, { manualError: 'Pick a valid date.' });
		// Noon local time avoids any timezone month/day drift.
		const date = new Date(y, m - 1, d, 12, 0, 0);
		if (Number.isNaN(date.getTime())) return fail(400, { manualError: 'Pick a valid date.' });
		if (monthKey(date) !== monthKey(new Date())) {
			return fail(400, { manualError: 'You can only add rides for the current month.' });
		}
		if (date.getTime() > Date.now()) {
			return fail(400, { manualError: "The date can't be in the future." });
		}

		const distanceM = km * 1000;
		await db.insert(rides).values({
			userId: user.id,
			startedAt: date,
			endedAt: date,
			distanceM,
			durationS: 0,
			rateCentsPerKm: user.rateCentsPerKm,
			earningsCents: computeEarningsCents(distanceM, user.rateCentsPerKm),
			track: [],
			manual: true
		});
		return { manualAdded: true };
	}
};
