/**
 * "Add a GitHub repository": scan a repo for skills, install the picked ones
 * for the user or the current project, and optionally keep the repo as a
 * Discover source.
 */

import React from 'react';

import { Icon } from '@/components/icon/Icon';
import { InstallConflictsDialog, type ConflictDecision, type SkillConflict } from '@/components/sections/skills/catalog/InstallConflictsDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import type { SkillsCatalogItem } from '@/lib/api/types';
import { isVSCodeRuntime } from '@/lib/desktop';
import { useI18n } from '@/lib/i18n';
import type { I18nKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useCustomizeHubStore } from '@/stores/useCustomizeHubStore';
import { useGitIdentitiesStore } from '@/stores/useGitIdentitiesStore';
import { useProjectsStore } from '@/stores/useProjectsStore';
import { useSkillsCatalogStore } from '@/stores/useSkillsCatalogStore';

import { addSkillSource, parseRepoInput, type RepoParseError } from './repoSource';

const PARSE_ERROR_KEYS: Record<RepoParseError, I18nKey> = {
  empty: 'settings.customize.addRepo.error.empty',
  unsupportedHost: 'settings.customize.addRepo.error.unsupportedHost',
  embeddedCredentials: 'settings.customize.addRepo.error.embeddedCredentials',
  invalidFormat: 'settings.customize.addRepo.error.invalidFormat',
};

type Identity = { id: string; name: string };

