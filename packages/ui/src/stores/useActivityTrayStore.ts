import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { createDeferredSafeJSONStorage } from './utils/safeStorage';
import {
  validatePermissionRule,
  type PermissionPolicyConfig,
  type PermissionPreset,
  type TerminalAutoExecutionMode,
} from '@/lib/activity-tray/permissionEngine';
import {
  globalTaskManager,
  type ActivityTask,
  type ActivityTaskKind,
} from '@/lib/activity-tray/taskManager';

export type ActivityTrayDefaultState = 'collapsed' | 'expanded' | 'remember_last';

export interface ActivityTrayTaskTypesVisibility {
  command: boolean;
  edit: boolean;
  format: boolean;
  build: boolean;
  typecheck: boolean;
  subagent: boolean;
}

export interface ActivityTrayShortcuts {
  toggleTray: string;
  approveTask: string;
  denyTask: string;
  jumpNextApproval: string;
}

export interface ActivityTraySettings {
  version: number;
  enabled: boolean;
  defaultState: ActivityTrayDefaultState;
  rememberedExpanded: boolean;
  autoHideFinishedAfterSeconds: number; // 0 = immediately, -1 = never
  maxVisibleRows: number;
  taskTypesToShow: ActivityTrayTaskTypesVisibility;
  showElapsedTime: boolean;
  showStopButton: boolean;
  logTailLines: number;
  maxStoredLogSizeMb: number;
  retentionPeriodHours: number;
  permissionPreset: PermissionPreset;
  terminalAutoExecutionMode: TerminalAutoExecutionMode;
  allowRules: string[];
  askRules: string[];
  denyRules: string[];
  workspaceOnlyFileAccess: boolean;
  sandboxEnabled: boolean;
  confirmBeforeStopping: boolean;
  notifyOnCompletion: boolean;
  notifyOnFailure: boolean;
  notifyOnApprovalNeeded: boolean;
  notificationSound: boolean;
  shortcuts: ActivityTrayShortcuts;
}

export const ACTIVITY_TRAY_SETTINGS_VERSION = 1;

export const DEFAULT_ACTIVITY_TRAY_SETTINGS: ActivityTraySettings = {
  version: ACTIVITY_TRAY_SETTINGS_VERSION,
  enabled: true,
  defaultState: 'expanded',
  rememberedExpanded: true,
  autoHideFinishedAfterSeconds: 10,
  maxVisibleRows: 6,
  taskTypesToShow: {
    command: true,
    edit: true,
    format: true,
    build: true,
    typecheck: true,
    subagent: true,
  },
  showElapsedTime: true,
  showStopButton: true,
  logTailLines: 100,
  maxStoredLogSizeMb: 25,
  retentionPeriodHours: 72,
  permissionPreset: 'default',
  terminalAutoExecutionMode: 'request_review',
  allowRules: [
    'command(git status)',
    'command(git diff)',
    'command(bun test)',
    'command(bun run)',
  ],
  askRules: [
    'command(git push)',
    'command(npm publish)',
  ],
  denyRules: [
    'command(rm -rf /)',
    'command(format)',
  ],
  workspaceOnlyFileAccess: true,
  sandboxEnabled: true,
  confirmBeforeStopping: false,
  notifyOnCompletion: false,
  notifyOnFailure: true,
  notifyOnApprovalNeeded: true,
  notificationSound: false,
  shortcuts: {
    toggleTray: 'mod+shift+y',
    approveTask: 'alt+enter',
    denyTask: 'alt+backspace',
    jumpNextApproval: 'alt+j',
  },
};

