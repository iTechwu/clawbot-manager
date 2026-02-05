'use client';

import { useState } from 'react';
import { pluginApi } from '@/lib/api/contracts/client';
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
} from '@repo/ui';
import {
  Search,
  Globe,
  Database,
  Code,
  MessageSquare,
  Wrench,
  Puzzle,
  FolderOpen,
} from 'lucide-react';
import type { PluginCategory } from '@repo/contracts';

/**
 * 分类图标映射
 */
const categoryIcons: Record<PluginCategory, React.ElementType> = {
  BROWSER: Globe,
  FILESYSTEM: FolderOpen,
  DATABASE: Database,
  API: Code,
  COMMUNICATION: MessageSquare,
  DEVELOPMENT: Wrench,
  CUSTOM: Puzzle,
};

/**
 * 分类标签映射
 */
const categoryLabels: Record<PluginCategory, string> = {
  BROWSER: '浏览器',
  FILESYSTEM: '文件系统',
  DATABASE: '数据库',
  API: 'API',
  COMMUNICATION: '通讯',
  DEVELOPMENT: '开发工具',
  CUSTOM: '自定义',
};

/**
 * 插件卡片组件
 */
function PluginCard({
  plugin,
}: {
  plugin: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    version: string;
    author: string | null;
    category: PluginCategory;
    isOfficial: boolean;
    iconEmoji: string | null;
    iconUrl: string | null;
  };
}) {
  const CategoryIcon = categoryIcons[plugin.category];

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {plugin.iconEmoji ? (
              <span className="text-2xl">{plugin.iconEmoji}</span>
            ) : plugin.iconUrl ? (
              <img
                src={plugin.iconUrl}
                alt={plugin.name}
                className="h-8 w-8 rounded"
              />
            ) : (
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
                <CategoryIcon className="h-4 w-4" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{plugin.name}</CardTitle>
              <CardDescription className="text-xs">
                v{plugin.version}
                {plugin.author && ` · ${plugin.author}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            {plugin.isOfficial && (
              <Badge variant="secondary" className="text-xs">
                官方
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {categoryLabels[plugin.category]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {plugin.description || '暂无描述'}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * 插件卡片骨架屏
 */
function PluginCardSkeleton() {
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
 * 插件市场页面
 */
export default function PluginsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PluginCategory | 'all'>('all');

  const { data: response, isLoading } = pluginApi.list.useQuery(
    ['plugins', { search, category }],
    {
      query: {
        search: search || undefined,
        category: category === 'all' ? undefined : category,
        limit: 50,
      },
    },
    {
      staleTime: 60000,
    },
  );

  const plugins = response?.body?.data?.list || [];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">插件市场</h1>
        <p className="text-muted-foreground text-sm">
          浏览和安装插件来扩展 Bot 的能力
        </p>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="搜索插件..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as PluginCategory | 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 插件列表 */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <PluginCardSkeleton key={i} />
          ))}
        </div>
      ) : plugins.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <Puzzle className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>暂无插件</p>
          {search && (
            <p className="mt-1 text-sm">
              尝试使用其他关键词搜索
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      )}
    </div>
  );
}
