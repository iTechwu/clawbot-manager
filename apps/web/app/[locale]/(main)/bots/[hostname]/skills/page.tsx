'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  botSkillApi,
  skillApi,
  skillSyncApi,
} from '@/lib/api/contracts/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  Switch,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@repo/ui';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Settings,
  Wrench,
  Sparkles,
  User,
  Search,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { toast } from 'sonner';
import type { BotSkillItem, SkillItem } from '@repo/contracts';
import { useLocalizedFields } from '@/hooks/useLocalizedFields';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/**
 * 获取技能图标
 */
function getSkillIcon(skill: {
  skillType?: { icon?: string | null } | null;
}): string {
  return skill.skillType?.icon || '📦';
}

/**
 * 已安装技能卡片
 */
function InstalledSkillCard({
  botSkill,
  onToggle,
  onRequestUninstall,
  t,
}: {
  botSkill: BotSkillItem;
  onToggle: (skillId: string, enabled: boolean) => void;
  onRequestUninstall: (skillId: string, name: string) => void;
  t: (key: string) => string;
}) {
  const { skill } = botSkill;
  const { getName, getDescription } = useLocalizedFields();
  const skillIcon = getSkillIcon(skill);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded text-lg">
              {skillIcon}
            </div>
            <div>
              <CardTitle className="text-base">{getName(skill)}</CardTitle>
              <CardDescription className="text-xs">
                v{skill.version}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={botSkill.isEnabled}
              onCheckedChange={(checked) => onToggle(skill.id, checked)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-1">
          {skill.isSystem ? (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="mr-1 h-3 w-3" />
              {t('system')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <User className="mr-1 h-3 w-3" />
              {t('custom')}
            </Badge>
          )}
          {skill.skillType && (
            <Badge variant="outline" className="text-xs">
              {getName(skill.skillType)}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
          {getDescription(skill) || t('noDescription')}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled>
            <Settings className="mr-1 h-3 w-3" />
            {t('configure')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRequestUninstall(skill.id, getName(skill))}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            {t('uninstall')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 可安装技能卡片
 */
function AvailableSkillCard({
  skill,
  onInstall,
  onPreview,
  isInstalling,
  t,
}: {
  skill: SkillItem;
  onInstall: (skillId: string) => void;
  onPreview: (skill: SkillItem) => void;
  isInstalling: boolean;
  t: (key: string) => string;
}) {
  const { getName, getDescription } = useLocalizedFields();
  const skillIcon = getSkillIcon(skill);

  return (
    <Card
      className="hover:border-primary/50 cursor-pointer transition-colors"
      onClick={() => onPreview(skill)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded text-lg">
              {skillIcon}
            </div>
            <div>
              <CardTitle className="text-base">{getName(skill)}</CardTitle>
              <CardDescription className="text-xs">
                v{skill.version}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            {skill.isSystem ? (
              <Badge variant="secondary" className="text-xs">
                {t('system')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                {t('custom')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
          {getDescription(skill) || t('noDescription')}
        </p>
        <Button
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onInstall(skill.id);
          }}
          disabled={isInstalling}
        >
          {isInstalling ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              {t('installing')}
            </>
          ) : (
            <>
              <Plus className="mr-1 h-3 w-3" />
              {t('install')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * 骨架屏
 */
function SkillCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div>
              <Skeleton className="mb-1 h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-3 h-10 w-full" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * 技能详情预览
 */
function SkillDetailPreview({
  skill,
  onBack,
  onInstall,
  isInstalling,
  t,
}: {
  skill: SkillItem;
  onBack: () => void;
  onInstall: (skillId: string) => void;
  isInstalling: boolean;
  t: (key: string) => string;
}) {
  const { getName, getDescription } = useLocalizedFields();
  const skillIcon = getSkillIcon(skill);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('backToList')}
      </Button>
      <div className="flex items-start gap-4">
        <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg text-2xl">
          {skillIcon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{getName(skill)}</h3>
          <p className="text-muted-foreground text-sm">
            {getDescription(skill) || t('noDescription')}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">{t('version')}:</span>{' '}
          <span>v{skill.version}</span>
        </div>
        {skill.author && (
          <div>
            <span className="text-muted-foreground">{t('author')}:</span>{' '}
            <span>{skill.author}</span>
          </div>
        )}
        {skill.source && (
          <div>
            <span className="text-muted-foreground">{t('source')}:</span>{' '}
            <Badge variant="outline" className="ml-1 text-xs">
              {skill.source}
            </Badge>
          </div>
        )}
      </div>
      {skill.skillType && (
        <div className="flex gap-1">
          <Badge variant="secondary">{getName(skill.skillType)}</Badge>
          {skill.isSystem && (
            <Badge variant="secondary">
              <Sparkles className="mr-1 h-3 w-3" />
              {t('system')}
            </Badge>
          )}
        </div>
      )}
      {/* 标签展示 */}
      {skill.definition?.tags &&
        Array.isArray(skill.definition.tags) &&
        skill.definition.tags.length > 0 && (
          <div>
            <span className="text-muted-foreground text-sm">{t('tags')}:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {(skill.definition.tags as string[]).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      {/* GitHub 源链接 */}
      {skill.sourceUrl && (
        <a
          href={skill.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
        >
          GitHub ↗
        </a>
      )}
      <Button
        className="w-full"
        onClick={() => onInstall(skill.id)}
        disabled={isInstalling}
      >
        {isInstalling ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            {t('installing')}
          </>
        ) : (
          <>
            <Plus className="mr-1 h-4 w-4" />
            {t('install')}
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Bot 技能管理页面
 */
export default function BotSkillsPage() {
  const params = useParams<{ hostname: string }>();
  const hostname = params.hostname;
  const queryClient = useQueryClient();
  const t = useTranslations('botSkills');
  const { getName } = useLocalizedFields();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [installingSkillId, setInstallingSkillId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('all');
  const [previewSkill, setPreviewSkill] = useState<SkillItem | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<{
    skillId: string;
    name: string;
  } | null>(null);
  const [isUninstalling, setIsUninstalling] = useState(false);

  // 获取已安装的技能
  const { data: installedResponse, isLoading: installedLoading } =
    botSkillApi.list.useQuery(
      ['bot-skills', hostname],
      { params: { hostname } },
      { enabled: !!hostname, queryKey: ['bot-skills', hostname] },
    );

  const installedSkills = installedResponse?.body?.data || [];
  const installedSkillIds = new Set(installedSkills.map((s) => s.skillId));

  // 获取技能分类
  const { data: skillTypesResponse } = skillSyncApi.skillTypes.useQuery(
    ['skill-types'],
    {},
    { enabled: isAddDialogOpen, queryKey: ['skill-types'] },
  );
  const skillTypes = skillTypesResponse?.body?.data?.skillTypes || [];

  // 获取所有可用技能（带搜索和分类筛选）
  const skillListQuery = useMemo(
    () => ({
      limit: 100,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(selectedTypeId !== 'all' ? { skillTypeId: selectedTypeId } : {}),
    }),
    [debouncedSearch, selectedTypeId],
  );

  const { data: availableResponse, isLoading: availableLoading } =
    skillApi.list.useQuery(
      ['skills-available', skillListQuery],
      { query: skillListQuery },
      {
        enabled: isAddDialogOpen,
        queryKey: ['skills-available', skillListQuery],
      },
    );

  const availableSkills = (availableResponse?.body?.data?.list || []).filter(
    (s) => !installedSkillIds.has(s.id),
  );

  // 安装技能（带同步进度反馈）
  const handleInstall = async (skillId: string) => {
    setInstallingSkillId(skillId);
    try {
      const response = await botSkillApi.install.mutation({
        params: { hostname },
        body: { skillId },
      });
      if (response.status === 200) {
        toast.success(t('installSuccess'));
        queryClient.invalidateQueries({ queryKey: ['bot-skills', hostname] });
        setIsAddDialogOpen(false);
        setPreviewSkill(null);
      } else if (response.status === 409) {
        toast.warning(t('alreadyInstalled'));
        queryClient.invalidateQueries({ queryKey: ['bot-skills', hostname] });
      } else {
        toast.error(t('installFailed'));
      }
    } catch {
      toast.error(t('installFailed'));
    } finally {
      setInstallingSkillId(null);
    }
  };

  // 切换技能启用状态
  const handleToggle = async (skillId: string, enabled: boolean) => {
    try {
      const response = await botSkillApi.updateConfig.mutation({
        params: { hostname, skillId },
        body: { isEnabled: enabled },
      });
      if (response.status === 200) {
        toast.success(enabled ? t('enabled') : t('disabled'));
        queryClient.invalidateQueries({ queryKey: ['bot-skills', hostname] });
      }
    } catch (error) {
      toast.error(t('operationFailed'));
    }
  };

  // 卸载技能（带二次确认）
  const handleUninstall = async (skillId: string) => {
    setIsUninstalling(true);
    try {
      const response = await botSkillApi.uninstall.mutation({
        params: { hostname, skillId },
        body: {},
      });
      if (response.status === 200) {
        toast.success(t('uninstallSuccess'));
        queryClient.invalidateQueries({ queryKey: ['bot-skills', hostname] });
      }
    } catch (error) {
      toast.error(t('uninstallFailed'));
    } finally {
      setIsUninstalling(false);
      setUninstallTarget(null);
    }
  };

  // 重置对话框状态
  const handleDialogOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setSearchQuery('');
      setSelectedTypeId('all');
      setPreviewSkill(null);
    }
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
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground text-sm">{hostname}</p>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('addSkill')}
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col gap-0 p-0">
            <div className="border-b px-6 pt-6 pb-4">
              <DialogHeader>
                <DialogTitle>{t('addSkill')}</DialogTitle>
                <DialogDescription>
                  {t('addSkillDescription')}
                </DialogDescription>
              </DialogHeader>
              {!previewSkill && (
                <div className="mt-4 space-y-3">
                  {/* 搜索框 */}
                  <div className="relative">
                    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder={t('searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {/* 分类筛选 */}
                  {skillTypes.length > 0 && (
                    <Tabs
                      value={selectedTypeId}
                      onValueChange={setSelectedTypeId}
                    >
                      <TabsList className="flex w-full justify-start overflow-x-auto">
                        <TabsTrigger value="all" className="shrink-0">
                          {t('allTypes')}
                        </TabsTrigger>
                        {skillTypes.map((type) => (
                          <TabsTrigger
                            key={type.id}
                            value={type.id}
                            className="shrink-0"
                          >
                            {type.icon && (
                              <span className="mr-1">{type.icon}</span>
                            )}
                            {getName(type)}
                            <Badge
                              variant="secondary"
                              className="ml-1 h-5 px-1 text-xs"
                            >
                              {type._count.skills}
                            </Badge>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {previewSkill ? (
                <SkillDetailPreview
                  skill={previewSkill}
                  onBack={() => setPreviewSkill(null)}
                  onInstall={handleInstall}
                  isInstalling={installingSkillId === previewSkill.id}
                  t={t}
                />
              ) : availableLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <SkillCardSkeleton key={i} />
                  ))}
                </div>
              ) : availableSkills.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Wrench className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>
                    {searchQuery || selectedTypeId !== 'all'
                      ? t('noSearchResults')
                      : t('noAvailableSkills')}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {availableSkills.map((skill) => (
                    <AvailableSkillCard
                      key={skill.id}
                      skill={skill}
                      onInstall={handleInstall}
                      onPreview={setPreviewSkill}
                      isInstalling={installingSkillId === skill.id}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 已安装技能列表 */}
      {installedLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkillCardSkeleton key={i} />
          ))}
        </div>
      ) : installedSkills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="text-muted-foreground mb-4">
              {t('noInstalledSkills')}
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addFirstSkill')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {installedSkills.map((botSkill) => (
            <InstalledSkillCard
              key={botSkill.id}
              botSkill={botSkill}
              onToggle={handleToggle}
              onRequestUninstall={(skillId, name) =>
                setUninstallTarget({ skillId, name })
              }
              t={t}
            />
          ))}
        </div>
      )}

      {/* 卸载确认对话框 */}
      <Dialog
        open={!!uninstallTarget}
        onOpenChange={(open) =>
          !open && !isUninstalling && setUninstallTarget(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('uninstallConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('uninstallConfirmDescription')}
              {uninstallTarget?.name && (
                <span className="text-foreground mt-1 block font-medium">
                  {uninstallTarget.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUninstallTarget(null)}
              disabled={isUninstalling}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                uninstallTarget && handleUninstall(uninstallTarget.skillId)
              }
              disabled={isUninstalling}
            >
              {isUninstalling ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              {t('uninstallConfirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
