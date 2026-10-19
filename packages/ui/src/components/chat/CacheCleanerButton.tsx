import React from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon/Icon';
import { toast } from '@/components/ui';
import { clearTransientCaches } from '@/lib/maintenance/cacheCleaner';

interface CacheCleanerButtonProps {
  className?: string;
}

export const CacheCleanerButton: React.FC<CacheCleanerButtonProps> = ({ className }) => {
  const [cleaning, setCleaning] = React.useState(false);

  const handleClean = async () => {
    try {
      setCleaning(true);
      const result = await clearTransientCaches();
      toast.success(
        `Cleared ${result.clearedLocalStorageKeys + result.clearedSessionStorageKeys} cached items successfully!`
      );
    } catch {
      toast.error('Failed to clear transient caches');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClean}
      disabled={cleaning}
      className={className}
      title="Clear temporary cache and state"
    >
      <Icon
        name={cleaning ? 'loader' : 'delete-bin'}
        className={`w-3.5 h-3.5 mr-1 ${cleaning ? 'animate-spin' : 'text-muted-foreground'}`}
      />
      <span className="text-xs">Purge Cache</span>
    </Button>
  );
};
