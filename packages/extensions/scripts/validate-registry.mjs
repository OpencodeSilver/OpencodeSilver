import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const registryFile = path.resolve(here, '../registry.json');

const raw = fs.readFileSync(registryFile, 'utf8');
const data = JSON.parse(raw);

if (data.version !== 1 || !Array.isArray(data.extensions)) {
  console.error('Invalid registry.json: version must be 1 and extensions must be an array');
  process.exit(1);
}
console.log(`Extensions registry valid: ${data.extensions.length} extension(s) declared.`);
