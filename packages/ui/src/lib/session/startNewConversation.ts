import { useSessionUIStore } from '@/sync/session-ui-store';
import { useUIStore } from '@/stores/useUIStore';

/**
 * "New conversation" from the sidebar or the title bar: a clean chat view.
 * Full-page surfaces close and so does the right-hand context panel (files,
 * changes, terminal…), which is remembered per folder and otherwise pops
 * open or shut as the draft lands on a different folder.
 */
export function startNewConversation(): void {
  const ui = useUIStore.getState();
  ui.closeMainSurfaces();
  for (const [directory, panel] of Object.entries(ui.contextPanelByDirectory)) {
    if (panel?.isOpen) ui.closeContextPanel(directory);
  }
  useSessionUIStore.getState().openNewSessionDraft();
}
