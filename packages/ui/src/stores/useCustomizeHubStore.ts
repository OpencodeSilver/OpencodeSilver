/**
 * Customize hub registry: one list of everything that customizes the agent
 * (skills, MCP connectors, agents, commands, rules, plugins), loaded from
 * `GET /api/customize/items`, plus the hub's own view state (mode, search,
 * filters, sort, the selected Discover category).
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { subscribeToConfigChanges } from '@/lib/configSync';
import { runtimeFetch } from '@/lib/runtime-fetch';
import { getConfigDirectory } from '@/stores/useAgentsStore';

export type CustomizeKind = 'skill' | 'mcp' | 'agent' | 'command' | 'rule' | 'plugin' | 'hook' | 'extension';
export type CustomizeItemStatus = 'ok' | 'info' | 'warning' | 'error' | 'blocked' | 'disabled' | 'shadowed';
export type CustomizeScopeFilter = 'all' | 'user' | 'project';
export type CustomizeMode = 'yours' | 'discover';
export type CustomizeSort = 'name' | 'stars';
export type CustomizeTypeFilter = 'all' | 'local' | 'remote';

export interface CustomizeDiagnostic {
  level: 'info' | 'warning' | 'error';
  message: string;
  code?: string;
  file?: string;
  line?: number | null;
}

export interface CustomizeItem {
  id: string;
  kind: CustomizeKind;
  name: string;
  displayName?: string;
  description?: string;
  /** `user`, `project` or `builtin`. */
  scope: string;
  origin: string;
  path?: string;
  enabled: boolean;
  status: CustomizeItemStatus;
  /** Name OpenCode knows a skill by; only these can be toggled. */
  engineId?: string;
  transport?: 'local' | 'remote';
  legacy?: boolean;
  shadowedBy?: { scope: string; path?: string } | null;
  diagnostics: CustomizeDiagnostic[];
}

interface CustomizeItemsResponse {
  items?: CustomizeItem[];
  counts?: Partial<Record<CustomizeKind, number>>;
  total?: number;
  availableKinds?: CustomizeKind[];
  unavailableKinds?: CustomizeKind[];
}

interface CustomizeHubState {
  items: CustomizeItem[];
  counts: Partial<Record<CustomizeKind, number>>;
  total: number;
  availableKinds: CustomizeKind[];
  unavailableKinds: CustomizeKind[];
  isLoading: boolean;
  loadError: string | null;
  lastLoadedAt: number | null;
  scopeFilter: CustomizeScopeFilter;
  query: string;
  mode: CustomizeMode;
  sort: CustomizeSort;
  discoverSourceFilter: string | null;
  discoverTypeFilter: CustomizeTypeFilter;
  discoverCategory: string | null;
  pendingIds: Record<string, boolean>;
  lastWriteError: string | null;
  setScopeFilter: (scope: CustomizeScopeFilter) => void;
  setQuery: (query: string) => void;
  setMode: (mode: CustomizeMode) => void;
  setSort: (sort: CustomizeSort) => void;
  setDiscoverSourceFilter: (sourceId: string | null) => void;
  setDiscoverTypeFilter: (type: CustomizeTypeFilter) => void;
  setDiscoverCategory: (category: string | null) => void;
  load: (options?: { directory?: string | null; force?: boolean }) => Promise<boolean>;
  refresh: (directory?: string | null) => Promise<boolean>;
  setItemEnabled: (id: string, enabled: boolean, directory?: string | null) => Promise<boolean>;
}

const DEFAULT_KEY = '__default__';
const FRESH_FOR_MS = 5_000;
const loadedAt = new Map<string, number>();
const generations = new Map<string, number>();
const inFlight = new Map<string, { generation: number; request: Promise<boolean> }>();

const resolveDirectory = (directory?: string | null): string | null => {
  if (directory !== undefined) {
    const trimmed = directory?.trim();
    return trimmed || null;
  }
  return getConfigDirectory();
};

const keyFor = (directory: string | null) => directory?.trim() || DEFAULT_KEY;

const withoutKey = <T extends Record<string, unknown>>(record: T, key: string): T => {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
};

/** Drop the cached load so the next `load` fetches again. */
const invalidate = (directory: string | null = getConfigDirectory()) => {
  const key = keyFor(directory);
  loadedAt.delete(key);
  generations.set(key, (generations.get(key) ?? 0) + 1);
};

const directoryRequest = (directory: string | null, init: { method?: string; contentType?: boolean; body?: string } = {}) => {
  const query = directory ? `?directory=${encodeURIComponent(directory)}` : '';
  const headers = new Headers(init.contentType ? { 'Content-Type': 'application/json' } : { 'Cache-Control': 'no-cache' });
  if (directory) headers.set('x-opencode-directory', directory);
  return { query, headers };
};

