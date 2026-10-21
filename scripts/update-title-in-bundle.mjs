import fs from 'node:fs';
import path from 'node:path';

export function resolveBundleChunkFiles(customDirs) {
  const assetDirs = customDirs || [
    'packages/electron/resources/web-dist/assets',
    'packages/electron/dist/win-unpacked/resources/web-dist/assets',
    'packages/web/dist/assets',
  ];

  const resolved = [];
  for (const dir of assetDirs) {
    if (!fs.existsSync(dir)) continue;
    const matches = fs.readdirSync(dir).filter(
      (f) => f.startsWith('useAppFontEffects') && f.endsWith('.js')
    );
    for (const match of matches) {
      resolved.push(path.join(dir, match));
    }
  }
  return resolved;
}

export function patchTitlesInBundle(customFiles, includeVscode = (customFiles === undefined)) {
  const files = customFiles || resolveBundleChunkFiles();
  let modifiedCount = 0;

  for (const p of files) {
    if (fs.existsSync(p)) {
      let c = fs.readFileSync(p, 'utf8');
      const target = 'FXe="OpencodeSilver"';
      const replacement = 'FXe="opencodesilver"';
      if (c.includes(target)) {
        c = c.replaceAll(target, replacement);
        fs.writeFileSync(p, c);
        console.log('Updated ' + p);
        modifiedCount += 1;
      }
    }
  }

  if (includeVscode) {
    const vscodeAssetDir = 'packages/vscode/dist/webview/assets';
    if (fs.existsSync(vscodeAssetDir)) {
      for (const f of fs.readdirSync(vscodeAssetDir)) {
        if (f.endsWith('.js')) {
          const full = path.join(vscodeAssetDir, f);
          let content = fs.readFileSync(full, 'utf8');
          let modified = false;
          if (content.includes('="OpencodeSilver"')) {
            content = content.replaceAll('="OpencodeSilver"', '="opencodesilver"');
            modified = true;
          }
          if (modified) {
            fs.writeFileSync(full, content);
            console.log('Updated vscode asset ' + f);
            modifiedCount += 1;
          }
        }
      }
    }
  }

  return modifiedCount;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  patchTitlesInBundle();
}
