import fs from 'node:fs';

function extractKeys(content) {
  const keys = [];
  const regex = /^\s*['"]([^'"]+)['"]\s*:\s*(['"`])/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

const en = fs.readFileSync('packages/ui/src/lib/i18n/messages/en.ts', 'utf8');
const enSet = fs.readFileSync('packages/ui/src/lib/i18n/messages/en.settings.ts', 'utf8');
console.log('en.ts keys count:', extractKeys(en).length);
console.log('en.settings.ts keys count:', extractKeys(enSet).length);
