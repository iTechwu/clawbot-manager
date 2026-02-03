'use client';

import { Card, CardContent, Badge } from '@repo/ui';
import { Activity, Bot, Key } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface HealthStatusProps {
  health: {
    status: string;
    botCount: number;
    keyCount: number;
  };
}

export function HealthStatus({ health }: HealthStatusProps) {
  const t = useTranslations('bots');

  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-sm">
            {t('health.status')}:
          </span>
          <Badge variant="default">{health.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Bot className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-sm">
            {t('health.botCount')}:
          </span>
          <span className="font-medium">{health.botCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Key className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-sm">
            {t('health.keyCount')}:
          </span>
          <span className="font-medium">{health.keyCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
