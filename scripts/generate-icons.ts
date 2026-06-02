/**
 * generate-icons.ts — rasterize public/icon.svg into the PWA icon set + OG images.
 * Uses `sharp` (already bundled with Next). Run: npm run icons
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const PUB = join(process.cwd(), "public");
const ICONS = join(PUB, "icons");
const svg = readFileSync(join(PUB, "icon.svg"));
const WARM_BG = "#0D0A08";

async function main(): Promise<void> {
  mkdirSync(ICONS, { recursive: true });

  // App / PWA icons
  await sharp(svg).resize(192, 192).png().toFile(join(ICONS, "icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(join(ICONS, "icon-512.png"));
  await sharp(svg).resize(180, 180).png().toFile(join(ICONS, "icon-apple-180.png"));
  await sharp(svg).resize(512, 512).png().toFile(join(ICONS, "icon-maskable-512.png"));

  // Open Graph: icon centered on a warm background (no system-font text → portable)
  const og = await sharp(svg).resize(360, 360).png().toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: WARM_BG } })
    .composite([{ input: og, gravity: "center" }])
    .png()
    .toFile(join(PUB, "og-image.png"));

  const ogSq = await sharp(svg).resize(720, 720).png().toBuffer();
  await sharp({ create: { width: 1080, height: 1080, channels: 4, background: WARM_BG } })
    .composite([{ input: ogSq, gravity: "center" }])
    .png()
    .toFile(join(PUB, "og-image-square.png"));

  console.info("[icons] Generados: 192/512/apple-180/maskable-512 + og-image(.square)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
