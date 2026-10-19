/** The Customize hub as a full page over the chat, opened from the sidebar's "Customizations". */

import React from 'react';

import { CustomizeHub } from '@/components/sections/customize/CustomizeHub';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { customizeSlugForTab, type CustomizeTab } from '@/lib/settings/metadata';
import { useUIStore } from '@/stores/useUIStore';

export const SkillsStoreView: React.FC = () => {
  const isOpen = useUIStore((state) => state.isSkillsStoreOpen);
  const setOpen = useUIStore((state) => state.setSkillsStoreOpen);
  const [tab, setTab] = React.useState<CustomizeTab>('skills');

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Leave Escape to open menus and dialogs; only close when nothing else handles it.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  const openSettings = (slug: string) => {
    const ui = useUIStore.getState();
    ui.setSkillsStoreOpen(false);
    ui.setSettingsPage(slug);
    ui.setSettingsDialogOpen(true);
  };

  return (
    <div className="absolute inset-0 z-10 bg-background" data-testid="skills-store-page">
      <ErrorBoundary>
        <CustomizeHub
          tab={tab}
          initialMode="discover"
          onSelectTab={setTab}
          onOpenSettings={(slug) => openSettings(slug || customizeSlugForTab(tab))}
          onClose={() => setOpen(false)}
        />
      </ErrorBoundary>
    </div>
  );
};
