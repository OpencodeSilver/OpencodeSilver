import React from 'react';

import { toast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';
import { useCustomizeHubStore, type CustomizeItem } from '@/stores/useCustomizeHubStore';

import { itemLabel } from './customizeModel';

/** Turn a skill or connector on/off, with a toast when the write fails. */
export const useToggleItem = (directory: string | null) => {
  const { t } = useI18n();
  const setItemEnabled = useCustomizeHubStore((state) => state.setItemEnabled);
  return React.useCallback(async (item: CustomizeItem, enabled: boolean) => {
    const ok = await setItemEnabled(item.id, enabled, directory);
    if (!ok) toast.error(t('settings.customize.item.toggleError', { name: itemLabel(item) }));
  }, [directory, setItemEnabled, t]);
};
