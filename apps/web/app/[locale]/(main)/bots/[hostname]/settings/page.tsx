'use client';

import { useState } from 'react';
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
} from '@repo/ui';
import { Settings, Shield, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BotSettingsPage() {
  const params = useParams<{ hostname: string }>();
  const router = useRouter();
  const hostname = params.hostname;
  const t = useTranslations('bots.detail.settings');

  const { bot, loading: botLoading } = useBot(hostname);
  const { handleDelete, deleteLoading } = useBots();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sandboxMode: true,
    timeout: 120,
  });

  // 初始化表单数据
  useState(() => {
    if (bot) {
      setFormData({
        name: bot.name || '',
        description: '',
        sandboxMode: true,
        timeout: 120,
      });
    }
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: 实现保存 API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('设置已保存');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await handleDelete(hostname);
      toast.success('Bot 已删除');
      router.push('/bots');
    } catch (error) {
      toast.error('删除失败');
    }
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
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Bot 描述（可选）"
              rows={3}
            />
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
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
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
