import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  COMMANDS_SAFE_FOR_REMOTE,
  ALL_IPC_COMMANDS,
  IPC_COMMAND_SCHEMAS,
  validateIpcCommand,
} from './ipc-registry.mjs';

describe('Electron Desktop IPC Security & Schema Validation', () => {
  test('all desktop_* case handlers in main.mjs are registered in ALL_IPC_COMMANDS', () => {
    const mainPath = path.resolve(import.meta.dirname, 'main.mjs');
    const mainContent = fs.readFileSync(mainPath, 'utf8');
    const matches = [...mainContent.matchAll(/case '(desktop_[a-zA-Z0-9_]+)':/g)].map((m) => m[1]);
    const mainHandlers = new Set(matches);

    expect(mainHandlers.size).toBe(68);
    for (const handler of mainHandlers) {
      expect(ALL_IPC_COMMANDS.has(handler)).toBe(true);
    }
    expect(ALL_IPC_COMMANDS.size).toBe(mainHandlers.size);
  });

  test('COMMANDS_SAFE_FOR_REMOTE contains exactly 17 allowlisted commands, all registered', () => {
    expect(COMMANDS_SAFE_FOR_REMOTE.size).toBe(17);
    for (const cmd of COMMANDS_SAFE_FOR_REMOTE) {
      expect(ALL_IPC_COMMANDS.has(cmd)).toBe(true);
    }
  });

  test('rejects unregistered or new unknown commands', () => {
    expect(() => validateIpcCommand('desktop_unknown_command', {}, true)).toThrow(
      'Unknown or unregistered desktop IPC command: desktop_unknown_command',
    );
    expect(() => validateIpcCommand('arbitrary_eval', {}, true)).toThrow(
      'Unknown or unregistered desktop IPC command: arbitrary_eval',
    );
  });

  test('blocks non-local senders from executing unsafe commands', () => {
    const unsafeCommands = [
      'desktop_read_file',
      'desktop_save_markdown_file',
      'desktop_open_path',
      'desktop_open_external_url',
      'desktop_reveal_path',
      'desktop_ssh_connect',
      'desktop_ssh_instances_get',
      'desktop_dev_tunnel_open',
      'desktop_clear_cache',
      'desktop_restart',
    ];

    for (const cmd of unsafeCommands) {
      expect(() => validateIpcCommand(cmd, {}, false)).toThrow(
        'IPC not available for this origin',
      );
    }
  });

  test('allows non-local senders to invoke commands in COMMANDS_SAFE_FOR_REMOTE', () => {
    for (const cmd of COMMANDS_SAFE_FOR_REMOTE) {
      expect(() => validateIpcCommand(cmd, {}, false)).not.toThrow();
    }
  });

  test('validates arguments with Zod schemas for typed commands', () => {
    // Valid read_file call
    const validRead = validateIpcCommand('desktop_read_file', { path: '/home/user/file.txt' }, true);
    expect(validRead.path).toBe('/home/user/file.txt');

    // Missing path in read_file
    expect(() => validateIpcCommand('desktop_read_file', {}, true)).toThrow('Invalid arguments');

    // Valid dev tunnel
    const validTunnel = validateIpcCommand('desktop_dev_tunnel_open', { baseUrl: 'http://localhost:3000', port: 3000 }, true);
    expect(validTunnel.port).toBe(3000);

    // Invalid port in dev tunnel
    expect(() => validateIpcCommand('desktop_dev_tunnel_open', { baseUrl: 'http://localhost:3000', port: 999999 }, true)).toThrow(
      'Invalid arguments',
    );

    // Valid SSH connect
    const validSsh = validateIpcCommand('desktop_ssh_connect', { id: 'ssh-instance-1' }, true);
    expect(validSsh.id).toBe('ssh-instance-1');

    // Invalid SSH connect (empty id)
    expect(() => validateIpcCommand('desktop_ssh_connect', { id: '' }, true)).toThrow('Invalid arguments');
  });
});
