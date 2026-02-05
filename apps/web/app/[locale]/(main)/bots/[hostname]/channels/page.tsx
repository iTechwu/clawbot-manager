'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  botChannelApi,
  channelApi,
  botChannelClient,
} from '@/lib/api/contracts/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  Input,
  Label,
  ScrollArea,
} from '@repo/ui';
import {
  Check,
  X,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  Play,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BotChannelItem, ChannelDefinition } from '@repo/contracts';
import {
  ChannelIcon,
  channelColors,
} from '@/lib/config/channels/channel-icons';
import { cn } from '@repo/ui/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQueryOptions = any;

/**
 * 渠道列表项组件
 */
function ChannelListItem({
  channel,
  definition,
  isSelected,
  onClick,
}: {
  channel?: BotChannelItem;
  definition: ChannelDefinition;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isConfigured = !!channel;
  const accentColor = channelColors[definition.id] || '#6B7280';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:bg-muted/50',
      )}
    >
      <div
        className="size-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${accentColor}20` }}
      >
        <ChannelIcon channelId={definition.id} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{definition.label}</p>
        <div className="flex items-center gap-1 text-xs">
          {isConfigured ? (
            <>
              <Check className="size-3 text-green-500" />
              <span className="text-green-500">已配置</span>
            </>
          ) : (
            <>
              <X className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">未配置</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
}

/**
 * 渠道配置表单组件
 */
function ChannelConfigForm({
  definition,
  channel,
  onSave,
  onTest,
  saving,
  testing,
}: {
  definition: ChannelDefinition;
  channel?: BotChannelItem;
  onSave: (credentials: Record<string, string>) => void;
  onTest: () => void;
  saving: boolean;
  testing: boolean;
}) {
  const t = useTranslations('bots.detail.channels');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );
  const accentColor = channelColors[definition.id] || '#6B7280';

  // 初始化凭证（如果已配置）
  // 注意：实际凭证应该从 API 获取，这里只是占位

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = () => {
    // 验证必填字段
    const missingFields: string[] = [];
    for (const field of definition.credentialFields || []) {
      if (field.required && !credentials[field.key]?.trim()) {
        missingFields.push(field.label);
      }
    }

    if (missingFields.length > 0) {
      toast.error(`请填写必填字段: ${missingFields.join(', ')}`);
      return;
    }

    onSave(credentials);
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div
          className="size-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <ChannelIcon channelId={definition.id} size={28} />
        </div>
        <div>
          <h3 className="text-lg font-semibold">配置 {definition.label}</h3>
          {definition.tokenHint && (
            <p className="text-sm text-muted-foreground">
              {definition.tokenHint}
            </p>
          )}
        </div>
      </div>

      {/* 凭证字段 */}
      <div className="space-y-4">
        {definition.credentialFields?.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key} className="flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
              {credentials[field.key] && (
                <Check className="size-3 text-green-500 ml-1" />
              )}
            </Label>

            <div className="relative">
              <Input
                id={field.key}
                type={
                  field.fieldType === 'password' && !showPasswords[field.key]
                    ? 'password'
                    : 'text'
                }
                placeholder={field.placeholder}
                value={credentials[field.key] || ''}
                onChange={(e) =>
                  handleCredentialChange(field.key, e.target.value)
                }
              />
              {field.fieldType === 'password' && (
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(field.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords[field.key] ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 帮助链接 */}
      {definition.helpUrl && (
        <p className="text-xs text-muted-foreground">
          💡 {definition.helpText || '查看帮助文档'}:{' '}
          <a
            href={definition.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {definition.helpUrl}
          </a>
        </p>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1"
          style={{ backgroundColor: accentColor }}
        >
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          {t('saveConfig')}
        </Button>
        <Button
          variant="outline"
          onClick={onTest}
          disabled={testing || !channel}
        >
          {testing ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Play className="size-4 mr-2" />
          )}
          {t('quickTest')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Bot 渠道管理页面 - OpenClaw Manager 风格
 */
export default function BotChannelsPage() {
  const params = useParams<{ hostname: string }>();
  const hostname = params.hostname;
  const locale = useLocale();
  const t = useTranslations('bots.detail.channels');
  const queryClient = useQueryClient();

  const [selectedChannelType, setSelectedChannelType] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // 获取渠道定义列表
  const { data: channelDefsResponse, isLoading: defsLoading } =
    channelApi.list.useQuery(
      ['channel-definitions', locale],
      { query: { locale } },
      { staleTime: 1000 * 60 * 10 } as AnyQueryOptions,
    );

  const channelDefinitions = useMemo(
    () => channelDefsResponse?.body?.data?.channels || [],
    [channelDefsResponse],
  );

  // 获取已配置的渠道列表
  const { data: channelsResponse, isLoading: channelsLoading } =
    botChannelApi.list.useQuery(
      ['bot-channels', hostname],
      { params: { hostname } },
      { enabled: !!hostname } as AnyQueryOptions,
    );

  const configuredChannels = useMemo(
    () => channelsResponse?.body?.data?.list || [],
    [channelsResponse],
  );

  // 获取选中的渠道定义和配置
  const selectedDefinition = useMemo(
    () => channelDefinitions.find((d) => d.id === selectedChannelType),
    [channelDefinitions, selectedChannelType],
  );

  const selectedChannel = useMemo(
    () => configuredChannels.find((c) => c.channelType === selectedChannelType),
    [configuredChannels, selectedChannelType],
  );

  // 自动选择第一个渠道
  useEffect(() => {
    if (channelDefinitions.length > 0 && !selectedChannelType) {
      setSelectedChannelType(channelDefinitions[0]?.id ?? null);
    }
  }, [channelDefinitions, selectedChannelType]);

  // 保存渠道配置
  const handleSaveConfig = async (credentials: Record<string, string>) => {
    if (!selectedChannelType) return;

    setSaving(true);
    try {
      if (selectedChannel) {
        // 更新现有渠道
        await botChannelClient.update({
          params: { hostname, channelId: selectedChannel.id },
          body: { credentials },
        });
      } else {
        // 创建新渠道
        await botChannelClient.create({
          params: { hostname },
          body: {
            channelType: selectedChannelType,
            name: selectedDefinition?.label || selectedChannelType,
            credentials,
          },
        });
      }
      toast.success('配置已保存');
      queryClient.invalidateQueries({ queryKey: ['bot-channels', hostname] });
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 快速测试
  const handleQuickTest = async () => {
    if (!selectedChannel) {
      toast.error('请先保存配置');
      return;
    }

    setTesting(true);
    try {
      const response = await botChannelClient.test({
        params: { hostname, channelId: selectedChannel.id },
        body: { message: 'Hello from ClawBot!' },
      });

      if (response.status === 200 && response.body.data) {
        const { status, message } = response.body.data;
        if (status === 'success') {
          toast.success(message || '测试成功');
        } else if (status === 'warning') {
          toast.warning(message || '测试完成，但有警告');
        } else {
          toast.error(message || '测试失败');
        }
      } else {
        toast.error('测试请求失败');
      }
    } catch (error) {
      toast.error('测试失败');
    } finally {
      setTesting(false);
    }
  };

  const isLoading = defsLoading || channelsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-[500px] w-64" />
          <Skeleton className="h-[500px] flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>

      {/* 主内容区 - 左右分栏 */}
      <div className="flex gap-6">
        {/* 左侧：渠道列表 */}
        <Card className="w-64 flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">消息渠道</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1">
                {channelDefinitions.map((definition) => {
                  const channel = configuredChannels.find(
                    (c) => c.channelType === definition.id,
                  );
                  return (
                    <ChannelListItem
                      key={definition.id}
                      definition={definition}
                      channel={channel}
                      isSelected={selectedChannelType === definition.id}
                      onClick={() => setSelectedChannelType(definition.id)}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 右侧：配置表单 */}
        <Card className="flex-1">
          <CardContent className="p-6">
            {selectedDefinition ? (
              <ChannelConfigForm
                definition={selectedDefinition}
                channel={selectedChannel}
                onSave={handleSaveConfig}
                onTest={handleQuickTest}
                saving={saving}
                testing={testing}
              />
            ) : (
              <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                {t('selectChannel')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
