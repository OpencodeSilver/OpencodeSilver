import { OpenCode } from '@opencode/client';
import { readGlobalPermissionRules } from './config-v2.js';

/**
 * One registry of everything that customizes the agent — skills, MCP
 * connectors, agents, commands, rules and plugins — for the Customize hub.
 *
 *   GET   /api/customize/items?directory=…      → { items, counts, total, availableKinds, unavailableKinds }
 *   PATCH /api/customize/items/:id?directory=…  { enabled } → the updated item
 *
 * Each item is read-only except skills OpenCode knows about (toggled through
 * a `skill` permission rule) and MCP connectors (toggled through `disabled`).
 * Like the other config routes, a change is written to disk at once and takes
 * effect on the next OpenCode reload.
 */

const AVAILABLE_KINDS = ['skill', 'mcp', 'agent', 'command', 'rule', 'plugin'];
// Surfaces OpenCode has no config entry for yet; the hub explains them instead.
const UNAVAILABLE_KINDS = ['hook', 'extension'];

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const asList = (value) => (Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []);
const asString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** `*`-glob match, the way OpenCode matches a permission resource. */
export const matchesResource = (pattern, value) => {
  if (pattern === '*' || pattern === value) return true;
  if (!pattern.includes('*')) return false;
  const escaped = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${escaped}$`).test(value);
};

/**
 * Whether a skill may load, from the global permission rules of every config
 * layer in load order (later layers and later rules win).
 */
export const isSkillAllowed = (layerConfigs, skillName) => {
  let effect = 'allow';
  for (const config of layerConfigs) {
    for (const rule of readGlobalPermissionRules(config)) {
      if ((rule.action === 'skill' || rule.action === '*') && matchesResource(rule.resource, skillName)) {
        effect = rule.effect;
      }
    }
  }
  return effect !== 'deny';
};

/**
 * Turn a skill on or off in one config object. v2 configs (`permissions`
 * array) get a rule; v1 configs (`permission` map) get a `skill` entry, so a
 * file keeps the spelling it already uses.
 */
export const applySkillToggle = (config, skillName, enabled) => {
  const next = isRecord(config) ? { ...config } : {};
  const usesV1Map = next.permissions === undefined && isRecord(next.permission);

  if (usesV1Map) {
    const permission = { ...next.permission };
    const skill = isRecord(permission.skill) ? { ...permission.skill } : {};
    if (enabled) delete skill[skillName];
    else skill[skillName] = 'deny';
    if (Object.keys(skill).length > 0) permission.skill = skill;
    else delete permission.skill;
    next.permission = permission;
    return next;
  }

  const rules = Array.isArray(next.permissions) ? next.permissions.filter((rule) => !(
    isRecord(rule) && rule.action === 'skill' && rule.resource === skillName
  )) : [];
  if (!enabled) rules.push({ action: 'skill', resource: skillName, effect: 'deny' });
  next.permissions = rules;
  return next;
};

export const registerCustomizeRoutes = (app, dependencies) => {
  const {
    fs,
    path,
    os,
    resolveOptionalProjectDirectory,
    buildOpenCodeUrl,
    getOpenCodeAuthHeaders,
    getOpenCodePort,
    fetchOpenCodeDiscoveredSkills,
    discoverSkills,
    mergeDiscoveredSkills,
    getAgentSources,
    getCommandSources,
    listMcpConfigs,
    updateMcpConfig,
    listPluginEntries,
    readConfigLayers,
    readConfigFile,
    writeConfig,
    OPENCODE_CONFIG_DIR,
  } = dependencies;

  const openCodeClient = (directory) => {
    if (!getOpenCodePort()) return null;
    return OpenCode.make({
      baseUrl: buildOpenCodeUrl('/', '').replace(/\/$/, ''),
      headers: {
        ...getOpenCodeAuthHeaders(),
        ...(directory ? { 'x-opencode-directory': encodeURIComponent(directory) } : {}),
      },
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8_000) }),
    });
  };

  const layerConfigsInLoadOrder = (layers) => [
    layers.userConfig,
    layers.userOverrideConfig,
    layers.projectConfig,
    layers.customConfig,
  ].filter(isRecord);

  const layerDiagnostics = (layers, filePath) => (layers.layerErrors || [])
    .filter((error) => !filePath || error.path === filePath)
    .map((error) => ({ level: 'error', code: error.code, message: error.message, file: error.path }));

  const finishItem = (item) => {
    const hasError = item.diagnostics.some((d) => d.level === 'error');
    const hasWarning = item.diagnostics.some((d) => d.level === 'warning');
    let status = item.status ?? 'ok';
    if (item.shadowedBy) status = 'shadowed';
    else if (!item.enabled) status = 'disabled';
    else if (hasError) status = 'error';
    else if (hasWarning) status = 'warning';
    return { ...item, status };
  };

  const collectSkills = async (directory, layers) => {
    const openCodeSkills = await fetchOpenCodeDiscoveredSkills(directory);
    const skills = mergeDiscoveredSkills(openCodeSkills ?? [], discoverSkills(directory));
    const engineNames = new Set((openCodeSkills ?? []).map((skill) => skill.name));
    const layerConfigs = layerConfigsInLoadOrder(layers);
    const projectNames = new Set(skills.filter((skill) => skill.scope === 'project').map((skill) => skill.name));

    return skills.map((skill) => {
      const builtIn = skill.path === '<built-in>';
      const scope = builtIn ? 'builtin' : (skill.scope || 'user');
      const shadowed = scope === 'user' && projectNames.has(skill.name);
      return finishItem({
        id: `skill:${scope}:${skill.name}`,
        kind: 'skill',
        name: skill.name,
        description: asString(skill.description) ?? undefined,
        scope,
        origin: builtIn ? 'opencode' : (skill.source || 'opencode'),
        path: builtIn ? undefined : skill.path,
        enabled: isSkillAllowed(layerConfigs, skill.name),
        engineId: engineNames.has(skill.name) ? skill.name : undefined,
        legacy: false,
        shadowedBy: shadowed ? { scope: 'project' } : null,
        diagnostics: [],
      });
    });
  };

  const collectMcp = (directory, layers) => listMcpConfigs(directory).map((entry) => {
    const filePath = entry.scope === 'project' ? layers.paths.projectPath : layers.paths.userPath;
    return finishItem({
      id: `mcp:${entry.name}`,
      kind: 'mcp',
      name: entry.name,
      description: entry.type === 'remote' ? entry.url : (entry.command || []).join(' '),
      scope: entry.scope || 'user',
      origin: entry.type === 'remote' ? 'remote' : 'local',
      path: filePath ?? undefined,
      enabled: entry.disabled !== true,
      transport: entry.type === 'remote' ? 'remote' : 'local',
      legacy: Boolean(entry.legacy),
      shadowedBy: null,
      diagnostics: layerDiagnostics(layers, filePath),
    });
  });

  const collectAgents = async (directory, client) => {
    if (!client) return [];
    const agents = await client.agent.list().then((response) => asList(response?.data)).catch(() => []);
    return agents.map((agent) => {
      const id = asString(agent?.id) ?? asString(agent?.name);
      if (!id) return null;
      let scope = 'builtin';
      let filePath;
      try {
        const sources = getAgentSources(id, directory);
        const source = sources.md?.exists ? sources.md : (sources.json?.exists ? sources.json : null);
        if (source) {
          scope = source.scope || 'user';
          filePath = source.path || undefined;
        }
      } catch {
        // a name OpenCode accepts but the disk helpers do not — keep it built-in
      }
      return finishItem({
        id: `agent:${id}`,
        kind: 'agent',
        name: id,
        displayName: asString(agent?.name) && agent.name !== id ? agent.name : undefined,
        description: asString(agent?.description) ?? undefined,
        scope,
        origin: scope === 'builtin' ? 'opencode' : 'config',
        path: filePath,
        enabled: agent?.disable !== true,
        legacy: false,
        shadowedBy: null,
        diagnostics: [],
      });
    }).filter(Boolean);
  };

  const collectCommands = async (directory, client) => {
    if (!client) return [];
    const commands = await client.command.list().then((response) => asList(response?.data)).catch(() => []);
    return commands.map((command) => {
      const name = asString(command?.name);
      if (!name) return null;
      let scope = 'builtin';
      let filePath;
      try {
        const sources = getCommandSources(name, directory);
        const source = sources.md?.exists ? sources.md : (sources.json?.exists ? sources.json : null);
        if (source) {
          scope = source.scope || 'user';
          filePath = source.path || undefined;
        }
      } catch {
        // see collectAgents
      }
      return finishItem({
        id: `command:${name}`,
        kind: 'command',
        name,
        description: asString(command?.description) ?? undefined,
        scope,
        origin: asString(command?.source) ?? (scope === 'builtin' ? 'opencode' : 'config'),
        path: filePath,
        enabled: true,
        legacy: false,
        shadowedBy: null,
        diagnostics: [],
      });
    }).filter(Boolean);
  };

  /** Instruction files OpenCode reads, plus the config `instructions` entries. */
  const collectRules = (directory, layers) => {
    const items = [];
    const seen = new Set();
    const add = (filePath, scope, origin) => {
      const resolved = path.resolve(filePath);
      if (seen.has(resolved) || !fs.existsSync(resolved)) return;
      seen.add(resolved);
      items.push(finishItem({
        id: `rule:${scope}:${resolved}`,
        kind: 'rule',
        name: path.basename(resolved),
        description: resolved,
        scope,
        origin,
        path: resolved,
        enabled: true,
        legacy: false,
        shadowedBy: null,
        diagnostics: [],
      }));
    };

    if (directory) {
      // The nearest AGENTS.md wins; CLAUDE.md stands in when there is none.
      let current = path.resolve(directory);
      while (true) {
        const agents = path.join(current, 'AGENTS.md');
        const claude = path.join(current, 'CLAUDE.md');
        if (fs.existsSync(agents)) { add(agents, 'project', 'agents'); break; }
        if (fs.existsSync(claude)) { add(claude, 'project', 'claude'); break; }
        if (fs.existsSync(path.join(current, '.git'))) break;
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
    add(path.join(OPENCODE_CONFIG_DIR, 'AGENTS.md'), 'user', 'agents');
    add(path.join(os.homedir(), '.claude', 'CLAUDE.md'), 'user', 'claude');

    const configs = [
      [layers.userConfig, 'user', layers.paths.userPath],
      [layers.userOverrideConfig, 'user', layers.paths.userOverridePath],
      [layers.projectConfig, 'project', layers.paths.projectPath],
      [layers.customConfig, 'project', layers.paths.customPath],
    ];
    for (const [config, scope, configPath] of configs) {
      if (!isRecord(config) || !Array.isArray(config.instructions)) continue;
      const base = configPath ? path.dirname(configPath) : (directory || process.cwd());
      for (const entry of config.instructions) {
        if (typeof entry !== 'string' || !entry.trim()) continue;
        if (/^https?:\/\//i.test(entry) || entry.includes('*')) {
          const id = `rule:${scope}:${entry}`;
          if (seen.has(id)) continue;
          seen.add(id);
          items.push(finishItem({
            id,
            kind: 'rule',
            name: entry,
            scope,
            origin: 'config',
            path: configPath ?? undefined,
            enabled: true,
            legacy: false,
            shadowedBy: null,
            diagnostics: [],
          }));
          continue;
        }
        const expanded = entry.startsWith('~/') ? path.join(os.homedir(), entry.slice(2)) : entry;
        add(path.isAbsolute(expanded) ? expanded : path.join(base, expanded), scope, 'config');
      }
    }
    return items;
  };

  const collectPlugins = (directory, layers) => listPluginEntries(directory).map((entry) => finishItem({
    id: `plugin:${entry.id}`,
    kind: 'plugin',
    name: entry.spec,
    scope: entry.scope || 'user',
    origin: entry.parsedKind || 'npm',
    path: entry.sourcePath ?? undefined,
    enabled: true,
    legacy: Boolean(entry.legacy),
    shadowedBy: null,
    diagnostics: layerDiagnostics(layers, entry.sourcePath),
  }));

  const collectItems = async (directory) => {
    const layers = readConfigLayers(directory);
    const client = openCodeClient(directory);
    const settle = (promise) => Promise.resolve().then(() => promise).catch((error) => {
      console.warn('[customize] a source failed to list:', error?.message || error);
      return [];
    });
    const groups = await Promise.all([
      settle(collectSkills(directory, layers)),
      settle(collectMcp(directory, layers)),
      settle(collectAgents(directory, client)),
      settle(collectCommands(directory, client)),
      settle(collectRules(directory, layers)),
      settle(collectPlugins(directory, layers)),
    ]);
    return { items: groups.flat(), layers };
  };

  const summarize = (items) => {
    const counts = {};
    for (const kind of AVAILABLE_KINDS) counts[kind] = 0;
    for (const item of items) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    return {
      items,
      counts,
      total: items.length,
      availableKinds: AVAILABLE_KINDS,
      unavailableKinds: UNAVAILABLE_KINDS,
    };
  };

  app.get('/api/customize/items', async (req, res) => {
    try {
      const { directory, error } = await resolveOptionalProjectDirectory(req);
      if (error) return res.status(400).json({ error });
      const { items } = await collectItems(directory);
      res.json(summarize(items));
    } catch (error) {
      console.error('[API:GET /api/customize/items] Failed:', error);
      res.status(500).json({ error: error.message || 'Failed to list customizations' });
    }
  });

  app.patch('/api/customize/items/:id', async (req, res) => {
    try {
      const id = String(req.params.id || '');
      const enabled = req.body?.enabled;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: '`enabled` must be a boolean' });
      }
      const { directory, error } = await resolveOptionalProjectDirectory(req);
      if (error) return res.status(400).json({ error });

      const { items, layers } = await collectItems(directory);
      const item = items.find((candidate) => candidate.id === id);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      if (item.kind === 'mcp') {
        updateMcpConfig(item.name, { disabled: !enabled }, directory);
      } else if (item.kind === 'skill') {
        if (!item.engineId || item.status === 'shadowed') {
          return res.status(409).json({ error: 'This skill cannot be toggled' });
        }
        const targetPath = item.scope === 'project' && layers.paths.projectPath
          ? layers.paths.projectPath
          : layers.paths.userPath;
        const current = fs.existsSync(targetPath) ? readConfigFile(targetPath) : {};
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        writeConfig(applySkillToggle(current, item.engineId, enabled), targetPath);
      } else {
        return res.status(409).json({ error: 'This item cannot be toggled' });
      }

      const { items: refreshed } = await collectItems(directory);
      const updated = refreshed.find((candidate) => candidate.id === id) ?? { ...item, enabled };
      res.json(updated);
    } catch (error) {
      console.error('[API:PATCH /api/customize/items/:id] Failed:', error);
      res.status(500).json({ error: error.message || 'Failed to update the item' });
    }
  });
};
