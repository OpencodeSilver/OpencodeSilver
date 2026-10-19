import { subscribeOpencodesilverEvents } from '@/lib/opencodesilverEvents';
import { getRuntimeKey } from '@/lib/runtime-switch';
import { applyMessageQueueUpdatedEvent, useMessageQueueStore } from '@/stores/messageQueueStore';

/** Queue events use the control SSE stream even while OpenCode uses WS. */
export const subscribeMessageQueueSync = (runtimeKey: string): (() => void) => (
  subscribeOpencodesilverEvents((event) => {
    if (runtimeKey !== getRuntimeKey()) return;
    if (event.type === 'event-stream-ready') {
      void useMessageQueueStore.getState().resync().catch(() => undefined);
    } else if (event.type === 'opencodesilver:message-queue.updated') {
      applyMessageQueueUpdatedEvent(event, runtimeKey);
    }
  })
);
