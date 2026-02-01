'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type HeartbeatStatus = 'online' | 'stale' | 'offline';

interface HeartbeatIndicatorProps {
  status: HeartbeatStatus;
  lastHeartbeat?: Date | string | null;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  online: {
    color: 'bg-emerald-500',
    label: 'Online',
    description: 'Agent is active and responding',
    animate: true,
  },
  stale: {
    color: 'bg-yellow-500',
    label: 'Stale',
    description: 'Agent heartbeat delayed',
    animate: false,
  },
  offline: {
    color: 'bg-red-500',
    label: 'Offline',
    description: 'Agent is not responding',
    animate: false,
  },
};

const sizeConfig = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function HeartbeatIndicator({
  status,
  lastHeartbeat,
  className,
  showLabel = false,
  size = 'md',
}: HeartbeatIndicatorProps) {
  const config = statusConfig[status];
  const sizeClass = sizeConfig[size];

  const formatLastSeen = () => {
    if (!lastHeartbeat) return 'Never';
    const date = typeof lastHeartbeat === 'string' ? new Date(lastHeartbeat) : lastHeartbeat;
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const indicator = (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="relative">
        <span
          className={cn(
            'block rounded-full',
            sizeClass,
            config.color,
            config.animate && 'animate-heartbeat-pulse'
          )}
        />
        {config.animate && (
          <span
            className={cn(
              'absolute inset-0 rounded-full opacity-75',
              config.color,
              'animate-ping'
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{indicator}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <div className="space-y-1">
          <p className="font-medium">{config.label}</p>
          <p className="text-muted-foreground">{config.description}</p>
          <p className="text-muted-foreground">Last seen: {formatLastSeen()}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
