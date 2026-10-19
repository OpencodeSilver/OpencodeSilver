import { describe, expect, test } from 'bun:test';
import { scanTextForSecrets } from './secretScanner';

describe('secretScanner', () => {
  test('detects OpenAI API keys and redacts them', () => {
    const input = 'Here is my key: sk-proj-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz';
    const result = scanTextForSecrets(input);
    expect(result.hasSecrets).toBe(true);
    expect(result.detectedTypes).toContain('OpenAI API Key');
    expect(result.redactedText).not.toContain('1234567890abcdef');
    expect(result.redactedText).toContain('[REDACTED_SECRET]');
  });

  test('detects GitHub Personal Access Tokens', () => {
    const input = 'Using token ghp_111122223333444455556666777788889999 to authenticate';
    const result = scanTextForSecrets(input);
    expect(result.hasSecrets).toBe(true);
    expect(result.detectedTypes).toContain('GitHub Personal Access Token');
    expect(result.redactedText).toContain('[REDACTED_SECRET]');
  });

  test('detects Anthropic API keys', () => {
    const input = 'export ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    const result = scanTextForSecrets(input);
    expect(result.hasSecrets).toBe(true);
    expect(result.detectedTypes).toContain('Anthropic API Key');
  });

  test('returns clean result when no secrets are present', () => {
    const input = 'This is a normal coding instruction with console.log("Hello world");';
    const result = scanTextForSecrets(input);
    expect(result.hasSecrets).toBe(false);
    expect(result.detectedTypes.length).toBe(0);
    expect(result.redactedText).toBe(input);
  });
});
