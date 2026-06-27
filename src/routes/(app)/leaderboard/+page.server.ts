import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { companies, users } from '$lib/server/db/schema';
import { getAcceptedFriendIds } from '$lib/server/friends';
import { getLeaderboard, monthWindow } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.user!;
	const { start, end, key } = monthWindow(url.searchParams.get('month'));

	// Friends scope: me + accepted friends.
	const friendIds = await getAcceptedFriendIds(me.id);
	const friends = await getLeaderboard([me.id, ...friendIds], start, end);

	// Company scope: everyone sharing my company.
	let company = null;
	let companyName: string | null = null;
	if (me.companyId) {
		const [c] = await db
			.select({ name: companies.name })
			.from(companies)
			.where(eq(companies.id, me.companyId))
			.limit(1);
		companyName = c?.name ?? null;

		const colleagues = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.companyId, me.companyId));
		company = await getLeaderboard(
			colleagues.map((u) => u.id),
			start,
			end
		);
	}

	return { month: key, meId: me.id, friends, company, companyName };
};
