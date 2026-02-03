'use client';

import type { ContainerStats } from '@repo/contracts';
import { Gauge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { formatBytes } from './utils';

interface SystemOverviewProps {
  stats: ContainerStats[];
  loading: boolean;
}

export function SystemOverview({ stats, loading }: SystemOverviewProps) {
  const t = useTranslations('bots.diagnostics.systemOverview');

  const totalCpu = stats.reduce((sum, s) => sum + s.cpuPercent, 0);
  const avgCpu = stats.length > 0 ? totalCpu / stats.length : 0;
  const totalMemory = stats.reduce((sum, s) => sum + s.memoryUsage, 0);
  const totalMemoryLimit = stats.reduce((sum, s) => sum + s.memoryLimit, 0);
  const memoryPercent =
    totalMemoryLimit > 0 ? (totalMemory / totalMemoryLimit) * 100 : 0;
  const totalNetworkRx = stats.reduce((sum, s) => sum + s.networkRxBytes, 0);
  const totalNetworkTx = stats.reduce((sum, s) => sum + s.networkTxBytes, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Skeleton className="size-8 rounded-full" />
            <span className="text-muted-foreground ml-3">{t('loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Gauge
            value={avgCpu}
            max={100}
            size="lg"
            label={t('avgCpu')}
            thresholds={{ warning: 60, danger: 85 }}
          />
          <Gauge
            value={memoryPercent}
            max={100}
            size="lg"
            label={t('memory')}
            thresholds={{ warning: 70, danger: 90 }}
          />
          <div className="flex flex-col justify-center space-y-2">
            <div className="text-center">
              <span className="text-primary text-2xl font-bold">
                {stats.length}
              </span>
              <p className="text-muted-foreground text-xs">{t('activeBots')}</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-semibold">
                {formatBytes(totalMemory)}
              </span>
              <p className="text-muted-foreground text-xs">{t('totalMemory')}</p>
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-2">
            <div className="text-center">
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                ↓ {formatBytes(totalNetworkRx)}
              </span>
              <p className="text-muted-foreground text-xs">{t('networkIn')}</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                ↑ {formatBytes(totalNetworkTx)}
              </span>
              <p className="text-muted-foreground text-xs">{t('networkOut')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}