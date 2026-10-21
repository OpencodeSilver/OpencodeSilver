/**
 * OpencodeSilver Desktop IPC Registry & Security Validation
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Enforces strong typing, argument schemas, domain categorization,
 * and remote/local security boundaries for all desktop_* IPC channels.
 */

import * as zodModule from 'zod';

const z = zodModule.z ?? zodModule.default ?? zodModule;

/**
 * Commands permissible for remote (non-local) web contents senders.
 * Every other desktop command requires a local sender (isLocalSender).
 */
export const COMMANDS_SAFE_FOR_REMOTE = new Set([
  'desktop_hosts_get',
  'desktop_host_probe',
  'desktop_new_window',
  'desktop_new_window_at_url',
  'desktop_new_window_for_host',
  'desktop_set_window_title',
  'desktop_set_window_theme',
  'desktop_is_window_fullscreen',
  'desktop_start_window_drag',
  'desktop_minimize_current_window',
  'desktop_toggle_current_window_maximized',
  'desktop_close_current_window',
  'desktop_get_current_window_state',
  'desktop_get_app_version',
  'desktop_get_lan_address',
  'desktop_capture_page_rect',
  'desktop_tray_update',
]);

const emptyArgsSchema = z.record(z.string(), z.unknown()).optional().default({});

