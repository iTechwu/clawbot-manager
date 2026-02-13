# Skill 安装全面实施方案

## 1. 问题背景

### 1.1 当前状态

当前 UI 安装 Skill 的流程仅拉取 `SKILL.md` 文件并写入文件系统。但 GitHub 上的 Skill 目录结构远比单个文件复杂：

```
skills/{author}/{slug}/
├── SKILL.md          # 核心文件（必须）
├── _meta.json        # ClawHub 版本元数据
├── README.md         # 补充文档
├── references/       # 参考文档目录
├── scripts/          # 脚本（init.sh, validate.sh 等）
├── schema/           # JSON Schema 定义
├── examples/         # 示例文件
└── assets/           # 静态资源
```

通过对 GitHub `openclaw/skills` 仓库的抽样调查，常见的附加内容包括：

| 目录/文件     | 出现频率 | 用途                     |
| ------------- | -------- | ------------------------ |
| `_meta.json`  | 几乎所有 | 版本历史（ClawHub 管理） |
| `references/` | 高       | 参考文档、API 文档       |
| `scripts/`    | 中       | 初始化脚本、验证脚本     |
| `examples/`   | 中       | 使用示例                 |
| `schema/`     | 低       | 数据结构定义             |
| `assets/`     | 低       | 图片、模板等静态资源     |
| `README.md`   | 低       | 补充说明文档             |

### 1.2 核心问题

1. 只拉取 `SKILL.md`，缺少 `references/`、`scripts/` 等辅助文件，部分 Skill 功能不完整
2. `raw.githubusercontent.com` 在国内被屏蔽，GitHub 内容拉取需要 API fallback
3. 没有版本管理，无法检测 Skill 更新
4. 安装过程缺少进度反馈和错误提示

## 2. Skill 分类与安装策略

### 2.1 按内容复杂度分类

| 类型            | 目录内容                              | 安装策略                  | 占比（估算） |
| --------------- | ------------------------------------- | ------------------------- | ------------ |
| A. 纯文档型     | 仅 `SKILL.md` + `_meta.json`          | 拉取 SKILL.md 即可        | ~40%         |
| B. 带参考文档型 | + `references/`                       | 拉取整个目录              | ~35%         |
| C. 带脚本型     | + `scripts/`                          | 拉取目录 + 执行 init 脚本 | ~15%         |
| D. 完整包型     | + `schema/` + `examples/` + `assets/` | 拉取整个目录              | ~10%         |

### 2.2 安装策略决策

推荐采用「整目录拉取」策略：不区分类型，统一拉取 Skill 目录下的所有文件。

理由：

- 实现简单，一套逻辑覆盖所有场景
- 避免遗漏关键文件导致 Skill 功能不完整
- GitHub API 支持递归获取目录内容
- 额外文件体积通常很小（几 KB ~ 几十 KB）

## 3. 技术方案

### 3.1 GitHub 内容拉取

#### 3.1.1 目录内容获取

使用 GitHub Contents API 递归获取 Skill 目录：

```
GET https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}
```

响应格式（目录）：

```json
[
  { "name": "SKILL.md", "type": "file", "download_url": "...", "size": 1234 },
  { "name": "references", "type": "dir", "url": "..." },
  { "name": "_meta.json", "type": "file", "download_url": "...", "size": 456 }
]
```

#### 3.1.2 URL 转换

从 `sourceUrl` 提取目录路径：

```
sourceUrl: https://github.com/openclaw/skills/tree/main/skills/{author}/{slug}/SKILL.md
目录路径:  skills/{author}/{slug}
API URL:   https://api.github.com/repos/openclaw/skills/contents/skills/{author}/{slug}?ref=main
```

#### 3.1.3 Fallback 策略

```
1. 尝试 raw.githubusercontent.com（快，但国内可能被屏蔽）
2. Fallback 到 api.github.com（稳定，有 rate limit）
3. 如果配置了 GITHUB_PROXY_URL，优先使用代理
```

#### 3.1.4 Rate Limit 考虑

- 未认证：60 次/小时
- Token 认证：5000 次/小时
- 建议在 `.env` 中配置 `GITHUB_TOKEN` 以提高限额
- 每个 Skill 安装约消耗 1-5 次 API 调用（1 次目录列表 + N 次文件下载）

