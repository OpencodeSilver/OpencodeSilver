import React from 'react';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { Icon } from '@/components/icon/Icon';
import {
  SettingsSection,
  SettingsFieldRow,
  SettingsCheckboxRow,
  SettingsChipGroup,
  SettingsInset,
  SETTINGS_NUMBER_INPUT_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { useI18n } from '@/lib/i18n';
import {
  useActivityTrayStore,
  type ActivityTrayDefaultState,
} from '@/stores/useActivityTrayStore';
import {
  validatePermissionRule,
  type PermissionPreset,
  type TerminalAutoExecutionMode,
} from '@/lib/activity-tray/permissionEngine';

interface RuleListEditorProps {
  title: string;
  description: string;
  rules: string[];
  placeholder: string;
  addButtonLabel: string;
  removeButtonLabel: string;
  emptyText: string;
  onAddRule: (rule: string) => { valid: boolean; error?: string };
  onRemoveRule: (rule: string) => void;
}

const RuleListEditor: React.FC<RuleListEditorProps> = ({
  title,
  description,
  rules,
  placeholder,
  addButtonLabel,
  removeButtonLabel,
  emptyText,
  onAddRule,
  onRemoveRule,
}) => {
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const result = onAddRule(draft);
      if (!result.valid) {
        setError(result.error ?? 'Invalid rule syntax.');
        return;
      }
      setDraft('');
      setError(null);
    },
    [draft, onAddRule],
  );

  return (
    <div className="py-2.5 border-t border-border/40 first:border-t-0">
      <div className="mb-1.5">
        <div className="text-xs font-medium text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-2">
        <input
          type="text"
          dir="ltr"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          className="flex-1 h-8 rounded-md border border-border/70 bg-background px-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit" size="sm" variant="outline" className="h-8 text-xs shrink-0">
          <Icon name="add" className="h-3.5 w-3.5 me-1" />
          {addButtonLabel}
        </Button>
      </form>

      {error && (
        <div className="mb-2 text-[11px] text-[rgb(var(--status-error))] font-medium">
          {error}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="text-[11px] text-muted-foreground italic py-1">{emptyText}</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rules.map((rule) => (
            <span
              key={rule}
              dir="ltr"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-foreground"
            >
              <span>{rule}</span>
              <button
                type="button"
                onClick={() => onRemoveRule(rule)}
                title={removeButtonLabel}
                aria-label={`${removeButtonLabel}: ${rule}`}
                className="text-muted-foreground hover:text-[rgb(var(--status-error))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
              >
                <Icon name="close" className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const AgentActivityTraySettings: React.FC = () => {
  const { t } = useI18n();
  const settings = useActivityTrayStore((state) => state.settings);
  const updateSettings = useActivityTrayStore((state) => state.updateSettings);
  const addPermissionRule = useActivityTrayStore((state) => state.addPermissionRule);
  const removePermissionRule = useActivityTrayStore((state) => state.removePermissionRule);
  const resetSettingsToDefaults = useActivityTrayStore((state) => state.resetSettingsToDefaults);
  const clearFinishedTasks = useActivityTrayStore((state) => state.clearFinishedTasks);

  const defaultStateOptions = React.useMemo<
    Array<{ value: ActivityTrayDefaultState; label: string }>
  >(
    () => [
      { value: 'expanded', label: t('tray.settings.defaultState.expanded') },
      { value: 'collapsed', label: t('tray.settings.defaultState.collapsed') },
      { value: 'remember_last', label: t('tray.settings.defaultState.remember_last') },
    ],
    [t],
  );

  const autoExecOptions = React.useMemo<Array<{ value: TerminalAutoExecutionMode; label: string }>>(
    () => [
      { value: 'request_review', label: t('tray.settings.autoExec.request_review') },
      { value: 'always_proceed', label: t('tray.settings.autoExec.always_proceed') },
    ],
    [t],
  );

  const presetOptions = React.useMemo<Array<{ value: PermissionPreset; label: string }>>(
    () => [
      { value: 'default', label: t('tray.settings.preset.default') },
      { value: 'request_review', label: t('tray.settings.preset.request_review') },
    ],
    [t],
  );

  const handleAddRule = React.useCallback(
    (listType: 'allow' | 'ask' | 'deny', rawRule: string) => {
      const v = validatePermissionRule(rawRule);
      if (!v.valid) {
        return {
          valid: false,
          error: v.errorKey ? t(v.errorKey) : t('tray.permissions.error.format'),
        };
      }
      addPermissionRule(listType, rawRule);
      return { valid: true };
    },
    [addPermissionRule, t],
  );

  return (
    <SettingsSection
      title={t('tray.settings.sectionTitle')}
      info={t('tray.settings.sectionDesc')}
    >
      <SettingsCheckboxRow
        settingsItem="activity-tray.enabled"
        checked={settings.enabled}
        onChange={(checked) => updateSettings({ enabled: checked })}
        label={t('tray.settings.enabledLabel')}
        ariaLabel={t('tray.settings.enabledLabel')}
        info={t('tray.settings.enabledDesc')}
      />

      <SettingsInset className="space-y-1">
        <SettingsFieldRow
          settingsItem="activity-tray.default-state"
          label={t('tray.settings.defaultStateLabel')}
        >
          <SettingsChipGroup
            value={settings.defaultState}
            options={defaultStateOptions}
            onChange={(value) => updateSettings({ defaultState: value })}
          />
        </SettingsFieldRow>

        <SettingsFieldRow
          settingsItem="activity-tray.auto-exec"
          label={t('tray.settings.autoExecLabel')}
          info={t('tray.settings.autoExecDesc')}
        >
          <SettingsChipGroup
            value={settings.terminalAutoExecutionMode}
            options={autoExecOptions}
            onChange={(value) => updateSettings({ terminalAutoExecutionMode: value })}
          />
        </SettingsFieldRow>

        <SettingsFieldRow
          settingsItem="activity-tray.preset"
          label={t('tray.settings.presetLabel')}
          info={t('tray.settings.presetDesc')}
        >
          <SettingsChipGroup
            value={settings.permissionPreset}
            options={presetOptions}
            onChange={(value) => updateSettings({ permissionPreset: value })}
          />
        </SettingsFieldRow>

        <SettingsCheckboxRow
          settingsItem="activity-tray.sandbox"
          checked={settings.sandboxEnabled}
          onChange={(checked) => updateSettings({ sandboxEnabled: checked })}
          label={t('tray.settings.sandboxLabel')}
          ariaLabel={t('tray.settings.sandboxLabel')}
          info={t('tray.settings.sandboxDesc')}
        />

        <SettingsCheckboxRow
          settingsItem="activity-tray.workspace-only"
          checked={settings.workspaceOnlyFileAccess}
          onChange={(checked) => updateSettings({ workspaceOnlyFileAccess: checked })}
          label={t('tray.settings.workspaceOnlyLabel')}
          ariaLabel={t('tray.settings.workspaceOnlyLabel')}
          info={t('tray.settings.workspaceOnlyDesc')}
        />

        <SettingsCheckboxRow
          settingsItem="activity-tray.confirm-before-kill"
          checked={settings.confirmBeforeStopping}
          onChange={(checked) => updateSettings({ confirmBeforeStopping: checked })}
          label={t('tray.settings.confirmBeforeKillLabel')}
          ariaLabel={t('tray.settings.confirmBeforeKillLabel')}
          info={t('tray.settings.confirmBeforeKillDesc')}
        />

        <SettingsFieldRow
          settingsItem="activity-tray.linger-seconds"
          label={t('tray.settings.lingerMsLabel')}
          info={t('tray.settings.lingerMsDesc')}
        >
          <NumberInput
            value={settings.autoHideFinishedAfterSeconds}
            min={-1}
            max={600}
            step={1}
            onValueChange={(secs) =>
              updateSettings({
                autoHideFinishedAfterSeconds: Math.max(-1, Math.min(600, secs)),
              })
            }
            className={SETTINGS_NUMBER_INPUT_CLASS}
          />
        </SettingsFieldRow>

        <SettingsFieldRow
          settingsItem="activity-tray.max-visible-rows"
          label={t('tray.settings.maxRowsLabel')}
          info={t('tray.settings.maxRowsDesc')}
        >
          <NumberInput
            value={settings.maxVisibleRows}
            min={1}
            max={20}
            step={1}
            onValueChange={(rows) =>
              updateSettings({ maxVisibleRows: Math.max(1, Math.min(20, rows)) })
            }
            className={SETTINGS_NUMBER_INPUT_CLASS}
          />
        </SettingsFieldRow>

        <SettingsFieldRow
          settingsItem="activity-tray.max-log-lines"
          label={t('tray.settings.maxLogLinesLabel')}
          info={t('tray.settings.maxLogLinesDesc')}
        >
          <NumberInput
            value={settings.logTailLines}
            min={10}
            max={2000}
            step={25}
            onValueChange={(lines) =>
              updateSettings({ logTailLines: Math.max(10, Math.min(2000, lines)) })
            }
            className={SETTINGS_NUMBER_INPUT_CLASS}
          />
        </SettingsFieldRow>

        {/* Editable Permission Rule Lists */}
        <div className="pt-2">
          <RuleListEditor
            title={t('tray.settings.allowListTitle')}
            description={t('tray.settings.allowListDesc')}
            rules={settings.allowRules}
            placeholder={t('tray.settings.rulePlaceholder')}
            addButtonLabel={t('tray.settings.addRule')}
            removeButtonLabel={t('tray.settings.removeRule')}
            emptyText={t('tray.settings.emptyRules')}
            onAddRule={(rule) => handleAddRule('allow', rule)}
            onRemoveRule={(rule) => removePermissionRule('allow', rule)}
          />

          <RuleListEditor
            title={t('tray.settings.askListTitle')}
            description={t('tray.settings.askListDesc')}
            rules={settings.askRules}
            placeholder={t('tray.settings.rulePlaceholder')}
            addButtonLabel={t('tray.settings.addRule')}
            removeButtonLabel={t('tray.settings.removeRule')}
            emptyText={t('tray.settings.emptyRules')}
            onAddRule={(rule) => handleAddRule('ask', rule)}
            onRemoveRule={(rule) => removePermissionRule('ask', rule)}
          />

          <RuleListEditor
            title={t('tray.settings.denyListTitle')}
            description={t('tray.settings.denyListDesc')}
            rules={settings.denyRules}
            placeholder={t('tray.settings.rulePlaceholder')}
            addButtonLabel={t('tray.settings.addRule')}
            removeButtonLabel={t('tray.settings.removeRule')}
            emptyText={t('tray.settings.emptyRules')}
            onAddRule={(rule) => handleAddRule('deny', rule)}
            onRemoveRule={(rule) => removePermissionRule('deny', rule)}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-border/40">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={resetSettingsToDefaults}
            className="text-xs"
          >
            <Icon name="restart" className="h-3.5 w-3.5 me-1.5" />
            {t('tray.settings.resetRulesBtn')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => clearFinishedTasks()}
            className="text-xs"
          >
            <Icon name="delete-bin" className="h-3.5 w-3.5 me-1.5" />
            {t('tray.settings.clearFinishedBtn')}
          </Button>
        </div>
      </SettingsInset>
    </SettingsSection>
  );
};
