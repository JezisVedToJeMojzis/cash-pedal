import { json } from '@sveltejs/kit';
import { searchCompanies } from '$lib/server/companies';
import type { RequestHandler } from './$types';

// Public: returns company-name suggestions so the type-ahead works on the
// registration page (before a session exists) as well as in the profile.
export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const names = await searchCompanies(q);
	return json(names);
};
