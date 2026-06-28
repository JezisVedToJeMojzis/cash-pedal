import { fail } from '@sveltejs/kit';
import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { friendships, users } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!;

	const otherIdExpr = sql`case when ${friendships.requesterId} = ${me.id} then ${friendships.addresseeId} else ${friendships.requesterId} end`;

	const rows = await db
		.select({
			id: friendships.id,
			status: friendships.status,
			requesterId: friendships.requesterId,
			addresseeId: friendships.addresseeId,
			createdAt: friendships.createdAt,
			otherId: sql<number>`${otherIdExpr}`,
			otherName: sql<string>`(select name from users u where u.id = ${otherIdExpr})`,
			otherCompanyId: sql<number | null>`(select company_id from users u where u.id = ${otherIdExpr})`
		})
		.from(friendships)
		.where(or(eq(friendships.requesterId, me.id), eq(friendships.addresseeId, me.id)));

	// A friend is a "coworker" if we share the same (non-null) company.
	const withCoworker = rows.map((r) => ({
		...r,
		coworker: me.companyId != null && r.otherCompanyId === me.companyId
	}));

	return {
		friends: withCoworker.filter((r) => r.status === 'accepted'),
		incoming: withCoworker.filter((r) => r.status === 'pending' && r.addresseeId === me.id),
		outgoing: withCoworker.filter((r) => r.status === 'pending' && r.requesterId === me.id)
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const me = locals.user!;
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Enter a name.' });

		const [target] = await db
			.select({ id: users.id })
			.from(users)
			.where(sql`lower(${users.name}) = lower(${name})`)
			.limit(1);

		if (!target) return fail(404, { error: `No user named "${name}".` });
		if (target.id === me.id) return fail(400, { error: "You can't add yourself." });

		const [existing] = await db
			.select({ id: friendships.id, status: friendships.status })
			.from(friendships)
			.where(
				or(
					and(eq(friendships.requesterId, me.id), eq(friendships.addresseeId, target.id)),
					and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, me.id))
				)
			)
			.limit(1);

		if (existing) {
			return fail(400, {
				error: existing.status === 'accepted' ? 'Already friends.' : 'A request already exists.'
			});
		}

		await db.insert(friendships).values({ requesterId: me.id, addresseeId: target.id });
		return { added: name };
	},

	accept: async ({ request, locals }) => {
		const me = locals.user!;
		const id = Number((await request.formData()).get('id'));
		await db
			.update(friendships)
			.set({ status: 'accepted' })
			.where(and(eq(friendships.id, id), eq(friendships.addresseeId, me.id)));
		return {};
	},

	// Decline an incoming request, cancel an outgoing one, or remove a friend.
	remove: async ({ request, locals }) => {
		const me = locals.user!;
		const id = Number((await request.formData()).get('id'));
		await db
			.delete(friendships)
			.where(
				and(
					eq(friendships.id, id),
					or(eq(friendships.requesterId, me.id), eq(friendships.addresseeId, me.id))
				)
			);
		return {};
	}
};
