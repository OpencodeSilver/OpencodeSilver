import { describe, expect, test } from 'bun:test';

import { CHAT_DRAFT_PROJECT_ID } from '@/lib/chatDirectories';
import { resolveProjectContextOwner } from './useProjectContextOwner';

const projects = [
  { id: 'opencodesilver', path: '/workspace/opencodesilver', label: 'OpencodeSilver' },
];

describe('resolveProjectContextOwner', () => {
  test('resolves a managed chat directory to the Chats root instead of the active project', () => {
    const owner = resolveProjectContextOwner({
      projects,
      worktreesByProject: new Map(),
      directory: '/Users/test/.config/opencodesilver/chats/2026-08-27/session-a',
      activeProjectId: 'opencodesilver',
      chatDraftOpen: false,
      chatDraftTarget: 'project',
      homeDirectory: '/Users/test',
    });

    expect(owner).toEqual({
      id: CHAT_DRAFT_PROJECT_ID,
      path: '/Users/test/.config/opencodesilver/chats',
    });
  });

  test('resolves a worktree session to its owning project', () => {
    const owner = resolveProjectContextOwner({
      projects,
      worktreesByProject: new Map([
        ['/workspace/opencodesilver', [{
          path: '/workspace/opencodesilver-feature',
          projectDirectory: '/workspace/opencodesilver',
          branch: 'feature',
          label: 'feature',
        }]],
      ]),
      directory: '/workspace/opencodesilver-feature',
      activeProjectId: null,
      chatDraftOpen: false,
      chatDraftTarget: 'project',
      homeDirectory: '/Users/test',
    });

    expect(owner).toEqual({ id: 'opencodesilver', path: '/workspace/opencodesilver' });
  });

  test('returns null for a recognized directory that owns nothing, instead of borrowing the active project', () => {
    const owner = resolveProjectContextOwner({
      projects,
      worktreesByProject: new Map(),
      directory: '/some/other/project',
      activeProjectId: 'opencodesilver',
      chatDraftOpen: false,
      chatDraftTarget: 'project',
      homeDirectory: '/Users/test',
    });

    expect(owner).toBeNull();
  });

  test('falls back to the active project only when there is no directory at all', () => {
    const owner = resolveProjectContextOwner({
      projects,
      worktreesByProject: new Map(),
      directory: null,
      activeProjectId: 'opencodesilver',
      chatDraftOpen: false,
      chatDraftTarget: 'project',
      homeDirectory: '/Users/test',
    });

    expect(owner).toEqual({ id: 'opencodesilver', path: '/workspace/opencodesilver' });
  });

  test('never falls back to the first project when the active project is unknown', () => {
    const owner = resolveProjectContextOwner({
      projects,
      worktreesByProject: new Map(),
      directory: null,
      activeProjectId: 'missing-project',
      chatDraftOpen: false,
      chatDraftTarget: 'project',
      homeDirectory: '/Users/test',
    });

    expect(owner).toBeNull();
  });
});
