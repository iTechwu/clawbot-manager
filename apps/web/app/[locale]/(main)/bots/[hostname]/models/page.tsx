'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBot } from '@/hooks/useBots';
import { useModelAvailability } from '@/hooks/useModels';
import { ModelRoutingConfig } from '../components/model-routing-config';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';
import {
  CheckCircle2,
  Cpu,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Star,
  StarOff,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { botModelClient } from '@/lib/api/contracts';
import type { ModelAvailabilityItem, BotModelInfo } from '@repo/contracts';

type FilterMode = 'all' | 'available' | 'added';

export default function BotModelsPage() {
  const params = useParams<{ hostname: string }>();
  const hostname = params.hostname;
  const t = useTranslations('bots.detail.models');

  const { loading: botLoading } = useBot(hostname);
  const {
    availability: allModels,
    loading: modelsLoading,
    refresh: refreshModels,
  } = useModelAvailability();

  const [botModels, setBotModels] = useState<BotModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [botModelsLoading, setBotModelsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());

  // 获取 Bot 的模型列表
  const fetchBotModels = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!hostname) return;
      if (!options?.silent) setBotModelsLoading(true);
      try {
        const response = await botModelClient.list({
          params: { hostname },
        });
        if (response.status === 200 && response.body.data) {
          setBotModels(response.body.data.list);
        }
      } catch {
        toast.error(t('fetchFailed'));
      } finally {
        if (!options?.silent) setBotModelsLoading(false);
      }
    },
    [hostname, t],
  );

  useEffect(() => {
    fetchBotModels();
  }, [fetchBotModels]);

  // 计算已添加到 Bot 的模型 ID 集合 (ModelAvailability ID -> BotModel)
  const addedModelMap = useMemo(() => {
    const map = new Map<string, BotModelInfo>();
    botModels.forEach((bm) => {
      const matching = allModels.filter((m) => m.model === bm.modelId);
      matching.forEach((m) => map.set(m.id, bm));
    });
    return map;
  }, [botModels, allModels]);

  // 过滤模型
  const filteredModels = useMemo(() => {
    return allModels.filter((model) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!model.model.toLowerCase().includes(query)) return false;
      }
      if (filterMode === 'available' && !model.isAvailable) return false;
      if (filterMode === 'added' && !addedModelMap.has(model.id)) return false;
      return true;
    });
  }, [allModels, searchQuery, filterMode, addedModelMap]);

  // 统计
  const stats = useMemo(() => ({
    total: filteredModels.length,
    available: filteredModels.filter((m) => m.isAvailable).length,
    added: filteredModels.filter((m) => addedModelMap.has(m.id)).length,
  }), [filteredModels, addedModelMap]);

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
        toast.success(t('addSuccess', { count: response.body.data.added }));
        await fetchBotModels({ silent: true });
      } else {
        toast.error(t('addFailed'));
      }
    } catch {
      toast.error(t('addFailed'));
    } finally {
      setLoading(false);
      setSelectedModels(new Set());
    }
  };

  // 从 Bot 移除模型
  const handleRemoveModel = async (model: ModelAvailabilityItem) => {
    if (!confirm(t('removeConfirm'))) return;
    setLoading(true);
    try {
      const response = await botModelClient.removeModel({
        params: { hostname, modelAvailabilityId: model.id },
        body: {},
      });
      if (response.status === 200) {
        toast.success(t('removeSuccess'));
        await fetchBotModels({ silent: true });
      } else {
        toast.error(t('removeFailed'));
      }
    } catch {
      toast.error(t('removeFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 设为主模型
  const handleSetPrimary = async (modelId: string) => {
    setLoading(true);
    try {
      const enabledModels = botModels
        .filter((m) => m.isEnabled)
        .map((m) => m.modelId);
      await botModelClient.update({
        params: { hostname },
        body: { models: enabledModels, primaryModel: modelId },
      });
      toast.success(t('setPrimarySuccess'));
      await fetchBotModels({ silent: true });
    } catch {
      toast.error(t('setPrimaryFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 刷新
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBotModels({ silent: true }), refreshModels()]);
      toast.success(t('refreshSuccess'));
    } catch {
      toast.error(t('refreshFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 选择逻辑
  const toggleModelSelection = (modelId: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  };

  const selectableModels = filteredModels.filter(
    (m) => !addedModelMap.has(m.id),
  );
  const allSelected =
    selectableModels.length > 0 &&
    selectableModels.every((m) => selectedModels.has(m.id));
  const someSelected =
    selectableModels.some((m) => selectedModels.has(m.id)) && !allSelected;

  const toggleSelectAll = () => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      selectableModels.forEach((m) => {
        if (allSelected) next.delete(m.id);
        else next.add(m.id);
      });
      return next;
    });
  };

  const handleAddSelected = () => {
    const modelsToAdd = allModels.filter((m) => selectedModels.has(m.id));
    if (modelsToAdd.length > 0) handleAddModels(modelsToAdd);
  };

  const isLoading = botLoading || botModelsLoading || modelsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
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

        {/* 模型管理 Tab */}
        <TabsContent value="models" className="mt-6 space-y-4">
          {/* 搜索和过滤 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg border p-1">
              {(['all', 'available', 'added'] as FilterMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={filterMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFilterMode(mode)}
                >
                  {t(`filter.${mode}`)}
                </Button>
              ))}
            </div>

            {selectedModels.size > 0 && (
              <Button onClick={handleAddSelected} size="sm" disabled={loading}>
                <Plus className="size-4 mr-1" />
                {t('addSelected', { count: selectedModels.size })}
              </Button>
            )}
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{t('statsTotal', { count: stats.total })}</span>
            <span>·</span>
            <span className="text-green-600">
              {t('statsAvailable', { count: stats.available })}
            </span>
            <span>·</span>
            <span className="text-blue-600">
              {t('statsAdded', { count: stats.added })}
            </span>
          </div>

          {/* 模型列表 - 卡片式 */}
          {filteredModels.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Cpu className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {searchQuery ? t('noMatchingModels') : t('noModels')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredModels.map((model) => {
                const botModel = addedModelMap.get(model.id);
                const isAdded = !!botModel;
                const isSelected = selectedModels.has(model.id);

                return (
                  <Card
                    key={model.id}
                    className={cn(
                      'transition-all',
                      isAdded && 'ring-1 ring-blue-200 dark:ring-blue-800',
                      isSelected && !isAdded && 'ring-2 ring-primary',
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* 选择框（未添加的模型） */}
                          {!isAdded && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                toggleModelSelection(model.id)
                              }
                            />
                          )}

                          {/* 模型信息 */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {model.model}
                              </span>
                              {model.isAvailable ? (
                                <CheckCircle2 className="size-4 text-green-500" />
                              ) : (
                                <XCircle className="size-4 text-red-500" />
                              )}
                              {isAdded && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('badgeAdded')}
                                </Badge>
                              )}
                              {botModel?.isPrimary && (
                                <Badge variant="default" className="text-xs">
                                  {t('primary')}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {model.isAvailable
                                ? t('available')
                                : model.errorMessage || t('unavailable')}
                            </span>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-1">
                          {isAdded ? (
                            <>
                              <Button
                                variant={
                                  botModel?.isPrimary ? 'default' : 'ghost'
                                }
                                size="sm"
                                onClick={() =>
                                  handleSetPrimary(botModel!.modelId)
                                }
                                disabled={loading || botModel?.isPrimary}
                                className="gap-1"
                              >
                                {botModel?.isPrimary ? (
                                  <Star className="size-4 fill-current" />
                                ) : (
                                  <StarOff className="size-4" />
                                )}
                                <span className="hidden sm:inline">
                                  {botModel?.isPrimary
                                    ? t('primaryModel')
                                    : t('setAsPrimary')}
                                </span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleRemoveModel(model)}
                                disabled={loading}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddModels([model])}
                              disabled={loading}
                            >
                              <Plus className="size-4 mr-1" />
                              {t('addBtn')}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 能力标签 */}
                      {model.capabilityTags &&
                        model.capabilityTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                            {model.capabilityTags.slice(0, 5).map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {model.capabilityTags.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{model.capabilityTags.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 模型路由 Tab */}
        <TabsContent value="routing" className="mt-6">
          <ModelRoutingConfig hostname={hostname} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
