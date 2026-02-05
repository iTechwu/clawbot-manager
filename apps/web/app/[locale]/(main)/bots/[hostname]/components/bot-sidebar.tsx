'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@repo/ui/lib/utils';
import { Badge, Separator } from '@repo/ui';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { botNavItems, botNavExtendedItems } from '@/lib/config/bot-nav';

interface BotSidebarProps {
  hostname: string;
  status?: 'running' | 'stopped' | 'starting' | 'error' | 'created';
  healthStatus?: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
}

const statusConfig = {
  running: {
    label: '运行中',
    color: 'bg-green-500',
    textColor: 'text-green-500',
  },
  stopped: {
    label: '已停止',
    color: 'bg-gray-500',
    textColor: 'text-gray-500',
  },
  starting: {
    label: '启动中',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
  },
  error: { label: '错误', color: 'bg-red-500', textColor: 'text-red-500' },
  created: {
    label: '已创建',
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
  },
};

export function BotSidebar({
  hostname,
  status = 'stopped',
  healthStatus,
}: BotSidebarProps) {
  const t = useTranslations('bots.detail');
  const pathname = usePathname();
  const [showExtended, setShowExtended] = useState(false);

  const basePath = `/bots/${hostname}`;
  const statusInfo = statusConfig[status];

  const isActive = (href: string) => {
    const fullPath = href ? `${basePath}${href}` : basePath;
    // 精确匹配或者是子路径
    return pathname === fullPath || (href === '' && pathname === basePath);
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      {/* Bot 信息头部 */}
      <div className="p-4 border-b">
        <Link
          href="/bots"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3 text-sm"
        >
          <ArrowLeft className="size-4" />
          {t('backToBots')}
        </Link>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{hostname}</h2>
            <div className="flex items-center gap-2">
              <div className={cn('size-2 rounded-full', statusInfo.color)} />
              <span className={cn('text-xs', statusInfo.textColor)}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主导航 */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {botNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const fullHref = item.href ? `${basePath}${item.href}` : basePath;

            return (
              <li key={item.id}>
                <Link
                  href={fullHref}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
                  )}
                  <Icon className="size-4" />
                  <span>{t(`nav.${item.labelKey}`)}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 扩展导航（可折叠） */}
        <div className="mt-4">
          <button
            onClick={() => setShowExtended(!showExtended)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground w-full"
          >
            {showExtended ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
            {t('nav.more')}
          </button>

          {showExtended && (
            <ul className="space-y-1 mt-1">
              {botNavExtendedItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                const fullHref = `${basePath}${item.href}`;

                return (
                  <li key={item.id}>
                    <Link
                      href={fullHref}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{t(`nav.${item.labelKey}`)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      {/* 底部状态 */}
      <div className="p-4 border-t">
        <div className="px-3 py-2.5 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div
              className={cn(
                'size-2 rounded-full animate-pulse',
                statusInfo.color,
              )}
            />
            <span className="text-xs text-muted-foreground">
              {status === 'running'
                ? t('status.serviceRunning')
                : t('status.serviceStopped')}
            </span>
          </div>
          {healthStatus && (
            <Badge
              variant={
                healthStatus === 'HEALTHY'
                  ? 'default'
                  : healthStatus === 'UNHEALTHY'
                    ? 'destructive'
                    : 'secondary'
              }
              className="text-xs"
            >
              {healthStatus}
            </Badge>
          )}
        </div>
      </div>
    </aside>
  );
}
