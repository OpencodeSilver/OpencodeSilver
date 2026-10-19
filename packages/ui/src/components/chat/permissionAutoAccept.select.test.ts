import { describe, expect, test } from 'bun:test';
import type { PermissionMode } from '@/stores/utils/permissionAutoAccept';
import { selectPermissionMode } from './permissionAutoAccept';

const recorder = () => {
    const calls: string[] = [];
    return {
        calls,
        setDraftPermissionMode: (mode: PermissionMode) => { calls.push(`draft:${mode}`); },
        setSessionMode: async (sessionId: string, mode: PermissionMode) => { calls.push(`session:${sessionId}:${mode}`); },
        onOpenSessionFirst: () => { calls.push('open-session-first'); },
        onToggleFailed: () => { calls.push('failed'); },
    };
};

describe('selectPermissionMode', () => {
    test('applies the exact mode to the session', () => {
        const r = recorder();
        selectPermissionMode({ ...r, permissionScopeSessionId: 's1', newSessionDraftOpen: false, mode: 'safety' });
        expect(r.calls).toEqual(['session:s1:safety']);
    });

    test('applies the mode to an open draft', () => {
        const r = recorder();
        selectPermissionMode({ ...r, permissionScopeSessionId: null, newSessionDraftOpen: true, mode: 'auto' });
        expect(r.calls).toEqual(['draft:auto']);
    });

    test('asks to open a session when there is neither', () => {
        const r = recorder();
        selectPermissionMode({ ...r, permissionScopeSessionId: null, newSessionDraftOpen: false, mode: 'ask' });
        expect(r.calls).toEqual(['open-session-first']);
    });
});
