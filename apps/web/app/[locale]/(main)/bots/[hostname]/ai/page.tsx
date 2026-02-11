'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBot } from '@/hooks/useBots';
import { useModelAvailability } from '@/hooks/useModels';
import { ModelAvailabilityTable } from '../components/model-availability-table';
import { ModelRoutingConfig } from '../components/model-routing-config';
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui';
import { Bot, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { botModelClient } from '@/lib/api/contracts';
import type { ModelAvailabilityItem, BotModelInfo } from '@repo/contracts';

export default function BotAIConfigPage() {
  const params = useParams<{ hostname: string }>();
  const hostname = params.hostname;
  const t = useTranslations('bots.detail.ai');

  const { loading: botLoading } = useBot(hostname);
  const {
    availability: allModels,
    loading: modelsLoading,
    refresh: refreshModels,
  } = useModelAvailability();

  const [botModels, setBotModels] = useState<BotModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [botModelsLoading, setBotModelsLoading] = useState(true);

  // 获取 Bot 的模型列表
  const fetchBotModels = useCallback(async () => {
    if (!hostname) return;
    setBotModelsLoading(true);
    try {
      const response = await botModelClient.list({
        params: { hostname },
      });
      if (response.status === 200 && response.body.data) {
        setBotModels(response.body.data.list);
      }
    } catch {
      toast.error(t('fetchModelsFailed'));
    } finally {
      setBotModelsLoading(false);
    }
  }, [hostname, t]);

  useEffect(() => {
    fetchBotModels();
  }, [fetchBotModels]);

  // 计算已添加到 Bot 的模型 ID 集合
  // 使用 modelId (model name) 匹配 ModelAvailability
  const addedModelIds = useMemo(() => {
    const ids = new Set<string>();
    botModels.forEach((botModel) => {
      // 在 allModels 中查找匹配的 ModelAvailability
      const matchingModels = allModels.filter(
        (m) => m.model === botModel.modelId,
      );
      matchingModels.forEach((m) => ids.add(m.id));
    });
    return ids;
  }, [botModels, allModels]);

  // 添加模型到 Bot
  const handleAddModels = async (models: ModelAvailabilityItem[]) => {
    if (models.length === 0) return;

    setLoading(true);
    try {
      const modelAvailabilityIds = models.map((m) => m.id);
      const response = await botModelClient.addModels({
        params: { hostname },
        body: {
          modelAvailabilityIds,
          primaryModelAvailabilityId:
            botModels.length === 0 ? modelAvailabilityIds[0] : undefined,
        },
      });

      if (response.status === 201 && response.body.data) {
        toast.success(t('addModelsSuccess', { count: response.body.data.added }));
        await fetchBotModels();
      } else {
        toast.error(t('addModelsFailed'));
      }
    } catch {
      toast.error(t('addModelsFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 从 Bot 移除模型
  const handleRemoveModel = async (model: ModelAvailabilityItem) => {
    if (!confirm(t('removeModelConfirm'))) return;

    setLoading(true);
    try {
      const response = await botModelClient.removeModel({
        params: { hostname, modelAvailabilityId: model.id },
        body: {},
      });

      if (response.status === 200) {
        toast.success(t('removeModelSuccess'));
        await fetchBotModels();
      } else {
        toast.error(t('removeModelFailed'));
      }
    } catch {
      toast.error(t('removeModelFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 刷新模型列表
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBotModels(), refreshModels()]);
      toast.success(t('refreshSuccess'));
    } catch {
      toast.error(t('refreshFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (botLoading || botModelsLoading) {
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="size-4 mr-2" />
          )}
          {t('refresh')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="models">{t('tabs.models')}</TabsTrigger>
          <TabsTrigger value="routing">{t('tabs.routing')}</TabsTrigger>
        </TabsList>

        {/* AI Models Tab */}
        <TabsContent value="models" className="mt-6 space-y-4">
          {allModels.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bot className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">{t('noModels')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('noModelsHint')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ModelAvailabilityTable
              models={allModels}
              addedModelIds={addedModelIds}
              loading={modelsLoading || loading}
              onAddModels={handleAddModels}
              onRemoveModel={handleRemoveModel}
              showAddButton={true}
            />
          )}
        </TabsContent>

        {/* Model Routing Tab */}
        <TabsContent value="routing" className="mt-6">
          <ModelRoutingConfig hostname={hostname} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
