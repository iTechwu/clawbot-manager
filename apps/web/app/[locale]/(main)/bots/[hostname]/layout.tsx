'use client';

import { useParams } from 'next/navigation';
import { useBot } from '@/hooks/useBots';
import { useBotStatusSSE } from '@/hooks/useBotStatusSSE';
import { BotSidebar } from './components/bot-sidebar';
import { Skeleton } from '@repo/ui';

export default function BotDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ hostname: string }>();
  const hostname = params.hostname;

  // 获取 Bot 基本信息
  const { bot, loading: isLoading } = useBot(hostname);

  // SSE 实时状态更新
  useBotStatusSSE({
    onStatusChange: (event) => {
      // 状态变更时会自动触发 React Query 缓存失效
      console.log('Bot status changed:', event);
    },
    onHealthChange: (event) => {
      console.log('Bot health changed:', event);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* 侧边栏骨架屏 */}
        <aside className="w-64 border-r bg-card p-4">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-12 w-full mb-6" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </aside>
        {/* 内容区骨架屏 */}
        <main className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* 侧边栏导航 */}
      <BotSidebar
        hostname={hostname}
        status={
          bot?.status as
            | 'running'
            | 'stopped'
            | 'starting'
            | 'error'
            | 'created'
        }
      />

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
