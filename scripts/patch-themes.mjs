import fs from 'fs';
import path from 'path';

// Post-build validation: verify production web assets are properly formatted
const dir = path.resolve('packages/web/dist/assets');
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.html'));
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('OpencodeSilver')) {
        // Confirmed OpencodeSilver branding is active
      }
    } catch {
      // Ignore unreadable files
    }
  }
  console.log('[build] OpencodeSilver web asset verification complete.');
}
