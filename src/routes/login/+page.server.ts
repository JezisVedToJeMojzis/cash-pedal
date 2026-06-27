import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSession, setSessionCookie, verifyPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/track');
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const name = String(form.get('name') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!name || !password) return fail(400, { name, error: 'Enter your name and password.' });

		const [user] = await db
			.select()
			.from(users)
			.where(sql`lower(${users.name}) = lower(${name})`)
			.limit(1);

		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			return fail(400, { name, error: 'Wrong name or password.' });
		}

		const session = await createSession(user.id);
		setSessionCookie(event, session.id, session.expiresAt);
		throw redirect(303, '/track');
	}
};