const settingsSchema = z.object({
  version: z.number().int().catch(ACTIVITY_TRAY_SETTINGS_VERSION),
  enabled: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.enabled),
  defaultState: z
    .enum(['collapsed', 'expanded', 'remember_last'])
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.defaultState),
  rememberedExpanded: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.rememberedExpanded),
  autoHideFinishedAfterSeconds: z
    .number()
    .int()
    .min(-1)
    .max(3600)
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.autoHideFinishedAfterSeconds),
  maxVisibleRows: z
    .number()
    .int()
    .min(1)
    .max(20)
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.maxVisibleRows),
  taskTypesToShow: z
    .object({
      command: z.boolean().catch(true),
      edit: z.boolean().catch(true),
      format: z.boolean().catch(true),
      build: z.boolean().catch(true),
      typecheck: z.boolean().catch(true),
      subagent: z.boolean().catch(true),
    })
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.taskTypesToShow),
  showElapsedTime: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.showElapsedTime),
  showStopButton: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.showStopButton),
  logTailLines: z
    .number()
    .int()
    .min(10)
    .max(2000)
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.logTailLines),
  maxStoredLogSizeMb: z
    .number()
    .int()
    .min(1)
    .max(500)
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.maxStoredLogSizeMb),
  retentionPeriodHours: z
    .number()
    .int()
    .min(1)
    .max(720)
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.retentionPeriodHours),
  permissionPreset: z
    .enum(['default', 'request_review'])
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.permissionPreset),
  terminalAutoExecutionMode: z
    .enum(['request_review', 'always_proceed'])
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.terminalAutoExecutionMode),
  allowRules: z
    .array(z.string())
    .transform((arr) => arr.filter((r) => validatePermissionRule(r).valid))
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.allowRules),
  askRules: z
    .array(z.string())
    .transform((arr) => arr.filter((r) => validatePermissionRule(r).valid))
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.askRules),
  denyRules: z
    .array(z.string())
    .transform((arr) => arr.filter((r) => validatePermissionRule(r).valid))
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.denyRules),
  workspaceOnlyFileAccess: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.workspaceOnlyFileAccess),
  sandboxEnabled: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.sandboxEnabled),
  confirmBeforeStopping: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.confirmBeforeStopping),
  notifyOnCompletion: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.notifyOnCompletion),
  notifyOnFailure: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.notifyOnFailure),
  notifyOnApprovalNeeded: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.notifyOnApprovalNeeded),
  notificationSound: z.boolean().catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.notificationSound),
  shortcuts: z
    .object({
      toggleTray: z.string().min(1).catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.shortcuts.toggleTray),
      approveTask: z.string().min(1).catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.shortcuts.approveTask),
      denyTask: z.string().min(1).catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.shortcuts.denyTask),
      jumpNextApproval: z
        .string()
        .min(1)
        .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.shortcuts.jumpNextApproval),
    })
    .catch(DEFAULT_ACTIVITY_TRAY_SETTINGS.shortcuts),
});

export function migrateAndValidateActivityTraySettings(raw: unknown): ActivityTraySettings {
  const parsed = settingsSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return { ...DEFAULT_ACTIVITY_TRAY_SETTINGS };
  }
  return {
    ...DEFAULT_ACTIVITY_TRAY_SETTINGS,
    ...parsed.data,
    version: ACTIVITY_TRAY_SETTINGS_VERSION,
  };
}

export const EMPTY_ACTIVITY_TASKS: readonly ActivityTask[] = [];

interface ActivityTrayStoreState {
  settings: ActivityTraySettings;
  isExpanded: boolean;
  expandedTaskIds: Record<string, boolean>;
  focusedApprovalTaskId: string | null;
  tasks: readonly ActivityTask[];

  updateSettings: (patch: Partial<ActivityTraySettings>) => void;
  setTaskTypeVisibility: (kind: ActivityTaskKind, visible: boolean) => void;
  addPermissionRule: (listType: 'allow' | 'ask' | 'deny', rule: string) => boolean;
  removePermissionRule: (listType: 'allow' | 'ask' | 'deny', rule: string) => void;
  setShortcut: (key: keyof ActivityTrayShortcuts, combo: string) => void;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  toggleTaskLogExpanded: (taskId: string) => void;
  setFocusedApprovalTaskId: (taskId: string | null) => void;
  syncTasksFromManager: (tasks: readonly ActivityTask[]) => void;
  clearFinishedTasks: (conversationId?: string) => number;
  resetSettingsToDefaults: () => void;
}

