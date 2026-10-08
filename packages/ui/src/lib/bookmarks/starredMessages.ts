export interface StarredMessageEntry {
  messageId: string;
  sessionId: string;
  preview: string;
  starredAt: number;
}

const STORAGE_KEY = 'opencodesilver_starred_messages_v1';

export function getStarredMessages(sessionId?: string): StarredMessageEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: StarredMessageEntry[] = JSON.parse(raw);
    if (sessionId) {
      return parsed.filter(item => item.sessionId === sessionId);
    }
    return parsed;
  } catch {
    return [];
  }
}

export function isMessageStarred(messageId: string): boolean {
  const list = getStarredMessages();
  return list.some(item => item.messageId === messageId);
}

export function toggleStarMessage(entry: Omit<StarredMessageEntry, 'starredAt'>): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const list = getStarredMessages();
    const index = list.findIndex(item => item.messageId === entry.messageId);
    let isNowStarred = false;

    if (index >= 0) {
      list.splice(index, 1);
      isNowStarred = false;
    } else {
      list.push({ ...entry, starredAt: Date.now() });
      isNowStarred = true;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('opencodesilver:starred_changed', { detail: { messageId: entry.messageId, isStarred: isNowStarred } }));
    return isNowStarred;
  } catch {
    return false;
  }
}
