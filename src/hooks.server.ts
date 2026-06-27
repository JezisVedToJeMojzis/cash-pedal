import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(SESSION_COOKIE);
	event.locals.user = await validateSession(sessionId);
	return resolve(event);
};
