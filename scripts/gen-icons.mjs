// Generates PWA icons from an inline SVG using sharp.
// Run with: npm run icons
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'icons');
await mkdir(outDir, { recursive: true });

const BG = '#16a34a';
const BG_DARK = '#0f172a';

// Bicycle glyph drawn on a 24x24 grid, scaled into the icon.
function svg(size, { padding, rounded, bg }) {
	const inner = size - padding * 2;
	const scale = inner / 24;
	const radius = rounded ? size * 0.22 : 0;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
	<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
	<g transform="translate(${padding} ${padding}) scale(${scale})"
		fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="5.5" cy="15" r="3.5"/>
		<circle cx="18.5" cy="15" r="3.5"/>
		<path d="M5.5 15h6l3.5-6h3M9 9h4l3 6"/>
		<circle cx="12" cy="5" r="1.2" fill="#fff" stroke="none"/>
	</g>
</svg>`;
}

async function render(name, size, opts) {
	await sharp(Buffer.from(svg(size, opts))).png().toFile(join(outDir, name));
	console.log('wrote', name);
}

await render('icon-192.png', 192, { padding: 30, rounded: true, bg: BG });
await render('icon-512.png', 512, { padding: 80, rounded: true, bg: BG });
// Maskable: fill the whole square, keep the glyph within the safe zone.
await render('icon-512-maskable.png', 512, { padding: 130, rounded: false, bg: BG });
await render('apple-touch-icon.png', 180, { padding: 28, rounded: true, bg: BG });
await render('favicon-48.png', 48, { padding: 6, rounded: true, bg: BG_DARK });

console.log('done');
