import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { encodeIco, FAVICON_SIZES } from "../../src/lib/favicon.ts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "../..");
const sourceSvgPath = resolve(
  packageRoot,
  "src/assets/branding/jant-logo-positive.svg",
);
const outputPath = resolve(packageRoot, "src/lib/jant-branding-generated.ts");

const NEGATIVE_FILL = "#FFFFFF";
const APP_ICON_CORNER_RADIUS = 22;
const POSITIVE_PNG_SIZE = 512;
const BRAND_TILE_PNG_SIZE = 512;
const SOCIAL_IMAGE_SIZE = 512;

interface BrandAssetBundle {
  positiveFill: string;
  positiveSvg: string;
  negativeSvg: string;
  appIconSvg: string;
  brandTilePng: ArrayBuffer;
  positiveLogoPng: ArrayBuffer;
  faviconIco: ArrayBuffer;
  appleTouchPng: ArrayBuffer;
  socialImagePng: ArrayBuffer;
}

function fail(message: string): never {
  throw new Error(message);
}

function normalizeSvg(svg: string): string {
  return svg.replace(/\r\n?/g, "\n").replace(/>\s+</g, "><").trim();
}

function extractSvgAttribute(svg: string, attribute: string): string {
  const match = svg.match(new RegExp(`${attribute}="([^"]+)"`));
  if (!match?.[1]) {
    fail(`Missing required SVG attribute: ${attribute}`);
  }

  return match[1];
}

function extractPathData(svg: string): string {
  const match = svg.match(/<path\b[^>]*\bd="([^"]+)"/);
  if (!match?.[1]) {
    fail('Missing required <path d="..."> in source SVG');
  }

  return match[1];
}

function extractFill(svg: string): string {
  const match = svg.match(/<path\b[^>]*\bfill="([^"]+)"/i);
  if (!match?.[1]) {
    fail("Missing required path fill in source SVG");
  }

  return match[1];
}

function buildLogoSvgMarkup({
  viewBox,
  pathData,
  fill,
}: {
  viewBox: string;
  pathData: string;
  fill: string;
}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path fill="${fill}" d="${pathData}"/></svg>`;
}

function buildAppIconSvgMarkup({
  viewBox,
  pathData,
  backgroundFill,
  markFill,
}: {
  viewBox: string;
  pathData: string;
  backgroundFill: string;
  markFill: string;
}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><rect width="100" height="100" rx="${APP_ICON_CORNER_RADIUS}" fill="${backgroundFill}"/><path fill="${markFill}" d="${pathData}"/></svg>`;
}

async function rasterizeSvg(svg: string, size: number): Promise<ArrayBuffer> {
  const rendered = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();

  return rendered.buffer.slice(
    rendered.byteOffset,
    rendered.byteOffset + rendered.byteLength,
  );
}

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

function chunkBase64(base64: string): string[] {
  return base64.match(/.{1,120}/g) ?? [];
}

function formatStringExport(name: string, value: string): string {
  return `export const ${name} = ${JSON.stringify(value)};\n`;
}

function formatNumberExport(name: string, value: number): string {
  return `export const ${name} = ${value};\n`;
}

function formatBase64Export(name: string, value: string): string {
  const chunks = chunkBase64(value)
    .map((chunk) => `  ${JSON.stringify(chunk)},`)
    .join("\n");

  return `export const ${name} = [\n${chunks}\n].join("");\n`;
}

async function buildAssetBundle({
  viewBox,
  pathData,
  positiveFill,
}: {
  viewBox: string;
  pathData: string;
  positiveFill: string;
}): Promise<BrandAssetBundle> {
  const positiveSvg = buildLogoSvgMarkup({
    viewBox,
    pathData,
    fill: positiveFill,
  });
  const negativeSvg = buildLogoSvgMarkup({
    viewBox,
    pathData,
    fill: NEGATIVE_FILL,
  });
  const appIconSvg = buildAppIconSvgMarkup({
    viewBox,
    pathData,
    backgroundFill: positiveFill,
    markFill: NEGATIVE_FILL,
  });

  const positiveLogoPng = await rasterizeSvg(positiveSvg, POSITIVE_PNG_SIZE);
  const brandTilePng = await rasterizeSvg(appIconSvg, BRAND_TILE_PNG_SIZE);
  const favicon16 = await rasterizeSvg(appIconSvg, FAVICON_SIZES.ICO_16);
  const favicon32 = await rasterizeSvg(appIconSvg, FAVICON_SIZES.ICO_32);
  const appleTouchPng = await rasterizeSvg(
    appIconSvg,
    FAVICON_SIZES.APPLE_TOUCH,
  );
  const socialImagePng = await rasterizeSvg(appIconSvg, SOCIAL_IMAGE_SIZE);
  const faviconIco = await encodeIco([
    { size: FAVICON_SIZES.ICO_16, png: favicon16 },
    { size: FAVICON_SIZES.ICO_32, png: favicon32 },
  ]).arrayBuffer();

  return {
    positiveFill,
    positiveSvg,
    negativeSvg,
    appIconSvg,
    brandTilePng,
    positiveLogoPng,
    faviconIco,
    appleTouchPng,
    socialImagePng,
  };
}

async function main(): Promise<void> {
  const sourceSvg = normalizeSvg(await readFile(sourceSvgPath, "utf8"));
  const viewBox = extractSvgAttribute(sourceSvg, "viewBox");
  const pathData = extractPathData(sourceSvg);
  const defaultBundle = await buildAssetBundle({
    viewBox,
    pathData,
    positiveFill: extractFill(sourceSvg),
  });

  const file = `// Generated by dev/scripts/generate-brand-assets.ts.
// Do not edit this file directly.

${formatStringExport("JANT_LOGO_VIEW_BOX", viewBox)}${formatStringExport(
    "JANT_LOGO_PATH_DATA",
    pathData,
  )}${formatStringExport(
    "JANT_LOGO_POSITIVE_FILL",
    defaultBundle.positiveFill,
  )}${formatStringExport(
    "JANT_LOGO_NEGATIVE_FILL",
    NEGATIVE_FILL,
  )}${formatNumberExport(
    "JANT_APP_ICON_CORNER_RADIUS",
    APP_ICON_CORNER_RADIUS,
  )}${formatStringExport(
    "JANT_LOGO_POSITIVE_SVG",
    defaultBundle.positiveSvg,
  )}${formatStringExport(
    "JANT_LOGO_NEGATIVE_SVG",
    defaultBundle.negativeSvg,
  )}${formatStringExport(
    "JANT_APP_ICON_SVG",
    defaultBundle.appIconSvg,
  )}${formatBase64Export(
    "JANT_BRAND_TILE_512_PNG_BASE64",
    toBase64(defaultBundle.brandTilePng),
  )}${formatBase64Export(
    "JANT_DEFAULT_FAVICON_ICO_BASE64",
    toBase64(defaultBundle.faviconIco),
  )}${formatBase64Export(
    "JANT_DEFAULT_APPLE_TOUCH_ICON_PNG_BASE64",
    toBase64(defaultBundle.appleTouchPng),
  )}${formatBase64Export(
    "JANT_DEFAULT_SOCIAL_IMAGE_PNG_BASE64",
    toBase64(defaultBundle.socialImagePng),
  )}${formatBase64Export(
    "JANT_LOGO_POSITIVE_512_PNG_BASE64",
    toBase64(defaultBundle.positiveLogoPng),
  )}`;

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, file);
  console.log(`Generated ${outputPath}`);
}

await main();
