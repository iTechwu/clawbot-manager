'use client';

import { Card, CardContent, Badge, Skeleton } from '@repo/ui';
import { Activity, Bot, Key, Play, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface StatusStatsBoxProps {
  health?: {
    status: string;
    botCount: number;
    keyCount: number;
  };
  stats: {
    total: number;
    running: number;
    stopped: number;
  };
  loading?: boolean;
}

export function StatusStatsBox({ health, stats, loading }: StatusStatsBoxProps) {
  const t = useTranslations('bots');

  if (loading) {
    return (
      <Card className="py-4">
        <CardContent>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-4">
      <CardContent>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {health && (
            <div className="flex items-center gap-2">
              <Activity className="text-muted-foreground size-4" />
              <span className="text-muted-foreground text-sm">
                {t('health.status')}:
              </span>
              <Badge variant="default">{health.status}</Badge>
            </div>
          )}

          {health && <div className="bg-border h-6 w-px" />}

          <div className="flex items-center gap-2">
            <Bot className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">
              {t('stats.total')}:
            </span>
            <span className="font-medium">{stats.total}</span>
          </div>

          <div className="flex items-center gap-2">
            <Play className="size-4 text-green-500" />
            <span className="text-muted-foreground text-sm">
              {t('stats.running')}:
            </span>
            <span className="font-medium text-green-600">{stats.running}</span>
          </div>

          <div className="flex items-center gap-2">
            <Square className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">
              {t('stats.stopped')}:
            </span>
            <span className="font-medium">{stats.stopped}</span>
          </div>

          {health && (
            <>
              <div className="bg-border h-6 w-px" />
              <div className="flex items-center gap-2">
                <Key className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-sm">
                  {t('health.keyCount')}:
                </span>
                <span className="font-medium">{health.keyCount}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
