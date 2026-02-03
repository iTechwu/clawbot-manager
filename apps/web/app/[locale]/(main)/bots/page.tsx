'use client';

import { useBots } from '@/hooks/useBots';
import { useProviderKeyHealth } from '@/hooks/useProviderKeys';
import { useState } from 'react';
import { CreateBotWizard } from '@/components/bots/create-wizard';
import { ClientOnly } from '@/components/client-only';
import { BotCard, BotCardSkeleton, StatusStatsBox } from './components';
import { Button } from '@repo/ui';
import { Plus, Key } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function BotsPage() {
  const t = useTranslations('bots');
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  const {
    bots,
    loading: botsLoading,
    handleStart,
    handleStop,
    handleDelete,
    actionLoading,
  } = useBots();
  const { health } = useProviderKeyHealth();

  // Calculate bot statistics
  const runningBots = bots.filter((bot) => bot.status === 'running').length;
  const stoppedBots = bots.filter((bot) => bot.status === 'stopped').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/secrets">
              <Key className="mr-2 size-4" />
              {t('actions.manageApiKeys')}
            </Link>
          </Button>
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="mr-2 size-4" />
            {t('actions.createBot')}
          </Button>
        </div>
      </div>

      <ClientOnly
        fallback={
          <StatusStatsBox
            stats={{ total: 0, running: 0, stopped: 0 }}
            loading
          />
        }
      >
        <StatusStatsBox
          health={health}
          stats={{
            total: bots.length,
            running: runningBots,
            stopped: stoppedBots,
          }}
          loading={botsLoading}
        />
      </ClientOnly>

      <ClientOnly
        fallback={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <BotCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        {botsLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <BotCardSkeleton key={i} />
            ))}
          </div>
        ) : bots.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            {t('messages.noBots')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                onStart={() => handleStart(bot.hostname)}
                onStop={() => handleStop(bot.hostname)}
                onDelete={() => handleDelete(bot.hostname)}
                loading={actionLoading}
              />
            ))}
          </div>
        )}
      </ClientOnly>

      <CreateBotWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
      />
    </div>
  );
}
