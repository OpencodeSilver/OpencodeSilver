import { readFileSync, writeFileSync } from 'node:fs';

const files = ['en.ts', 'en.settings.ts'];
for (const file of files) {
  const filePath = `packages/ui/src/lib/i18n/messages/${file}`;
  const content = readFileSync(filePath, 'utf8');
  let count = 0;
  // Match property values: : 'value' or : "value"
  const replaced = content.replace(/:\s*(')([^']*)(')/g, (fullMatch, q1, val, q2) => {
    if (val.includes('OpencodeSilver')) {
      count++;
      return `: ${q1}${val.replaceAll('OpencodeSilver', 'OpencodeSilver')}${q2}`;
    }
    return fullMatch;
  });
  console.log(`${file}: replaced ${count} string values with OpencodeSilver`);
  writeFileSync(filePath, replaced, 'utf8');
}
