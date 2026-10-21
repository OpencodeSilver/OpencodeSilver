import { describe, expect, test } from 'bun:test';
import { scanContentForSecrets, runPrePackageScan } from '../scripts/verify-no-secrets.mjs';

describe('VS Code Pre-Package Secret Scanner', () => {
  test('clean code and config pass with 0 errors', () => {
    const cleanContent = `
      export function activate() {
        console.log("OpencodeSilver activated");
      }
    `;
    const issues = scanContentForSecrets(cleanContent, 'extension.js');
    expect(issues.length).toBe(0);
  });

  test('detects Anthropic API key leak', () => {
    const leaked = `const key = "sk-ant-api03-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";`;
    const issues = scanContentForSecrets(leaked, 'extension.js');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('Anthropic API Key');
  });

  test('detects GitHub PAT leak', () => {
    const leaked = `const token = "ghp_111122223333444455556666777788889999";`;
    const issues = scanContentForSecrets(leaked, 'extension.js');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('GitHub PAT');
  });

  test('detects AWS Access Key ID leak', () => {
    const leaked = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;
    const issues = scanContentForSecrets(leaked, 'extension.js');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('AWS Access Key ID');
  });

  test('detects private cryptographic key header', () => {
    const leaked = `-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...`;
    const issues = scanContentForSecrets(leaked, 'key.pem');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('Private Key Header');
  });

  test('runPrePackageScan passes on the actual vscode package directory', () => {
    const errors = runPrePackageScan();
    expect(errors.length).toBe(0);
  });
});
