import { fail, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { rides, routes } from '$lib/server/db/schema';
import { computeEarningsCents } from '$lib/format';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const myRoutes = await db
		.select()
		.from(routes)
		.where(eq(routes.userId, user.id))
		.orderBy(asc(routes.createdAt));
	return { routes: myRoutes };
};

export const actions: Actions = {
	log: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const routeId = Number(form.get('routeId')) || 0;
		const direction = String(form.get('direction'));
		const dateStr = String(form.get('date') ?? '');

		const [route] = await db
			.select()
			.from(routes)
			.where(and(eq(routes.id, routeId), eq(routes.userId, user.id)))
			.limit(1);
		if (!route) return fail(400, { error: 'Pick a route.' });
		if (direction !== 'forward' && direction !== 'reverse') {
			return fail(400, { error: 'Pick a direction.' });
		}

		// Compare by calendar day (not timestamp) so logging *today* always works.
		const now = new Date();
		const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		const useDateStr = dateStr || todayStr;
		if (useDateStr > todayStr) return fail(400, { error: "The date can't be in the future." });
		const [y, m, d] = useDateStr.split('-').map(Number);
		if (!y || !m || !d) return fail(400, { error: 'Pick a valid date.' });
		const date = new Date(y, m - 1, d, 12, 0, 0);

		const forward = direction === 'forward';
		const startPoint = forward ? route.startLabel : route.endLabel;
		const endPoint = forward ? route.endLabel : route.startLabel;
		const distanceM = route.distanceM;

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
