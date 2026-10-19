import { describe, expect, test } from 'bun:test';

import { resolveProjectActionsOwner } from './useProjectActionsContext';

const projects = [
  { id: 'opencodesilver', path: '/workspace/opencodesilver', label: 'OpencodeSilver' },
];

describe('resolveProjectActionsOwner', () => {
  test('resolves a worktree directory to its owning parent project', () => {
    const owner = resolveProjectActionsOwner({
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
    });

    expect(owner).toEqual(projects[0]);
  });

  test('resolves a directory under the project path to that project', () => {
    const owner = resolveProjectActionsOwner({
      projects,
      worktreesByProject: new Map(),
      directory: '/workspace/opencodesilver/packages/ui',
      activeProjectId: null,
    });

    expect(owner).toEqual(projects[0]);
  });

  test('falls back to the active project when the directory does not resolve', () => {
    const owner = resolveProjectActionsOwner({
      projects,
      worktreesByProject: new Map(),
      directory: '/some/other/project',
      activeProjectId: 'opencodesilver',
    });

    expect(owner).toEqual(projects[0]);
  });

  test('falls back to the active project when the directory is empty or null', () => {
    expect(resolveProjectActionsOwner({
      projects,
      worktreesByProject: new Map(),
      directory: '',
      activeProjectId: 'opencodesilver',
    })).toEqual(projects[0]);

    expect(resolveProjectActionsOwner({
      projects,
      worktreesByProject: new Map(),
      directory: null,
      activeProjectId: 'opencodesilver',
    })).toEqual(projects[0]);
  });

  test('returns null when the directory does not resolve and the active project is unknown', () => {
    const owner = resolveProjectActionsOwner({
      projects,
      worktreesByProject: new Map(),
      directory: '/some/other/project',
      activeProjectId: 'missing-project',
    });

    expect(owner).toBeNull();
  });
});
