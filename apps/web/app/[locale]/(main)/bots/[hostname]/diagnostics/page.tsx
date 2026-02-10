'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Progress,
} from '@repo/ui';
import {
  Stethoscope,
  Key,
  Bot,
  MessageSquare,
  Server,
  Globe,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { botClient } from '@/lib/api/contracts';
import type { DiagnosticCheckType } from '@repo/contracts';

type DiagnosticStatus = 'pending' | 'running' | 'pass' | 'warning' | 'fail';

interface DiagnosticCheck {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: DiagnosticStatus;
  message?: string;
  latency?: number;
}

const statusConfig: Record<
  DiagnosticStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  pending: {
    icon: Stethoscope,
    color: 'text-muted-foreground',
    label: '待检查',
  },
  running: { icon: Loader2, color: 'text-blue-500', label: '检查中' },
  pass: { icon: CheckCircle, color: 'text-green-500', label: '通过' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', label: '警告' },
  fail: { icon: XCircle, color: 'text-red-500', label: '失败' },
};

export default function BotDiagnosticsPage() {
  const params = useParams<{ hostname: string }>();
  const hostname = params.hostname;
  const t = useTranslations('bots.detail.diagnostics');

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [checks, setChecks] = useState<DiagnosticCheck[]>([
    {
      id: 'provider_key',
      name: t('providerKey'),
      description: '验证 API Key 是否有效',
      icon: Key,
      status: 'pending',
    },
    {
      id: 'model_access',
      name: t('modelAccess'),
      description: '检查配置的模型是否可调用',
      icon: Bot,
      status: 'pending',
    },
    {
      id: 'channel_tokens',
      name: t('channelTokens'),
      description: '验证渠道 Token 是否有效',
      icon: MessageSquare,
      status: 'pending',
    },
    {
      id: 'container',
      name: t('container'),
      description: '检查容器运行状态',
      icon: Server,
      status: 'pending',
    },
    {
      id: 'network',
      name: t('network'),
      description: '检查外部 API 端点连通性',
      icon: Globe,
      status: 'pending',
    },
  ]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setProgress(0);
    setRecommendations([]);

    // 重置所有检查状态为运行中
    setChecks((prev) =>
      prev.map((check) => ({
        ...check,
        status: 'running' as DiagnosticStatus,
        message: undefined,
        latency: undefined,
      })),
    );

    try {
      // 调用真实 API
      const checkTypes: DiagnosticCheckType[] = [
        'provider_key',
        'model_access',
        'channel_tokens',
        'container',
        'network',
      ];

      const response = await botClient.diagnose({
        params: { hostname },
        body: { checks: checkTypes },
      });

      if (response.status === 200 && response.body.data) {
        const { checks: apiChecks, recommendations: apiRecommendations } =
          response.body.data;

        // 更新检查结果
        setChecks((prev) =>
          prev.map((check) => {
            const apiCheck = apiChecks.find((c) => c.name === check.id);
            if (apiCheck) {
              return {
                ...check,
                status: apiCheck.status as DiagnosticStatus,
                message: apiCheck.message,
                latency: apiCheck.latency,
              };
            }
            return { ...check, status: 'pending' as DiagnosticStatus };
          }),
        );

        setRecommendations(apiRecommendations);
      } else {
        // API 调用失败，设置所有检查为失败
        setChecks((prev) =>
          prev.map((check) => ({
            ...check,
            status: 'fail' as DiagnosticStatus,
            message: '诊断请求失败',
          })),
        );
      }
    } catch (error) {
      // 网络错误或其他异常
      setChecks((prev) =>
        prev.map((check) => ({
          ...check,
          status: 'fail' as DiagnosticStatus,
          message: error instanceof Error ? error.message : '诊断请求失败',
        })),
      );
    }

    setProgress(100);
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </div>
        <Button onClick={runDiagnostics} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              诊断中...
            </>
          ) : (
            <>
              <RefreshCw className="size-4 mr-2" />
              {t('runDiagnostics')}
            </>
          )}
        </Button>
      </div>

      {/* 进度条 */}
      {isRunning && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Progress value={progress} className="flex-1" />
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 诊断结果 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => {
          const StatusIcon = statusConfig[check.status].icon;
          const Icon = check.icon;

          return (
            <Card key={check.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {check.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {check.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon
                      className={cn(
                        'size-4',
                        statusConfig[check.status].color,
                        check.status === 'running' && 'animate-spin',
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm',
                        statusConfig[check.status].color,
                      )}
                    >
                      {check.message || statusConfig[check.status].label}
                    </span>
                  </div>
                  {check.latency && (
                    <Badge variant="secondary" className="text-xs">
                      {check.latency}ms
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 建议 */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('recommendations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="size-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
