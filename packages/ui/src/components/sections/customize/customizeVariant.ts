import React from 'react';

/** `page` when the hub fills the main surface, `settings` inside Settings (narrower cards). */
export type CustomizeVariant = 'page' | 'settings';

export const CustomizeVariantContext = React.createContext<CustomizeVariant>('page');

export const useCustomizeVariant = (): CustomizeVariant => React.useContext(CustomizeVariantContext);
