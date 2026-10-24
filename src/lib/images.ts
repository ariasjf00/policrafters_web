// Responsive image attributes for server-rendered <img>/<source>.
//
// Sources, in order:
//  1. The CMS image object, when it carries `renditions` / `width` / `height`
//     (optional fields of the extended image shape — Docs/API_CONTRACT.md).
//  2. The build-time manifest written by scripts/optimize-media.mjs, for local
//     /images/... files under public/.
//  3. The URL unchanged (SVGs, unknown or remote URLs).
//
// The manifest is generated and gitignored; when it's absent (a fresh clone
// before the first `npm run optimize-media`) everything falls back to (3).

export interface ImageInput {
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
  renditions?: Record<string, string>;
}

export interface ResolvedImage {
  src: string;
  srcset?: string;
  sizes?: string;
  width?: number;
  height?: number;
  alt: string;
}

interface ManifestImage {
  width?: number;
  height?: number;
  renditions?: Record<string, string>;
}

type Manifest = Record<string, ManifestImage & Record<string, unknown>>;

const manifestModules = import.meta.glob<Manifest>('../data/media-manifest.json', {
  eager: true,
  import: 'default'
});
const manifest: Manifest = Object.values(manifestModules)[0] ?? {};

interface ResolveOptions {
  /* The `sizes` attribute for this render point's layout; only emitted with a srcset. */
  sizes?: string;
  /* The `src` fallback is the largest rendition not wider than this. */
  maxSrcWidth?: number;
}

const buildSrcset = (renditions: Record<string, string>): string =>
  Object.entries(renditions)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([width, url]) => `${url} ${width}w`)
    .join(', ');

const pickSrc = (renditions: Record<string, string>, maxSrcWidth: number): string | undefined => {
  const widths = Object.keys(renditions).map(Number).sort((a, b) => a - b);
  if (!widths.length) return undefined;
  const fitting = widths.filter((width) => width <= maxSrcWidth);
  return renditions[String(fitting.length ? fitting.at(-1) : widths[0])];
};

export function resolveImage(image: ImageInput | undefined, options: ResolveOptions = {}): ResolvedImage {
  const { sizes, maxSrcWidth = 1200 } = options;
  const url = image?.url ?? '';
  const alt = image?.alt ?? '';

  const cmsRenditions = image?.renditions && Object.keys(image.renditions).length ? image.renditions : undefined;
  const local = manifest[url];
  const renditions = cmsRenditions ?? (local?.renditions && Object.keys(local.renditions).length ? local.renditions : undefined);
  const width = image?.width ?? local?.width;
  const height = image?.height ?? local?.height;

  if (!renditions) {
    return { src: url, width, height, alt };
  }

  return {
    src: pickSrc(renditions, maxSrcWidth) ?? url,
    srcset: buildSrcset(renditions),
    sizes,
    width,
    height,
    alt
  };
}

/** Width/height of a local file recorded in the manifest (logos, which have no renditions). */
export function getImageSize(url: string): { width?: number; height?: number } {
  const entry = manifest[url];
  return { width: entry?.width, height: entry?.height };
}

interface ManifestVideo {
  '1080'?: string;
  '720'?: string;
  poster?: string;
}

/** Compressed variants of a local /videos/... file, when the pipeline produced them. */
export function resolveVideo(url: string): { hd: string; sd: string; poster?: string } {
  const entry = manifest[url] as unknown as ManifestVideo | undefined;
  return { hd: entry?.['1080'] ?? url, sd: entry?.['720'] ?? url, poster: entry?.poster };
}
