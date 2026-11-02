import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { scanContentForSecrets, runPrePackageScan } from '../scripts/verify-no-secrets.mjs';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('VS Code Pre-Package Secret Scanner', () => {
  test('clean code and config pass with 0 errors', () => {
    const cleanContent = `
      export function activate() {
        console.log("OpencodeSilver activated");
      }
    `;
    const issues = scanContentForSecrets(cleanContent, 'extension.js');
    assert.equal(issues.length, 0);
  });

  test('detects Anthropic API key leak', () => {
    const leaked = `const key = "sk-ant-api03-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";`;
    const issues = scanContentForSecrets(leaked, 'extension.js');
    assert.ok(issues.length > 0);
    assert.ok(issues[0]?.includes('Anthropic API Key'));
  });

  test('detects GitHub PAT leak', () => {
    const leaked = `const token = "ghp_111122223333444455556666777788889999";`;
    const issues = scanContentForSecrets(leaked, 'extension.js');
    assert.ok(issues.length > 0);
    assert.ok(issues[0]?.includes('GitHub PAT'));
  });

  test('detects AWS Access Key ID leak', () => {
    const leaked = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;
    const issues = scanContentForSecrets(leaked, 'extension.js');
    assert.ok(issues.length > 0);
    assert.ok(issues[0]?.includes('AWS Access Key ID'));
  });

  test('detects private cryptographic key header', () => {
    const leaked = `-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...`;
    const issues = scanContentForSecrets(leaked, 'key.pem');
    assert.ok(issues.length > 0);
    assert.ok(issues[0]?.includes('Private Key Header'));
  });

  test('runPrePackageScan passes on the actual vscode package directory', () => {
    const errors = runPrePackageScan(packageDir);
    assert.deepEqual(errors, []);
  });
});
