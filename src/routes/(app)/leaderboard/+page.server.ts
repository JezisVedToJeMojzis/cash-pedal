import { fail } from '@sveltejs/kit';
import { and, eq, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { companies, friendships, users } from '$lib/server/db/schema';
import { getAcceptedFriendIds } from '$lib/server/friends';
import { getLeaderboard, monthWindow } from '$lib/server/stats';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.user!;
	const { start, end, key } = monthWindow(url.searchParams.get('month'));

	// Friends scope: me + accepted friends.
	const friendIds = await getAcceptedFriendIds(me.id);
	const friends = await getLeaderboard([me.id, ...friendIds], start, end);

	// Company scope: everyone sharing my company, annotated with my relationship
	// to them so the board can offer an "Add friend" button.
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
		const board = await getLeaderboard(
			colleagues.map((u) => u.id),
			start,
			end
		);

		// Pending requests in either direction.
		const pending = await db
			.select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
			.from(friendships)
			.where(
				and(
					eq(friendships.status, 'pending'),
					or(eq(friendships.requesterId, me.id), eq(friendships.addresseeId, me.id))
				)
			);
		const pendingIds = new Set(pending.map((p) => (p.requesterId === me.id ? p.addresseeId : p.requesterId)));
		const friendSet = new Set(friendIds);

		company = board.map((e) => ({
			...e,
			relation:
				e.userId === me.id
					? 'self'
					: friendSet.has(e.userId)
						? 'friend'
						: pendingIds.has(e.userId)
							? 'pending'
							: 'none'
		}));
	}

	return { month: key, meId: me.id, friends, company, companyName };
};

export const actions: Actions = {
	// Add a colleague (by id) as a friend, straight from the company board.
	add: async ({ request, locals }) => {
		const me = locals.user!;
		const targetId = Number((await request.formData()).get('userId'));
		if (!targetId || targetId === me.id) return fail(400, { error: 'Invalid user.' });

		const [target] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, targetId))
			.limit(1);
		if (!target) return fail(404, { error: 'User not found.' });

		const [existing] = await db
			.select({ id: friendships.id })
			.from(friendships)
			.where(
				or(
					and(eq(friendships.requesterId, me.id), eq(friendships.addresseeId, targetId)),
					and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, me.id))
				)
			)
			.limit(1);
		if (existing) return fail(400, { error: 'Already connected.' });

		await db.insert(friendships).values({ requesterId: me.id, addresseeId: targetId });
		return { added: true };
	}
};
