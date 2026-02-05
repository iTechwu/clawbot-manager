'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  useBotUsageStats,
  useBotUsageTrend,
  useBotUsageBreakdown,
} from '@/hooks/useBotUsage';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Skeleton,
} from '@repo/ui';
import {
  Activity,
  Zap,
  AlertTriangle,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';

/**
 * 统计卡片组件
 */
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
          {description && <Skeleton className="mt-1 h-3 w-32" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 简单的趋势图表组件
 */
function SimpleTrendChart({
  data,
  loading,
}: {
  data: Array<{
    timestamp: Date;
    requestTokens: number;
    responseTokens: number;
  }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[300px] items-center justify-center">
        暂无数据
      </div>
    );
  }

  // 计算最大值用于缩放
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.requestTokens, d.responseTokens)),
  );

  return (
    <div className="h-[300px] w-full">
      <div className="flex h-full items-end gap-1">
        {data.map((point, index) => {
          const requestHeight =
            maxValue > 0 ? (point.requestTokens / maxValue) * 100 : 0;
          const responseHeight =
            maxValue > 0 ? (point.responseTokens / maxValue) * 100 : 0;

          return (
            <div
              key={index}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${new Date(point.timestamp).toLocaleDateString()}\n输入: ${point.requestTokens.toLocaleString()}\n输出: ${point.responseTokens.toLocaleString()}`}
            >
              <div className="flex w-full flex-1 items-end gap-0.5">
                <div
                  className="flex-1 rounded-t bg-blue-500 transition-all"
                  style={{ height: `${requestHeight}%` }}
                />
                <div
                  className="flex-1 rounded-t bg-green-500 transition-all"
                  style={{ height: `${responseHeight}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span>输入 Token</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>输出 Token</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 分组统计组件
 */
function BreakdownList({
  data,
  loading,
}: {
  data: Array<{
    key: string;
    requestTokens: number;
    responseTokens: number;
    requestCount: number;
    percentage: number;
    estimatedCost: number;
  }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">暂无数据</div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex-1">
            <div className="font-medium">{item.key}</div>
            <div className="text-muted-foreground text-sm">
              {item.requestCount.toLocaleString()} 次请求 ·{' '}
              {(item.requestTokens + item.responseTokens).toLocaleString()}{' '}
              tokens
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">{item.percentage.toFixed(1)}%</div>
            <div className="text-muted-foreground text-sm">
              ${item.estimatedCost.toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Bot 用量页面
 */
export default function BotUsagePage() {
  const params = useParams<{ hostname: string }>();
  const hostname = params.hostname;

  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [groupBy, setGroupBy] = useState<'vendor' | 'model' | 'status'>(
    'vendor',
  );

  // 计算日期范围
  const dateRange = useMemo(() => {
    const now = new Date();
    const endDate = now;
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    return { startDate, endDate };
  }, [period]);

  // 获取统计数据
  const { data: statsResponse, isLoading: statsLoading } = useBotUsageStats({
    hostname,
    period,
  });
  const stats = statsResponse?.body?.data;

  // 获取趋势数据
  const { data: trendResponse, isLoading: trendLoading } = useBotUsageTrend({
    hostname,
    granularity: period === 'day' ? 'hour' : 'day',
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
  });
  const trend = trendResponse?.body?.data;

  // 获取分组数据
  const { data: breakdownResponse, isLoading: breakdownLoading } =
    useBotUsageBreakdown({
      hostname,
      groupBy,
    });
  const breakdown = breakdownResponse?.body?.data;

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/bots"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">用量统计</h1>
            <p className="text-muted-foreground text-sm">{hostname}</p>
          </div>
        </div>
        <Select
          value={period}
          onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">今天</SelectItem>
            <SelectItem value="week">近 7 天</SelectItem>
            <SelectItem value="month">近 30 天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总 Token"
          value={formatNumber(stats?.totalTokens || 0)}
          icon={Zap}
          description={`输入 ${formatNumber(stats?.requestTokens || 0)} / 输出 ${formatNumber(stats?.responseTokens || 0)}`}
          loading={statsLoading}
        />
        <StatCard
          title="请求次数"
          value={formatNumber(stats?.requestCount || 0)}
          icon={Activity}
          description={`成功 ${stats?.successCount || 0} / 失败 ${stats?.errorCount || 0}`}
          loading={statsLoading}
        />
        <StatCard
          title="错误率"
          value={`${(stats?.errorRate || 0).toFixed(1)}%`}
          icon={AlertTriangle}
          description={`${stats?.errorCount || 0} 次错误`}
          loading={statsLoading}
        />
        <StatCard
          title="预估成本"
          value={`$${(stats?.estimatedCost || 0).toFixed(2)}`}
          icon={DollarSign}
          description="基于模型定价估算"
          loading={statsLoading}
        />
      </div>

      {/* 详细数据 */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">
            <TrendingUp className="mr-2 h-4 w-4" />
            趋势
          </TabsTrigger>
          <TabsTrigger value="breakdown">
            <Activity className="mr-2 h-4 w-4" />
            分布
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Token 使用趋势</CardTitle>
              <CardDescription>
                {period === 'day' ? '按小时' : '按天'}统计的 Token 使用量
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleTrendChart
                data={trend?.dataPoints || []}
                loading={trendLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>用量分布</CardTitle>
                <CardDescription>按不同维度查看用量分布</CardDescription>
              </div>
              <Select
                value={groupBy}
                onValueChange={(v) =>
                  setGroupBy(v as 'vendor' | 'model' | 'status')
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">按提供商</SelectItem>
                  <SelectItem value="model">按模型</SelectItem>
                  <SelectItem value="status">按状态</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <BreakdownList
                data={breakdown?.groups || []}
                loading={breakdownLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 平均响应时间 */}
      {stats?.avgDurationMs && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgDurationMs.toFixed(0)} ms
            </div>
            <p className="text-muted-foreground text-xs">
              基于 {stats.requestCount} 次请求
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