export const IPC_COMMAND_SCHEMAS = {
  // --- Window & Layout ---
  desktop_pick_theme_file: emptyArgsSchema,
  desktop_start_window_drag: emptyArgsSchema,
  desktop_focus_window: emptyArgsSchema,
  desktop_is_window_fullscreen: emptyArgsSchema,
  desktop_set_window_title: z.object({
    title: z.string().max(1000).optional(),
  }).passthrough().optional().default({}),
  desktop_set_window_theme: z.object({
    themeMode: z.string().max(100).optional(),
    themeVariant: z.string().max(100).optional(),
    splash: z.boolean().optional(),
  }).passthrough().optional().default({}),
  desktop_set_window_pinned: z.object({
    pinned: z.boolean().optional(),
  }).passthrough().optional().default({}),
  desktop_get_window_pinned: emptyArgsSchema,
  desktop_focus_main_window: z.object({
    sessionId: z.string().max(200).optional(),
    directory: z.string().max(2000).optional(),
    mode: z.string().max(100).optional(),
    projectId: z.string().max(200).optional(),
  }).passthrough().optional().default({}),
  desktop_close_current_window: emptyArgsSchema,
  desktop_minimize_current_window: emptyArgsSchema,
  desktop_toggle_current_window_maximized: emptyArgsSchema,
  desktop_get_current_window_state: emptyArgsSchema,
  desktop_set_locale: z.object({
    locale: z.string().max(50).optional(),
  }).passthrough().optional().default({}),
  desktop_show_app_menu: z.object({
    locale: z.string().max(50).optional(),
    x: z.number().int().optional(),
    y: z.number().int().optional(),
  }).passthrough().optional().default({}),
  desktop_new_window: emptyArgsSchema,
  desktop_new_window_for_host: z.object({
    hostId: z.string().max(200).optional(),
  }).passthrough().optional().default({}),
  desktop_new_window_at_url: z.object({
    url: z.string().max(4000).optional(),
    clientToken: z.string().max(2000).optional(),
    requestHeaders: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().optional().default({}),
  desktop_open_session_mini_chat_window: z.object({
    sessionId: z.string().max(200).optional(),
    directory: z.string().max(2000).optional(),
  }).passthrough().optional().default({}),
  desktop_open_draft_mini_chat_window: z.object({
    directory: z.string().max(2000).optional(),
    projectId: z.string().max(200).optional(),
  }).passthrough().optional().default({}),
  desktop_capture_page_rect: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).passthrough().optional().default({}),

  // --- App Lifecycle & System ---
  desktop_get_app_version: emptyArgsSchema,
  desktop_get_launch_at_login: emptyArgsSchema,
  desktop_set_launch_at_login: z.object({
    enabled: z.boolean().optional(),
  }).passthrough().optional().default({}),
  desktop_get_minimize_to_tray: emptyArgsSchema,
  desktop_set_minimize_to_tray: z.object({
    enabled: z.boolean().optional(),
  }).passthrough().optional().default({}),
  desktop_get_keep_awake: emptyArgsSchema,
  desktop_set_keep_awake: z.object({
    enabled: z.boolean().optional(),
  }).passthrough().optional().default({}),
  desktop_tray_update: z.object({
    dockBadgeCount: z.number().int().nonnegative().max(9999).optional().nullable(),
  }).passthrough().optional().default({}),
  desktop_notify: emptyArgsSchema,
  desktop_clear_cache: emptyArgsSchema,
  desktop_check_for_updates: emptyArgsSchema,
  desktop_download_and_install_update: emptyArgsSchema,
  desktop_restart: emptyArgsSchema,
  desktop_get_lan_address: emptyArgsSchema,
  desktop_take_pending_session_links: emptyArgsSchema,

  // --- Filesystem & Shell ---
  desktop_save_markdown_file: z.object({
    defaultFileName: z.string().max(500).optional(),
    content: z.string().optional().default(''),
  }).passthrough().optional().default({}),
  desktop_read_file: z.object({
    path: z.string().min(1, 'path is required').max(4000),
  }).passthrough(),
  desktop_open_path: z.object({
    path: z.string().max(4000).optional(),
    app: z.string().max(500).optional(),
  }).passthrough().optional().default({}),
  desktop_open_external_url: z.object({
    url: z.string().min(1, 'url is required').max(4000),
  }).passthrough(),
  desktop_reveal_path: z.object({
    path: z.string().min(1, 'path is required').max(4000),
  }).passthrough(),
  desktop_open_in_app: z.object({
    projectPath: z.string().max(4000).optional(),
    appId: z.string().max(500).optional(),
    appName: z.string().max(500).optional(),
  }).passthrough().optional().default({}),
  desktop_open_file_in_app: z.object({
    filePath: z.string().max(4000).optional(),
    appId: z.string().max(500).optional(),
    appName: z.string().max(500).optional(),
  }).passthrough().optional().default({}),
  desktop_filter_installed_apps: z.object({
    apps: z.array(z.unknown()).optional(),
  }).passthrough().optional().default({}),
  desktop_fetch_app_icons: z.object({
    apps: z.array(z.unknown()).optional(),
  }).passthrough().optional().default({}),
  desktop_get_installed_apps: z.object({
    apps: z.array(z.unknown()).optional(),
    force: z.boolean().optional(),
  }).passthrough().optional().default({}),

  // --- Browser Panel & Dev Tunnels ---
  desktop_dev_tunnel_open: z.object({
    baseUrl: z.string().min(1, 'baseUrl is required').max(4000),
    port: z.number().int().min(1).max(65535),
    relay: z.boolean().optional(),
    targetKey: z.string().max(500).optional(),
    requestHeaders: z.record(z.string(), z.unknown()).optional(),
    clientToken: z.string().max(2000).optional(),
  }).passthrough(),
  desktop_dev_tunnel_close: z.object({
    baseUrl: z.string().max(4000).optional(),
    port: z.number().int().optional(),
  }).passthrough().optional().default({}),
  desktop_relay_dev_tunnel_close_all: emptyArgsSchema,
  desktop_browser_set_color_scheme: z.object({
    scheme: z.string().max(50).optional(),
    webContentsId: z.number().int().optional(),
  }).passthrough().optional().default({}),
  desktop_browser_fetch_favicon: z.object({
    url: z.string().max(4000).optional(),
  }).passthrough().optional().default({}),
  desktop_browser_clear_data: z.object({
    partition: z.string().max(500).optional(),
    cookies: z.boolean().optional(),
    cache: z.boolean().optional(),
  }).passthrough().optional().default({}),
  desktop_browser_capture_page: z.object({
    webContentsId: z.number().int().optional(),
  }).passthrough().optional().default({}),

  // --- Hosts & Authentication ---
  desktop_managed_opencode_compatible: z.object({
    apiBaseUrl: z.string().max(4000).optional(),
  }).passthrough().optional().default({}),
  desktop_hosts_get: emptyArgsSchema,
  desktop_hosts_set: z.object({
    input: z.unknown().optional(),
    config: z.unknown().optional(),
  }).passthrough().optional().default({}),
  desktop_local_client_token_get: emptyArgsSchema,
  desktop_install_id_get: emptyArgsSchema,
  desktop_host_probe: z.object({
    url: z.string().max(4000).optional(),
    clientToken: z.string().max(2000).optional(),
    requestHeaders: z.record(z.string(), z.unknown()).optional(),
    expectedServerId: z.string().max(500).optional(),
  }).passthrough().optional().default({}),
  desktop_remote_password_login: z.object({
    url: z.string().max(4000).optional(),
    password: z.string().max(2000).optional(),
    trustDevice: z.boolean().optional(),
    requestHeaders: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().optional().default({}),

  // --- SSH Remote Instances ---
  desktop_ssh_instances_get: emptyArgsSchema,
  desktop_ssh_instances_set: z.object({
    config: z.unknown().optional(),
  }).passthrough().optional().default({}),
  desktop_ssh_import_hosts: emptyArgsSchema,
  desktop_ssh_connect: z.object({
    id: z.string().min(1, 'id is required').max(500),
  }).passthrough(),
  desktop_ssh_disconnect: z.object({
    id: z.string().min(1, 'id is required').max(500),
  }).passthrough(),
  desktop_ssh_status: z.object({
    id: z.string().min(1, 'id is required').max(500),
  }).passthrough(),
  desktop_ssh_logs: z.object({
    id: z.string().min(1, 'id is required').max(500),
    limit: z.number().int().positive().max(10000).optional(),
  }).passthrough(),
  desktop_ssh_logs_clear: z.object({
    id: z.string().min(1, 'id is required').max(500),
  }).passthrough(),
};

export const ALL_IPC_COMMANDS = new Set(Object.keys(IPC_COMMAND_SCHEMAS));

/**
 * Validates an IPC command and its arguments according to caller origin and schemas.
 *
 * @param {string} command - IPC command name
 * @param {unknown} args - Raw arguments object passed over IPC
 * @param {boolean} isLocal - Whether sender origin is trusted local
 * @returns {Record<string, unknown>} Validated and normalized arguments
 */
export function validateIpcCommand(command, args, isLocal = false) {
  if (!ALL_IPC_COMMANDS.has(command)) {
    throw new Error(`Unknown or unregistered desktop IPC command: ${command}`);
  }

  if (!isLocal && !COMMANDS_SAFE_FOR_REMOTE.has(command)) {
    throw new Error('IPC not available for this origin');
  }

  const schema = IPC_COMMAND_SCHEMAS[command];
  const parsed = schema.safeParse(args ?? {});
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid arguments for ${command}: ${errorDetails}`);
  }

  return parsed.data;
}
