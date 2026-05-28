import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const COST_PER_1K_CHARS = 0.016;
const fmtCost = (chars) => `$${((chars * COST_PER_1K_CHARS) / 1000).toFixed(4)}`;

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

const args = process.argv.slice(2);
const filterCourse = args.find((a) => a.startsWith('--course='))?.split('=')[1];
const filterLocale = args.find((a) => a.startsWith('--locale='))?.split('=')[1];
const filterModules = args
  .find((a) => a.startsWith('--module='))
  ?.split('=')[1]
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const manifestOnly = args.includes('--manifest-only');
const dryRun = args.includes('--dry-run');
const listOnly = args.includes('--list');
const withScriptOnly = args.includes('--with-script');
const useMdxFallback = args.includes('--use-mdx-fallback');
const confirmEach = args.includes('--confirm');
const listVoices = args.includes('--voices');

const offlineMode = (listOnly || dryRun || manifestOnly) && !listVoices;
if (!offlineMode && !API_KEY) {
  console.error('Missing MISTRAL_API_KEY. Set it in .env or your shell.');
  process.exit(1);
}

async function askYesNo(prompt) {
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(prompt)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes' || answer === 'o' || answer === 'oui';
  } finally {
    rl.close();
  }
}

function moduleMatches(name) {
  if (!filterModules || filterModules.length === 0) return true;
  return filterModules.some((needle) => name.includes(needle));
}

const SOURCES = [
  { locale: 'fr', dir: resolve(ROOT, 'src', 'content', 'course-modules-fr') },
  { locale: 'en', dir: resolve(ROOT, 'src', 'content', 'course-modules-en') },
];

const MAX_CHARS_PER_CHUNK = 3800;

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

function chunkText(text, maxChars = MAX_CHARS_PER_CHUNK) {
  if (text.length <= maxChars) return [text];
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    const next = current ? `${current}\n\n${para}` : para;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    if (para.length <= maxChars) {
      current = para;
    } else {
      const sentences = para.split(/(?<=[.!?])\s+/);
      current = '';
      for (const sentence of sentences) {
        const combined = current ? `${current} ${sentence}` : sentence;
        if (combined.length <= maxChars) {
          current = combined;
        } else {
          if (current) chunks.push(current);
          current = sentence.slice(0, maxChars);
        }
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function callVoxtralSingle(text) {
  const res = await fetch('https://api.mistral.ai/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input: text,
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

async function callVoxtral(text) {
  const chunks = chunkText(text);
  if (chunks.length === 1) return callVoxtralSingle(chunks[0]);
  const buffers = [];
  for (let i = 0; i < chunks.length; i += 1) {
    process.stdout.write(`      chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)…`);
    const buf = await callVoxtralSingle(chunks[i]);
    buffers.push(buf);
    process.stdout.write(` ${buf.length} bytes\n`);
  }
  return Buffer.concat(buffers);
}

async function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

async function fetchVoices() {
  const res = await fetch('https://api.mistral.ai/v1/audio/voices', {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET /v1/audio/voices ${res.status}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

async function main() {
  if (listVoices) {
    console.log('Fetching your Voxtral voices…');
    const data = await fetchVoices();
    const items = data.items ?? data;
    if (!Array.isArray(items) || items.length === 0) {
      console.log('No voices found on this account.');
      return;
    }
    console.log('-'.repeat(80));
    for (const v of items) {
      const langs = Array.isArray(v.languages) ? v.languages.join(',') : '';
      const meta = [v.gender, v.age, langs].filter(Boolean).join(' · ');
      console.log(`  id=${v.id}`);
      console.log(`     name=${v.name ?? '(unnamed)'}  slug=${v.slug ?? '-'}  ${meta}`);
    }
    console.log('-'.repeat(80));
    console.log(
      'Set MISTRAL_TTS_VOICE_ID=<id> in your .env, then re-run audio:generate.',
    );
    return;
  }
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
      if (!moduleMatches(modName)) continue;
      const key = `${locale}/${course}/${modName}`;

      if (listOnly) {
        const audioScriptPath = mdxPath.replace(/\.mdx$/, '.audio.md');
        const hasScript = existsSync(audioScriptPath);
        if (withScriptOnly && !hasScript) continue;
        const outFile = resolve(OUT_DIR, locale, course, `${modName}.mp3`);
        const cached = existsSync(outFile);
        let chars = 0;
        if (hasScript) {
          chars = (await readFile(audioScriptPath, 'utf-8')).trim().length;
        }
        const costStr = chars > 0 ? ` cost=${fmtCost(chars)}` : '';
        const charsStr = chars > 0 ? ` chars=${chars}` : '';
        console.log(
          `  ${key.padEnd(60)} script=${hasScript ? 'yes' : 'no '} mp3=${cached ? 'yes' : 'no '}${charsStr}${costStr}`,
        );
        continue;
      }

      const audioScriptPath = mdxPath.replace(/\.mdx$/, '.audio.md');
      let text;
      let source;
      if (existsSync(audioScriptPath)) {
        text = (await readFile(audioScriptPath, 'utf-8')).trim();
        source = 'script';
      } else if (useMdxFallback) {
        const raw = await readFile(mdxPath, 'utf-8');
        text = stripMdx(raw);
        source = 'mdx';
      } else {
        console.log(`skip  ${key} — no .audio.md sidecar (pass --use-mdx-fallback to override)`);
        dropped += 1;
        continue;
      }

      if (text.length < 50) {
        console.log(`drop  ${key} (text too short: ${text.length} chars)`);
        dropped += 1;
        continue;
      }

      const outFile = resolve(OUT_DIR, locale, course, `${modName}.mp3`);
      const hashFile = `${outFile}.hash`;
      const newHash = sha256(`${text}\n${MODEL}\n${VOICE_ID}\n${source}`);

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
        console.log(`would ${key} (${text.length} chars, ~${fmtCost(text.length)}, source=${source})`);
        continue;
      }

      if (confirmEach) {
        const ok = await askYesNo(
          `Generate ${key}? (${text.length} chars, ~${fmtCost(text.length)}) [y/N]: `,
        );
        if (!ok) {
          console.log(`skip  ${key} (declined)`);
          skipped += 1;
          continue;
        }
      }

      console.log(`gen   ${key} (${text.length} chars, ~${fmtCost(text.length)}, source=${source})…`);
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
