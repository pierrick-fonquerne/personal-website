import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const OUT_DIR = resolve(ROOT, 'public', 'audio');
const MANIFEST_PATH = resolve(OUT_DIR, 'manifest.json');

const ENV_PATH = resolve(ROOT, '.env');
if (existsSync(ENV_PATH)) {
  const envContent = await readFile(ENV_PATH, 'utf-8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const API_KEY = process.env.MISTRAL_API_KEY;
const MODEL = process.env.MISTRAL_TTS_MODEL || 'voxtral-mini-tts-2603';
const VOICE_ID = process.env.MISTRAL_TTS_VOICE_ID || 'Pierrick';

if (!API_KEY) {
  console.error('Missing MISTRAL_API_KEY. Set it in .env or your shell.');
  process.exit(1);
}

const args = process.argv.slice(2);
const filterCourse = args.find((a) => a.startsWith('--course='))?.split('=')[1];
const filterLocale = args.find((a) => a.startsWith('--locale='))?.split('=')[1];
const manifestOnly = args.includes('--manifest-only');
const dryRun = args.includes('--dry-run');

const SOURCES = [
  { locale: 'fr', dir: resolve(ROOT, 'src', 'content', 'course-modules-fr') },
  { locale: 'en', dir: resolve(ROOT, 'src', 'content', 'course-modules-en') },
];

function stripMdx(raw) {
  return raw
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/m, '')
    .replace(/^import\s+.+$/gm, '')
    .replace(/<([A-Z][\w]*)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[A-Z][\w]*\b[^>]*\/>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]+\$/g, ' ')
    .replace(/\{[^{}\n]*\}/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function* walkMdx(dir) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const fp = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkMdx(fp);
    } else if (e.isFile() && fp.endsWith('.mdx')) {
      yield fp;
    }
  }
}

function parseRel(fp, sourceDir) {
  const rel = fp.slice(sourceDir.length + 1).replace(/\\/g, '/');
  const parts = rel.split('/');
  const moduleName = parts.pop().replace(/\.mdx$/, '');
  const course = parts.join('/');
  return { course, module: moduleName };
}

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

async function callVoxtral(text) {
  const res = await fetch('https://api.mistral.ai/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      text,
      voice_id: VOICE_ID,
      response_format: 'mp3',
      stream: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voxtral ${res.status}: ${body.slice(0, 400)}`);
  }
  const payload = await res.json();
  if (!payload?.audio_data) throw new Error('Voxtral returned no audio_data');
  return Buffer.from(payload.audio_data, 'base64');
}

async function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

async function main() {
  const banner = `Voxtral TTS — model=${MODEL}, voice=${VOICE_ID}${dryRun ? ' [DRY RUN]' : ''}`;
  console.log(banner);
  console.log('-'.repeat(banner.length));

  const manifest = await readManifest();
  let generated = 0;
  let skipped = 0;
  let dropped = 0;

  for (const { locale, dir } of SOURCES) {
    if (filterLocale && locale !== filterLocale) continue;
    if (!existsSync(dir)) continue;

    for await (const mdxPath of walkMdx(dir)) {
      const { course, module: modName } = parseRel(mdxPath, dir);
      if (filterCourse && course !== filterCourse) continue;
      const key = `${locale}/${course}/${modName}`;

      const raw = await readFile(mdxPath, 'utf-8');
      const text = stripMdx(raw);

      if (text.length < 50) {
        console.log(`drop  ${key} (text too short: ${text.length} chars)`);
        dropped += 1;
        continue;
      }

      const outFile = resolve(OUT_DIR, locale, course, `${modName}.mp3`);
      const hashFile = `${outFile}.hash`;
      const newHash = sha256(`${text}\n${MODEL}\n${VOICE_ID}`);

      const upToDate =
        existsSync(hashFile) &&
        existsSync(outFile) &&
        (await readFile(hashFile, 'utf-8')).trim() === newHash;

      if (upToDate || manifestOnly) {
        if (existsSync(outFile)) {
          manifest[key] = {
            url: `/audio/${locale}/${course}/${modName}.mp3`,
            chars: text.length,
          };
          if (upToDate) {
            console.log(`skip  ${key} (cached)`);
            skipped += 1;
          }
        } else if (manifestOnly) {
          console.log(`miss  ${key} (no mp3 found, manifest-only mode)`);
        }
        continue;
      }

      if (dryRun) {
        console.log(`would ${key} (${text.length} chars)`);
        continue;
      }

      console.log(`gen   ${key} (${text.length} chars)…`);
      const audio = await callVoxtral(text);
      await mkdir(dirname(outFile), { recursive: true });
      await writeFile(outFile, audio);
      await writeFile(hashFile, newHash);
      manifest[key] = {
        url: `/audio/${locale}/${course}/${modName}.mp3`,
        chars: text.length,
      };
      generated += 1;
      console.log(`      → ${outFile.replace(ROOT, '.')} (${audio.length} bytes)`);
    }
  }

  if (!dryRun) {
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  }

  console.log('-'.repeat(banner.length));
  console.log(
    `Done. generated=${generated}, cached=${skipped}, dropped=${dropped}, manifest=${Object.keys(manifest).length} entries.`,
  );
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
