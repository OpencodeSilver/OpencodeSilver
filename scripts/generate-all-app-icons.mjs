import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const iconWinSvgPath = path.join(repoRoot, 'packages', 'electron', 'resources', 'icons', 'icon-win.svg');
const appIconSvgPath = path.join(repoRoot, 'packages', 'electron', 'resources', 'icons', 'app-icon.svg');
const logoDarkSvgPath = path.join(repoRoot, 'packages', 'web', 'public', 'logo-dark-512x512.svg');
const logoLightSvgPath = path.join(repoRoot, 'packages', 'web', 'public', 'logo-light-512x512.svg');

const electronIconsDir = path.join(repoRoot, 'packages', 'electron', 'resources', 'icons');
const webPublicDir = path.join(repoRoot, 'packages', 'web', 'public');

function createIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count

  let offset = 6 + count * 16;
  const dirEntries = [];

  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // image byte size
    entry.writeUInt32LE(offset, 12); // image byte offset
    dirEntries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function generate() {
  console.log('[icons] generating all PNG and ICO files from updated SVGs...');

  const iconWinSvg = fs.readFileSync(iconWinSvgPath);
  const appIconSvg = fs.readFileSync(appIconSvgPath);
  const logoDarkSvg = fs.readFileSync(logoDarkSvgPath);
  const logoLightSvg = fs.readFileSync(logoLightSvgPath);

  // 1. Electron icon.png (512x512) and app-icon.png (512x512)
  await sharp(iconWinSvg).resize(512, 512).png().toFile(path.join(electronIconsDir, 'icon.png'));
  await sharp(appIconSvg).resize(512, 512).png().toFile(path.join(electronIconsDir, 'app-icon.png'));

  // 2. Electron icon.ico (16, 24, 32, 48, 64, 128, 256)
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoBuffers = await Promise.all(
    icoSizes.map(size => sharp(iconWinSvg).resize(size, size).png().toBuffer())
  );
  const icoData = createIco(icoBuffers, icoSizes);
  fs.writeFileSync(path.join(electronIconsDir, 'icon.ico'), icoData);
  console.log(`[icons] generated ${path.join(electronIconsDir, 'icon.ico')} (${icoData.length} bytes)`);

  // 3. Web public PNG icons
  await sharp(appIconSvg).resize(32, 32).png().toFile(path.join(webPublicDir, 'favicon-32.png'));
  await sharp(appIconSvg).resize(16, 16).png().toFile(path.join(webPublicDir, 'favicon-16.png'));
  await sharp(appIconSvg).resize(32, 32).png().toFile(path.join(webPublicDir, 'favicon.png'));

  await sharp(appIconSvg).resize(180, 180).png().toFile(path.join(webPublicDir, 'apple-touch-icon-180x180.png'));
  await sharp(appIconSvg).resize(180, 180).png().toFile(path.join(webPublicDir, 'apple-touch-icon.png'));
  await sharp(appIconSvg).resize(167, 167).png().toFile(path.join(webPublicDir, 'apple-touch-icon-167x167.png'));
  await sharp(appIconSvg).resize(152, 152).png().toFile(path.join(webPublicDir, 'apple-touch-icon-152x152.png'));
  await sharp(appIconSvg).resize(120, 120).png().toFile(path.join(webPublicDir, 'apple-touch-icon-120x120.png'));

  await sharp(appIconSvg).resize(192, 192).png().toFile(path.join(webPublicDir, 'pwa-192.png'));
  await sharp(appIconSvg).resize(512, 512).png().toFile(path.join(webPublicDir, 'pwa-512.png'));
  await sharp(appIconSvg).resize(192, 192).png().toFile(path.join(webPublicDir, 'pwa-maskable-192.png'));
  await sharp(appIconSvg).resize(512, 512).png().toFile(path.join(webPublicDir, 'pwa-maskable-512.png'));

  // 4. VS Code extension icon
  const vscodeAssetsDir = path.join(repoRoot, 'packages', 'vscode', 'assets');
  if (fs.existsSync(vscodeAssetsDir)) {
    await sharp(appIconSvg).resize(512, 512).png().toFile(path.join(vscodeAssetsDir, 'app-icon.png'));
  }

  // 5. Electron dev-icon
  await sharp(appIconSvg).resize(512, 512).png().toFile(path.join(electronIconsDir, 'dev-icon.png'));

  // 6. Mobile assets
  const mobileAssetsDir = path.join(repoRoot, 'packages', 'mobile', 'assets');
  if (fs.existsSync(mobileAssetsDir)) {
    await sharp(appIconSvg).resize(512, 512).png().toFile(path.join(mobileAssetsDir, 'icon-only.png'));
    await sharp(appIconSvg).resize(512, 512).png().toFile(path.join(mobileAssetsDir, 'icon-foreground.png'));
  }

  // 7. Electron Tray template icons (from updated tray-glyph.svg)
  const trayDir = path.join(electronIconsDir, 'tray');
  const trayGlyphSvgPath = path.join(trayDir, 'tray-glyph.svg');
  if (fs.existsSync(trayGlyphSvgPath)) {
    const trayGlyphSvg = fs.readFileSync(trayGlyphSvgPath);
    await sharp(trayGlyphSvg).resize(16, 16).png().toFile(path.join(trayDir, 'trayTemplate-idle.png'));
    await sharp(trayGlyphSvg).resize(32, 32).png().toFile(path.join(trayDir, 'trayTemplate-idle@2x.png'));
    await sharp(trayGlyphSvg).resize(16, 16).png().toFile(path.join(trayDir, 'trayTemplate-unseen.png'));
    await sharp(trayGlyphSvg).resize(32, 32).png().toFile(path.join(trayDir, 'trayTemplate-unseen@2x.png'));

    for (let i = 0; i <= 15; i++) {
      const pad = String(i).padStart(2, '0');
      await sharp(trayGlyphSvg).resize(16, 16).png().toFile(path.join(trayDir, `trayTemplate-breath-${pad}.png`));
      await sharp(trayGlyphSvg).resize(32, 32).png().toFile(path.join(trayDir, `trayTemplate-breath-${pad}@2x.png`));
    }
  }

  console.log('[icons] all icons successfully generated!');
}

generate().catch((err) => {
  console.error('[icons] failed to generate icons:', err);
  process.exit(1);
});
