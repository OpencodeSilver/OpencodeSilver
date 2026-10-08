import { describe, expect, test } from 'bun:test';
import { parseIssueReference } from './issueReference';

describe('parseIssueReference', () => {
  test('parses issue numbers', () => {
    expect(parseIssueReference('42')).toEqual({ number: 42 });
    expect(parseIssueReference('#42')).toEqual({ number: 42 });
  });

  test('parses GitHub issue URLs', () => {
    expect(parseIssueReference('https://github.com/opencodesilver/opencodesilver/issues/42')).toEqual({
      number: 42,
      identity: { provider: 'github', instance: 'github.com' },
      project: { owner: 'opencodesilver', name: 'opencodesilver' },
    });
  });

  test('parses GitLab issue URLs with nested groups', () => {
    expect(parseIssueReference('https://gitlab.example.com/platform/tools/opencodesilver/-/issues/42')).toEqual({
      number: 42,
      identity: { provider: 'gitlab', instance: 'https://gitlab.example.com' },
      project: { owner: 'platform/tools', name: 'opencodesilver' },
    });
  });

  test('rejects unrelated and invalid references', () => {
    expect(parseIssueReference('https://github.com/opencodesilver/opencodesilver/pull/42')).toBeNull();
    expect(parseIssueReference('#0')).toBeNull();
    expect(parseIssueReference('issue 42')).toBeNull();
  });
});
