'use client';

import { useMemo, useState, useCallback } from 'react';
import { useAvailableModels, useModelAvailability } from '@/hooks/useModels';
import { useProviderKeys } from '@/hooks/useProviderKeys';
import { useIsAdmin } from '@/lib/permissions';
import type { AvailableModel, ModelAvailabilityItem } from '@repo/contracts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Progress,
} from '@repo/ui';
import {
  Search,
  Cpu,
  Zap,
  Brain,
  Sparkles,
  CheckCircle,
  XCircle,
  RefreshCw,
  PlayCircle,
  Key,
  Database,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { ModelCard } from './components/model-card';
import { toast } from 'sonner';

/**
 * 模型分类配置
 */
const MODEL_CATEGORIES = [
  { id: 'all', label: '全部', icon: Cpu },
  { id: 'reasoning', label: '推理', icon: Brain },
  { id: 'balanced', label: '均衡', icon: Sparkles },
  { id: 'fast', label: '快速', icon: Zap },
] as const;

// View mode type
type ViewMode = 'cards' | 'availability';

export default function ModelsPage() {
  const {
    models,
    loading,
    error,
    refresh,
    refreshModels,
    refreshing,
    refreshAllModels,
    refreshingAll,
    verifySingleModel,
    verifyingModel,
    batchVerifyUnverified,
    batchVerifying,
    batchVerifyAllUnavailable,
    batchVerifyingAll,
  } = useAvailableModels();
  const isAdmin = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Get ModelAvailability data for admin view
  const {
    availability,
    loading: availabilityLoading,
    refresh: refreshAvailability,
  } = useModelAvailability();

  // Get provider keys list (for admin to know if any API keys are configured)
  const { keys: providerKeys, loading: providerKeysLoading } =
    useProviderKeys();

  // Filter models by search and category
  const filteredModels = useMemo(() => {
    let result = [...models];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (model) =>
          model.displayName.toLowerCase().includes(query) ||
          model.model.toLowerCase().includes(query) ||
          model.vendor.toLowerCase().includes(query),
      );
    }

    // Filter by category
    if (activeCategory !== 'all') {
      result = result.filter((model) => model.category === activeCategory);
    }

    return result;
  }, [models, searchQuery, activeCategory]);

  // Group models by availability
  const { availableModels, unavailableModels } = useMemo(() => {
    const available: AvailableModel[] = [];
    const unavailable: AvailableModel[] = [];

    filteredModels.forEach((model) => {
      if (model.isAvailable) {
        available.push(model);
      } else {
        unavailable.push(model);
      }
    });

    return { availableModels: available, unavailableModels: unavailable };
  }, [filteredModels]);

  // Stats
  const stats = useMemo(() => {
    const total = models.length;
    const available = models.filter((m) => m.isAvailable).length;
    return { total, available };
  }, [models]);

  // Handle refresh models for a specific provider key
  const handleRefreshModels = useCallback(
    async (providerKeyId: string) => {
      const result = await refreshModels(providerKeyId);
      if (result) {
        toast.success(
          `刷新完成：${result.models.length} 个模型，新增 ${result.addedCount}，移除 ${result.removedCount}`,
        );
      }
    },
    [refreshModels],
  );

  // Handle verify single model
  const handleVerifySingleModel = useCallback(
    async (providerKeyId: string, model: string) => {
      const result = await verifySingleModel(providerKeyId, model);
      if (result) {
        if (result.isAvailable) {
          toast.success(`模型 ${model} 验证成功`);
        } else {
          toast.error(
            `模型 ${model} 不可用: ${result.errorMessage || '未知错误'}`,
          );
        }
      }
    },
    [verifySingleModel],
  );

  // Handle batch verify unverified models for a provider key
  const handleBatchVerify = useCallback(
    async (providerKeyId: string) => {
      setBatchProgress({ current: 0, total: 1 });

      const result = await batchVerifyUnverified(providerKeyId);

      setBatchProgress(null);

      if (result) {
        toast.success(
          `批量验证完成：${result.available}/${result.total} 个模型可用，${result.failed} 个失败`,
        );
        // Refresh availability data
        refreshAvailability();
      }
    },
    [batchVerifyUnverified, refreshAvailability],
  );

  // Handle refresh all models
  const handleRefreshAllModels = useCallback(async () => {
    const result = await refreshAllModels();
    if (result) {
      toast.success(
        `刷新完成：${result.successCount}/${result.totalProviderKeys} 个密钥成功，共 ${result.totalModels} 个模型，新增 ${result.totalAdded}，移除 ${result.totalRemoved}`,
      );
      refreshAvailability();
    }
  }, [refreshAllModels, refreshAvailability]);

  // Handle batch verify all unavailable models
  const handleBatchVerifyAll = useCallback(async () => {
    setBatchProgress({ current: 0, total: 1 });

    const result = await batchVerifyAllUnavailable();

    setBatchProgress(null);

    if (result) {
      toast.success(
        `批量验证完成：${result.totalAvailable}/${result.totalVerified} 个模型可用，${result.totalFailed} 个失败`,
      );
      refreshAvailability();
    }
  }, [batchVerifyAllUnavailable, refreshAvailability]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <XCircle className="text-destructive mx-auto mb-4 size-16" />
            <h2 className="mb-2 text-xl font-semibold">加载失败</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">可用模型</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            查看系统中所有可用的 AI 模型
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500 size-4" />
            <span className="text-sm">
              {stats.available} / {stats.total} 可用
            </span>
          </div>
          {/* View Mode Toggle (Admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-1 rounded-md border p-1">
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('cards')}
              >
                <Cpu className="mr-1 size-3.5" />
                卡片
              </Button>
              <Button
                variant={viewMode === 'availability' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('availability')}
              >
                <Database className="mr-1 size-3.5" />
                可用性
              </Button>
            </div>
          )}
          {isAdmin && providerKeys.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    refreshing || refreshingAll || batchProgress !== null
                  }
                >
                  <RefreshCw
                    className={`mr-1.5 size-4 ${refreshing || refreshingAll ? 'animate-spin' : ''}`}
                  />
                  {refreshing || refreshingAll ? '刷新中...' : '刷新模型列表'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleRefreshAllModels}
                  className="font-medium"
                >
                  <RefreshCw className="mr-2 size-4" />
                  刷新所有密钥
                </DropdownMenuItem>
                <div className="my-1 h-px bg-border" />
                {providerKeys.map((pk) => (
                  <DropdownMenuItem
                    key={pk.id}
                    onClick={() => handleRefreshModels(pk.id)}
                  >
                    <RefreshCw className="mr-2 size-4" />
                    {pk.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isAdmin && providerKeys.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    batchProgress !== null ||
                    batchVerifying ||
                    batchVerifyingAll
                  }
                >
                  <PlayCircle
                    className={`mr-1.5 size-4 ${batchVerifying || batchVerifyingAll ? 'animate-spin' : ''}`}
                  />
                  {batchVerifying || batchVerifyingAll
                    ? '验证中...'
                    : '批量验证'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleBatchVerifyAll}
                  className="font-medium"
                >
                  <PlayCircle className="mr-2 size-4" />
                  验证所有不可用模型
                </DropdownMenuItem>
                <div className="my-1 h-px bg-border" />
                {providerKeys.map((pk) => (
                  <DropdownMenuItem
                    key={pk.id}
                    onClick={() => handleBatchVerify(pk.id)}
                  >
                    <PlayCircle className="mr-2 size-4" />
                    {pk.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Admin Notice: No Provider Keys */}
      {isAdmin && providerKeys.length === 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="flex items-center gap-3 py-3">
            <Key className="size-5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                尚未配置 API 密钥
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                请先在「密钥管理」页面添加 API 密钥，然后才能刷新和验证模型
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
              asChild
            >
              <a href="/secrets">
                <Key className="mr-1.5 size-4" />
                添加密钥
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Batch Progress */}
      {batchProgress && (
        <div className="mb-4 shrink-0">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>批量验证进度</span>
            <span>
              {batchProgress.current} / {batchProgress.total}
            </span>
          </div>
          <Progress
            value={(batchProgress.current / batchProgress.total) * 100}
          />
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-4 flex shrink-0 items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="搜索模型..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList>
            {MODEL_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5">
                <cat.icon className="size-4" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Models List */}
      <ScrollArea className="min-h-0 flex-1">
        {/* Availability Table View (Admin only) */}
        {isAdmin && viewMode === 'availability' ? (
          <div className="pb-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Database className="size-4" />
                模型可用性记录 ({availability.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshAvailability()}
                disabled={availabilityLoading}
              >
                <RefreshCw
                  className={`mr-1.5 size-4 ${availabilityLoading ? 'animate-spin' : ''}`}
                />
                刷新
              </Button>
            </div>
            {availability.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Database className="text-muted-foreground mb-4 size-16 opacity-50" />
                <h3 className="text-muted-foreground text-lg font-medium">
                  暂无可用性记录
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  请先刷新模型列表以获取可用性数据
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availability.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm truncate">
                            {item.model}
                          </span>
                          {item.isAvailable ? (
                            <Badge
                              variant="default"
                              className="bg-green-500 shrink-0"
                            >
                              <CheckCircle className="mr-1 size-3" />
                              可用
                            </Badge>
                          ) : item.errorMessage === 'Not verified yet' ? (
                            <Badge variant="secondary" className="shrink-0">
                              <Clock className="mr-1 size-3" />
                              未验证
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="shrink-0">
                              <XCircle className="mr-1 size-3" />
                              不可用
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>
                            验证时间:{' '}
                            {item.lastVerifiedAt
                              ? new Date(item.lastVerifiedAt).toLocaleString(
                                  'zh-CN',
                                )
                              : '-'}
                          </span>
                          {item.errorMessage &&
                            item.errorMessage !== 'Not verified yet' && (
                              <span className="text-destructive flex items-center gap-1 truncate">
                                <AlertCircle className="size-3 shrink-0" />
                                <span
                                  className="truncate"
                                  title={item.errorMessage}
                                >
                                  {item.errorMessage}
                                </span>
                              </span>
                            )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleVerifySingleModel(
                            item.providerKeyId,
                            item.model,
                          );
                        }}
                        disabled={verifyingModel === item.model}
                        title="验证模型"
                      >
                        <RefreshCw
                          className={`size-4 ${verifyingModel === item.model ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Cpu className="text-muted-foreground mb-4 size-16 opacity-50" />
            <h3 className="text-muted-foreground text-lg font-medium">
              {searchQuery ? '没有找到匹配的模型' : '暂无可用模型'}
            </h3>
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            {/* Available Models */}
            {availableModels.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="text-green-500 size-4" />
                  可用模型 ({availableModels.length})
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {availableModels.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isAdmin={isAdmin}
                      onVerify={handleVerifySingleModel}
                      verifying={verifyingModel === model.model}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unavailable Models */}
            {unavailableModels.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <XCircle className="size-4" />
                  不可用模型 ({unavailableModels.length})
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
                  {unavailableModels.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isAdmin={isAdmin}
                      onVerify={handleVerifySingleModel}
                      verifying={verifyingModel === model.model}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
