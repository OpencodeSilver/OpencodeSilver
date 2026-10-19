import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const electronDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(electronDir, '..', '..');
const require = createRequire(import.meta.url);

const prepareCliScript = path.join(__dirname, 'prepare-opencode-cli.mjs');

const runAsync = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      windowsHide: true,
      ...options,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`));
    });
    child.on('error', reject);
  });

const patchMacPackagerForCrossPlatform = () => {
  const packagerJsCandidates = [
    path.join(repoRoot, 'node_modules', '.bun', 'app-builder-lib@26.8.1+378fa37387592c70', 'node_modules', 'app-builder-lib', 'out', 'packager.js'),
    path.join(repoRoot, 'node_modules', '.bun', 'node_modules', 'app-builder-lib', 'out', 'packager.js'),
  ];
  for (const candidate of packagerJsCandidates) {
    if (!fs.existsSync(candidate)) continue;
    const original = fs.readFileSync(candidate, 'utf8');
    const guard = 'if (platform === core_1.Platform.MAC && process.platform === core_1.Platform.WINDOWS.nodeName)';
    if (original.includes(guard)) {
      const patched = original.replace(
        guard,
        'if (false && platform === core_1.Platform.MAC && process.platform === core_1.Platform.WINDOWS.nodeName)'
      );
      fs.writeFileSync(candidate, patched, 'utf8');
      console.log(`[electron] enabled cross-platform macOS archive packaging in ${candidate}`);
    }
  }
};

const buildMacArch = async (arch) => {
  console.log(`\n[electron] === Preparing & packaging macOS (${arch}) ===`);
  const env = {
    ...process.env,
    OPENCODESILVER_TARGET_PLATFORM: 'darwin',
    OPENCODESILVER_TARGET_ARCH: arch,
    CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  };

  await runAsync(process.execPath, [prepareCliScript], {
    cwd: electronDir,
    env,
  });

  await runAsync(
    process.execPath,
    [
      path.join(__dirname, 'package.mjs'),
      '--mac',
      'zip',
      `--${arch}`,
      '--config.mac.identity=null',
      '--config.mac.notarize=false',
    ],
    {
      cwd: electronDir,
      env,
    }
  );
};

const main = async () => {
  patchMacPackagerForCrossPlatform();
  await buildMacArch('arm64');
  await buildMacArch('x64');
  // Restore Windows OpenCode CLI in resources/opencode-cli after macOS builds
  await runAsync(process.execPath, [prepareCliScript], {
    cwd: electronDir,
    env: { ...process.env, OPENCODESILVER_TARGET_ARCH: 'x64' },
  });
  console.log('\n[electron] Completed macOS arm64 and x64 builds!');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
