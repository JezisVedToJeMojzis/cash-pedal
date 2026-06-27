import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

function createDb() {
	if (!env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set. Copy .env.example to .env (see README).');
	}
	return drizzle(postgres(env.DATABASE_URL), { schema });
}

type DB = ReturnType<typeof createDb>;

// Connect lazily on first use so that importing this module at build time
// (SvelteKit's analyse step) doesn't require DATABASE_URL.
let instance: DB | null = null;
export const db = new Proxy({} as DB, {
	get(_target, prop, receiver) {
		instance ??= createDb();
		const value = Reflect.get(instance, prop, receiver);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});

export { schema };
