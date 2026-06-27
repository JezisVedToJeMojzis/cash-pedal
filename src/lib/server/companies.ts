import { sql } from 'drizzle-orm';
import { db } from './db';
import { companies } from './db/schema';

/**
 * Resolve a free-text company name to a company id, creating the company the
 * first time a name is seen. Case-insensitive. Returns null for empty input.
 */
export async function resolveCompanyByName(rawName: string): Promise<number | null> {
	const name = rawName.trim();
	if (!name) return null;

	const [existing] = await db
		.select({ id: companies.id })
		.from(companies)
		.where(sql`lower(${companies.name}) = lower(${name})`)
		.limit(1);
	if (existing) return existing.id;

	// Insert; if a concurrent request created it first, fall back to a lookup.
	const inserted = await db
		.insert(companies)
		.values({ name })
		.onConflictDoNothing()
		.returning({ id: companies.id });
	if (inserted[0]) return inserted[0].id;

	const [after] = await db
		.select({ id: companies.id })
		.from(companies)
		.where(sql`lower(${companies.name}) = lower(${name})`)
		.limit(1);
	return after?.id ?? null;
}

/** Company names matching a prefix/substring, for type-ahead suggestions. */
export async function searchCompanies(q: string, limit = 8): Promise<string[]> {
	const term = q.trim();
	if (!term) return [];
	const rows = await db
		.select({ name: companies.name })
		.from(companies)
		.where(sql`${companies.name} ILIKE ${'%' + term + '%'}`)
		.orderBy(sql`(${companies.name} ILIKE ${term + '%'}) desc`, companies.name)
		.limit(limit);
	return rows.map((r) => r.name);
}