export const AddRepoDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({ open, onOpenChange }) => {
  const { t } = useI18n();
  const scanRepo = useSkillsCatalogStore((state) => state.scanRepo);
  const installSkills = useSkillsCatalogStore((state) => state.installSkills);
  const loadCatalog = useSkillsCatalogStore((state) => state.loadCatalog);
  const loadSource = useSkillsCatalogStore((state) => state.loadSource);
  const setSelectedSource = useSkillsCatalogStore((state) => state.setSelectedSource);
  const isScanning = useSkillsCatalogStore((state) => state.isScanning);
  const isInstalling = useSkillsCatalogStore((state) => state.isInstalling);
  const defaultGitIdentityId = useGitIdentitiesStore((state) => state.defaultGitIdentityId);
  const loadDefaultGitIdentityId = useGitIdentitiesStore((state) => state.loadDefaultGitIdentityId);
  const projects = useProjectsStore((state) => state.projects);
  const activeProjectId = useProjectsStore((state) => state.activeProjectId);

  const [repository, setRepository] = React.useState('');
  const [subpath, setSubpath] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [gitIdentityId, setGitIdentityId] = React.useState<string | null>(null);
  const [identities, setIdentities] = React.useState<Identity[]>([]);
  const [keepAsSource, setKeepAsSource] = React.useState(true);
  const [scope, setScope] = React.useState<'user' | 'project'>('user');
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [scanned, setScanned] = React.useState(false);
  const [foundCount, setFoundCount] = React.useState<number | null>(null);
  const [found, setFound] = React.useState<SkillsCatalogItem[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [conflictsOpen, setConflictsOpen] = React.useState(false);
  const [conflicts, setConflicts] = React.useState<SkillConflict[]>([]);
  const [conflictSelection, setConflictSelection] = React.useState<string[]>([]);
  const requestRef = React.useRef(0);
  const busy = isScanning || isInstalling;

  React.useEffect(() => {
    if (!open) return;
    requestRef.current += 1;
    setRepository('');
    setSubpath('');
    setLabel('');
    setGitIdentityId(null);
    setIdentities([]);
    setInputError(null);
    setScanned(false);
    setFoundCount(null);
    setFound([]);
    setSelected(new Set());
    setKeepAsSource(true);
    setScope(projects.length > 0 ? 'project' : 'user');
    setConflictsOpen(false);
    setConflicts([]);
    setConflictSelection([]);
    void loadDefaultGitIdentityId();
    // Only reset when the dialog opens, not when the project list changes under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadDefaultGitIdentityId]);

  const resetScan = () => {
    requestRef.current += 1;
    setScanned(false);
    setFoundCount(null);
    setFound([]);
    setSelected(new Set());
  };

  /** The normalized `owner/repo`, or null after showing why the input is invalid. */
  const validate = (): string | null => {
    const parsed = parseRepoInput(repository);
    if (!parsed.ok) {
      setInputError(t(PARSE_ERROR_KEYS[parsed.error]));
      return null;
    }
    setInputError(null);
    return parsed.normalizedSource;
  };

  const onRepositoryBlur = () => {
    if (!repository.trim()) {
      setInputError(null);
      return;
    }
    const parsed = parseRepoInput(repository);
    if (!parsed.ok) {
      setInputError(t(PARSE_ERROR_KEYS[parsed.error]));
      return;
    }
    setInputError(null);
    if (!subpath && parsed.subpath) setSubpath(parsed.subpath);
    if (!label) setLabel(`${parsed.owner}/${parsed.repo}`);
  };

  const scan = async () => {
    const source = validate();
    if (!source) return;
    const parsed = parseRepoInput(repository);
    if (parsed.ok && !label.trim()) setLabel(`${parsed.owner}/${parsed.repo}`);
    setScanned(false);
    setFoundCount(null);
    const request = requestRef.current + 1;
    requestRef.current = request;
    const result = await scanRepo({ source, subpath: subpath.trim() || undefined, gitIdentityId: gitIdentityId || undefined });
    if (requestRef.current !== request) return;
    if (!result.ok) {
      const kind = result.error?.kind;
      if (kind === 'authRequired') {
        if (isVSCodeRuntime()) {
          toast.error(t('settings.skills.catalog.shared.toast.privateRepoNotSupportedVsCode'));
          return;
        }
        const options = (result.error && 'identities' in result.error ? result.error.identities : undefined) ?? [];
        setIdentities(options);
        if (!gitIdentityId && options.length > 0) {
          const preferred = defaultGitIdentityId && defaultGitIdentityId !== 'global' && options.some((option) => option.id === defaultGitIdentityId)
            ? defaultGitIdentityId
            : options[0].id;
          setGitIdentityId(preferred);
        }
        toast.error(t('settings.customize.addRepo.error.authRequired'));
        return;
      }
      if (kind === 'networkError') toast.error(t('settings.customize.addRepo.error.networkError'));
      else if (kind === 'gitUnavailable') toast.error(t('settings.customize.addRepo.error.gitUnavailable'));
      else toast.error(result.error?.message || t('settings.customize.addRepo.error.unknown'));
      return;
    }
    const items = result.items ?? [];
    setFoundCount(items.length);
    setFound(items);
    setScanned(true);
    setSelected(new Set(items.map((item) => item.skillDir)));
    if (items.length === 0) toast.info(t('settings.customize.addRepo.noSkillsFound'));
    else toast.success(t('settings.customize.addRepo.foundCount', { count: items.length }));
  };

  const saveSource = async (source: string) => {
    const result = await addSkillSource({
      label: label.trim() || source,
      source,
      subpath: subpath.trim() || undefined,
      gitIdentityId: gitIdentityId || undefined,
    });
    if (!result.ok) {
      toast.error(t('settings.customize.addRepo.error.saveFailed'));
      return result;
    }
    await loadCatalog({ refresh: true });
    await loadSource(result.catalogId, { refresh: true });
    setSelectedSource(result.catalogId);
    return result;
  };

  const addSourceOnly = async () => {
    const source = validate();
    if (!source) return;
    const result = await saveSource(source);
    if (!result.ok) return;
    toast[result.alreadyExists ? 'info' : 'success'](
      t(result.alreadyExists ? 'settings.customize.addRepo.alreadyAdded' : 'settings.customize.addRepo.sourceAdded'),
    );
    onOpenChange(false);
  };

  const projectDirectory = scope === 'project'
    ? (projects.find((project) => project.id === activeProjectId)?.path ?? projects[0]?.path ?? null)
    : null;

  const install = async (skillDirs: string[], decisions?: Record<string, ConflictDecision>) => {
    const source = validate();
    if (!source) return;
    const result = await installSkills(
      {
        source,
        subpath: subpath.trim() || undefined,
        gitIdentityId: gitIdentityId || undefined,
        scope,
        targetSource: 'opencode',
        selections: skillDirs.map((skillDir) => ({ skillDir })),
        conflictPolicy: 'prompt',
        conflictDecisions: decisions,
      },
      { directory: projectDirectory },
    );
    if (result.ok) {
      if (keepAsSource) await saveSource(source);
      void useCustomizeHubStore.getState().refresh(projectDirectory);
      toast.success(t('settings.customize.addRepo.installedToast'));
      onOpenChange(false);
      return;
    }
    if (result.error?.kind === 'conflicts') {
      setConflictSelection(skillDirs);
      setConflicts(result.error.conflicts);
      setConflictsOpen(true);
      return;
    }
    if (result.error?.kind === 'authRequired') {
      toast.error(t('settings.customize.addRepo.error.authRequired'));
      return;
    }
    toast.error(result.error?.message || t('settings.customize.addRepo.error.unknown'));
  };

  const toggle = (skillDir: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(skillDir)) next.delete(skillDir);
      else next.add(skillDir);
      return next;
    });
  };

  const allSelected = found.length > 0 && selected.size === found.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="github" className="h-5 w-5" />
              <span>{t('settings.customize.addRepo.title')}</span>
            </DialogTitle>
            <DialogDescription>{t('settings.customize.addRepo.description')}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto py-1 pe-1">
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-[var(--surface-elevated)] p-3">
              <Icon name="shield-check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="typography-meta text-muted-foreground">{t('settings.customize.addRepo.trustNotice')}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="add-repo-input" className="typography-ui-label text-foreground">{t('settings.customize.addRepo.field.repository')}</label>
              <Input
                id="add-repo-input"
                dir="ltr"
                value={repository}
                onChange={(event) => {
                  setRepository(event.target.value);
                  if (inputError) setInputError(null);
                  resetScan();
                }}
                onBlur={onRepositoryBlur}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void scan();
                  }
                }}
                placeholder={t('settings.customize.addRepo.field.repositoryPlaceholder')}
                className={cn('font-mono text-xs sm:text-sm', inputError && 'border-destructive focus-visible:ring-destructive')}
                aria-invalid={Boolean(inputError)}
                aria-describedby={inputError ? 'add-repo-input-error' : undefined}
                autoFocus
              />
              {inputError ? <p id="add-repo-input-error" className="typography-micro text-destructive" role="alert">{inputError}</p> : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="add-repo-subpath" className="typography-ui-label text-foreground">{t('settings.customize.addRepo.field.subpath')}</label>
                <Input
                  id="add-repo-subpath"
                  dir="ltr"
                  value={subpath}
                  onChange={(event) => {
                    setSubpath(event.target.value);
                    resetScan();
                  }}
                  placeholder={t('settings.customize.addRepo.field.subpathPlaceholder')}
                  className="font-mono text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="add-repo-label" className="typography-ui-label text-foreground">{t('settings.customize.addRepo.field.label')}</label>
                <Input id="add-repo-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t('settings.customize.addRepo.field.labelPlaceholder')} />
              </div>
            </div>

            {identities.length > 0 && !isVSCodeRuntime() ? (
              <div className="space-y-1.5">
                <span className="typography-ui-label text-foreground">{t('settings.customize.addRepo.field.gitIdentity')}</span>
                <Select
                  value={gitIdentityId || ''}
                  onValueChange={(value) => {
                    setGitIdentityId((value as string) || null);
                    resetScan();
                  }}
                >
                  <SelectTrigger className="w-fit">
                    <span>{identities.find((identity) => identity.id === gitIdentityId)?.name || t('settings.customize.addRepo.field.gitIdentityNone')}</span>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {identities.map((identity) => (
                      <SelectItem key={identity.id} value={identity.id}>{identity.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-1">
              <div aria-live="polite" className="typography-meta text-muted-foreground">
                {foundCount !== null ? t('settings.customize.addRepo.foundCount', { count: foundCount }) : null}
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => { void scan(); }} disabled={busy} className="gap-1.5">
                <Icon name={isScanning ? 'loader-4' : 'refresh'} className={cn('h-3.5 w-3.5', isScanning && 'animate-spin')} />
                <span>{t(isScanning ? 'settings.customize.addRepo.actions.scanning' : 'settings.customize.addRepo.actions.scan')}</span>
              </Button>
            </div>

            {scanned ? (
              <div className="space-y-2 border-t border-border/50 pt-2">
                {found.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/80 p-4 text-center">
                    <p className="typography-meta text-muted-foreground">{t('settings.customize.addRepo.noSkillsFound')}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-1">
                      <span className="typography-ui-label text-foreground">{t('settings.customize.addRepo.foundCount', { count: found.length })}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setSelected(allSelected ? new Set() : new Set(found.map((item) => item.skillDir)))}
                        className="h-7 px-2 text-xs"
                      >
                        {t(allSelected ? 'settings.customize.addRepo.deselectAll' : 'settings.customize.addRepo.selectAll')}
                      </Button>
                    </div>
                    <div className="max-h-52 space-y-2 overflow-y-auto pe-1">
                      {found.map((item) => {
                        const checked = selected.has(item.skillDir);
                        return (
                          <div
                            key={item.skillDir}
                            onClick={() => toggle(item.skillDir)}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-[var(--surface-elevated)] p-2.5 transition-colors hover:border-border',
                              checked && 'border-primary/40 bg-primary/5',
                            )}
                          >
                            <div className="pt-0.5" onClick={(event) => event.stopPropagation()}>
                              <Checkbox checked={checked} onChange={() => toggle(item.skillDir)} ariaLabel={item.skillName} />
                            </div>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                              <Icon name="book-open" className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-foreground">{item.frontmatterName || item.skillName}</span>
                                <span className="typography-micro truncate rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-muted-foreground">{item.skillDir}</span>
                              </div>
                              {item.description ? <p className="typography-micro mt-0.5 line-clamp-2 text-muted-foreground">{item.description}</p> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3 border-t border-border/50 pt-3">
                      <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={t('settings.customize.addRepo.destination')}>
                        <span className="typography-ui-label text-foreground">{t('settings.customize.addRepo.destination')}</span>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-[var(--surface-elevated)] p-2.5 text-xs',
                              scope === 'user' && 'border-primary/60 bg-primary/5',
                            )}
                          >
                            <input type="radio" name="add-repo-scope" value="user" checked={scope === 'user'} onChange={() => setScope('user')} className="sr-only" />
                            <Icon name="user-3" className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-foreground">{t('settings.customize.addRepo.destination.user')}</span>
                          </label>
                          <label
                            className={cn(
                              'flex items-center gap-2 rounded-lg border border-border/60 bg-[var(--surface-elevated)] p-2.5 text-xs',
                              projects.length === 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                              scope === 'project' && projects.length > 0 && 'border-primary/60 bg-primary/5',
                            )}
                          >
                            <input
                              type="radio"
                              name="add-repo-scope"
                              value="project"
                              checked={scope === 'project'}
                              onChange={() => { if (projects.length > 0) setScope('project'); }}
                              disabled={projects.length === 0}
                              className="sr-only"
                            />
                            <Icon name="folder" className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-foreground">{t('settings.customize.addRepo.destination.project')}</span>
                              {projects.length === 0 ? (
                                <span className="typography-micro text-muted-foreground">{t('settings.customize.addRepo.destination.projectDisabled')}</span>
                              ) : null}
                            </div>
                          </label>
                        </div>
                      </div>
                      <label className="flex cursor-pointer select-none items-center gap-2 pt-1">
                        <Checkbox checked={keepAsSource} onChange={setKeepAsSource} ariaLabel={t('settings.customize.addRepo.keepAsSource')} />
                        <span className="typography-meta text-foreground">{t('settings.customize.addRepo.keepAsSource')}</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 border-t border-border/50 pt-3 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              {t('settings.common.actions.cancel')}
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => { void addSourceOnly(); }} disabled={busy}>
                {t('settings.customize.addRepo.actions.addSource')}
              </Button>
              {scanned && found.length > 0 ? (
                <Button
                  type="button"
                  variant="default"
                  onClick={() => { if (selected.size > 0) void install(Array.from(selected)); }}
                  disabled={selected.size === 0 || busy}
                  className="gap-1.5"
                >
                  {isInstalling ? (
                    <>
                      <Icon name="loader-4" className="h-3.5 w-3.5 animate-spin" />
                      <span>{t('settings.customize.addRepo.actions.installing')}</span>
                    </>
                  ) : (
                    <span>{t('settings.customize.addRepo.actions.installSelected')}</span>
                  )}
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <InstallConflictsDialog
        open={conflictsOpen}
        onOpenChange={setConflictsOpen}
        conflicts={conflicts}
        onConfirm={(decisions) => {
          setConflictsOpen(false);
          void install(conflictSelection, decisions);
        }}
      />
    </>
  );
};
