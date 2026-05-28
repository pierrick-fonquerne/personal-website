import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '..', 'public', 'og-default.png');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#111113"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="56" y="56" width="1088" height="518" fill="none" stroke="#27272a" stroke-width="1.5"/>

  <rect x="96" y="120" width="4" height="80" fill="#ff6b35"/>
  <text x="124" y="170" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" font-weight="500" fill="#ff6b35" letter-spacing="6">// PORTFOLIO</text>

  <text x="96" y="330" font-family="Inter, system-ui, sans-serif" font-size="140" font-weight="800" fill="#fafaf7" letter-spacing="-6">Pierrick</text>
  <text x="96" y="460" font-family="Inter, system-ui, sans-serif" font-size="140" font-weight="800" fill="#fafaf7" letter-spacing="-6">Fonquerne</text>

  <line x1="96" y1="510" x2="220" y2="510" stroke="#3f3f46" stroke-width="1"/>
  <text x="96" y="555" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="#a1a1aa" letter-spacing="2">.NET  ·  Angular  ·  Rust</text>
</svg>
`.trim();

await mkdir(dirname(outPath), { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath);

console.log('Wrote', outPath);
