import { describe, expect, test as it } from 'bun:test';
import { TaskManager } from '../taskManager';

describe('TaskManager', () => {
  it('starts a task, updates its lifecycle, and notifies subscribers', async () => {
    const manager = new TaskManager({ throttleMs: 0, enableServerSync: false });
    const snapshots: number[] = [];
    const unsubscribe = manager.subscribe((tasks) => {
      snapshots.push(tasks.length);
    });

    const task = await manager.start({
      id: 'test-task-1',
      conversationId: 'conv-1',
      kind: 'command',
      label: 'bun test',
      command: 'bun test',
      cwd: '/workspace',
      status: 'awaiting_approval',
    });

    expect(task.id).toBe('test-task-1');
    expect(task.status).toBe('awaiting_approval');
    expect(manager.list({ conversationId: 'conv-1' }).length).toBe(1);
    expect(snapshots.length).toBeGreaterThan(0);

    unsubscribe();
  });

  it('transitions awaiting_approval -> running on approve and -> denied on deny', async () => {
    const addedRules: string[] = [];
    const manager = new TaskManager({
      throttleMs: 0,
      enableServerSync: false,
      onRuleAdded: (rule) => addedRules.push(rule),
    });

    await manager.start({
      id: 'task-approve',
      conversationId: 'conv-1',
      kind: 'command',
      label: 'git status',
      command: 'git status',
      status: 'awaiting_approval',
    });

    const approved = await manager.approve('task-approve', 'always');
    expect(approved?.status).toBe('running');
    expect(addedRules).toContain('command(git status)');

    await manager.start({
      id: 'task-deny',
      conversationId: 'conv-1',
      kind: 'command',
      label: 'rm -rf build',
      command: 'rm -rf build',
      status: 'awaiting_approval',
    });

    const denied = await manager.deny('task-deny');
    expect(denied?.status).toBe('denied');
    expect(typeof denied?.endedAt).toBe('number');
  });

  it('kills a running task and any child sub-tasks', async () => {
    const manager = new TaskManager({ throttleMs: 0, enableServerSync: false });

    await manager.start({
      id: 'task-parent',
      conversationId: 'conv-1',
      kind: 'build',
      label: 'bun run build',
      status: 'running',
    });
    await manager.start({
      id: 'task-child',
      parentId: 'task-parent',
      conversationId: 'conv-1',
      kind: 'command',
      label: 'tsc',
      status: 'running',
    });

    const killed = await manager.kill('task-parent');
    expect(killed?.status).toBe('killed');
    expect(typeof killed?.endedAt).toBe('number');
    const child = manager.list({ conversationId: 'conv-1' }).find((t) => t.id === 'task-child');
    expect(child?.status).toBe('killed');
  });

  it('stores and retrieves log tail via appendLogs and getLogs', async () => {
    const manager = new TaskManager({ throttleMs: 0, enableServerSync: false });

    const manyLines = Array.from({ length: 120 }, (_, idx) => `line-${idx + 1}`);
    await manager.start({
      id: 'task-logs',
      conversationId: 'conv-1',
      kind: 'command',
      label: 'long output',
      status: 'running',
      initialLogs: manyLines,
    });

    const logs = await manager.getLogs('task-logs', 20);
    expect(logs.length).toBe(20);
    expect(logs[logs.length - 1]).toBe('line-120');
  });

  it('reconciles dead OS PIDs so tasks never stay stuck as running', async () => {
    const manager = new TaskManager({
      throttleMs: 0,
      enableServerSync: false,
      checkProcessAlive: (pid) => pid === 1001,
    });

    await manager.start({
      id: 'alive-task',
      conversationId: 'conv-reconcile',
      kind: 'command',
      label: 'alive',
      pid: 1001,
      status: 'running',
    });
    await manager.start({
      id: 'dead-task',
      conversationId: 'conv-reconcile',
      kind: 'command',
      label: 'dead',
      pid: 9999,
      status: 'running',
    });

    const changed = await manager.reconcile('conv-reconcile');
    expect(changed).toBe(true);
    const list = manager.list({ conversationId: 'conv-reconcile' });
    expect(list.find((t) => t.id === 'alive-task')?.status).toBe('running');
    expect(list.find((t) => t.id === 'dead-task')?.status).toBe('failed');
  });

  it('clears finished tasks while preserving running and awaiting_approval tasks', async () => {
    const manager = new TaskManager({ throttleMs: 0, enableServerSync: false });

    await manager.start({
      id: 'running-1',
      conversationId: 'conv-clear',
      kind: 'command',
      label: 'running',
      status: 'running',
    });
    await manager.start({
      id: 'done-1',
      conversationId: 'conv-clear',
      kind: 'command',
      label: 'done',
      status: 'done',
      endedAt: Date.now() - 1000,
    });

    const removed = manager.clearFinishedTasks({ conversationId: 'conv-clear', olderThanMs: 0 });
    expect(removed).toBe(1);
    const remaining = manager.list({ conversationId: 'conv-clear' });
    expect(remaining.map((t) => t.id)).toEqual(['running-1']);
  });
});
