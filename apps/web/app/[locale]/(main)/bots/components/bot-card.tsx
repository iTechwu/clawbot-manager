'use client';

import type { Bot } from '@repo/contracts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from '@repo/ui';
import { Play, Square, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BotCardProps {
  bot: Bot;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
  loading: boolean;
}

const statusVariants: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  running: 'default',
  starting: 'secondary',
  stopped: 'outline',
  error: 'destructive',
  created: 'secondary',
};

export function BotCard({
  bot,
  onStart,
  onStop,
  onDelete,
  loading,
}: BotCardProps) {
  const t = useTranslations('bots');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{bot.name}</CardTitle>
            <CardDescription>{bot.hostname}</CardDescription>
          </div>
          <Badge variant={statusVariants[bot.status] || 'outline'}>
            {t(`status.${bot.status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('fields.provider')}</span>
          <span className="font-medium">{bot.aiProvider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('fields.channel')}</span>
          <span className="font-medium">{bot.channelType}</span>
        </div>
        {bot.port && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('fields.port')}</span>
            <span className="font-medium">{bot.port}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {bot.status === 'stopped' || bot.status === 'created' ? (
          <Button
            size="sm"
            onClick={onStart}
            disabled={loading}
            className="flex-1"
          >
            <Play className="mr-1 size-4" />
            {t('actions.start')}
          </Button>
        ) : bot.status === 'running' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={onStop}
            disabled={loading}
            className="flex-1"
          >
            <Square className="mr-1 size-4" />
            {t('actions.stop')}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          disabled={loading}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
