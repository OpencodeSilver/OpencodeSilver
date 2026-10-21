export const MODELS_DEV_API_URL = "https://models.dev/api.json";
export const MODELS_DEV_PROXY_URL = "/api/opencodesilver/models-metadata";

export const FALLBACK_PROVIDER_ID = "opencode";
export const FALLBACK_MODEL_ID = "big-pickle";
// Sentinel selectedProviderId used by the providers UI while the "Add provider"
// form is open. It is intentionally not a real provider id and must not be
// persisted as a stable provider selection.
export const ADD_PROVIDER_SENTINEL = "__add_provider__";
export const GIT_UTILITY_PROVIDER_ID = "zen";
export const GIT_UTILITY_PREFERRED_MODEL_ID = "big-pickle";
export const PROVIDER_CONFIG_REFRESH_CONCURRENCY = 4;
export const PROVIDERS_RETRY_SOURCE = "loadProviders:retryAfterFailure";
export const PROVIDERS_RETRY_DELAY_MS = 3000;

export interface OpencodeSilverDefaults {
    defaultModel?: string;
    defaultVariant?: string;
    defaultAgent?: string;
    autoCreateWorktree?: boolean;
    gitmojiEnabled?: boolean;
    defaultFileViewerPreview?: boolean;
    zenModel?: string;
    messageStreamTransport?: 'auto' | 'ws' | 'sse';
    dictationEnabled?: boolean;
    sttProvider?: 'local' | 'openai-compatible';
    sttServerUrl?: string;
    sttModel?: string;
    sttLocalModel?: string;
    sttLanguage?: string;
}
