import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { sessions, users, type User } from './db/schema';

const scrypt = promisify(_scrypt);

export const SESSION_COOKIE = 'pedal_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Hash a password as `salt:hash` using scrypt (Node built-in, no native deps). */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const derived = (await scrypt(password, salt, 64)) as Buffer;
	return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltHex, hashHex] = stored.split(':');
	if (!saltHex || !hashHex) return false;
	const derived = (await scrypt(password, Buffer.from(saltHex, 'hex'), 64)) as Buffer;
	const expected = Buffer.from(hashHex, 'hex');
	return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export async function createSession(userId: number): Promise<{ id: string; expiresAt: Date }> {
	const id = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await db.insert(sessions).values({ id, userId, expiresAt });
	return { id, expiresAt };
}

export async function validateSession(id: string | undefined): Promise<User | null> {
	if (!id) return null;
	const row = await db
		.select({ user: users, expiresAt: sessions.expiresAt })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id))
		.limit(1);
	const found = row[0];
	if (!found) return null;
	if (found.expiresAt.getTime() < Date.now()) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}
	return found.user;
}

export async function deleteSession(id: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, id));
}

export function setSessionCookie(event: RequestEvent, id: string, expiresAt: Date) {
	event.cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		// Behind a TLS-terminating proxy (Render) set COOKIE_SECURE=true; locally
		// fall back to whether the request itself is https.
		secure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : event.url.protocol === 'https:',
		expires: expiresAt
	});
}

export function clearSessionCookie(event: RequestEvent) {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}
