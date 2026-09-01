#!/usr/bin/env node
/**
 * Rasterises the brand SVGs in src/assets into every icon and social image the
 * site references: favicons (PNG + multi-resolution .ico), Apple touch icons,
 * PWA icons, Windows tiles, Open Graph and Twitter cards.
 *
 * Chromium does the rendering so the output matches what a browser draws.
 * Generated files land in public/ and are committed, so a normal `npm run build`
 * never needs a browser.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = resolve(root, "src/assets");
const outDir = resolve(root, "public/images");
const iconDir = resolve(root, "public/icons");
mkdirSync(outDir, { recursive: true });
mkdirSync(iconDir, { recursive: true });

/** Icon sizes rendered from the square shield mark. */
const ICON_SIZES = [16, 32, 48, 57, 60, 64, 70, 72, 76, 96, 114, 120, 128, 144, 150, 152, 167, 180, 192, 256, 310, 384, 512];
/** Sizes packed into favicon.ico. */
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function renderSvg(page, svg, width, height, background = null) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:${background ?? "transparent"};}
    svg{display:block;width:${width}px;height:${height}px;}
  </style></head><body>${svg}</body></html>`;
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: "load" });
  return page.screenshot({ omitBackground: background === null, type: "png" });
}

/** Minimal ICO container around a set of already-encoded PNGs. */
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width  (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((png) => png.data)]);
}

async function main() {
  const mark = readFileSync(resolve(assets, "logo-mark.svg"), "utf8");
  const og = readFileSync(resolve(assets, "og-image.svg"), "utf8");

  const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--disable-lcd-text"] });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  const icoParts = [];
  for (const size of ICON_SIZES) {
    const png = await renderSvg(page, mark, size, size);
    writeFileSync(resolve(iconDir, `icon-${size}.png`), png);
    if (ICO_SIZES.includes(size)) icoParts.push({ size, data: png });
  }

  // Named copies for the tags browsers actually look for.
  const copy = (from, to) => writeFileSync(resolve(root, to), readFileSync(resolve(iconDir, from)));
  copy("icon-180.png", "public/apple-touch-icon.png");
  copy("icon-180.png", "public/apple-touch-icon-precomposed.png");
  copy("icon-192.png", "public/icons/android-chrome-192x192.png");
  copy("icon-512.png", "public/icons/android-chrome-512x512.png");
  copy("icon-32.png", "public/favicon-32x32.png");
  copy("icon-16.png", "public/favicon-16x16.png");
  copy("icon-150.png", "public/icons/mstile-150x150.png");
  copy("icon-310.png", "public/icons/mstile-310x310.png");
  copy("icon-70.png", "public/icons/mstile-70x70.png");

  writeFileSync(resolve(root, "public/favicon.ico"), buildIco(icoParts));
  writeFileSync(resolve(root, "public/logo-icon.ico"), buildIco(icoParts));

  // Maskable PWA icons need the mark inset inside a full-bleed safe area.
  for (const size of [192, 512]) {
    const maskable = `<div style="width:${size}px;height:${size}px;background:#0A1F45;display:flex;align-items:center;justify-content:center">
      <div style="width:${Math.round(size * 0.62)}px">${mark}</div></div>`;
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}svg{width:100%;height:auto;display:block}</style></head><body>${maskable}</body></html>`);
    writeFileSync(resolve(iconDir, `maskable-${size}.png`), await page.screenshot({ type: "png" }));
  }

  // Social cards.
  const ogPng = await renderSvg(page, og, 1200, 630, "#0A1F45");
  writeFileSync(resolve(outDir, "og-image.png"), ogPng);
  writeFileSync(resolve(outDir, "twitter-card.png"), ogPng);
  const squarePng = await renderSvg(page, og, 1200, 1200, "#0A1F45");
  writeFileSync(resolve(outDir, "og-image-square.png"), squarePng);

  await browser.close();

  const generated = ICON_SIZES.length + 2 + 9 + 4 + 3;
  process.stdout.write(`Generated ${generated} icon and social image files in public/.\n`);
  if (!existsSync(resolve(root, "public/favicon.ico"))) throw new Error("favicon.ico was not written");
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
