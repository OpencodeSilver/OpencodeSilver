import assert from 'node:assert/strict';
import test from 'node:test';

import { checkForDesktopUpdate } from './updater-check.mjs';

const compareVersions = (left, right) => left.localeCompare(right, undefined, { numeric: true });

test('signals failed checks without replacing an existing pending update', async () => {
  const pendingUpdate = { version: '2.0.0', electronUpdate: { id: 'existing' } };
  await assert.rejects(
    checkForDesktopUpdate({
      autoUpdater: { checkForUpdates: async () => { throw new Error('feed unavailable'); } },
      currentVersion: '1.0.0',
      pendingUpdate,
      compareVersions,
    }),
    /Unable to check for updates: feed unavailable.*network connection/,
  );
  assert.deepEqual(pendingUpdate, { version: '2.0.0', electronUpdate: { id: 'existing' } });
});

test('treats missing update feed (404) as no update available', async () => {
  const result = await checkForDesktopUpdate({
    autoUpdater: {
      checkForUpdates: async () => {
        throw new Error('HttpError: 404 Not Found "https://github.com/.../latest-linux.yml"');
      },
    },
    currentVersion: '1.15.0',
    pendingUpdate: { version: '1.16.0' },
    compareVersions,
  });
  assert.equal(result.available, false);
  assert.equal(result.pendingUpdate, null);
  assert.equal(result.nextVersion, '1.15.0');
});

test('authoritative no-update result clears pending update', async () => {
  const result = await checkForDesktopUpdate({
    autoUpdater: { checkForUpdates: async () => ({ updateInfo: { version: '1.0.0' } }) },
    currentVersion: '1.0.0',
    pendingUpdate: { version: '2.0.0' },
    compareVersions,
  });
  assert.equal(result.available, false);
  assert.equal(result.pendingUpdate, null);
});

test('treats "No published versions on GitHub" as no update available', async () => {
  const result = await checkForDesktopUpdate({
    autoUpdater: {
      checkForUpdates: async () => {
        throw new Error('No published versions on GitHub');
      },
    },
    currentVersion: '3.0.0',
    pendingUpdate: null,
    compareVersions,
  });
  assert.equal(result.available, false);
  assert.equal(result.pendingUpdate, null);
  assert.equal(result.nextVersion, '3.0.0');
});

test('isMissingUpdateFeedError recognises a missing feed but not network failures', async () => {
  const { isMissingUpdateFeedError } = await import('./updater-check.mjs');
  assert.equal(isMissingUpdateFeedError(new Error('No published versions on GitHub')), true);
  assert.equal(isMissingUpdateFeedError(new Error('HttpError: 404 \n"method: GET url: https://github.com/o/r/releases.atom"')), true);
  assert.equal(isMissingUpdateFeedError('Error: No published versions on GitHub'), true);
  assert.equal(isMissingUpdateFeedError(new Error('net::ERR_INTERNET_DISCONNECTED')), false);
  assert.equal(isMissingUpdateFeedError(undefined), false);
});
