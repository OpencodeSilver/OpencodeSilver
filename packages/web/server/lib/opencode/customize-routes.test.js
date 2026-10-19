import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { applySkillToggle, isSkillAllowed, matchesResource, registerCustomizeRoutes } from './customize-routes.js';

const tempDirs = [];
const makeTemp = (prefix) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
});

describe('skill permission helpers', () => {
  it('matches globs the way OpenCode does', () => {
    expect(matchesResource('*', 'anything')).toBe(true);
    expect(matchesResource('internal-*', 'internal-docs')).toBe(true);
    expect(matchesResource('internal-*', 'public')).toBe(false);
    expect(matchesResource('exact', 'exact')).toBe(true);
  });

  it('lets later layers and rules win', () => {
    const user = { permissions: [{ action: 'skill', resource: 'a', effect: 'deny' }] };
    const project = { permissions: [{ action: 'skill', resource: 'a', effect: 'allow' }] };
    expect(isSkillAllowed([user], 'a')).toBe(false);
    expect(isSkillAllowed([user, project], 'a')).toBe(true);
    expect(isSkillAllowed([{ permission: { skill: { 'b-*': 'deny' } } }], 'b-one')).toBe(false);
  });

  it('writes v2 rules and keeps v1 maps in their own spelling', () => {
    const off = applySkillToggle({}, 'docs', false);
    expect(off.permissions).toEqual([{ action: 'skill', resource: 'docs', effect: 'deny' }]);
    expect(applySkillToggle(off, 'docs', true).permissions).toEqual([]);

    const v1Off = applySkillToggle({ permission: { edit: 'ask' } }, 'docs', false);
    expect(v1Off.permission).toEqual({ edit: 'ask', skill: { docs: 'deny' } });
    expect(applySkillToggle(v1Off, 'docs', true).permission).toEqual({ edit: 'ask' });
  });
});

describe('GET/PATCH /api/customize/items', () => {
  const start = ({ projectRoot, configPath, skills = [], mcp = [] }) => {
    const app = express();
    app.use(express.json());
    let mcpEntries = mcp;
    let config = {};
    registerCustomizeRoutes(app, {
      fs,
      path,
      os,
      resolveOptionalProjectDirectory: async () => ({ directory: projectRoot, error: null }),
      buildOpenCodeUrl: () => 'http://127.0.0.1:9/',
      getOpenCodeAuthHeaders: () => ({}),
      getOpenCodePort: () => 0,
      fetchOpenCodeDiscoveredSkills: async () => skills,
      discoverSkills: () => [],
      mergeDiscoveredSkills: (a) => a,
      getAgentSources: () => ({}),
      getCommandSources: () => ({}),
      listMcpConfigs: () => mcpEntries,
      updateMcpConfig: (name, updates) => {
        mcpEntries = mcpEntries.map((entry) => (entry.name === name ? { ...entry, ...updates } : entry));
      },
      listPluginEntries: () => [],
      readConfigLayers: () => ({
        userConfig: config,
        userOverrideConfig: null,
        projectConfig: null,
        customConfig: null,
        paths: { userPath: configPath, userOverridePath: null, projectPath: path.join(projectRoot, '.opencode', 'opencode.json'), customPath: null },
        layerErrors: [],
      }),
      readConfigFile: () => config,
      writeConfig: (next) => { config = next; },
      OPENCODE_CONFIG_DIR: makeTemp('oc-customize-cfg-'),
    });
    const server = app.listen(0);
    const { port } = server.address();
    return {
      baseUrl: `http://127.0.0.1:${port}`,
      close: () => new Promise((resolve) => server.close(() => resolve())),
    };
  };

  it('lists skills, connectors and rules with counts', async () => {
    const projectRoot = makeTemp('oc-customize-');
    fs.mkdirSync(path.join(projectRoot, '.git'));
    fs.writeFileSync(path.join(projectRoot, 'AGENTS.md'), '# rules');
    const handle = start({
      projectRoot,
      configPath: path.join(projectRoot, 'user.json'),
      skills: [{ name: 'docs', path: '/x/docs/SKILL.md', scope: 'user', source: 'opencode', description: 'Docs' }],
      mcp: [{ name: 'ctx', type: 'remote', url: 'https://example.test/mcp', scope: 'user' }],
    });
    try {
      const body = await (await fetch(`${handle.baseUrl}/api/customize/items`)).json();
      expect(body.counts.skill).toBe(1);
      expect(body.counts.mcp).toBe(1);
      expect(body.counts.rule).toBe(1);
      expect(body.unavailableKinds).toEqual(['hook', 'extension']);
      const skill = body.items.find((item) => item.kind === 'skill');
      expect(skill).toMatchObject({ name: 'docs', engineId: 'docs', enabled: true, status: 'ok' });
    } finally {
      await handle.close();
    }
  });

  it('turns a skill and a connector off', async () => {
    const projectRoot = makeTemp('oc-customize-');
    const handle = start({
      projectRoot,
      configPath: path.join(projectRoot, 'user.json'),
      skills: [{ name: 'docs', path: '/x/docs/SKILL.md', scope: 'user', source: 'opencode' }],
      mcp: [{ name: 'ctx', type: 'local', command: ['npx', 'x'], scope: 'user' }],
    });
    try {
      const patch = (id) => fetch(`${handle.baseUrl}/api/customize/items/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      }).then((response) => response.json());

      expect(await patch('skill:user:docs')).toMatchObject({ enabled: false, status: 'disabled' });
      expect(await patch('mcp:ctx')).toMatchObject({ enabled: false, status: 'disabled' });
    } finally {
      await handle.close();
    }
  });
});
