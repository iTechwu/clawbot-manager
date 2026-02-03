'use client';

import { useContainerStats } from '@/hooks/useBots';
import type { ContainerStats } from '@repo/contracts';
import { useTranslations } from 'next-intl';
import { Alert } from '@repo/ui';
import { AlertCircle } from 'lucide-react';
import {
  SystemOverview,
  ContainerMetrics,
  HealthStatus,
  CleanupPanel,
} from './components';

export default function DiagnosticsPage() {
  const t = useTranslations('bots.diagnostics');
  const { stats, loading, error } = useContainerStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SystemOverview stats={stats as ContainerStats[]} loading={loading} />
          <ContainerMetrics stats={stats as ContainerStats[]} />
        </div>

        <div className="space-y-6">
          <HealthStatus />
          <CleanupPanel />
        </div>
      </div>
    </div>
  );
}
