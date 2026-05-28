import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..', 'public');

// Brand favicon: the "//" code motif from the OG hero ("// PORTFOLIO"),
// rendered as two accent-orange slashes on a dark, rounded tile.
// Geometry-only (no font dependency) so it stays crisp down to 16px.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#0a0a0a"/>
  <rect x="1.5" y="1.5" width="125" height="125" rx="26.5" fill="none" stroke="#27272a" stroke-width="3"/>
  <g fill="#ff6b35">
    <polygon points="33,92 55,36 71,36 49,92"/>
    <polygon points="57,92 79,36 95,36 73,92"/>
  </g>
</svg>
`;

const svgBuffer = Buffer.from(svg);

// Build a multi-image .ico that embeds PNGs (Vista+ supports PNG-in-ICO).
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  const payloads = [];
  let offset = 6 + images.length * 16;

  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 => 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset
    offset += data.length;
    entries.push(entry);
    payloads.push(data);
  }

  return Buffer.concat([header, ...entries, ...payloads]);
}

const png = (size) =>
  sharp(svgBuffer, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

await mkdir(publicDir, { recursive: true });

// Scalable favicon (referenced first by the layout).
await writeFile(resolve(publicDir, 'favicon.svg'), svgBuffer);

// Legacy / fallback multi-size .ico.
const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await png(size) })),
);
await writeFile(resolve(publicDir, 'favicon.ico'), buildIco(icoImages));

// Apple touch icon (iOS home screen).
await writeFile(resolve(publicDir, 'apple-touch-icon.png'), await png(180));

console.log('Wrote favicon.svg, favicon.ico (16/32/48), apple-touch-icon.png');