export const useActivityTrayStore = create<ActivityTrayStoreState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_ACTIVITY_TRAY_SETTINGS,
      isExpanded: true,
      expandedTaskIds: {},
      focusedApprovalTaskId: null,
      tasks: globalTaskManager.list(),

      updateSettings: (patch) => {
        set((state) => {
          const merged = migrateAndValidateActivityTraySettings({
            ...state.settings,
            ...patch,
          });
          let nextExpanded = state.isExpanded;
          if (patch.defaultState === 'collapsed') {
            nextExpanded = false;
          } else if (patch.defaultState === 'expanded') {
            nextExpanded = true;
          }
          return {
            settings: merged,
            isExpanded: nextExpanded,
          };
        });
      },

      setTaskTypeVisibility: (kind, visible) => {
        set((state) => ({
          settings: {
            ...state.settings,
            taskTypesToShow: {
              ...state.settings.taskTypesToShow,
              [kind]: visible,
            },
          },
        }));
      },

      addPermissionRule: (listType, rawRule) => {
        const validation = validatePermissionRule(rawRule);
        if (!validation.valid || !validation.parsed) {
          return false;
        }
        const normalizedRule = validation.parsed.raw;
        const field =
          listType === 'allow'
            ? 'allowRules'
            : listType === 'ask'
              ? 'askRules'
              : 'denyRules';
        set((state) => {
          const existing = state.settings[field];
          if (existing.includes(normalizedRule)) return state;
          return {
            settings: {
              ...state.settings,
              [field]: [...existing, normalizedRule],
            },
          };
        });
        return true;
      },

      removePermissionRule: (listType, rule) => {
        const field =
          listType === 'allow'
            ? 'allowRules'
            : listType === 'ask'
              ? 'askRules'
              : 'denyRules';
        set((state) => ({
          settings: {
            ...state.settings,
            [field]: state.settings[field].filter((r) => r !== rule),
          },
        }));
      },

      setShortcut: (key, combo) => {
        const trimmed = combo.trim();
        if (!trimmed) return;
        set((state) => ({
          settings: {
            ...state.settings,
            shortcuts: {
              ...state.settings.shortcuts,
              [key]: trimmed,
            },
          },
        }));
      },

      setExpanded: (expanded) => {
        set((state) => ({
          isExpanded: expanded,
          settings:
            state.settings.defaultState === 'remember_last'
              ? { ...state.settings, rememberedExpanded: expanded }
              : state.settings,
        }));
      },

      toggleExpanded: () => {
        const next = !get().isExpanded;
        get().setExpanded(next);
      },

      toggleTaskLogExpanded: (taskId) => {
        set((state) => ({
          expandedTaskIds: {
            ...state.expandedTaskIds,
            [taskId]: !state.expandedTaskIds[taskId],
          },
        }));
      },

      setFocusedApprovalTaskId: (taskId) => {
        set({ focusedApprovalTaskId: taskId });
      },

      syncTasksFromManager: (tasks) => {
        set({ tasks });
      },

      clearFinishedTasks: (conversationId) => {
        return globalTaskManager.clearFinishedTasks({ conversationId, olderThanMs: 0 });
      },

      resetSettingsToDefaults: () => {
        set({
          settings: { ...DEFAULT_ACTIVITY_TRAY_SETTINGS },
          isExpanded: true,
        });
      },
    }),
    {
      name: 'opencodesilver-activity-tray-settings-v1',
      version: ACTIVITY_TRAY_SETTINGS_VERSION,
      storage: createDeferredSafeJSONStorage(),
      partialize: (state) => ({
        settings: state.settings,
      }),
      migrate: (persistedState: unknown) => {
        const record =
          persistedState && typeof persistedState === 'object'
            ? (persistedState as { settings?: unknown })
            : {};
        const settings = migrateAndValidateActivityTraySettings(record.settings);
        const isExpanded =
          settings.defaultState === 'collapsed'
            ? false
            : settings.defaultState === 'remember_last'
              ? settings.rememberedExpanded
              : true;
        return {
          settings,
          isExpanded,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const validated = migrateAndValidateActivityTraySettings(state.settings);
        const initialExpanded =
          validated.defaultState === 'collapsed'
            ? false
            : validated.defaultState === 'remember_last'
              ? validated.rememberedExpanded
              : true;
        state.updateSettings(validated);
        state.setExpanded(initialExpanded);
      },
    },
  ),
);

// Wire globalTaskManager to useActivityTrayStore
globalTaskManager.subscribe((tasks) => {
  useActivityTrayStore.getState().syncTasksFromManager(tasks);
});

globalTaskManager.configure({
  onRuleAdded: (rule) => {
    useActivityTrayStore.getState().addPermissionRule('allow', rule);
  },
});

export function selectPermissionPolicyConfig(
  settings: ActivityTraySettings,
  workspaceRoot?: string | null,
): PermissionPolicyConfig {
  return {
    preset: settings.permissionPreset,
    autoExecutionMode: settings.terminalAutoExecutionMode,
    allowRules: settings.allowRules,
    askRules: settings.askRules,
    denyRules: settings.denyRules,
    workspaceOnlyFileAccess: settings.workspaceOnlyFileAccess,
    sandboxEnabled: settings.sandboxEnabled,
    workspaceRoot,
  };
}
