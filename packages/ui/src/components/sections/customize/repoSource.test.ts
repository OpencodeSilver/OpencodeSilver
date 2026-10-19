import { describe, expect, test as it } from 'bun:test';

import { catalogIdFor, parseRepoInput } from './repoSource';

describe('parseRepoInput', () => {
  it('accepts owner/repo shorthand', () => {
    expect(parseRepoInput('anthropics/skills')).toEqual({ ok: true, owner: 'anthropics', repo: 'skills', normalizedSource: 'anthropics/skills' });
  });

  it('reads branch and folder from a tree URL', () => {
    expect(parseRepoInput('https://github.com/openai/skills/tree/main/skills/.curated')).toEqual({
      ok: true, owner: 'openai', repo: 'skills', ref: 'main', subpath: 'skills/.curated', normalizedSource: 'openai/skills',
    });
  });

  it('accepts SSH remotes on GitHub only', () => {
    expect(parseRepoInput('git@github.com:a/b.git')).toMatchObject({ ok: true, normalizedSource: 'a/b' });
    expect(parseRepoInput('git@gitlab.com:a/b.git')).toEqual({ ok: false, error: 'unsupportedHost' });
  });

  it('rejects credentials, other hosts and odd input', () => {
    expect(parseRepoInput('https://user:pw@github.com/a/b')).toEqual({ ok: false, error: 'embeddedCredentials' });
    expect(parseRepoInput('https://gitlab.com/a/b')).toEqual({ ok: false, error: 'unsupportedHost' });
    expect(parseRepoInput('javascript:alert(1)')).toEqual({ ok: false, error: 'invalidFormat' });
    expect(parseRepoInput('  ')).toEqual({ ok: false, error: 'empty' });
    expect(parseRepoInput('just-a-name')).toEqual({ ok: false, error: 'invalidFormat' });
  });
});

describe('catalogIdFor', () => {
  it('suffixes ids that are taken', () => {
    expect(catalogIdFor('a/b', undefined)).toBe('custom:a-b');
    expect(catalogIdFor('a/b', 'skills', new Set(['custom:a-b-skills']))).toBe('custom:a-b-skills-2');
  });
});
