'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBot, useBots } from '@/hooks/useBots';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Separator,
  Skeleton,
  Badge,
  Alert,
  AlertDescription,
} from '@repo/ui';
import {
  Settings,
  Shield,
  AlertTriangle,
  Trash2,
  Loader2,
  User,
  Tag,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BotSettingsPage() {
  const params = useParams<{ hostname: string }>();
  const router = useRouter();
  const hostname = params.hostname;
  const t = useTranslations('bots.detail.settings');

  const { bot, loading: botLoading, refresh } = useBot(hostname);
  const {
    handleDelete,
    handleUpdate,
    handleClearPendingConfig,
    deleteLoading,
    updateLoading,
    clearPendingConfigLoading,
  } = useBots();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    soulMarkdown: '',
    tags: [] as string[],
    sandboxMode: true,
    timeout: 120,
  });
  const [tagInput, setTagInput] = useState('');

  // 初始化表单数据
  useEffect(() => {
    if (bot) {
      setFormData({
        name: bot.name || '',
        soulMarkdown: bot.soulMarkdown || '',
        tags: bot.tags || [],
        sandboxMode: true,
        timeout: 120,
      });
    }
  }, [bot]);

  // 检查是否有待生效配置
  const pendingConfig = bot?.pendingConfig as Record<string, unknown> | null;
  const hasPendingChanges =
    pendingConfig && Object.keys(pendingConfig).length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await handleUpdate(hostname, {
        name: formData.name,
        soulMarkdown: formData.soulMarkdown,
        tags: formData.tags,
      });
      toast.success('设置已保存，重启 Bot 后生效');
      refresh();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleClearPending = async () => {
    if (!confirm('确定要放弃所有未生效的修改吗？')) return;
    try {
      await handleClearPendingConfig(hostname);
      toast.success('已放弃未生效的修改');
      refresh();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDeleteBot = async () => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await handleDelete(hostname);
      toast.success('Bot 已删除');
      router.push('/bots');
    } catch {
      toast.error('删除失败');
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  if (botLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
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

      {/* 待生效配置提示 */}
      {hasPendingChanges && (
        <Alert>
          <Clock className="size-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              有配置修改尚未生效，重启 Bot 后将应用以下更改：
              {'name' in (pendingConfig ?? {}) && <Badge variant="outline" className="ml-2">名称</Badge>}
              {'soulMarkdown' in (pendingConfig ?? {}) && <Badge variant="outline" className="ml-2">人设</Badge>}
              {'tags' in (pendingConfig ?? {}) && <Badge variant="outline" className="ml-2">标签</Badge>}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearPending}
              disabled={clearPendingConfigLoading}
            >
              {clearPendingConfigLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4 mr-1" />
              )}
              放弃修改
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="size-5" />
            <CardTitle>{t('basicInfo')}</CardTitle>
          </div>
          <CardDescription>配置 Bot 的基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Bot 名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hostname">主机名</Label>
              <Input id="hostname" value={hostname} disabled />
              <p className="text-xs text-muted-foreground">
                主机名创建后不可修改
              </p>
            </div>
          </div>

          {/* 标签管理 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="size-4" />
              标签
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="输入标签后按回车添加"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                添加
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 人设配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="size-5" />
            <CardTitle>人设配置</CardTitle>
          </div>
          <CardDescription>
            配置 Bot 的人设描述，定义 Bot 的性格、能力和行为方式
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="soulMarkdown">人设描述 (Markdown)</Label>
            <Textarea
              id="soulMarkdown"
              value={formData.soulMarkdown}
              onChange={(e) =>
                setFormData({ ...formData, soulMarkdown: e.target.value })
              }
              placeholder="使用 Markdown 格式描述 Bot 的人设..."
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              支持 Markdown 格式，可以包含标题、列表、代码块等
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 运行配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5" />
            <CardTitle>{t('runtime')}</CardTitle>
          </div>
          <CardDescription>配置 Bot 的运行参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>沙箱模式</Label>
              <p className="text-xs text-muted-foreground">
                在隔离环境中运行代码，提高安全性
              </p>
            </div>
            <Switch
              checked={formData.sandboxMode}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, sandboxMode: checked })
              }
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="timeout">超时时间（秒）</Label>
            <Input
              id="timeout"
              type="number"
              value={formData.timeout}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  timeout: parseInt(e.target.value) || 120,
                })
              }
              min={30}
              max={600}
            />
            <p className="text-xs text-muted-foreground">
              API 请求的最大等待时间，范围 30-600 秒
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || updateLoading}>
          {(saving || updateLoading) && (
            <Loader2 className="size-4 mr-2 animate-spin" />
          )}
          保存设置
        </Button>
      </div>

      {/* 危险操作 */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <CardTitle>{t('danger')}</CardTitle>
          </div>
          <CardDescription>以下操作不可撤销，请谨慎操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('deleteBot')}</p>
              <p className="text-sm text-muted-foreground">
                删除此 Bot 及其所有配置、日志和数据
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteBot}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="size-4 mr-2" />
              )}
              删除 Bot
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
