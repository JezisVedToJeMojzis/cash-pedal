import { fail, redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, rides } from '$lib/server/db/schema';
import {
	clearSessionCookie,
	deleteSession,
	hashPassword,
	SESSION_COOKIE,
	verifyPassword
} from '$lib/server/auth';
import { resolveCompanyByName } from '$lib/server/companies';
import { resolveCommute } from '$lib/server/geocode';
import type { Actions, PageServerLoad } from './$types';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CZK', 'PLN', 'CHF', 'SEK', 'NOK', 'DKK'];

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const [agg] = await db
		.select({
			rides: sql<number>`count(*)::int`,
			distanceM: sql<number>`coalesce(sum(${rides.distanceM}), 0)`,
			earningsCents: sql<number>`coalesce(sum(${rides.earningsCents}), 0)::int`
		})
		.from(rides)
		.where(eq(rides.userId, user.id));

	return {
		currencies: CURRENCIES,
		totals: agg
	};
};

export const actions: Actions = {
	settings: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const currency = String(form.get('currency') ?? 'EUR').trim().toUpperCase();
		const rateMajor = parseFloat(String(form.get('rate') ?? '0').replace(',', '.'));

		if (!Number.isFinite(rateMajor) || rateMajor < 0) {
			return fail(400, { section: 'settings', error: 'Enter a valid rate (e.g. 0.25).' });
		}
		if (!CURRENCIES.includes(currency)) {
			return fail(400, { section: 'settings', error: 'Unsupported currency.' });
		}

		await db
			.update(users)
			.set({ currency, rateCentsPerKm: Math.round(rateMajor * 100) })
			.where(eq(users.id, user.id));

		return { section: 'settings', saved: true };
	},

	company: async ({ request, locals }) => {
		const user = locals.user!;
		const company = String((await request.formData()).get('company') ?? '').trim();
		// Empty input clears the company (resolveCompanyByName returns null).
		const companyId = await resolveCompanyByName(company);
		await db.update(users).set({ companyId }).where(eq(users.id, user.id));
		return { section: 'company', saved: true };
	},

	commute: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const home = String(form.get('homeAddress') ?? '').trim();
		const office = String(form.get('officeAddress') ?? '').trim();
		const overrideRaw = String(form.get('distanceKm') ?? '').trim();

		// Both empty clears the saved commute.
		if (!home && !office) {
			await db
				.update(users)
				.set({ homeAddress: null, officeAddress: null, commuteDistanceM: null })
				.where(eq(users.id, user.id));
			return { section: 'commute', saved: true, cleared: true };
		}
		if (!home || !office) {
			return fail(400, { section: 'commute', error: 'Enter both your home and office address.' });
		}

		// Manual distance override (e.g. taken from Google Maps): use it as-is,
		// no geocoding/routing needed.
		if (overrideRaw) {
			const km = parseFloat(overrideRaw.replace(',', '.'));
			if (!Number.isFinite(km) || km <= 0) {
				return fail(400, { section: 'commute', error: 'Enter a valid distance in km (e.g. 10.5).' });
			}
			await db
				.update(users)
				.set({ homeAddress: home, officeAddress: office, commuteDistanceM: km * 1000 })
				.where(eq(users.id, user.id));
			return { section: 'commute', saved: true, distanceM: km * 1000, manual: true };
		}

		// Otherwise auto-calculate the cycling route distance.
		const result = await resolveCommute(home, office);
		if ('error' in result) {
			const which = result.error === 'home' ? 'home' : 'office';
			return fail(400, {
				section: 'commute',
				error: `Couldn't find the ${which} address. Try adding the city and country.`
			});
		}

		await db
			.update(users)
			.set({ homeAddress: home, officeAddress: office, commuteDistanceM: result.distanceM })
			.where(eq(users.id, user.id));

		return {
			section: 'commute',
			saved: true,
			distanceM: result.distanceM,
			approximate: result.approximate
		};
	},

	account: async ({ request, locals }) => {
		const user = locals.user!;
		const name = String((await request.formData()).get('name') ?? '').trim();

		if (name.length < 2) return fail(400, { section: 'account', error: 'Name must be at least 2 characters.' });

		const [clash] = await db
			.select({ id: users.id })
			.from(users)
			.where(sql`lower(${users.name}) = lower(${name}) and ${users.id} <> ${user.id}`)
			.limit(1);
		if (clash) return fail(400, { section: 'account', error: 'That name is already taken.' });

		await db.update(users).set({ name }).where(eq(users.id, user.id));
		return { section: 'account', saved: true };
	},

	password: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');

		if (!(await verifyPassword(current, user.passwordHash))) {
			return fail(400, { section: 'password', error: 'Current password is incorrect.' });
		}
		if (next.length < 6) return fail(400, { section: 'password', error: 'New password must be at least 6 characters.' });

		await db
			.update(users)
			.set({ passwordHash: await hashPassword(next) })
			.where(eq(users.id, user.id));
		return { section: 'password', saved: true };
	},

	logout: async (event) => {
		const id = event.cookies.get(SESSION_COOKIE);
		if (id) await deleteSession(id);
		clearSessionCookie(event);
		throw redirect(303, '/login');
	}
};
