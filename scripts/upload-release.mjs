import fs from 'fs';
import https from 'https';

async function upload() {
  const filePath = 'packages/electron/dist/OpencodeSilver-2.4.0-win-x64.exe';
  const fileName = 'OpencodeSilver-2.4.0-win-x64.exe';
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const token = process.env.GH_TOKEN;

  console.log(`Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

  const url = `https://uploads.github.com/repos/OpencodeSilver/OpencodeSilver/releases/405198367/assets?name=${encodeURIComponent(fileName)}`;

  const fileStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });

  let uploadedBytes = 0;
  fileStream.on('data', (chunk) => {
    uploadedBytes += chunk.length;
    const pct = ((uploadedBytes / fileSize) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${pct}% (${(uploadedBytes / (1024 * 1024)).toFixed(1)} / ${(fileSize / (1024 * 1024)).toFixed(1)} MB)`);
  });

  const req = https.request(url, {
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

upload();
