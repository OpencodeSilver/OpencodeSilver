declare const acquireVsCodeApi: () => {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

interface VSCodeAPI {
  postMessage: (message: unknown) => void;
}

let vscodeApi: VSCodeAPI | null = null;
let noopWarned = false;

const noopVSCodeApi: VSCodeAPI = {
  postMessage: (message) => {
    // acquireVsCodeApi() can return undefined in broken/non-standard webview slots
    // (Cursor after extension update, VSCodium, headless). Drop the message instead
    // of throwing TypeError: Cannot read properties of undefined (reading 'postMessage').
    if (!noopWarned) {
      noopWarned = true;
      console.warn('[opencodesilver] VS Code API unavailable; dropping postMessage', message);
    }
  },
};

function getVSCodeAPI(): VSCodeAPI {
  if (!vscodeApi) {
    const acquired = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
    vscodeApi = acquired ?? noopVSCodeApi;
    // A reload or move between windows replaces the document without disposing
    // its host panel. Retire the previous document's streams before any request.
    vscodeApi.postMessage({ type: 'webview:ready' });
  }
  return vscodeApi;
}

interface BridgeRequest {
  id: string;
  type: string;
  payload?: unknown;
}

interface BridgeResponse {
  id: string;
  type: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

const pendingRequests = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout?: ReturnType<typeof setTimeout>;
  onAbort?: () => void;
}>();

let requestIdCounter = 0;

window.addEventListener('message', (event: MessageEvent<BridgeResponse>) => {
  const response = event.data;
  if (!response || typeof response.id !== 'string') return;

  const messageId = (response as BridgeResponse & { _msgId?: unknown })._msgId;
  if (typeof messageId === 'string' && messageId.length > 0) {
    getVSCodeAPI().postMessage({ type: 'bridge:ack', _msgId: messageId });
  }

  const pending = pendingRequests.get(response.id);
  if (pending) {
    pendingRequests.delete(response.id);
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }
    if (pending.onAbort) {
      pending.onAbort();
    }
    if (response.success) {
      pending.resolve(response.data);
    } else {
      pending.reject(new Error(response.error || 'Unknown error'));
    }
  }
});

export function sendBridgeMessage<T = unknown>(type: string, payload?: unknown): Promise<T> {
  return sendBridgeMessageWithOptions<T>(type, payload);
}

/**
 * Tells the extension something without waiting for an answer.
 *
 * Requests are tracked until a response arrives, so a message the extension
 * never replies to would leak a pending entry on every call. State the webview
 * pushes outward (editor comment threads following the composer's drafts) has
 * no answer to wait for, so it does not go through the request path at all.
 */
