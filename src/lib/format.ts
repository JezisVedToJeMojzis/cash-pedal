/** Compensation in cents for a given distance (metres) and rate (cents per km). */
export function computeEarningsCents(distanceM: number, rateCentsPerKm: number): number {
	return Math.round((distanceM / 1000) * rateCentsPerKm);
}

export function formatMoney(cents: number, currency = 'EUR'): string {
	try {
		return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
	} catch {
		return `${(cents / 100).toFixed(2)} ${currency}`;
	}
}

/** Format a per-km rate (stored in cents) like "0.25 EUR/km". */
export function formatRate(cents: number, currency = 'EUR'): string {
	return `${formatMoney(cents, currency)}/km`;
}

export function formatDistance(metres: number): string {
	const km = metres / 1000;
	return `${km.toFixed(2)} km`;
}

export function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${m}:${String(s).padStart(2, '0')}`;
}

/** Average speed in km/h. */
export function formatSpeed(metres: number, seconds: number): string {
	if (seconds <= 0) return '0.0 km/h';
	return `${((metres / 1000 / seconds) * 3600).toFixed(1)} km/h`;
}

/** Month key "YYYY-MM" for a date. */
export function monthKey(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
	const [y, m] = key.split('-').map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
