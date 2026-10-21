import fs from 'node:fs';
import path from 'node:path';

export function resolveAppFontEffectsFiles(customDirs) {
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

export function patchThemeNamesInFiles(targetFiles) {
  const files = targetFiles || resolveAppFontEffectsFiles();
  let totalPatched = 0;

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log('Skipping missing:', file);
      continue;
    }
    let content = fs.readFileSync(file, 'utf8');
    const before = content;

    content = content.replaceAll(
      'id:"opencodesilver-dark",name:"OpencodeSilver"',
      'id:"opencodesilver-dark",name:"OpencodeSilver"'
    );
    content = content.replaceAll(
      'id:"opencodesilver-light",name:"OpencodeSilver"',
      'id:"opencodesilver-light",name:"OpencodeSilver"'
    );
    content = content.replaceAll(
      'The OpencodeSilver signature',
      'The OpencodeSilver signature'
    );

    if (content !== before) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Successfully updated theme names in:', file);
      totalPatched += 1;
    } else {
      console.log('No matches found in:', file);
    }
  }

  return totalPatched;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  patchThemeNamesInFiles();
}