### 3.2 文件写入

#### 3.2.1 目录结构

```
${BOT_OPENCLAW_DIR}/{isolationKey}/skills/{skillSlug}/
├── SKILL.md
├── references/
│   └── api-docs.md
├── scripts/
│   └── init.sh
└── ...
```

容器内映射为：

```
/home/node/.openclaw/skills/{skillSlug}/
```

#### 3.2.2 文件过滤

安装时排除以下文件（不影响 Skill 运行）：

| 文件         | 排除原因                         |
| ------------ | -------------------------------- |
| `_meta.json` | ClawHub 平台元数据，非运行时需要 |

其余文件全部保留。

### 3.3 API 设计

#### 3.3.1 安装流程改造

```
installSkill(userId, hostname, data)
  ├── 1. 验证 Bot 和 Skill
  ├── 2. 检查重复安装
  ├── 3. 从 GitHub 拉取 Skill 目录
  │     ├── 3a. 获取目录文件列表
  │     ├── 3b. 并行下载所有文件
  │     └── 3c. 更新 DB definition.content（SKILL.md 内容）
  ├── 4. 创建 BotSkill 记录
  ├── 5. 写入所有文件到文件系统
  └── 6. 返回安装结果
```

#### 3.3.2 新增方法

**OpenClawSkillSyncClient**（Client 层）：

```typescript
/**
 * 获取 Skill 目录下的所有文件
 * @returns 文件列表 [{ path, content, size }]
 */
async fetchSkillDirectory(sourceUrl: string): Promise<SkillFile[]>

interface SkillFile {
  /** 相对于 skill 目录的路径，如 "SKILL.md" 或 "references/api.md" */
  relativePath: string;
  /** 文件内容（文本） */
  content: string;
  /** 文件大小（字节） */
  size: number;
}
```

**WorkspaceService**（Service 层）：

```typescript
/**
 * 写入 Skill 的所有文件到文件系统
 */
async writeSkillFiles(
  userId: string,
  hostname: string,
  skillDirName: string,
  files: SkillFile[],
): Promise<void>
```

### 3.4 版本管理

#### 3.4.1 版本检测

利用 `_meta.json` 中的版本信息：

```json
{
  "latest": {
    "version": "1.14.1",
    "publishedAt": 1770935725778
  }
}
```

对比 DB 中存储的 `Skill.version` 字段，判断是否有更新。

#### 3.4.2 更新流程

```
检测更新 → 提示用户 → 用户确认 → 重新拉取目录 → 覆盖写入 → 更新 DB 版本
```

### 3.5 错误处理

| 场景               | 处理方式                                    |
| ------------------ | ------------------------------------------- |
| GitHub 不可达      | 使用 API fallback，仍失败则提示用户检查网络 |
| Rate Limit 超限    | 提示用户配置 GITHUB_TOKEN                   |
| 单个文件下载失败   | 跳过非关键文件，SKILL.md 失败则整体失败     |
| 文件写入失败       | 回滚已写入文件，提示磁盘空间或权限问题      |
| 目录已存在（重装） | 清空目录后重新写入                          |

## 4. 前端交互设计

### 4.1 安装按钮状态

```
[安装] → [安装中...] → [已安装 ✓]
                     → [安装失败 ✗] → [重试]
```

### 4.2 安装进度（可选增强）

对于包含多个文件的 Skill，可显示进度：

```
正在安装 agent-identity-kit...
  ✓ SKILL.md
  ✓ schema/agent.schema.json
  ✓ scripts/init.sh
  ✓ examples/basic.md
安装完成 (4 个文件)
```

### 4.3 Skill 详情增强

在 Skill 卡片或详情页显示：

- 版本号（来自 frontmatter 或 \_meta.json）
- 包含的文件数量
- 是否有 scripts（提示可能需要初始化）
- 是否有 references（提示有参考文档）
- 最后更新时间

## 5. 实施步骤

### Phase 1：完善单文件安装（当前）

已完成：

- [x] SKILL.md 拉取和写入
- [x] GitHub API fallback（raw URL 被屏蔽时）
- [x] 安装时自动同步 SKILL.md
- [x] 卸载时清理文件
- [x] 页面加载时补写缺失的 SKILL.md

### Phase 2：整目录安装

