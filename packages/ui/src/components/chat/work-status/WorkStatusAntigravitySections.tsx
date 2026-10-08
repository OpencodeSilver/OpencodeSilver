import React from 'react';
import { Icon } from '@/components/icon/Icon';
import type { IconName } from '@/components/icon/icons';
import { useGitStore } from '@/stores/useGitStore';
import { useNestedGitDirectory } from '@/hooks/useNestedGitDirectory';
import { useSessionMessageRecords } from '@/sync/sync-context';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { normalizeTerminalDirectory } from '@/lib/pathNormalization';
import { useSkillsStore } from '@/stores/useSkillsStore';
import { useUIStore } from '@/stores/useUIStore';
import { useEffectiveDirectory } from '@/hooks/useEffectiveDirectory';
import { useI18n } from '@/lib/i18n';
import { WorkStatusCollapsibleSection, WorkStatusRow, WorkStatusValue } from './WorkStatusPrimitives';
import { useReportWorkStatusPresence } from './presenceContext';

type Props = {
  sessionId: string | null;
  directory: string | null;
  repositoryEnabled?: boolean;
};

const EMPTY_TERMINAL_TABS: readonly { id: string; label?: string; lifecycle?: string }[] = [];

const getFileIconName = (filePath: string): IconName => {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return 'file-text';
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.webp')) return 'file-image';
  if (lower.endsWith('.pdf')) return 'file-pdf';
  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.json') ||
    lower.endsWith('.rs') ||
    lower.endsWith('.py') ||
    lower.endsWith('.css') ||
    lower.endsWith('.html') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.yaml')
  ) {
    return 'file-code';
  }
  return 'file';
};

const splitFilePath = (filePath: string): { basename: string; dir: string } => {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  if (idx === -1) return { basename: normalized, dir: '' };
  return {
    basename: normalized.slice(idx + 1),
    dir: normalized.slice(0, idx),
  };
};

