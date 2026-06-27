import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import {
	createSession,
	hashPassword,
	setSessionCookie
} from '$lib/server/auth';
import { resolveCompanyByName } from '$lib/server/companies';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/track');
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const company = String(form.get('company') ?? '').trim();

		if (name.length < 2) return fail(400, { name, company, error: 'Name must be at least 2 characters.' });
		if (password.length < 6) return fail(400, { name, company, error: 'Password must be at least 6 characters.' });

		// Case-insensitive uniqueness check.
		const existing = await db
			.select({ id: users.id })
			.from(users)
			.where(sql`lower(${users.name}) = lower(${name})`)
			.limit(1);
		if (existing.length) return fail(400, { name, company, error: 'That name is already taken.' });

		const passwordHash = await hashPassword(password);
		const companyId = await resolveCompanyByName(company);
		const [user] = await db
			.insert(users)
			.values({ name, passwordHash, companyId })
			.returning({ id: users.id });

		const session = await createSession(user.id);
		setSessionCookie(event, session.id, session.expiresAt);
		throw redirect(303, '/track');
	}
};
