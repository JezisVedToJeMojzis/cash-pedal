import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { companies } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { user: null };
	const { id, name, companyId, rateCentsPerKm, currency, createdAt } = locals.user;

	let companyName: string | null = null;
	if (companyId) {
		const [c] = await db
			.select({ name: companies.name })
			.from(companies)
			.where(eq(companies.id, companyId))
			.limit(1);
		companyName = c?.name ?? null;
	}

	return {
		user: { id, name, companyId, companyName, rateCentsPerKm, currency, createdAt }
	};
};