export function postBridgeNotification<Payload extends object>(type: string, payload: Payload): void {
  getVSCodeAPI().postMessage({ type, payload });
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function handleBrowserFallbackBridgeMessage<T>(
  type: string,
  payload?: unknown,
  options?: { timeoutMs?: number; signal?: AbortSignal; onAbort?: (id: string) => void }
): Promise<T> {
  const rawApiUrl = (typeof window !== 'undefined' && window.__VSCODE_CONFIG__?.apiUrl) || '';
  const apiBase = rawApiUrl.replace(/\/$/, '');

  if (type === 'api:proxy') {
    const { method, path, headers, bodyBase64 } = (payload || {}) as {
      method?: string;
      path?: string;
      headers?: Record<string, string>;
      bodyBase64?: string;
    };
    const body = bodyBase64 ? decodeBase64(bodyBase64) : undefined;
    const url = `${apiBase}${path || ''}`;
    try {
      const res = await fetch(url, {
        method: method || 'GET',
        headers,
        body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
        signal: options?.signal,
      });
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      const text = await res.text();
      return {
        status: res.status,
        headers: resHeaders,
        bodyText: text,
      } as unknown as T;
    } catch (err) {
      return {
        status: 502,
        headers: {},
        bodyText: JSON.stringify({ error: String(err) }),
      } as unknown as T;
    }
  }

  if (type === 'api:session:message') {
    const { path, headers, bodyText } = (payload || {}) as {
      path?: string;
      headers?: Record<string, string>;
      bodyText?: string;
    };
    const url = `${apiBase}${path || ''}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
        body: bodyText,
        signal: options?.signal,
      });
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      const text = await res.text();
      return {
        status: res.status,
        headers: resHeaders,
        bodyText: text,
      } as unknown as T;
    } catch (err) {
      return {
        status: 502,
        headers: {},
        bodyText: JSON.stringify({ error: String(err) }),
      } as unknown as T;
    }
  }

  if (type === 'api:sse:start') {
    const { path, headers, streamId } = (payload || {}) as {
      path?: string;
      headers?: Record<string, string>;
      streamId?: string;
    };
    const url = `${apiBase}${path || ''}`;
    fetch(url, {
      headers: { Accept: 'text/event-stream', ...(headers || {}) },
      signal: options?.signal,
    }).then(async (res) => {
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            window.postMessage({ type: 'api:sse:end', streamId }, '*');
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          window.postMessage({ type: 'api:sse:chunk', streamId, chunk }, '*');
        }
      } catch (err: any) {
        window.postMessage({ type: 'api:sse:end', streamId, error: err?.message }, '*');
      }
    }).catch((err) => {
      window.postMessage({ type: 'api:sse:end', streamId, error: err?.message }, '*');
    });

    return {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      streamId: streamId || 'browser-fallback-sse',
    } as unknown as T;
  }

  if (type === 'api:sse:stop') {
    return { stopped: true } as unknown as T;
  }

  if (type === 'api:session-activity:get') {
    return {} as unknown as T;
  }

  if (type === 'api:permission-auto-accept:get') {
    return { enabled: false, sessions: {} } as unknown as T;
  }

  if (type === 'api:fs:list') {
    const { path, respectGitignore } = (payload || {}) as { path?: string; respectGitignore?: boolean };
    const url = `${apiBase}/api/fs/list?path=${encodeURIComponent(path || '')}&respectGitignore=${respectGitignore ? 'true' : 'false'}`;
    const res = await fetch(url).catch(() => null);
    if (res?.ok) {
      return await res.json() as unknown as T;
    }
    return { entries: [] } as unknown as T;
  }

  if (type === 'api:fs/home') {
    return { path: (typeof window !== 'undefined' && window.__OPENCODESILVER_HOME__) || 'C:/Users/GEMTM/Desktop/101' } as unknown as T;
  }

  if (type === 'api:models/metadata') {
    const res = await fetch(`${apiBase}/api/models/metadata`).catch(() => null);
    if (res?.ok) {
      return await res.json() as unknown as T;
    }
    return {} as unknown as T;
  }

  if (type === 'vscode:command') {
    return { result: null } as unknown as T;
  }

  if (type === 'vscode:openExternalUrl') {
    const { url } = (payload || {}) as { url?: string };
    if (url && typeof window !== 'undefined') window.open(url, '_blank');
    return undefined as unknown as T;
  }

  return {} as unknown as T;
}

export function sendBridgeMessageWithOptions<T = unknown>(
  type: string,
  payload?: unknown,
  options?: { timeoutMs?: number; signal?: AbortSignal; onAbort?: (id: string) => void }
): Promise<T> {
  if (typeof acquireVsCodeApi !== 'function') {
    return handleBrowserFallbackBridgeMessage<T>(type, payload, options);
  }

  return new Promise((resolve, reject) => {
    const id = `req_${++requestIdCounter}_${Date.now()}`;
    const request: BridgeRequest = { id, type, payload };

    const pending: {
      resolve: (value: unknown) => void;
      reject: (reason: Error) => void;
      timeout?: ReturnType<typeof setTimeout>;
      onAbort?: () => void;
    } = {
      resolve: resolve as (value: unknown) => void,
      reject,
    };

    if (options?.signal) {
      const abort = () => {
        if (!pendingRequests.has(id)) return;
        pendingRequests.delete(id);
        if (pending.timeout) {
          clearTimeout(pending.timeout);
        }
        options.onAbort?.(id);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      if (options.signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      options.signal.addEventListener('abort', abort, { once: true });
      pending.onAbort = () => options.signal?.removeEventListener('abort', abort);
    }

    pendingRequests.set(id, pending);

    const timeoutMs = typeof options?.timeoutMs === 'number' ? options.timeoutMs : 30000;
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      pending.timeout = setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          if (pending.onAbort) {
            pending.onAbort();
          }
          reject(new Error(`Request ${type} timed out`));
        }
      }, timeoutMs);
    }

    getVSCodeAPI().postMessage(request);
  });
}

export type ProxiedApiResponse = {
  status: number;
  headers: Record<string, string>;
  bodyBase64?: string;
  bodyText?: string;
};

export async function proxyApiRequest(options: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  bodyBase64?: string;
  signal?: AbortSignal;
}): Promise<ProxiedApiResponse> {
  // Do not impose a bridge-level timeout. Let the original fetch's AbortSignal
  // (or OpenCode server response timing) control the lifecycle.
  const { signal, ...payload } = options;
  return sendBridgeMessageWithOptions<ProxiedApiResponse>('api:proxy', payload, {
    timeoutMs: 0,
    signal,
    onAbort: (requestID) => getVSCodeAPI().postMessage({ id: `abort_${requestID}`, type: 'api:proxy:abort', payload: { requestID } }),
  });
}

export async function proxySessionMessageRequest(options: {
  path: string;
  headers?: Record<string, string>;
  bodyText: string;
  signal?: AbortSignal;
}): Promise<ProxiedApiResponse> {
  // Keep parity with server-side direct forwarder: let extension host control timeout.
  const { signal, ...payload } = options;
  return sendBridgeMessageWithOptions<ProxiedApiResponse>('api:session:message', payload, {
    timeoutMs: 0,
    signal,
    onAbort: (requestID) => getVSCodeAPI().postMessage({ id: `abort_${requestID}`, type: 'api:proxy:abort', payload: { requestID } }),
  });
}

export type ProxiedSseStartResponse = {
  status: number;
  headers: Record<string, string>;
  streamId: string | null;
  error?: string;
};

export async function startSseProxy(options: {
  path: string;
  headers?: Record<string, string>;
  streamId?: string;
}): Promise<ProxiedSseStartResponse> {
  return sendBridgeMessage<ProxiedSseStartResponse>('api:sse:start', options);
}

export async function stopSseProxy(options: { streamId: string }): Promise<{ stopped: boolean }> {
  return sendBridgeMessage<{ stopped: boolean }>('api:sse:stop', options);
}

export async function executeVSCodeCommand(command: string, args?: unknown[]): Promise<{ result?: unknown }> {
  return sendBridgeMessage<{ result?: unknown }>('vscode:command', { command, args });
}

export async function openVSCodeExternalUrl(url: string): Promise<void> {
  await sendBridgeMessage('vscode:openExternalUrl', { url });
}

type CommandHandler = (payload: unknown) => void;
const commandHandlers = new Map<string, CommandHandler>();

export function onCommand(command: string, handler: CommandHandler): () => void {
  commandHandlers.set(command, handler);
  return () => commandHandlers.delete(command);
}

window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;
  if (message?.type === 'command' && message.command) {
    const handler = commandHandlers.get(message.command);
    if (handler) {
      handler(message.payload);
    }
  }
});

type ThemeChangePayload =
  | 'light'
  | 'dark'
  | {
      kind?: 'light' | 'dark' | 'high-contrast';
      shikiThemes?: { light?: Record<string, unknown>; dark?: Record<string, unknown> } | null;
    };
type ThemeChangeHandler = (theme: ThemeChangePayload) => void;
let themeChangeHandler: ThemeChangeHandler | null = null;

export function onThemeChange(handler: ThemeChangeHandler): () => void {
  themeChangeHandler = handler;
  return () => { themeChangeHandler = null; };
}

window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;
  if (message?.type === 'themeChange' && themeChangeHandler) {
    themeChangeHandler(message.theme);
  }
});
