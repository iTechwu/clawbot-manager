'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';

export default function NotificationsPage() {
  const t = useTranslations('settings');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('notifications')}</CardTitle>
        <CardDescription>{t('notificationsDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{t('comingSoon')}</p>
      </CardContent>
    </Card>
  );
}
