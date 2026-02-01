'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';

export type AutonomyLevel = 'INTERN' | 'SPECIALIST' | 'LEAD' | 'AUTONOMOUS';

interface AutonomyLevelBadgeProps {
  level: AutonomyLevel;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const levelConfig = {
  INTERN: {
    label: 'Intern',
    shortLabel: 'INT',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Shield,
    description: 'Needs approval for all actions',
    permissions: ['Request approval', 'Execute with confirmation'],
  },
  SPECIALIST: {
    label: 'Specialist',
    shortLabel: 'SPE',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: ShieldCheck,
    description: 'Can execute within defined scope',
    permissions: ['Execute scoped tasks', 'Request help when needed'],
  },
  LEAD: {
    label: 'Lead',
    shortLabel: 'LED',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: ShieldAlert,
    description: 'Can approve other agents work',
    permissions: ['Approve intern actions', 'Delegate tasks', 'Review work'],
  },
  AUTONOMOUS: {
    label: 'Autonomous',
    shortLabel: 'AUT',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Zap,
    description: 'Full autonomy - executes independently',
    permissions: ['Full execution rights', 'Self-approval', 'No restrictions'],
  },
};

const sizeConfig = {
  sm: {
    badge: 'px-1.5 py-0.5 text-[10px]',
    icon: 'h-3 w-3',
  },
  md: {
    badge: 'px-2 py-1 text-xs',
    icon: 'h-3.5 w-3.5',
  },
  lg: {
    badge: 'px-2.5 py-1.5 text-sm',
    icon: 'h-4 w-4',
  },
};

export function AutonomyLevelBadge({
  level,
  className,
  showLabel = true,
  size = 'md',
}: AutonomyLevelBadgeProps) {
  const config = levelConfig[level];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.color,
        sizes.badge,
        className
      )}
    >
      <Icon className={sizes.icon} />
      {showLabel && <span>{config.shortLabel}</span>}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="font-medium">{config.label}</span>
          </div>
          <p className="text-muted-foreground text-xs">{config.description}</p>
          <div className="border-t border-border pt-2">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Permissions:</p>
            <ul className="text-xs space-y-0.5">
              {config.permissions.map((perm, idx) => (
                <li key={idx} className="text-muted-foreground">
                  • {perm}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
