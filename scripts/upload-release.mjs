import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

export function resolveReleaseAssetPath(customVersion) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = customVersion || pkg.version;
  const distDir = path.resolve('packages/electron/dist');
  const expectedName = `OpencodeSilver-${version}-win-x64.exe`;
  const expectedPath = path.join(distDir, expectedName);

  if (fs.existsSync(expectedPath)) {
    return { fileName: expectedName, filePath: expectedPath, version };
  }

  if (fs.existsSync(distDir)) {
    const match = fs.readdirSync(distDir).find(
      (f) => f.startsWith('OpencodeSilver-') && f.endsWith('-win-x64.exe')
    );
    if (match) {
      return { fileName: match, filePath: path.join(distDir, match), version };
    }
  }

  return { fileName: expectedName, filePath: expectedPath, version };
}

async function upload() {
  const { fileName, filePath, version } = resolveReleaseAssetPath();

  if (!fs.existsSync(filePath)) {
    console.error(`Asset file not found at ${filePath}. Build installer first.`);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('GH_TOKEN or GITHUB_TOKEN environment variable required.');
    process.exit(1);
  }

  console.log(`Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB) for version ${version}...`);

  // Query release by tag v${version}
  const releaseUrl = `https://api.github.com/repos/OpencodeSilver/OpencodeSilver/releases/tags/v${version}`;
  const releaseInfo = await new Promise((resolve, reject) => {
    https.get(releaseUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'OpencodeSilver-Uploader',
        'Accept': 'application/vnd.github.v3+json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to find release for v${version}: ${data}`));
        }
      });
    }).on('error', reject);
  });

  const uploadUrl = `https://uploads.github.com/repos/OpencodeSilver/OpencodeSilver/releases/${releaseInfo.id}/assets?name=${encodeURIComponent(fileName)}`;

  const fileStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
  let uploadedBytes = 0;
  fileStream.on('data', (chunk) => {
    uploadedBytes += chunk.length;
    const pct = ((uploadedBytes / fileSize) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${pct}% (${(uploadedBytes / (1024 * 1024)).toFixed(1)} / ${(fileSize / (1024 * 1024)).toFixed(1)} MB)`);
  });

  const req = https.request(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'OpencodeSilver-Uploader',
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileSize,
    },
    timeout: 300000,
  }, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
      console.log(`\nResponse: ${res.statusCode}`);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Upload successful!');
      } else {
        console.error('Upload failed:', body);
      }
    });
  });

  req.on('error', (e) => {
    console.error('\nUpload error:', e);
  });

  fileStream.pipe(req);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  upload();
}
