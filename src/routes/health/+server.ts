import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Lightweight health check for Render.
export const GET: RequestHandler = () => text('ok');
