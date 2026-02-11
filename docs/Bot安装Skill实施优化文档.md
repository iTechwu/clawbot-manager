# Bot 安装 Skill 实施优化文档

## 1. 当前实现状态

### 已完成

| 模块 | 状态 | 文件 |
|------|------|------|
| API 契约 (skill + botSkill) | ✅ | `packages/contracts/src/api/skill.contract.ts` |
| 前端 API 客户端 | ✅ | `apps/web/lib/api/contracts/client.ts` |
| 后端 Controller | ✅ | `apps/api/src/modules/skill-api/skill-api.controller.ts` |
| 后端 Service | ✅ | `apps/api/src/modules/skill-api/skill-api.service.ts` |
| 后端 Module 注册 | ✅ | `apps/api/src/modules/skill-api/skill-api.module.ts` |
| DB Service 层 | ✅ | `apps/api/generated/db/modules/bot-skill/` |
| 前端技能管理页面 | ✅ | `apps/web/app/[locale]/(main)/bots/[hostname]/skills/page.tsx` |
| 前端导航入口 | ✅ | `apps/web/lib/config/bot-nav.ts` |
| 国际化 (zh-CN / en) | ✅ | `apps/web/locales/*/botSkills.json` |
| OpenClaw SKILL.md 同步 | ✅ | `apps/api/libs/infra/clients/internal/openclaw/openclaw-skill-sync.client.ts` |
| 技能同步定时任务 | ✅ | `apps/api/src/modules/skill-sync/skill-sync.service.ts` |

### 核心流程可用性

基础的安装、卸载、启用/禁用流程已全部打通，前后端联调可用。

---

## 2. 优化问题清单（实施状态标注）

### P0 — 必须修复（影响功能正确性）

#### 2.1 重复安装未做前置检查 ✅ 已完成

**实现位置**: `skill-api.service.ts:321-328`

```typescript
const existing = await this.botSkillService.get({
  botId: bot.id,
  skillId: data.skillId,
});
if (existing) {
  throw new ConflictException('该技能已安装');
}
```

#### 2.2 YAML 解析器不够健壮 ✅ 已完成

**实现位置**: `openclaw-skill-sync.client.ts:17,504-515`

- 引入 `js-yaml` 替代手写 `parseSimpleYaml`
- `yaml.load()` + try/catch 降级为空对象
- 已删除旧的 `parseSimpleYaml` 和 `parseYamlValue` 方法

---

### P1 — 重要优化（影响用户体验）

#### 2.3 安装对话框搜索和分类筛选 ✅ 已完成

**实现位置**: `skills/page.tsx:350-351,370-395,504-538`

- `searchQuery` + `selectedTypeId` 状态
- `skillSyncApi.skillTypes.useQuery` 获取分类列表
- `useMemo` 构建 `skillListQuery`，传入 `search` 和 `skillTypeId`
- 搜索框带 Search 图标，分类 Tab 带技能数量 Badge

#### 2.4 卸载操作二次确认 ✅ 已完成

**实现位置**: `skills/page.tsx:353-356,612-638`

- 使用 `Dialog` + `DialogFooter` 实现确认弹窗（因 `AlertDialog` 未在 `@repo/ui` 中导出）
- `uninstallTarget` 状态管理，destructive 按钮样式

#### 2.5 安装时同步进度反馈 ✅ 已完成

**实现位置**: `skills/page.tsx:207-217,321-331`

- `Loader2` 旋转动画 + `installing` 文案
- 在 `AvailableSkillCard` 和 `SkillDetailPreview` 中均有实现

#### 2.6 技能详情预览 ✅ 已完成

**实现位置**: `skills/page.tsx:249-335`

- `SkillDetailPreview` 组件：图标、名称、描述、版本、作者、来源、分类 Badge
- 点击卡片进入预览，返回列表按钮
- 预览页面也可直接安装

---

## 3. 深度代码审查发现的问题

### 🔴 Bug 级别

#### 3.1 已安装技能缺少 skillType 关联查询

**位置**: `skill-api.service.ts:277-292`

`getBotSkills` 方法中 `select: { skill: true }` 只加载 Skill 的标量字段，不会自动加载嵌套的 `skillType` 关联。导致已安装技能卡片上的分类 Badge 始终为空。

```typescript
// 当前代码（有问题）
select: {
  ...
  skill: true,  // ❌ 不会加载 skill.skillType
}

// 应改为
select: {
  ...
  skill: {
    include: {
      skillType: true,  // ✅ 显式加载 skillType
    },
  },
}
```

#### 3.2 前端未区分 409 Conflict 错误

**位置**: `skills/page.tsx:415-416`

`handleInstall` 的 catch 块对所有错误统一显示 `installFailed`。当后端返回 409（技能已安装）时，应显示 `alreadyInstalled` 提示而非通用错误。

```typescript
// 当前代码
} catch (error) {
  toast.error(t('installFailed'));  // ❌ 所有错误一视同仁
}

// 建议
} catch (error: any) {
  if (error?.status === 409) {
    toast.warning(t('alreadyInstalled'));
    queryClient.invalidateQueries({ queryKey: ['bot-skills', hostname] });
  } else {
    toast.error(t('installFailed'));
  }
}
```

