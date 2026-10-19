import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { isMessageStarred, toggleStarMessage } from '@/lib/bookmarks/starredMessages';
import { toast } from '@/components/ui';

interface StarMessageButtonProps {
  messageId: string;
  sessionId: string;
  preview: string;
  className?: string;
}

export const StarMessageButton: React.FC<StarMessageButtonProps> = ({
  messageId,
  sessionId,
  preview,
  className,
}) => {
  const [starred, setStarred] = React.useState(() => isMessageStarred(messageId));

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isNow = toggleStarMessage({ messageId, sessionId, preview });
    setStarred(isNow);
    if (isNow) {
      toast.success('Message starred');
    } else {
      toast.info('Message unstarred');
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-1 rounded-md transition-colors hover:bg-accent/60 ${
        starred ? 'text-amber-400' : 'text-muted-foreground/50 hover:text-muted-foreground'
      } ${className ?? ''}`}
      title={starred ? 'Unstar message' : 'Star message'}
    >
      <Icon name="star" className={`w-3.5 h-3.5 ${starred ? 'fill-current' : ''}`} />
    </button>
  );
};
