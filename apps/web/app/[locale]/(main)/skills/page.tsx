'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { skillApi } from '@/lib/api/contracts/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Label,
  Textarea,
} from '@repo/ui';
import {
  Search,
  Wrench,
  MessageSquare,
  GitBranch,
  Plus,
  Sparkles,
  User,
  Loader2,
} from 'lucide-react';
import type { SkillType, CreateSkillRequest } from '@repo/contracts';

/**
 * 技能类型图标映射
 */
const skillTypeIcons: Record<SkillType, React.ElementType> = {
  tool: Wrench,
  prompt: MessageSquare,
  workflow: GitBranch,
};

/**
 * 技能类型键列表
 */
const skillTypeKeys: SkillType[] = ['tool', 'prompt', 'workflow'];

/**
 * 技能卡片组件
 */
function SkillCard({
  skill,
  t,
}: {
  skill: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    version: string;
    skillType: SkillType;
    isSystem: boolean;
    isEnabled: boolean;
  };
  t: (key: string) => string;
}) {
  const TypeIcon = skillTypeIcons[skill.skillType];

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{skill.name}</CardTitle>
              <CardDescription className="text-xs">
                v{skill.version}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
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
            <Badge variant="outline" className="text-xs">
              {t(`types.${skill.skillType}`)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {skill.description || t('noDescription')}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * 技能卡片骨架屏
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
          <Skeleton className="h-5 w-12" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * 创建技能表单组件
 */
function CreateSkillForm({
  onSuccess,
  onCancel,
  t,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<CreateSkillRequest>>({
    name: '',
    slug: '',
    description: '',
    version: '1.0.0',
    skillType: 'tool',
    definition: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug || !formData.skillType) {
      toast.error(t('fillRequiredFields'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await skillApi.create.mutation({
        body: {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          version: formData.version || '1.0.0',
          skillType: formData.skillType,
          definition: formData.definition || {},
        },
      });

      if (response.status === 200) {
        toast.success(t('createSuccess'));
        queryClient.invalidateQueries({ queryKey: ['skills'] });
        onSuccess();
      } else {
        toast.error(t('createFailed'));
      }
    } catch {
      toast.error(t('createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('form.name')} *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">{t('form.slug')} *</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
          placeholder={t('form.slugPlaceholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="skillType">{t('form.type')} *</Label>
        <Select
          value={formData.skillType}
          onValueChange={(v) => setFormData((prev) => ({ ...prev, skillType: v as SkillType }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {skillTypeKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`types.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('form.description')}</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder={t('form.descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="version">{t('form.version')}</Label>
        <Input
          id="version"
          value={formData.version}
          onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
          placeholder="1.0.0"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('form.create')}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * 技能管理页面
 */
export default function SkillsPage() {
  const t = useTranslations('skills');
  const [search, setSearch] = useState('');
  const [skillType, setSkillType] = useState<SkillType | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'system' | 'custom'>(
    'all',
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: response, isLoading } = skillApi.list.useQuery(
    ['skills', { search, skillType, sourceFilter }],
    {
      query: {
        search: search || undefined,
        skillType: skillType === 'all' ? undefined : skillType,
        isSystem:
          sourceFilter === 'all'
            ? undefined
            : sourceFilter === 'system'
              ? true
              : false,
        limit: 50,
      },
    },
    {
      staleTime: 60000,
      queryKey: ['skills', { search, skillType, sourceFilter }],
    },
  );

  const skills = response?.body?.data?.list || [];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('createSkill')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createSkill')}</DialogTitle>
              <DialogDescription>
                {t('createSkillDescription')}
              </DialogDescription>
            </DialogHeader>
            <CreateSkillForm
              t={t}
              onSuccess={() => setIsCreateDialogOpen(false)}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* 来源切换 */}
      <Tabs
        value={sourceFilter}
        onValueChange={(v) =>
          setSourceFilter(v as 'all' | 'system' | 'custom')
        }
      >
        <TabsList>
          <TabsTrigger value="all">{t('allSkills')}</TabsTrigger>
          <TabsTrigger value="system">{t('systemSkills')}</TabsTrigger>
          <TabsTrigger value="custom">{t('customSkills')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={skillType}
          onValueChange={(v) => setSkillType(v as SkillType | 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            {skillTypeKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`types.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 技能列表 */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkillCardSkeleton key={i} />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <Wrench className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>{t('noSkills')}</p>
          {search && <p className="mt-1 text-sm">{t('tryOtherKeywords')}</p>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
