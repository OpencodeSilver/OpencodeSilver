import { createConfiguredWebAPIs } from './runtimeConfig';
import type { RuntimeAPIs } from '@opencodesilver/ui/lib/api/types';
import '@opencodesilver/ui/index.css';
import '@opencodesilver/ui/styles/fonts';
import '@opencodesilver/ui/styles/katex-css';

declare global {
  interface Window {
    __OPENCODESILVER_RUNTIME_APIS__?: RuntimeAPIs;
  }
}

window.__OPENCODESILVER_RUNTIME_APIS__ = createConfiguredWebAPIs();

void import('@opencodesilver/ui/apps/renderElectronMiniChatApp')
  .then(({ renderElectronMiniChatApp }) => {
    renderElectronMiniChatApp(window.__OPENCODESILVER_RUNTIME_APIS__ ?? createConfiguredWebAPIs());
  });
