'use client';

import type { ContainerStats } from '@repo/contracts';
import { Gauge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { useTranslations } from 'next-intl';
import { formatBytes, extractBotName } from './utils';

interface ContainerMetricsProps {
  stats: ContainerStats[];
}

export function ContainerMetrics({ stats }: ContainerMetricsProps) {
  const t = useTranslations('bots.diagnostics.containerMetrics');

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center">
            {t('noContainers')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-muted-foreground px-4 py-2 text-left text-sm font-medium">
                  {t('container')}
                </th>
                <th className="text-muted-foreground px-4 py-2 text-left text-sm font-medium">
                  {t('cpu')}
                </th>
                <th className="text-muted-foreground px-4 py-2 text-left text-sm font-medium">
                  {t('memory')}
                </th>
                <th className="text-muted-foreground px-4 py-2 text-left text-sm font-medium">
                  {t('network')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.map((stat) => (
                <tr key={stat.hostname}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm" title={stat.hostname}>
                      {extractBotName(stat.name)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Gauge
                      value={stat.cpuPercent}
                      max={100}
                      size="sm"
                      thresholds={{ warning: 60, danger: 85 }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Gauge
                      value={stat.memoryPercent}
                      max={100}
                      size="sm"
                      thresholds={{ warning: 70, danger: 90 }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col text-xs">
                      <span className="text-green-600 dark:text-green-400">
                        ↓ {formatBytes(stat.networkRxBytes)}
                      </span>
                      <span className="text-orange-600 dark:text-orange-400">
                        ↑ {formatBytes(stat.networkTxBytes)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