#### 3.3 后端搜索未覆盖中文字段

**位置**: `skill-api.service.ts:78-87`

搜索只匹配 `name` 和 `description`，未匹配 `nameZh` 和 `descriptionZh`。中文用户搜索中文名称时无结果。

```typescript
// 当前代码
OR: [
  { name: { contains: search, mode: 'insensitive' } },
  { description: { contains: search, mode: 'insensitive' } },
]

// 应改为
OR: [
  { name: { contains: search, mode: 'insensitive' } },
  { nameZh: { contains: search, mode: 'insensitive' } },
  { description: { contains: search, mode: 'insensitive' } },
  { descriptionZh: { contains: search, mode: 'insensitive' } },
]
```

### 🟡 体验问题

#### 3.4 搜索无防抖

**位置**: `skills/page.tsx:510`

每次按键都触发 `setSearchQuery` → `useMemo` 重算 → `useQuery` 重新请求。快速输入时会产生大量无效 API 调用。

**建议**: 添加 300ms 防抖，可用 `useDeferredValue` 或自定义 `useDebounce` hook。

#### 3.5 卸载确认未显示技能名称

**位置**: `skills/page.tsx:619-622`

`uninstallTarget.name` 已存储但未在确认弹窗中使用。用户看到的是通用文案，不知道要卸载哪个技能。

**建议**: 在 `DialogDescription` 中插入技能名称：
```
确定要卸载「{uninstallTarget.name}」吗？
```

#### 3.6 InstalledSkillCard 的 hostname prop 未使用

**位置**: `skills/page.tsx:65,71`

`hostname` 作为 prop 传入但组件内部从未引用。应移除以保持接口干净。

#### 3.7 安装对话框仍硬编码 limit: 100

**位置**: `skills/page.tsx:380`

虽然添加了搜索和筛选，但仍一次性加载 100 条。当技能库增长到 500+ 时，应改为分页加载或无限滚动。

#### 3.8 卸载操作无 loading 状态

**位置**: `skills/page.tsx:438-454`

卸载 API 调用期间，确认按钮没有 loading 状态，用户可能重复点击。

---

## 4. 进一步 UI 优化建议

### P1.5 — 应尽快修复

| # | 优化项 | 说明 | 涉及文件 |
|---|--------|------|----------|
| 4.1 | 搜索防抖 | 添加 300ms 防抖减少 API 调用 | `skills/page.tsx` |
| 4.2 | 卸载确认显示技能名 | 在确认弹窗中显示要卸载的技能名称 | `skills/page.tsx` |
| 4.3 | 修复 skillType 关联 | `getBotSkills` 显式 include skillType | `skill-api.service.ts` |
| 4.4 | 搜索覆盖中文字段 | 添加 nameZh/descriptionZh 到搜索条件 | `skill-api.service.ts` |
| 4.5 | 409 错误区分处理 | 前端区分 Conflict 和其他错误 | `skills/page.tsx` |

### P2 — 可选优化（提升体验）

| # | 优化项 | 说明 | 涉及文件 |
|---|--------|------|----------|
| 4.6 | 已安装技能搜索 | 列表上方添加搜索框 | `skills/page.tsx` |
| 4.7 | 分页/无限滚动 | 替换 limit:100 为分页加载 | `skills/page.tsx` |
| 4.8 | 批量安装 | 多选 + 批量安装 API | `skill.contract.ts` + `skill-api.service.ts` |
| 4.9 | 技能配置面板 | 根据 definition.frontmatter 动态生成配置表单 | `skills/page.tsx` |
| 4.10 | GitHub 请求代理 | HTTP 代理 / GitHub API + Token / 本地缓存 | `openclaw-skill-sync.client.ts` |
| 4.11 | 卸载 loading 状态 | 确认按钮显示 loading | `skills/page.tsx` |
| 4.12 | 移除未使用 prop | InstalledSkillCard 移除 hostname | `skills/page.tsx` |
| 4.13 | 排序选项 | 支持按名称、日期、热度排序 | `skills/page.tsx` |
| 4.14 | GitHub 链接 | 详情预览中添加 GitHub 源链接 | `skills/page.tsx` |
| 4.15 | 技能标签展示 | 详情预览中展示 definition.tags | `skills/page.tsx` |

---

## 5. 关键文件索引

| 文件 | 修改类型 | 阶段 | 状态 |
|------|---------|------|------|
| `apps/api/src/modules/skill-api/skill-api.service.ts` | 修改 | P0 | ✅ 已完成 |
| `apps/api/libs/infra/clients/internal/openclaw/openclaw-skill-sync.client.ts` | 修改 | P0 | ✅ 已完成 |
| `apps/api/package.json` | 修改 | P0 | ✅ 已完成 |
| `apps/web/app/[locale]/(main)/bots/[hostname]/skills/page.tsx` | 修改 | P1 | ✅ 已完成 |
| `apps/web/locales/zh-CN/botSkills.json` | 修改 | P1 | ✅ 已完成 |
| `apps/web/locales/en/botSkills.json` | 修改 | P1 | ✅ 已完成 |
| `packages/contracts/src/api/skill.contract.ts` | 不变 | — | — |
| `packages/contracts/src/schemas/skill.schema.ts` | 不变 | — | — |
