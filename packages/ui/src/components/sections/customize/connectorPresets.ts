/**
 * Connectors Discover offers to add in one click: well-known MCP servers,
 * remote ones by URL and local ones run with npx. Adding one writes a normal
 * MCP entry to the user's config; nothing here is installed until then.
 */

import type { IconName } from '@/components/icon/icons';
import type { I18nKey } from '@/lib/i18n';
import type { McpDraft } from '@/stores/useMcpConfigStore';

export type ConnectorTransport =
  | { type: 'remote'; url: string }
  | { type: 'local'; command: readonly string[] };

export interface ConnectorPreset {
  id: string;
  label: string;
  descriptionKey: I18nKey;
  transport: ConnectorTransport;
  categories: readonly string[];
}

export const CONNECTOR_PRESETS: readonly ConnectorPreset[] = [
  {
    id: 'context7',
    label: 'Context7',
    descriptionKey: 'settings.customize.store.mcp.context7',
    transport: {
      type: 'remote',
      url: 'https://mcp.context7.com/mcp',
    },
    categories: ['files-documents', 'apis', 'engineering'],
  },
  {
    id: 'deepwiki',
    label: 'DeepWiki',
    descriptionKey: 'settings.customize.store.mcp.deepwiki',
    transport: {
      type: 'remote',
      url: 'https://mcp.deepwiki.com/mcp',
    },
    categories: ['files-documents', 'notes-memory', 'engineering'],
  },
  {
    id: 'linear',
    label: 'Linear',
    descriptionKey: 'settings.customize.store.mcp.linear',
    transport: {
      type: 'remote',
      url: 'https://mcp.linear.app/mcp',
    },
    categories: ['tickets-tasks', 'pipelines-jobs'],
  },
  {
    id: 'playwright',
    label: 'Playwright',
    descriptionKey: 'settings.customize.store.mcp.playwright',
    transport: {
      type: 'local',
      command: ['npx', '@playwright/mcp@latest'],
    },
    categories: ['engineering', 'code', 'testing'],
  },
  {
    id: 'memory',
    label: 'Memory',
    descriptionKey: 'settings.customize.store.mcp.memory',
    transport: {
      type: 'local',
      command: ['npx', '-y', '@modelcontextprotocol/server-memory'],
    },
    categories: ['notes-memory', 'ai-models-agents'],
  },
  {
    id: 'sequential-thinking',
    label: 'Sequential Thinking',
    descriptionKey: 'settings.customize.store.mcp.sequentialThinking',
    transport: {
      type: 'local',
      command: ['npx', '-y', '@modelcontextprotocol/server-sequential-thinking'],
    },
    categories: ['ai-models-agents', 'notes-memory'],
  },
  {
    id: 'chrome-devtools',
    label: 'Chrome DevTools',
    descriptionKey: 'settings.customize.store.mcp.chromeDevtools',
    transport: {
      type: 'local',
      command: ['npx', '-y', 'chrome-devtools-mcp@latest', '--headless', '--isolated'],
    },
    categories: ['engineering', 'code', 'testing'],
  },
  {
    id: 'filesystem',
    label: 'Filesystem',
    descriptionKey: 'settings.customize.store.mcp.filesystem',
    transport: {
      type: 'local',
      command: ['npx', '-y', '@modelcontextprotocol/server-filesystem', '.'],
    },
    categories: ['files-documents', 'engineering'],
  },
  {
    id: 'sentry',
    label: 'Sentry',
    descriptionKey: 'settings.customize.store.mcp.sentry',
    transport: {
      type: 'remote',
      url: 'https://mcp.sentry.dev/mcp',
    },
    categories: ['devops', 'engineering'],
  },
  {
    id: 'notion',
    label: 'Notion',
    descriptionKey: 'settings.customize.store.mcp.notion',
    transport: {
      type: 'remote',
      url: 'https://mcp.notion.com/mcp',
    },
    categories: ['notes-memory', 'files-documents'],
  },
  {
    id: 'atlassian',
    label: 'Atlassian',
    descriptionKey: 'settings.customize.store.mcp.atlassian',
    transport: {
      type: 'remote',
      url: 'https://mcp.atlassian.com/v1/sse',
    },
    categories: ['tickets-tasks', 'engineering'],
  },
  {
    id: 'asana',
    label: 'Asana',
    descriptionKey: 'settings.customize.store.mcp.asana',
    transport: {
      type: 'remote',
      url: 'https://mcp.asana.com/sse',
    },
    categories: ['tickets-tasks', 'pipelines-jobs'],
  },
  {
    id: 'stripe',
    label: 'Stripe',
    descriptionKey: 'settings.customize.store.mcp.stripe',
    transport: {
      type: 'remote',
      url: 'https://mcp.stripe.com',
    },
    categories: ['apis', 'data-analytics'],
  },
  {
    id: 'paypal',
    label: 'PayPal',
    descriptionKey: 'settings.customize.store.mcp.paypal',
    transport: {
      type: 'remote',
      url: 'https://mcp.paypal.com/mcp',
    },
    categories: ['apis', 'data-analytics'],
  },
  {
    id: 'figma',
    label: 'Figma',
    descriptionKey: 'settings.customize.store.mcp.figma',
    transport: {
      type: 'remote',
      url: 'https://mcp.figma.com/mcp',
    },
    categories: ['designs-media', 'engineering'],
  },
  {
    id: 'canva',
    label: 'Canva',
    descriptionKey: 'settings.customize.store.mcp.canva',
    transport: {
      type: 'remote',
      url: 'https://mcp.canva.com/mcp',
    },
    categories: ['designs-media'],
  },
  {
    id: 'supabase',
    label: 'Supabase',
    descriptionKey: 'settings.customize.store.mcp.supabase',
    transport: {
      type: 'remote',
      url: 'https://mcp.supabase.com/mcp',
    },
    categories: ['devops', 'data-analytics'],
  },
  {
    id: 'neon',
    label: 'Neon',
    descriptionKey: 'settings.customize.store.mcp.neon',
    transport: {
      type: 'remote',
      url: 'https://mcp.neon.tech/mcp',
    },
    categories: ['devops', 'data-analytics'],
  },
  {
    id: 'vercel',
    label: 'Vercel',
    descriptionKey: 'settings.customize.store.mcp.vercel',
    transport: {
      type: 'remote',
      url: 'https://mcp.vercel.com',
    },
    categories: ['devops', 'pipelines-jobs'],
  },
  {
    id: 'cloudflare-docs',
    label: 'Cloudflare Docs',
    descriptionKey: 'settings.customize.store.mcp.cloudflareDocs',
    transport: {
      type: 'remote',
      url: 'https://docs.mcp.cloudflare.com/mcp',
    },
    categories: ['files-documents', 'devops'],
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    descriptionKey: 'settings.customize.store.mcp.huggingface',
    transport: {
      type: 'remote',
      url: 'https://huggingface.co/mcp',
    },
    categories: ['ai-models-agents', 'data-analytics'],
  },
  {
    id: 'monday',
    label: 'monday.com',
    descriptionKey: 'settings.customize.store.mcp.monday',
    transport: {
      type: 'remote',
      url: 'https://mcp.monday.com/mcp',
    },
    categories: ['tickets-tasks', 'pipelines-jobs'],
  },
  {
    id: 'intercom',
    label: 'Intercom',
    descriptionKey: 'settings.customize.store.mcp.intercom',
    transport: {
      type: 'remote',
      url: 'https://mcp.intercom.com/mcp',
    },
    categories: ['tickets-tasks', 'data-analytics'],
  },
  {
    id: 'exa',
    label: 'Exa',
    descriptionKey: 'settings.customize.store.mcp.exa',
    transport: {
      type: 'remote',
      url: 'https://mcp.exa.ai/mcp',
    },
    categories: ['apis', 'files-documents'],
  },
  {
    id: 'webflow',
    label: 'Webflow',
    descriptionKey: 'settings.customize.store.mcp.webflow',
    transport: {
      type: 'remote',
      url: 'https://mcp.webflow.com/sse',
    },
    categories: ['designs-media', 'apis'],
  },
  {
    id: 'square',
    label: 'Square',
    descriptionKey: 'settings.customize.store.mcp.square',
    transport: {
      type: 'remote',
      url: 'https://mcp.squareup.com/sse',
    },
    categories: ['apis', 'data-analytics'],
  },
  ];

