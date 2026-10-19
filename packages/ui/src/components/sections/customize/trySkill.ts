import { useInputStore } from '@/sync/input-store';
import { useSessionUIStore } from '@/sync/session-ui-store';
import { useUIStore } from '@/stores/useUIStore';

/** Start a new chat with `/<skill> ` typed in, so the user can try a skill right away. */
export const trySkillInNewChat = (name: string) => {
  const ui = useUIStore.getState();
  ui.closeMainSurfaces();
  ui.setSettingsDialogOpen(false);
  useSessionUIStore.getState().openNewSessionDraft();
  useInputStore.getState().setPendingInputText(`/${name} `, 'replace', null);
};
