import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rides } from '$lib/server/db/schema';
import { computeEarningsCents } from '$lib/format';
import type { Actions } from './$types';

export const actions: Actions = {
	commute: async ({ request, locals }) => {
		const user = locals.user!;
		if (!user.homeAddress || !user.officeAddress || user.commuteDistanceM == null) {
			return fail(400, { error: 'Set your home and office addresses in Profile first.' });
		}

		const form = await request.formData();
		const direction = String(form.get('direction'));
		if (direction !== 'to_office' && direction !== 'to_home') {
			return fail(400, { error: 'Pick a direction.' });
		}

		// Date (defaults to today); never in the future.
		const dateStr = String(form.get('date') ?? '');
		let date = new Date();
		if (dateStr) {
			const [y, m, d] = dateStr.split('-').map(Number);
			if (y && m && d) date = new Date(y, m - 1, d, 12, 0, 0);
		}
		if (date.getTime() > Date.now()) {
			return fail(400, { error: "The date can't be in the future." });
		}

		const toOffice = direction === 'to_office';
		const startPoint = toOffice ? user.homeAddress : user.officeAddress;
		const endPoint = toOffice ? user.officeAddress : user.homeAddress;
		const distanceM = user.commuteDistanceM;

		await db.insert(rides).values({
			userId: user.id,
			startedAt: date,
			endedAt: date,
			distanceM,
			durationS: 0,
			rateCentsPerKm: user.rateCentsPerKm,
			earningsCents: computeEarningsCents(distanceM, user.rateCentsPerKm),
			track: [],
			startPoint,
			endPoint
		});

		throw redirect(303, '/history?saved=1');
	}
};