export const WorkStatusAntigravitySections: React.FC<Props> = ({
  sessionId,
  directory,
  repositoryEnabled = true,
}) => {
  const { t } = useI18n();
  const effectiveDirectory = useEffectiveDirectory();
  const targetDirectory = effectiveDirectory || directory || '__global__';
  const openContextPanelTab = useUIStore((state) => state.openContextPanelTab);
  const openContextSurface = useUIStore((state) => state.openContextSurface);
  const setSettingsPage = useUIStore((state) => state.setSettingsPage);
  const setSettingsDialogOpen = useUIStore((state) => state.setSettingsDialogOpen);

  const { gitDirectory } = useNestedGitDirectory(directory || effectiveDirectory || null, { enabled: repositoryEnabled });
  const gitStatus = useGitStore(
    React.useCallback(
      (state) => (gitDirectory ? state.directories.get(gitDirectory)?.status ?? null : null),
      [gitDirectory],
    ),
  );

  const changedFiles = React.useMemo(() => gitStatus?.files ?? [], [gitStatus?.files]);
  const [showAllFiles, setShowAllFiles] = React.useState(false);
  const visibleChangedFiles = React.useMemo(
    () => (showAllFiles ? changedFiles : changedFiles.slice(0, 5)),
    [changedFiles, showAllFiles],
  );

  const sessionMessages = useSessionMessageRecords(sessionId ?? '', (directory || effectiveDirectory) ?? undefined);

  const { artifacts, uploads, skillsUsed } = React.useMemo(() => {
    const artifactMap = new Map<string, string>();
    const uploadList: { id: string; name: string }[] = [];
    const skillSet = new Set<string>();

    for (const entry of sessionMessages) {
      for (const part of entry.parts ?? []) {
        const partRecord = part as Record<string, unknown>;
        const partType = typeof partRecord.type === 'string' ? partRecord.type : '';

        if (partType === 'file') {
          const filename =
            typeof partRecord.filename === 'string'
              ? partRecord.filename
              : typeof partRecord.url === 'string'
                ? partRecord.url.split('/').pop() ?? 'attachment'
                : 'attachment';
          const id = typeof partRecord.id === 'string' ? partRecord.id : `${entry.info.id}-${uploadList.length}`;
          uploadList.push({ id, name: filename });
        }

        if (partType === 'tool') {
          const toolName = typeof partRecord.tool === 'string' ? partRecord.tool : '';
          const inputObj = ((partRecord.state ?? {}) as Record<string, unknown>).input as Record<string, unknown> | undefined;

          if (toolName === 'skill' && inputObj && typeof inputObj.name === 'string' && inputObj.name.trim()) {
            skillSet.add(inputObj.name.trim());
          }

          const candidatePath =
            (inputObj && typeof inputObj.filePath === 'string' && inputObj.filePath) ||
            (inputObj && typeof inputObj.path === 'string' && inputObj.path) ||
            (inputObj && typeof inputObj.TargetFile === 'string' && inputObj.TargetFile) ||
            '';
          if (candidatePath && /\.(md|mdx|html|pdf)$/i.test(candidatePath)) {
            const { basename } = splitFilePath(candidatePath);
            artifactMap.set(candidatePath, basename);
          }
        }
      }
    }

    for (const file of changedFiles) {
      if (/\.(md|mdx)$/i.test(file.path)) {
        const { basename } = splitFilePath(file.path);
        artifactMap.set(file.path, basename);
      }
    }

    return {
      artifacts: Array.from(artifactMap.entries()).map(([path, name]) => ({ path, name })),
      uploads: uploadList,
      skillsUsed: Array.from(skillSet),
    };
  }, [changedFiles, sessionMessages]);

  const terminalTabs = useTerminalStore(
    React.useCallback(
      (state) => {
        if (!targetDirectory) return EMPTY_TERMINAL_TABS;
        const key = normalizeTerminalDirectory(targetDirectory);
        return state.sessions.get(key)?.tabs ?? EMPTY_TERMINAL_TABS;
      },
      [targetDirectory],
    ),
  );



  const skills = useSkillsStore((state) => state.skills);

  useReportWorkStatusPresence('antigravity-inspector', true);

  const handleOpenFileDiff = React.useCallback(
    (filePath: string) => {
      if (!targetDirectory) return;
      openContextPanelTab(targetDirectory, {
        mode: 'diff',
        diffScope: 'working',
        targetPath: filePath,
      });
    },
    [openContextPanelTab, targetDirectory],
  );

  const handleOpenAllChanges = React.useCallback(() => {
    if (!targetDirectory) return;
    openContextPanelTab(targetDirectory, { mode: 'diff', diffScope: 'working' });
  }, [openContextPanelTab, targetDirectory]);

  const handleOpenFiles = React.useCallback(() => {
    if (!targetDirectory) return;
    openContextSurface(targetDirectory, 'file');
  }, [openContextSurface, targetDirectory]);

  const handleOpenTerminal = React.useCallback(() => {
    if (!targetDirectory) return;
    openContextSurface(targetDirectory, 'terminal');
  }, [openContextSurface, targetDirectory]);



  const handleOpenSkillsCatalog = React.useCallback(() => {
    setSettingsPage('skills.catalog');
    setSettingsDialogOpen(true);
  }, [setSettingsDialogOpen, setSettingsPage]);

  return (
    <>
      {repositoryEnabled ? (
        <WorkStatusCollapsibleSection
          id="ag-files-changed"
          title={t('ag.inspector.filesChanged')}
          defaultExpanded={changedFiles.length > 0}
          summary={changedFiles.length}
        >
          {changedFiles.length === 0 ? (
            <WorkStatusRow
              icon="folder"
              label={t('contextPanel.mode.files')}
              muted
              onClick={handleOpenFiles}
            />
          ) : (
            <div className="flex flex-col gap-0.5 pt-0.5">
              {visibleChangedFiles.map((file) => {
                const { basename, dir } = splitFilePath(file.path);
                const iconName = getFileIconName(file.path);
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => handleOpenFileDiff(file.path)}
                    className="group flex h-7 w-full items-center gap-2 rounded-md px-1 text-left transition-colors hover:bg-interactive-hover/50"
                    title={file.path}
                  >
                    <Icon name={iconName} className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    <span className="shrink-0 text-[12.5px] font-medium text-foreground">{basename}</span>
                    {dir ? (
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground/75">{dir}</span>
                    ) : (
                      <span className="flex-1" />
                    )}
                  </button>
                );
              })}
              {changedFiles.length > 5 ? (
                <div className="mt-1 flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setShowAllFiles((prev) => !prev)}
                    className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showAllFiles
                      ? t('ag.inspector.showLess')
                      : t('ag.inspector.seeAll', { count: changedFiles.length })}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAllChanges}
                    className="text-[11.5px] text-muted-foreground/80 transition-colors hover:text-foreground"
                  >
                    {t('ag.inspector.openDiff')}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </WorkStatusCollapsibleSection>
      ) : null}

      <WorkStatusCollapsibleSection
        id="ag-artifacts"
        title={t('ag.inspector.artifacts')}
        summary={artifacts.length > 0 ? artifacts.length : undefined}
      >
        {artifacts.length === 0 ? (
          <WorkStatusRow
            icon="file-text"
            label={t('ag.inspector.noArtifacts')}
            muted
            onClick={handleOpenFiles}
          />
        ) : (
          <div className="flex flex-col gap-0.5 pt-0.5">
            {artifacts.map((artifact) => (
              <WorkStatusRow
                key={artifact.path}
                icon="file-text"
                label={artifact.name}
                tooltip={artifact.path}
                onClick={handleOpenFiles}
              />
            ))}
          </div>
        )}
      </WorkStatusCollapsibleSection>

      <WorkStatusCollapsibleSection
        id="ag-uploads"
        title={t('ag.inspector.uploads')}
        summary={uploads.length > 0 ? uploads.length : undefined}
      >
        {uploads.length === 0 ? (
          <div className="px-1 py-1 text-[12px] text-muted-foreground">{t('ag.inspector.noUploads')}</div>
        ) : (
          <div className="flex flex-col gap-0.5 pt-0.5">
            {uploads.map((upload) => (
              <WorkStatusRow key={upload.id} icon="attachment-2" label={upload.name} />
            ))}
          </div>
        )}
      </WorkStatusCollapsibleSection>



      <WorkStatusCollapsibleSection
        id="ag-terminals"
        title={t('ag.inspector.terminals')}
        summary={terminalTabs.length > 0 ? terminalTabs.length : undefined}
      >
        {terminalTabs.length === 0 ? (
          <WorkStatusRow
            icon="terminal-box"
            label={t('ag.inspector.openTerminal')}
            muted
            onClick={handleOpenTerminal}
          />
        ) : (
          <div className="flex flex-col gap-0.5 pt-0.5">
            {terminalTabs.map((tab) => (
              <WorkStatusRow
                key={tab.id}
                icon="terminal-box"
                label={tab.label || t('layout.mainTab.terminal')}
                onClick={handleOpenTerminal}
                value={
                  tab.lifecycle === 'running' ? (
                    <WorkStatusValue tone="success">{t('ag.inspector.active')}</WorkStatusValue>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </WorkStatusCollapsibleSection>

      <WorkStatusCollapsibleSection
        id="ag-skills-used"
        title={t('ag.inspector.skillsUsed')}
        summary={skillsUsed.length > 0 ? skillsUsed.length : skills.length > 0 ? skills.length : undefined}
      >
        {skillsUsed.length > 0 ? (
          <div className="flex flex-col gap-0.5 pt-0.5">
            {skillsUsed.map((skillName) => (
              <WorkStatusRow
                key={skillName}
                icon="book-open"
                label={skillName}
                onClick={handleOpenSkillsCatalog}
              />
            ))}
          </div>
        ) : (
          <WorkStatusRow
            icon="book-open"
            label={
              skills.length > 0
                ? t('ag.inspector.projectSkillsReady', { count: skills.length })
                : t('ag.inspector.browseSkillsCatalog')
            }
            muted
            onClick={handleOpenSkillsCatalog}
          />
        )}
      </WorkStatusCollapsibleSection>
    </>
  );
};
