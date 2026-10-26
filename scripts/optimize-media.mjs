// Media optimization pipeline (SEO Phase 3). Runs as `prebuild` and on demand
// (`npm run optimize-media`).
//
//  - public/images/**.{png,jpg,jpeg} -> WebP renditions in public/_media/images/...
//  - public/videos/**.mp4            -> 1080p/720p H.264 + a WebP poster in public/_media/videos/
//  - a 1200x630 default social image  -> public/images/og/policrafters-og.jpg (committed)
//  - src/data/media-manifest.json     -> what src/lib/images.ts reads (generated, gitignored)
//
// Incremental: an output newer than its source is never rebuilt, so repeat
// builds are fast. public/_media/ and the manifest are generated, not committed.
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const mediaDir = path.join(publicDir, '_media');
const manifestPath = path.join(root, 'src', 'data', 'media-manifest.json');

const IMAGE_WIDTHS = [480, 800, 1200, 1600, 2400];
const WEBP_QUALITY = 78;
const OG_PATH = path.join(publicDir, 'images', 'og', 'policrafters-og.jpg');
const OG_SOURCE = path.join(publicDir, 'images', 'pages', 'horizontal_video_static_image.png');

const toUrl = (absPath) => '/' + path.relative(publicDir, absPath).split(path.sep).join('/');
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function walk(dir, exts, skipDirs = []) {
  const found = [];
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.includes(entry.name)) found.push(...(await walk(full, exts, skipDirs)));
    } else if (exts.includes(path.extname(entry.name).toLowerCase())) {
      found.push(full);
    }
  }
  return found;
}

async function isFresh(output, source) {
  try {
    const [out, src] = await Promise.all([fs.stat(output), fs.stat(source)]);
    return out.mtimeMs >= src.mtimeMs && out.size > 0;
  } catch {
    return false;
  }
}

const manifest = {};
const summary = [];

// --- images ----------------------------------------------------------------
async function optimizeImage(file) {
  const meta = await sharp(file).metadata();
  const { width, height } = meta;
  if (!width || !height) return;

  const rel = path.relative(path.join(publicDir, 'images'), file);
  const parsed = path.parse(rel);
  const outDir = path.join(mediaDir, 'images', parsed.dir);
  await fs.mkdir(outDir, { recursive: true });

  // Cap at the original width; always keep one rendition at the original
  // width when the image is narrower than the largest step.
  const widths = [...new Set([...IMAGE_WIDTHS.filter((w) => w < width), Math.min(width, IMAGE_WIDTHS.at(-1))])].sort((a, b) => a - b);
  const renditions = {};
  let largest = 0;

  for (const w of widths) {
    const out = path.join(outDir, `${parsed.name}-${w}.webp`);
    if (!(await isFresh(out, file))) {
      await sharp(file).resize({ width: w, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toFile(out);
    }
    renditions[String(w)] = toUrl(out);
    largest = Math.max(largest, (await fs.stat(out)).size);
  }

  manifest[toUrl(file)] = { width, height, renditions };
  summary.push({ name: toUrl(file), before: (await fs.stat(file)).size, after: largest });
}

// --- videos ----------------------------------------------------------------
async function encode(source, output, height) {
  if (await isFresh(output, source)) return;
  const args = [
    '-y', '-i', source,
    '-vf', `scale=-2:'min(${height},ih)'`,
    '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-an',
    output
  ];
  await run(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 64 });
}

async function optimizeVideo(file) {
  const parsed = path.parse(path.relative(path.join(publicDir, 'videos'), file));
  const outDir = path.join(mediaDir, 'videos', parsed.dir);
  await fs.mkdir(outDir, { recursive: true });

  const out1080 = path.join(outDir, `${parsed.name}-1080.mp4`);
  const out720 = path.join(outDir, `${parsed.name}-720.mp4`);
  const poster = path.join(outDir, `${parsed.name}-poster.webp`);

  await encode(file, out1080, 1080);
  await encode(file, out720, 720);

  if (!(await isFresh(poster, file))) {
    const frame = path.join(outDir, `${parsed.name}-frame.png`);
    await run(ffmpegPath, ['-y', '-i', file, '-frames:v', '1', frame]);
    await sharp(frame).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 72 }).toFile(poster);
    await fs.rm(frame, { force: true });
  }

  manifest[toUrl(file)] = {
    '1080': toUrl(out1080),
    '720': toUrl(out720),
    poster: toUrl(poster)
  };
  summary.push({ name: toUrl(file), before: (await fs.stat(file)).size, after: (await fs.stat(out1080)).size });
}

// --- default social image --------------------------------------------------
async function buildOgImage() {
  try {
    await fs.stat(OG_SOURCE);
  } catch {
    return;
  }
  if (await isFresh(OG_PATH, OG_SOURCE)) return;
  await fs.mkdir(path.dirname(OG_PATH), { recursive: true });
  // Cover-crop of the homepage hero poster. A placeholder until design delivers
  // a real 1200x630 — see Docs/SEO_phase3_prod_changes_pending.md.
  await sharp(OG_SOURCE).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82, mozjpeg: true }).toFile(OG_PATH);
}

// --- logos: dimensions only, so <img> can declare width/height ----------------
async function recordLogoSize(file) {
  const { width, height } = await sharp(file).metadata();
  if (width && height) manifest[toUrl(file)] = { width, height, renditions: {} };
}

async function main() {
  const started = Date.now();
  await buildOgImage();

  const images = await walk(path.join(publicDir, 'images'), ['.png', '.jpg', '.jpeg'], ['og']);
  for (const file of images) await optimizeImage(file);

  for (const logo of ['logo_black.png', 'logo_grey.png']) {
    const file = path.join(publicDir, logo);
    try {
      await recordLogoSize(file);
    } catch {
      /* logo missing — nothing to record */
    }
  }

  if (ffmpegPath) {
    const videos = await walk(path.join(publicDir, 'videos'), ['.mp4']);
    for (const file of videos) await optimizeVideo(file);
  } else {
    console.warn('[optimize-media] ffmpeg-static no está disponible; se omiten los videos.');
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const before = summary.reduce((total, row) => total + row.before, 0);
  const after = summary.reduce((total, row) => total + row.after, 0);
  const biggest = [...summary].sort((a, b) => b.before - a.before).slice(0, 8);
  console.log(`[optimize-media] ${summary.length} archivos, ${mb(before)} -> ${mb(after)} (versión más grande), ${((Date.now() - started) / 1000).toFixed(1)}s`);
  for (const row of biggest) console.log(`  ${row.name.padEnd(60)} ${kb(row.before).padStart(10)} -> ${kb(row.after).padStart(9)}`);
}

main().catch((error) => {
  console.error('[optimize-media] falló:', error);
  process.exit(1);
});
