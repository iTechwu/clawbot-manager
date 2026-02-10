'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { Play, Square, RotateCcw, Stethoscope, Loader2 } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface QuickActionsProps {
  isRunning: boolean;
  loading?: boolean;
  hasProvider?: boolean;
  hasChannel?: boolean;
  configLoading?: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onDiagnose: () => void;
}

export function QuickActions({
  isRunning,
  loading,
  hasProvider,
  hasChannel,
  configLoading,
  onStart,
  onStop,
  onRestart,
  onDiagnose,
}: QuickActionsProps) {
  const t = useTranslations('bots.detail.dashboard');

  // 检查配置是否完成
  const isConfigComplete = hasProvider && hasChannel;
  const isConfigChecking = configLoading;

  // 包装操作函数，在配置未完成时显示提示
  const wrapActionWithConfigCheck = (
    action: () => void,
    requiresConfig: boolean,
  ) => {
    return () => {
      if (requiresConfig && !isConfigChecking && !isConfigComplete) {
        const missingItems: string[] = [];
        if (!hasProvider) missingItems.push(t('configRequired.provider'));
        if (!hasChannel) missingItems.push(t('configRequired.channel'));
        toast.warning(t('configRequired.title'), {
          description: t('configRequired.description', {
            items: missingItems.join('、'),
          }),
        });
        return;
      }
      action();
    };
  };

  const actions = [
    {
      id: 'start',
      label: t('start'),
      icon: Play,
      onClick: wrapActionWithConfigCheck(onStart, true),
      disabled: loading || isRunning,
      color: 'green',
      hoverBg: 'hover:bg-green-500/20 hover:border-green-500/50',
      iconBg: isRunning ? 'bg-muted' : 'bg-green-500/20',
      iconColor: isRunning ? 'text-muted-foreground' : 'text-green-500',
    },
    {
      id: 'stop',
      label: t('stop'),
      icon: Square,
      onClick: onStop,
      disabled: loading || !isRunning,
      color: 'red',
      hoverBg: 'hover:bg-red-500/20 hover:border-red-500/50',
      iconBg: !isRunning ? 'bg-muted' : 'bg-red-500/20',
      iconColor: !isRunning ? 'text-muted-foreground' : 'text-red-500',
    },
    {
      id: 'restart',
      label: t('restart'),
      icon: RotateCcw,
      onClick: wrapActionWithConfigCheck(onRestart, true),
      disabled: loading,
      color: 'amber',
      hoverBg: 'hover:bg-amber-500/20 hover:border-amber-500/50',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-500',
    },
    {
      id: 'diagnose',
      label: t('diagnose'),
      icon: Stethoscope,
      onClick: wrapActionWithConfigCheck(onDiagnose, true),
      disabled: loading,
      color: 'purple',
      hoverBg: 'hover:bg-purple-500/20 hover:border-purple-500/50',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {t('quickActions')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  'flex flex-col items-center gap-3 p-4 rounded-xl transition-all',
                  'border bg-card',
                  action.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : action.hoverBg,
                )}
              >
                <div
                  className={cn(
                    'size-12 rounded-full flex items-center justify-center',
                    action.iconBg,
                  )}
                >
                  {loading && action.id === 'restart' ? (
                    <Loader2
                      className={cn('size-5 animate-spin', action.iconColor)}
                    />
                  ) : (
                    <Icon className={cn('size-5', action.iconColor)} />
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    action.disabled
                      ? 'text-muted-foreground'
                      : 'text-foreground',
                  )}
                >
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
