import {
	pgTable,
	serial,
	text,
	integer,
	doublePrecision,
	timestamp,
	jsonb,
	boolean,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** A single GPS sample on a ride: [latitude, longitude, epoch-ms]. */
export type TrackPoint = [number, number, number];

export const companies = pgTable('companies', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	// Case-insensitive unique company names.
	uniqueIndex('companies_name_lower_idx').on(sql`lower(${t.name})`)
]);

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	/** @deprecated legacy free-text company; superseded by companyId. */
	company: text('company'),
	companyId: integer('company_id').references(() => companies.id, { onDelete: 'set null' }),
	/** Compensation rate in cents per kilometre (integer to avoid float drift). */
	rateCentsPerKm: integer('rate_cents_per_km').notNull().default(0),
	currency: text('currency').notNull().default('EUR'),
	/** Saved commute endpoints + the cycling distance between them (metres). */
	homeAddress: text('home_address'),
	officeAddress: text('office_address'),
	commuteDistanceM: doublePrecision('commute_distance_m'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	// Case-insensitive unique usernames.
	uniqueIndex('users_name_lower_idx').on(sql`lower(${t.name})`)
]);

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const rides = pgTable('rides', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
	endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
	/** Total distance in metres. */
	distanceM: doublePrecision('distance_m').notNull().default(0),
	/** Moving duration in seconds. */
	durationS: integer('duration_s').notNull().default(0),
	/** Snapshot of the user's rate at the time of the ride. */
	rateCentsPerKm: integer('rate_cents_per_km').notNull().default(0),
	/** Computed compensation in cents. */
	earningsCents: integer('earnings_cents').notNull().default(0),
	/** Recorded GPS track for drawing the route polyline. */
	track: jsonb('track').$type<TrackPoint[]>().notNull().default([]),
	/** True if the user entered this ride by hand (no GPS recording). */
	manual: boolean('manual').notNull().default(false),
	/** Start and end addresses of the commute. */
	startPoint: text('start_point'),
	endPoint: text('end_point'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	index('rides_user_started_idx').on(t.userId, t.startedAt)
]);

export const friendships = pgTable('friendships', {
	id: serial('id').primaryKey(),
	requesterId: integer('requester_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	addresseeId: integer('addressee_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	/** 'pending' | 'accepted' */
	status: text('status').notNull().default('pending'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	uniqueIndex('friendships_pair_idx').on(t.requesterId, t.addresseeId)
]);

export type Company = typeof companies.$inferSelect;
export type User = typeof users.$inferSelect;
export type Ride = typeof rides.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
