import type { User } from '$lib/server/db/schema';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
		}
		interface PageData {
			user?:
				| (Pick<User, 'id' | 'name' | 'companyId' | 'rateCentsPerKm' | 'currency' | 'createdAt'> & {
						companyName: string | null;
				  })
				| null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
