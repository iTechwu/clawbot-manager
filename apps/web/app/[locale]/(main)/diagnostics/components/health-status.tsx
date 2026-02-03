'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@repo/ui';
import { Activity } from 'lucide-react';
import { API_CONFIG } from '@/config';

export function HealthStatus() {
  const t = useTranslations('bots.diagnostics.healthStatus');
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [responseTime, setResponseTime] = useState<number | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const start = Date.now();
      try {
        const response = await fetch(`${API_CONFIG.apiHealthUrl}`);
        setHealthy(response.ok);
        setResponseTime(Date.now() - start);
      } catch {
        setHealthy(false);
        setResponseTime(null);
      }
      setLastCheck(new Date().toLocaleTimeString());
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="size-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div
            className={`size-3 rounded-full ${
              healthy === null
                ? 'bg-muted'
                : healthy
                  ? 'bg-green-500'
                  : 'bg-destructive'
            }`}
          />
          <div>
            <span className="text-sm font-medium">
              {healthy === null
                ? t('checking')
                : healthy
                  ? t('healthy')
                  : t('unhealthy')}
            </span>
            {responseTime !== null && (
              <Badge variant="secondary" className="ml-2">
                {responseTime}ms
              </Badge>
            )}
          </div>
        </div>
        {lastCheck && (
          <p className="text-muted-foreground mt-2 text-xs">
            {t('lastChecked')}: {lastCheck}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
