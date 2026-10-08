import fs from 'fs';
import path from 'path';

const dir = path.resolve('packages/web/dist/assets');
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir).filter(f => f.startsWith('useAppFontEffects') && f.endsWith('.js'));
  for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replaceAll('OpenChamber (Dark)', 'OpencodeSilver (Dark)');
    content = content.replaceAll('OpenChamber (Light)', 'OpencodeSilver (Light)');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Successfully patched theme names in ${file}`);
  }
}
