# 图标使用指南

## 概述

本项目使用统一的图标系统，迁移自 Vue 项目的 `getSVGLogo` 系统。所有图标文件存储在 `public/icons/` 目录下。

## 使用方法

### 1. 使用 SVGIcon 组件（推荐）

```tsx
import { SVGIcon } from '@/lib/icons';

// 基本用法
<SVGIcon name="sidebar/更多" className="w-5 h-5" />

// 带尺寸
<SVGIcon name="knowledge-base/info-icon" width={20} height={20} />
```

### 2. 使用 getSVGIcon 函数（兼容 Vue 项目）

```tsx
import { getSVGIcon } from '@/lib/icons';

const MoreIcon = getSVGIcon('sidebar/更多');
<MoreIcon className="w-5 h-5" />
```

### 3. 图标路径规则

- 图标文件存储在 `public/icons/` 目录
- 支持嵌套目录结构，例如：`sidebar/更多.svg` -> `sidebar/更多`
- 图标名称不需要包含 `.svg` 扩展名

### 4. 常用图标映射

| Vue 项目名称 | Next.js 路径 | 说明 |
|------------|------------|------|
| `more` | `sidebar/更多` | 更多操作 |
| `iconGroup` | `knowledge-base/group` | 分组图标 |
| `infoCopy` | `agents/info-copy` | 复制信息 |
| `refresh` | `refresh` | 刷新 |
| `close` | `close` | 关闭 |
| `uploadImage` | `upload-image` | 上传图片 |
| `play` | `sidebar/播放` | 播放 |
| `edit` | `edit` | 编辑 |
| `delete` | `sidebar/删除` | 删除 |
| `forward` | `sidebar/转发` | 转发 |

### 5. 图标目录结构

```
public/icons/
├── sidebar/          # 侧边栏图标
├── agents/           # Agent 相关图标
├── material/         # 素材相关图标
├── editor/           # 编辑器图标
├── knowledge-base/   # 知识库图标
├── data-center/      # 数据中心图标
├── home/             # 首页图标
├── team/             # 团队图标
└── project/          # 项目图标
```

## 迁移说明

### 从 Vue 项目迁移

Vue 项目中使用：
```vue
<component :is="getSVGLogo('more')" />
```

Next.js 项目中改为：
```tsx
<SVGIcon name="sidebar/更多" />
```

### 图标路径查找

如果不知道图标的确切路径，可以：
1. 在 `public/icons/` 目录中搜索对应的 SVG 文件
2. 查看 `lib/icons.tsx` 中的 `ICON_PATH_MAP` 映射表
3. 使用文件搜索功能查找图标文件

## 注意事项

1. **图标文件格式**：所有图标必须是 SVG 格式
2. **路径大小写**：图标路径区分大小写
3. **错误处理**：如果图标加载失败，会在控制台输出警告
4. **性能优化**：图标文件会自动缓存，无需担心性能问题

## 添加新图标

1. 将 SVG 文件放入 `public/icons/` 目录（可以创建子目录）
2. 在代码中使用 `SVGIcon` 组件引用
3. 可选：在 `ICON_PATH_MAP` 中添加映射（用于简化名称）

