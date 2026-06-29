import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from './db';
import { companies, rides, users } from './db/schema';
import { monthKey } from '$lib/format';

export interface LeaderEntry {
	userId: number;
	name: string;
	companyName: string | null;
	currency: string;
	distanceM: number;
	earningsCents: number;
	rideCount: number;
}

/** Calendar-month window for a "YYYY-MM" key (or the current month). */
export function monthWindow(param?: string | null) {
	const now = new Date();
	const [y, m] = (param ?? monthKey(now)).split('-').map(Number);
	const start = new Date(y, m - 1, 1);
	const end = new Date(y, m, 1); // first day of next month — board resets here
	return { start, end, key: monthKey(start) };
}

/**
 * Ride totals per user for the given users within [start, end). Users with no
 * rides in the window are included with zeroes so the board is complete.
 */
export async function getLeaderboard(
	userIds: number[],
	start: Date,
	end: Date
): Promise<LeaderEntry[]> {
	if (userIds.length === 0) return [];

	const rows = (await db
		.select({
			userId: rides.userId,
			name: users.name,
			companyName: companies.name,
			currency: users.currency,
			distanceM: sql<number>`coalesce(sum(${rides.distanceM}), 0)`,
			earningsCents: sql<number>`coalesce(sum(${rides.earningsCents}), 0)::int`,
			rideCount: sql<number>`count(*)::int`
		})
		.from(rides)
		.innerJoin(users, eq(users.id, rides.userId))
		.leftJoin(companies, eq(companies.id, users.companyId))
		.where(and(inArray(rides.userId, userIds), gte(rides.startedAt, start), lt(rides.startedAt, end)))
		.groupBy(rides.userId, users.name, companies.name, users.currency)) as LeaderEntry[];

	const present = new Set(rows.map((r) => r.userId));
	const missing = userIds.filter((id) => !present.has(id));
	if (missing.length) {
		const blanks = await db
			.select({
				userId: users.id,
				name: users.name,
				companyName: companies.name,
				currency: users.currency
			})
			.from(users)
			.leftJoin(companies, eq(companies.id, users.companyId))
			.where(inArray(users.id, missing));
		for (const b of blanks) {
			rows.push({ ...b, distanceM: 0, earningsCents: 0, rideCount: 0 });
		}
	}
	return rows;
}

export interface MonthlyTotal {
	key: string;
	distanceM: number;
	earningsCents: number;
	rideCount: number;
}

/** Per-month distance + earnings for one user, newest month first. */
export async function getMonthlyTotals(userId: number): Promise<MonthlyTotal[]> {
	const rows = await db
		.select({
			startedAt: rides.startedAt,
			distanceM: rides.distanceM,
			earningsCents: rides.earningsCents
		})
		.from(rides)
		.where(eq(rides.userId, userId))
		.orderBy(desc(rides.startedAt));

	const months = new Map<string, MonthlyTotal>();
	for (const r of rows) {
		const key = monthKey(new Date(r.startedAt));
		let m = months.get(key);
		if (!m) {
			m = { key, distanceM: 0, earningsCents: 0, rideCount: 0 };
			months.set(key, m);
		}
		m.distanceM += r.distanceM;
		m.earningsCents += r.earningsCents;
		m.rideCount += 1;
	}
	return [...months.values()];
}
