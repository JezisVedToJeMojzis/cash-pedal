// Applies pending SQL migrations from ./drizzle to the database in DATABASE_URL.
// Runs at container start (before the server) using only runtime dependencies.
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set — cannot run migrations.');
	process.exit(1);
}

const sql = postgres(url, { max: 1 });
try {
	await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
	console.log('Migrations applied.');
} catch (err) {
	console.error('Migration failed:', err);
	process.exit(1);
} finally {
	await sql.end();
}
