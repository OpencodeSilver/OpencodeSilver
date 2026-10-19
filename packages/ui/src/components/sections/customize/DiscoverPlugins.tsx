/**
 * Discover › Plugins. OpenCode has no plugin registry to browse, so this
 * shows the plugins already configured and points to the Plugins settings,
 * where a package or a local folder can be added.
 */

import React from 'react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useCustomizeHubStore } from '@/stores/useCustomizeHubStore';

import { CustomizeCard, CustomizeGrid, CustomizeKindIcon, CustomizeSectionHeader, ScopeBadge } from './CustomizeParts';
import { itemLabel, itemMatchesQuery } from './customizeModel';

export const DiscoverPlugins: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const { t } = useI18n();
  const items = useCustomizeHubStore((state) => state.items);
  const query = useCustomizeHubStore((state) => state.query);
  const plugins = React.useMemo(() => items.filter((item) => item.kind === 'plugin' && itemMatchesQuery(item, query)), [items, query]);

  return (
    <div className="space-y-6" data-testid="customize-discover-plugins">
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border/80 p-6">
        <h2 className="text-lg font-semibold text-foreground">{t('settings.customize.discover.plugins.empty.title')}</h2>
        <p className="max-w-xl typography-meta text-muted-foreground">{t('settings.customize.discover.plugins.empty.description')}</p>
        <Button variant="secondary" size="sm" onClick={onOpenSettings}>{t('settings.customize.discover.plugins.empty.manageAction')}</Button>
      </div>
      {plugins.length > 0 ? (
        <div className="space-y-4">
          <CustomizeSectionHeader title={t('settings.customize.tab.plugins')} count={plugins.length} />
          <CustomizeGrid>
            {plugins.map((plugin) => (
              <CustomizeCard
                key={plugin.id}
                icon={<CustomizeKindIcon kind="plugin" className="h-5 w-5 text-foreground/80" />}
                title={itemLabel(plugin)}
                description={plugin.description || plugin.path}
                meta={<ScopeBadge scope={plugin.scope} />}
              />
            ))}
          </CustomizeGrid>
        </div>
      ) : null}
    </div>
  );
};