目标：拉取 Skill 目录下的所有文件，而非仅 SKILL.md。

修改文件清单：

| 文件                            | 修改内容                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `openclaw-skill-sync.client.ts` | 新增 `fetchSkillDirectory()` 方法                                                          |
| `workspace.service.ts`          | 新增 `writeSkillFiles()` 方法，改造 `removeInstalledSkillMd()` 为 `removeInstalledSkill()` |
| `skill-api.service.ts`          | 改造 `installSkill()` 使用整目录安装                                                       |
| `skill.schema.ts`               | 新增 `SkillFile` 类型定义                                                                  |

关键实现：

```typescript
// openclaw-skill-sync.client.ts
async fetchSkillDirectory(sourceUrl: string): Promise<SkillFile[]> {
  // 1. 从 sourceUrl 提取目录路径
  const dirApiUrl = this.convertToDirApiUrl(sourceUrl);

  // 2. 获取目录文件列表
  const listing = await this.fetchDirListing(dirApiUrl);

  // 3. 并行下载所有文件（排除 _meta.json）
  const files = await Promise.all(
    listing
      .filter(item => item.type === 'file' && item.name !== '_meta.json')
      .map(item => this.fetchFileContent(item))
  );

  // 4. 递归处理子目录
  for (const dir of listing.filter(item => item.type === 'dir')) {
    const subFiles = await this.fetchSubDirectory(dir.url, dir.name);
    files.push(...subFiles);
  }

  return files;
}
```

### Phase 3：版本管理与更新

目标：检测 Skill 更新并支持一键升级。

修改文件清单：

| 文件                   | 修改内容                                      |
| ---------------------- | --------------------------------------------- |
| `skill.schema.ts`      | 新增 `SkillUpdateInfo` Schema                 |
| `skill.contract.ts`    | 新增 `checkUpdates` 端点                      |
| `skill-api.service.ts` | 新增 `checkSkillUpdates()` 和 `updateSkill()` |
| `skills/page.tsx`      | 显示更新提示和升级按钮                        |

### Phase 4：脚本执行支持（可选）

目标：对于包含 `scripts/init.sh` 的 Skill，安装后在容器内执行初始化脚本。

这需要通过 Docker exec 在容器内执行：

```bash
docker exec {containerId} bash /home/node/.openclaw/skills/{skillName}/scripts/init.sh
```

安全考虑：

- 需要用户明确授权
- 脚本执行结果需要展示给用户
- 考虑沙箱化执行

## 6. 安全考虑

### 6.1 文件内容安全

- 限制单个 Skill 目录总大小（建议 5MB 上限）
- 限制文件数量（建议 50 个文件上限）
- 过滤可执行文件（.exe, .sh 等）的自动执行
- 文件路径校验，防止路径穿越攻击（`../` 等）

### 6.2 GitHub API 安全

- Token 存储在环境变量，不暴露给前端
- Rate Limit 监控和告警
- 请求超时控制（60 秒）

### 6.3 容器安全

- Skill 文件以只读方式挂载（如果可能）
- 脚本执行需要用户授权
- 容器内 Skill 目录权限控制

## 7. 配置项

```env
# .env

# GitHub Token（提高 API rate limit 从 60 到 5000 次/小时）
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# GitHub 代理 URL（可选，用于加速 raw.githubusercontent.com）
GITHUB_PROXY_URL=https://ghproxy.com/https://raw.githubusercontent.com

# Skill 安装限制
SKILL_MAX_DIR_SIZE=5242880    # 单个 Skill 目录最大 5MB
SKILL_MAX_FILE_COUNT=50       # 单个 Skill 最多 50 个文件
```

## 8. 监控与日志

安装过程的关键日志点：

```
[INFO]  Skill install started: {skillId, skillSlug, hostname}
[INFO]  Fetching skill directory from GitHub: {sourceUrl, fileCount}
[INFO]  File downloaded: {relativePath, size}
[WARN]  Non-critical file download failed: {relativePath, error}
[ERROR] Critical file download failed: {relativePath, error}
[INFO]  Skill files written to filesystem: {skillDirName, fileCount, totalSize}
[INFO]  Skill install completed: {skillId, duration}
[ERROR] Skill install failed: {skillId, error, phase}
```
