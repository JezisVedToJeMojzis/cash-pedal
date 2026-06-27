import { and, eq, or } from 'drizzle-orm';
import { db } from './db';
import { friendships } from './db/schema';

/** IDs of users who are accepted friends of `userId`. */
export async function getAcceptedFriendIds(userId: number): Promise<number[]> {
	const rows = await db
		.select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
		.from(friendships)
		.where(
			and(
				eq(friendships.status, 'accepted'),
				or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
			)
		);
	return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}
