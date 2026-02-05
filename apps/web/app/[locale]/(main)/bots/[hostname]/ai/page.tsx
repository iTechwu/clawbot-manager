'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBot } from '@/hooks/useBots';
import { ProviderCard } from '../components/provider-card';
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@repo/ui';
import { Plus, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { botClient } from '@/lib/api/contracts';
import type { BotProviderDetail } from '@repo/contracts';

// 转换 API 响应为组件所需格式
interface BotProvider {
  id: string;
  providerKeyId: string;
  vendor: string;
  label: string;
  baseUrl: string | null;
  apiKeyMasked: string;
  isPrimary: boolean;
  models: {
    id: string;
    name: string;
    isPrimary: boolean;
  }[];
}

function mapProviderDetail(detail: BotProviderDetail): BotProvider {
  return {
    id: detail.id,
    providerKeyId: detail.providerKeyId,
    vendor: detail.vendor,
    label: detail.label,
    baseUrl: detail.baseUrl,
    apiKeyMasked: detail.apiKeyMasked,
    isPrimary: detail.isPrimary,
    models: detail.allowedModels.map((modelId) => ({
      id: modelId,
      name: modelId,
      isPrimary: modelId === detail.primaryModel,
    })),
  };
}

export default function BotAIConfigPage() {
  const params = useParams<{ hostname: string }>();
  const hostname = params.hostname;
  const t = useTranslations('bots.detail.ai');

  const { bot, loading: botLoading } = useBot(hostname);
  const [providers, setProviders] = useState<BotProvider[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(true);

  // 获取 Bot 的 Provider 列表
  const fetchProviders = useCallback(async () => {
    if (!hostname) return;
    setProvidersLoading(true);
    try {
      const response = await botClient.getProviders({
        params: { hostname },
      });
      if (response.status === 200 && response.body.data) {
        setProviders(response.body.data.providers.map(mapProviderDetail));
      }
    } catch (error) {
      toast.error('获取 Provider 列表失败');
    } finally {
      setProvidersLoading(false);
    }
  }, [hostname]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSetPrimaryModel = async (
    provider: BotProvider,
    modelId: string,
  ) => {
    setLoading(true);
    try {
      const response = await botClient.setPrimaryModel({
        params: { hostname, keyId: provider.providerKeyId },
        body: { modelId },
      });
      if (response.status === 200) {
        toast.success('主模型设置成功');
        // 刷新列表
        await fetchProviders();
      } else {
        toast.error('设置失败');
      }
    } catch (error) {
      toast.error('设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProvider = async (provider: BotProvider) => {
    if (!confirm('确定要删除此 Provider 吗？')) return;

    setLoading(true);
    try {
      const response = await botClient.removeProvider({
        params: { hostname, keyId: provider.providerKeyId },
        body: {},
      });
      if (response.status === 200) {
        setProviders((prev) => prev.filter((p) => p.id !== provider.id));
        toast.success('Provider 已删除');
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = async () => {
    // TODO: 实现添加 Provider 逻辑
    setIsAddDialogOpen(false);
    toast.success('Provider 添加成功');
  };

  if (botLoading || providersLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          {t('addProvider')}
        </Button>
      </div>

      {/* Provider 列表 */}
      {providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">{t('noProviders')}</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="size-4 mr-2" />
              {t('addFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              vendor={provider.vendor}
              label={provider.label}
              baseUrl={provider.baseUrl}
              apiKeyMasked={provider.apiKeyMasked}
              models={provider.models}
              isPrimary={provider.isPrimary}
              onSetPrimaryModel={(modelId) =>
                handleSetPrimaryModel(provider, modelId)
              }
              onDelete={() => handleDeleteProvider(provider)}
              loading={loading}
            />
          ))}
        </div>
      )}

      {/* 添加 Provider 对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addProvider')}</DialogTitle>
            <DialogDescription>
              从已配置的 API Keys 中选择一个 Provider 添加到此 Bot
            </DialogDescription>
          </DialogHeader>

          {/* TODO: 实现 Provider 选择表单 */}
          <div className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              功能开发中...
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddProvider}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
