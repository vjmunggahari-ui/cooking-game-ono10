// Simmer & Serve — hand-in program (Node 22, standard library only).
// The game is this directory's game/ folder (plain static files a desktop
// browser loads offline) plus screenshots/ (3–4 real renders of the game).
// This program copies both to the output directory and writes dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// The grader runs this with MAKEFUN_OUTPUT_DIR set to its own /output.
// Outside the grader, set MAKEFUN_OUTPUT_DIR yourself:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// There is no fallback directory: without MAKEFUN_OUTPUT_DIR the program
// refuses to run, so it can never silently hand in the wrong folder.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR;
if (!out) {
  throw new Error('MAKEFUN_OUTPUT_DIR is not set — refusing to write anywhere else.');
}

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

function fail(message) {
  throw new Error(`hand-in refused: ${message}`);
}

function totalBytes(dir) {
  let total = 0;
  let count = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      const sub = totalBytes(path);
      total += sub.bytes;
      count += sub.count;
    } else if (name.isFile()) {
      total += statSync(path).size;
      count += 1;
    }
  }
  return { bytes: total, count };
}

// Gate mirrors (the scorer's own caps): refuse an entry the scorer would refuse.
const gameIndex = join(gameDir, 'index.html');
if (!existsSync(gameIndex)) fail('game/index.html is missing.');
if (statSync(gameIndex).size > 1024 * 1024) fail('game/index.html is over 1 MiB.');
// References mirror: no script, link or import in the game may point at the
// network — every load must be a data: URI or a file under game/.
function scanForNetworkUrls(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      scanForNetworkUrls(path);
    } else if (/\.(html|js|mjs|css)$/.test(name.name)) {
      const text = readFileSync(path, 'utf8');
      const hit = text.match(/https?:\/\/[^\s"'<>]+/);
      if (hit) fail(`${path} loads over the network: ${hit[0]}`);
    }
  }
}
scanForNetworkUrls(gameDir);
const gameTree = totalBytes(gameDir);
if (gameTree.count > 993) fail(`game/ holds ${gameTree.count} files (cap 993).`);
if (gameTree.bytes > 48 * 1024 * 1024) fail('game/ is over 48 MiB in all.');
if (!existsSync(shotsDir)) fail('screenshots/ is missing.');
const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
if (shots.length < 3 || shots.length > 4) fail(`screenshots/ holds ${shots.length} images (need 3 or 4).`);
for (const shot of shots) {
  const path = join(shotsDir, shot);
  if (!statSync(path).isFile()) fail(`screenshots/${shot} is not a regular file.`);
  if (statSync(path).size > 256 * 1024) fail(`screenshots/${shot} is over 256 KiB.`);
  const head = readFileSync(path).subarray(0, 3);
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e;
  if (!isJpeg && !isPng) fail(`screenshots/${shot} is neither PNG nor JPEG.`);
}

mkdirSync(out, { recursive: true });
// Clear only this program's own outputs inside the output directory.
// The directory itself belongs to whoever set MAKEFUN_OUTPUT_DIR (the
// grader's /output may be owned by another user), so never remove it.
for (const name of ['game', 'screenshots', 'dossier.json']) {
  rmSync(join(out, name), { recursive: true, force: true });
}
cpSync(gameDir, join(out, 'game'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
const dossierPath = join(out, 'dossier.json');
writeFileSync(dossierPath, dossier);

// Read-back self-check: the dossier on disk must be byte-for-byte what the
// library writes from the handed-in files, and it must parse as JSON.
// (buildDossier returns bytes, not a string, so compare Buffers.)
const onDisk = readFileSync(dossierPath);
if (!Buffer.from(dossier).equals(onDisk)) fail('dossier.json on disk differs from the freshly built dossier.');
const dossierText = onDisk.toString('utf8');
JSON.parse(dossierText);
if (onDisk.length > 1536 * 1024) fail('dossier.json is over 1.5 MiB.');

console.log(`wrote ${dossierPath} (${dossier.length} bytes, ${shots.length} screenshots, ${gameTree.count} game files)`);
