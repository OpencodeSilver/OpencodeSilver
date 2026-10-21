import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../');
const registryFile = path.resolve(here, '../registry.json');

const raw = fs.readFileSync(registryFile, 'utf8');
const data = JSON.parse(raw);

if (data.version !== 1 || !Array.isArray(data.extensions)) {
  console.error('Invalid registry.json: version must be 1 and extensions must be an array');
  process.exit(1);
}

// Validate built-in extensions if declared
for (const ext of data.extensions) {
  if (!ext.id || !ext.directory) {
    console.error(`Invalid built-in extension entry: ${JSON.stringify(ext)}`);
    process.exit(1);
  }
}

// Validate extension gallery if declared
if (data.gallery !== undefined) {
  if (!Array.isArray(data.gallery)) {
    console.error('Invalid registry.json: gallery must be an array');
    process.exit(1);
  }

  for (const item of data.gallery) {
    if (!item.id || !item.name || !item.directory || !item.title) {
      console.error(`Invalid gallery extension entry: ${JSON.stringify(item)}`);
      process.exit(1);
    }

    const itemPath = path.resolve(repoRoot, item.directory);
    if (!fs.existsSync(itemPath)) {
      console.error(`Gallery extension path does not exist: ${itemPath}`);
      process.exit(1);
    }

    const pkgPath = path.join(itemPath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      console.error(`Gallery extension missing package.json: ${pkgPath}`);
      process.exit(1);
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name !== item.name) {
      console.error(`Package name mismatch for ${item.id}: expected ${item.name}, found ${pkg.name}`);
      process.exit(1);
    }

    if (!pkg.opencodesilver?.contributes) {
      console.error(`Gallery extension missing opencodesilver.contributes: ${item.id}`);
      process.exit(1);
    }
  }
}

console.log(`Extensions registry valid: ${data.extensions.length} built-in(s), ${data.gallery?.length ?? 0} gallery extension(s) verified.`);
