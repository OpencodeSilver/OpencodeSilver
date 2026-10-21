import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { shouldBlockGuestFrameNavigation } from './guest-frame-navigation.mjs';

describe('Electron WebPreferences & Sandbox Isolation Security', () => {
  test('main window options configure context isolation and disable node integration', () => {
    const earlyStartupPath = path.resolve(import.meta.dirname, 'early-startup.mjs');
    const content = fs.readFileSync(earlyStartupPath, 'utf8');

    const match = content.match(/webPreferences:\s*\{([\s\S]*?)\}/);
    expect(match).toBeTruthy();
    const prefsText = match[1];

    expect(prefsText).toContain('contextIsolation: true');
    expect(prefsText).toContain('nodeIntegration: false');
    expect(prefsText).toContain('sandbox: false');
    expect(prefsText).toContain('webviewTag: true');
    expect(prefsText).toContain('// sandbox must stay off');
  });

  test('mini-chat window configuration in main.mjs disables webviewTag', () => {
    const mainPath = path.resolve(import.meta.dirname, 'main.mjs');
    const mainContent = fs.readFileSync(mainPath, 'utf8');

    const match = mainContent.match(/webPreferences:\s*\{[\s\S]*?sandbox:\s*false,[\s\S]*?\},[\s\S]*?__ocMiniChat = true;/);
    expect(match).toBeTruthy();
    const prefsText = match[0];

    expect(prefsText).toContain('contextIsolation: true');
    expect(prefsText).toContain('nodeIntegration: false');
    expect(prefsText).toContain('webviewTag: false');
    expect(prefsText).toContain('sandbox: false');
  });

  test('defense-in-depth: guest frame navigation blocks subframe escapes', () => {
    const blocked = shouldBlockGuestFrameNavigation({
      isMainFrame: false,
      frameOrigin: 'null',
      frame: { url: 'data:text/html,...', parent: {} },
      initiator: null,
      mainFrame: { url: 'http://127.0.0.1:3001' },
      url: 'https://malicious.example.com/exfiltrate?data=secret',
      isAppOrigin: (u) => u.startsWith('http://127.0.0.1:3001'),
    });

    expect(blocked).toBe(true);
  });
});