export interface ConnectorCollection {
  id: string;
  titleKey: I18nKey;
  subtitleKey: I18nKey;
  connectorIds: readonly string[];
  icon: IconName;
}

export const CONNECTOR_COLLECTIONS: readonly ConnectorCollection[] = [
  {
    id: 'engineering',
    titleKey: 'settings.customize.discover.connectors.collection.engineering.title',
    subtitleKey: 'settings.customize.discover.connectors.collection.engineering.subtitle',
    connectorIds: ['playwright', 'chrome-devtools', 'memory'],
    icon: 'server',
  },
  {
    id: 'productivity',
    titleKey: 'settings.customize.discover.connectors.collection.productivity.title',
    subtitleKey: 'settings.customize.discover.connectors.collection.productivity.subtitle',
    connectorIds: ['linear', 'filesystem', 'sequential-thinking'],
    icon: 'brain',
  },
];

export const connectorPresetById = (id: string): ConnectorPreset | undefined => CONNECTOR_PRESETS.find((preset) => preset.id === id);

/** The MCP entry a preset becomes: user scope, default timeouts, OAuth discovery on. */
export const draftFromPreset = (preset: ConnectorPreset): McpDraft => ({
  name: preset.id,
  scope: 'user',
  type: preset.transport.type,
  command: preset.transport.type === 'local' ? [...preset.transport.command] : [],
  url: preset.transport.type === 'remote' ? preset.transport.url : '',
  environment: [],
  headers: [],
  oauthEnabled: true,
  oauthClientId: '',
  oauthClientSecret: '',
  oauthScope: '',
  oauthRedirectUri: '',
  oauthCallbackPort: '',
  oauthAuthServerMetadataUrl: '',
  protocol: 'legacy',
  timeoutStartup: '',
  timeoutCatalog: '',
  timeoutExecution: '',
  codemode: 'default',
  disabled: false,
});