export const useCustomizeHubStore = create<CustomizeHubState>()(
  devtools(
    (set, get) => ({
      items: [],
      counts: {},
      total: 0,
      availableKinds: [],
      unavailableKinds: [],
      isLoading: false,
      loadError: null,
      lastLoadedAt: null,
      scopeFilter: 'all',
      query: '',
      mode: 'discover',
      sort: 'name',
      discoverSourceFilter: null,
      discoverTypeFilter: 'all',
      discoverCategory: null,
      pendingIds: {},
      lastWriteError: null,

      setScopeFilter: (scopeFilter) => set({ scopeFilter }),
      setQuery: (query) => set({ query }),
      setMode: (mode) => set({ mode }),
      setSort: (sort) => set({ sort }),
      setDiscoverSourceFilter: (discoverSourceFilter) => set({ discoverSourceFilter }),
      setDiscoverTypeFilter: (discoverTypeFilter) => set({ discoverTypeFilter }),
      setDiscoverCategory: (discoverCategory) => set({ discoverCategory }),

      load: async (options) => {
        const directory = resolveDirectory(options?.directory);
        const key = keyFor(directory);
        const last = loadedAt.get(key);
        if (options?.force !== true && last !== undefined && Date.now() - last < FRESH_FOR_MS) {
          return true;
        }

        // Join a request already running for this generation; wait out an
        // older one so a forced reload is never answered with stale data.
        let running = inFlight.get(key);
        while (running) {
          if (running.generation === (generations.get(key) ?? 0)) return running.request;
          await running.request;
          running = inFlight.get(key);
        }

        const generation = generations.get(key) ?? 0;
        const request = (async () => {
          set({ isLoading: true });
          try {
            const { query, headers } = directoryRequest(directory);
            const response = await runtimeFetch(`/api/customize/items${query}`, { headers });
            if (!response.ok) {
              set({ isLoading: false, loadError: `HTTP ${response.status}` });
              return false;
            }
            const body = (await response.json()) as CustomizeItemsResponse;
            loadedAt.set(key, Date.now());
            set({
              items: body.items ?? [],
              counts: body.counts ?? {},
              total: body.total ?? 0,
              availableKinds: body.availableKinds ?? [],
              unavailableKinds: body.unavailableKinds ?? [],
              isLoading: false,
              loadError: null,
              lastLoadedAt: Date.now(),
            });
            return true;
          } catch (error) {
            console.warn('[CustomizeHubStore] Failed to load the customization registry:', error);
            set({ isLoading: false, loadError: 'network' });
            return false;
          } finally {
            if (inFlight.get(key)?.generation === generation) inFlight.delete(key);
          }
        })();
        inFlight.set(key, { generation, request });
        return request;
      },

      refresh: async (directory) => {
        const resolved = resolveDirectory(directory);
        invalidate(resolved);
        return get().load({ directory: resolved, force: true });
      },

      setItemEnabled: async (id, enabled, directory) => {
        const resolved = resolveDirectory(directory);
        const previous = get().items.find((item) => item.id === id) ?? null;
        // Optimistic: flip the row now, put it back if the write fails.
        set((state) => ({
          pendingIds: { ...state.pendingIds, [id]: true },
          lastWriteError: null,
          items: state.items.map((item) => (item.id === id
            ? { ...item, enabled, status: enabled ? 'ok' : 'disabled' }
            : item)),
        }));
        try {
          const { query, headers } = directoryRequest(resolved, { contentType: true });
          const response = await runtimeFetch(`/api/customize/items/${encodeURIComponent(id)}${query}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ enabled }),
          });
          const body = (await response.json().catch(() => null)) as (CustomizeItem & { error?: string }) | null;
          if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`);
          invalidate(resolved);
          set((state) => ({
            items: body ? state.items.map((item) => (item.id === id ? { ...item, ...body } : item)) : state.items,
            pendingIds: withoutKey(state.pendingIds, id),
            lastWriteError: null,
          }));
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'network';
          console.warn('[CustomizeHubStore] Failed to change item state:', error);
          set((state) => ({
            items: previous ? state.items.map((item) => (item.id === id ? previous : item)) : state.items,
            pendingIds: withoutKey(state.pendingIds, id),
            lastWriteError: message,
          }));
          return false;
        }
      },
    }),
    { name: 'CustomizeHubStore' },
  ),
);

// A config change anywhere (a skill installed, a connector added) changes
// the registry; reload it if the hub has been opened.
subscribeToConfigChanges(() => {
  invalidate();
  if (useCustomizeHubStore.getState().lastLoadedAt !== null) {
    void useCustomizeHubStore.getState().load({ force: true });
  }
});
