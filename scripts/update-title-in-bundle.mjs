import fs from 'node:fs';
import path from 'node:path';

const explicitPaths = [
  'packages/electron/resources/web-dist/assets/useAppFontEffects-DFc9Zmvo.js',
  'packages/electron/dist/win-unpacked/resources/web-dist/assets/useAppFontEffects-DFc9Zmvo.js',
  'packages/web/dist/assets/useAppFontEffects-DFc9Zmvo.js'
];

for (const p of explicitPaths) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    const target = 'FXe="OpencodeSilver"';
    const replacement = 'FXe="opencodesilver"';
    if (c.includes(target)) {
      c = c.replaceAll(target, replacement);
      fs.writeFileSync(p, c);
      console.log('Updated ' + p);
    }
  }
}

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
      if (content.includes('="OpencodeSilver"')) {
        content = content.replaceAll('="OpencodeSilver"', '="opencodesilver"');
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(full, content);
        console.log('Updated vscode asset ' + f);
      }
    }
  }
}
