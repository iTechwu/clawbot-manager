'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBot } from '@/hooks/useBots';
import { useProviderKeys, useProviderKeyModels } from '@/hooks/useProviderKeys';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Label,
  ScrollArea,
} from '@repo/ui';
import { Plus, Bot, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { botClient } from '@/lib/api/contracts';
import type { BotProviderDetail, ProviderModel } from '@repo/contracts';

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

  const { loading: botLoading } = useBot(hostname);
  const { keys: providerKeys, loading: keysLoading } = useProviderKeys();
  const { getModels, loading: modelsLoading } = useProviderKeyModels();

  const [providers, setProviders] = useState<BotProvider[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(true);

  // 添加 Provider 表单状态
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]); // Store model IDs
  const [primaryModel, setPrimaryModel] = useState<string>(''); // Store model ID
  const [isPrimary, setIsPrimary] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

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

  // 当选择 Provider Key 时，获取可用模型
  useEffect(() => {
    if (!selectedKeyId) {
      setAvailableModels([]);
      setSelectedModels([]);
      setPrimaryModel('');
      return;
    }

    const fetchModels = async () => {
      const result = await getModels(selectedKeyId);
      const models = result?.models;
      if (models && models.length > 0) {
        setAvailableModels(models);
        // 默认选择所有模型 (store IDs)
        const modelIds = models.map((m) => m.id);
        setSelectedModels(modelIds);
        // 默认选择第一个模型作为主模型
        const firstModel = models[0];
        if (firstModel) {
          setPrimaryModel(firstModel.id);
        }
      }
    };

    fetchModels();
  }, [selectedKeyId, getModels]);

  // 过滤掉已添加的 Provider Keys
  const availableKeys = providerKeys.filter(
    (key) => !providers.some((p) => p.providerKeyId === key.id),
  );

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
    if (!selectedKeyId || selectedModels.length === 0) {
      toast.error('请选择 Provider 和至少一个模型');
      return;
    }

    setAddLoading(true);
    try {
      const response = await botClient.addProvider({
        params: { hostname },
        body: {
          keyId: selectedKeyId,
          models: selectedModels,
          primaryModel: primaryModel || selectedModels[0],
          isPrimary: isPrimary || providers.length === 0, // 如果是第一个，自动设为主 Provider
        },
      });
      if (response.status === 201) {
        toast.success('Provider 添加成功');
        setIsAddDialogOpen(false);
        resetAddForm();
        await fetchProviders();
      } else {
        const errorBody = response.body as { error?: string };
        toast.error(errorBody?.error || '添加失败');
      }
    } catch (error) {
      toast.error('添加失败');
    } finally {
      setAddLoading(false);
    }
  };

  const resetAddForm = () => {
    setSelectedKeyId('');
    setAvailableModels([]);
    setSelectedModels([]);
    setPrimaryModel('');
    setIsPrimary(false);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetAddForm();
    }
    setIsAddDialogOpen(open);
  };

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        const newModels = prev.filter((m) => m !== modelId);
        // 如果取消选择的是主模型，重新选择第一个
        if (modelId === primaryModel && newModels.length > 0) {
          const firstModel = newModels[0];
          if (firstModel) {
            setPrimaryModel(firstModel);
          }
        }
        return newModels;
      } else {
        return [...prev, modelId];
      }
    });
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
      <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addProvider')}</DialogTitle>
            <DialogDescription>
              从已配置的 API Keys 中选择一个 Provider 添加到此 Bot
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Provider Key 选择 */}
            <div className="space-y-2">
              <Label>选择 API Key</Label>
              {keysLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : availableKeys.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="size-4" />
                  <span>没有可用的 API Key，请先在设置中添加</span>
                </div>
              ) : (
                <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择一个 API Key" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKeys.map((key) => (
                      <SelectItem key={key.id} value={key.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{key.vendor}</span>
                          <span className="text-muted-foreground text-xs">
                            {key.label}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 模型选择 */}
            {selectedKeyId && (
              <div className="space-y-2">
                <Label>选择模型</Label>
                {modelsLoading ? (
                  <div className="flex items-center gap-2 p-4">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      加载模型列表...
                    </span>
                  </div>
                ) : availableModels.length === 0 ? (
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    无可用模型
                  </div>
                ) : (
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    <div className="space-y-2">
                      {availableModels.map((model) => (
                        <div
                          key={model.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={model.id}
                              checked={selectedModels.includes(model.id)}
                              onCheckedChange={() =>
                                toggleModelSelection(model.id)
                              }
                            />
                            <Label
                              htmlFor={model.id}
                              className="text-sm cursor-pointer"
                            >
                              {model.name || model.id}
                            </Label>
                          </div>
                          {selectedModels.includes(model.id) && (
                            <Button
                              variant={
                                primaryModel === model.id ? 'default' : 'ghost'
                              }
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => setPrimaryModel(model.id)}
                            >
                              {primaryModel === model.id
                                ? '主模型'
                                : '设为主模型'}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* 设为主 Provider */}
            {providers.length > 0 && selectedKeyId && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPrimary"
                  checked={isPrimary}
                  onCheckedChange={(checked) => setIsPrimary(checked === true)}
                />
                <Label htmlFor="isPrimary" className="text-sm cursor-pointer">
                  设为主 Provider（Bot 默认使用此 Provider）
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={addLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleAddProvider}
              disabled={
                addLoading ||
                !selectedKeyId ||
                selectedModels.length === 0 ||
                availableKeys.length === 0
              }
            >
              {addLoading && <Loader2 className="size-4 mr-2 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
