/**
 * Parsing a GitHub repository the user pasted (owner/repo, an https URL with
 * an optional /tree/<branch>/<path>, or git@github.com:owner/repo.git) and
 * saving it as a skill catalog source.
 */

import type { SkillCatalogConfig } from '@/lib/desktop';
import { loadDesktopSettings, updateDesktopSettings } from '@/lib/persistence';

export type RepoParseError = 'empty' | 'invalidFormat' | 'unsupportedHost' | 'embeddedCredentials';

export type RepoParseResult =
  | { ok: true; owner: string; repo: string; ref?: string; subpath?: string; normalizedSource: string }
  | { ok: false; error: RepoParseError };

const BLOCKED_SCHEMES = ['javascript:', 'file:', 'data:', 'ftp:', 'mailto:'];
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const isGitHubHost = (host: string) => host === 'github.com' || host === 'www.github.com';

/** `tree/<ref>/<path…>` after owner/repo. */
const treeParts = (segments: string[], start: number): { ref?: string; subpath?: string } => {
  if (segments.length < start + 2 || segments[start] !== 'tree') return {};
  const ref = segments[start + 1];
  const rest = segments.slice(start + 2);
  return { ref, subpath: rest.length > 0 ? rest.join('/') : undefined };
};

const fail = (error: RepoParseError): RepoParseResult => ({ ok: false, error });

export function parseRepoInput(input: string): RepoParseResult {
  const value = input.trim();
  if (!value) return fail('empty');
  const lower = value.toLowerCase();
  if (BLOCKED_SCHEMES.some((scheme) => lower.startsWith(scheme))) return fail('invalidFormat');

  if (value.startsWith('git@')) {
    if ((value.match(/@/g) ?? []).length > 1) return fail('embeddedCredentials');
    const match = value.match(/^git@([^:]+):([^/\s]+)\/([^/\s]+?)(\.git)?$/i);
    if (!match) {
      const host = value.match(/^git@([^:]+):/);
      return fail(host && host[1].toLowerCase() !== 'github.com' ? 'unsupportedHost' : 'invalidFormat');
    }
    if (match[1].toLowerCase() !== 'github.com') return fail('unsupportedHost');
    return { ok: true, owner: match[2], repo: match[3], normalizedSource: `${match[2]}/${match[3]}` };
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return fail('invalidFormat');
    }
    if (url.username || url.password) return fail('embeddedCredentials');
    if (!isGitHubHost(url.hostname.toLowerCase())) return fail('unsupportedHost');
    const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
    if (segments.length < 2) return fail('invalidFormat');
    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/i, '');
    if (!owner || !repo) return fail('invalidFormat');
    return { ok: true, owner, repo, ...treeParts(segments, 2), normalizedSource: `${owner}/${repo}` };
  }

  if (value.includes(':')) return fail('invalidFormat');
  const segments = value.split('/').filter(Boolean);
  if (segments.length === 2) {
    const [owner, rawRepo] = segments;
    const repo = rawRepo.replace(/\.git$/i, '');
    if (!NAME_PATTERN.test(owner) || !NAME_PATTERN.test(repo)) return fail('invalidFormat');
    return { ok: true, owner, repo, normalizedSource: `${owner}/${repo}` };
  }
  if (segments.length > 2 && segments[0].includes('.')) {
    if (!isGitHubHost(segments[0].toLowerCase())) return fail('unsupportedHost');
    const owner = segments[1];
    const repo = segments[2].replace(/\.git$/i, '');
    return { ok: true, owner, repo, ...treeParts(segments, 3), normalizedSource: `${owner}/${repo}` };
  }
  return fail('invalidFormat');
}

const slug = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');

/** A stable `custom:` id for a source, suffixed when it would collide. */
export function catalogIdFor(source: string, subpath: string | undefined, taken?: ReadonlySet<string>): string {
  const base = slug(source);
  const sub = subpath ? slug(subpath) : '';
  const id = `custom:${(sub ? `${base}-${sub}` : base) || 'repo'}`;
  if (!taken || !taken.has(id)) return id;
  let suffix = 2;
  while (taken.has(`${id}-${suffix}`)) suffix += 1;
  return `${id}-${suffix}`;
}

export type AddSourceResult =
  | { ok: true; catalogId: string; alreadyExists?: boolean }
  | { ok: false; error: 'invalidInput' | 'loadFailed' | 'saveFailed' };

/** Add a repository to the saved skill catalogs, or return the existing entry. */
export async function addSkillSource(input: { label: string; source: string; subpath?: string; gitIdentityId?: string }): Promise<AddSourceResult> {
  const source = input.source.trim();
  const subpath = (input.subpath ?? '').trim();
  const label = input.label.trim() || source;
  if (!source) return { ok: false, error: 'invalidInput' };

  const settings = await loadDesktopSettings();
  // A failed read must never look like "no catalogs": saving would drop the others.
  if (settings === null) return { ok: false, error: 'loadFailed' };
  const catalogs = settings.skillCatalogs ?? [];
  const existing = catalogs.find((entry) => (
    (entry.source || '').trim().toLowerCase() === source.toLowerCase()
    && (entry.subpath || '').trim().toLowerCase() === subpath.toLowerCase()
  ));
  if (existing) return { ok: true, catalogId: existing.id, alreadyExists: true };

  const id = catalogIdFor(source, subpath || undefined, new Set(catalogs.map((entry) => entry.id)));
  const entry: SkillCatalogConfig = { id, label, source };
  if (subpath) entry.subpath = subpath;
  if (input.gitIdentityId) entry.gitIdentityId = input.gitIdentityId;
  try {
    const result = await updateDesktopSettings({ skillCatalogs: [...catalogs, entry] });
    return result?.ok ? { ok: true, catalogId: id } : { ok: false, error: 'saveFailed' };
  } catch {
    return { ok: false, error: 'saveFailed' };
  }
}
