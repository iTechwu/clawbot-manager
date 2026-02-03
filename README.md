# ClawBotManager

> AI Bot 全生命周期管理与 API 密钥编排平台，解决多 Bot、多提供商场景下的密钥安全、请求代理与运维难题。

## 📌 项目定位

### 用途与目标

ClawBotManager 面向**需要部署和管理多个 AI Bot** 的团队与开发者，提供：

- **Bot 生命周期管理**：创建、启动、停止、删除，基于 Docker 容器化运行
- **API 密钥安全编排**：加密存储、标签路由、Round-robin 负载均衡
- **统一 AI 请求代理**：单入口对接多 AI 提供商，按 Bot Token 鉴权
- **多租户隔离**：按用户划分 Bot 与密钥，支持团队协作

### 解决的问题

| 痛点                                                 | 方案                                                 |
| ---------------------------------------------------- | ---------------------------------------------------- |
| 多 Bot 场景下 API Key 分散、易泄露                   | 集中加密存储（AES-256-GCM），统一通过 Bot Token 访问 |
| 多 AI 提供商（OpenAI、Anthropic、Google 等）接入复杂 | 统一 `/v1/:vendor/*` 代理，自动认证与转发            |
| Bot 与密钥的映射、配额、故障切换                     | Provider Key 标签路由 + Round-robin 轮询             |
| 容器与数据库状态不一致                               | reconcile 对账、孤立资源检测与清理                   |

### 目标用户

- 需要运行多个 AI Bot 的产品/研发团队
- 希望统一管理 OpenAI、Anthropic、DeepSeek 等 API 密钥的开发者
- 需要 Bot 与 API 调用审计、使用日志的运营方

---

## 🧩 项目阶段

**当前阶段：MVP / 早期可用**

- ✅ 核心能力：Bot CRUD、Provider Key 管理、AI 代理、Docker 容器编排
- ✅ 基础设施：用户认证、多登录方式、文件上传、短信、国际化
- ⏳ 持续迭代：诊断能力、监控告警、高级路由策略
- ⚠️ 生产部署前需自行评估：密钥备份、高可用、资源限流等

---

## 🏗️ 架构设计

### 设计原则

1. **分层架构**：API 层 → Service 层 → DB 层 / Client 层，严格禁止跨层访问
2. **Zod-first**：所有 API 请求/响应通过 Zod Schema 校验，类型安全
3. **契约驱动**：ts-rest 定义前后端契约，编译时类型 + 运行时校验
4. **infra / domain 边界**：infra 不依赖 domain，domain 可依赖 infra，便于复用与测试
5. **密钥零明文**：API 密钥 AES-256-GCM 加密存储，仅运行时解密

### 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            ClawBotManager                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Web (Next.js 16)          │  API (NestJS 11 + Fastify)                 │
│  - Bot 管理 / 创建向导      │  - Bot API（CRUD、生命周期）                 │
│  - Provider Key 管理       │  - Proxy（/v1/:vendor/* 代理）              │
│  - 诊断与运维               │  - Sign / SMS / Uploader                    │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
            │  PostgreSQL   │   │  Redis        │   │  Docker       │
            │  Prisma ORM   │   │  BullMQ       │   │  Bot 容器      │
            └───────────────┘   └───────────────┘   └───────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
            ┌───────────────────┐                   ┌───────────────────┐
            │  OpenAI           │                   │  Anthropic        │
            │  DeepSeek / Groq  │   ...             │  Google / Venice  │
            └───────────────────┘                   └───────────────────┘
```

### 数据流（简化）

1. **创建 Bot**：用户填写配置 → 分配端口 → 创建 Workspace（config.json、soul.md、features.json）→ 启动 Docker 容器 → 写入 DB，生成 Gateway Token
2. **代理请求**：客户端带 `Authorization: Bearer <gateway_token>` 访问 `/api/v1/openai/...` → 校验 Token → 选择 Provider Key（标签 + Round-robin）→ 解密密钥 → 转发至上游 API → 记录 BotUsageLog
3. **密钥管理**：用户添加 Provider Key → AES-256-GCM 加密 → 写入 ProviderKey 表，支持 tag、baseUrl 等

### 目录结构

```
clawbotmanager/
├── apps/
│   ├── web/                    # Next.js 16 前端
│   │   ├── app/[locale]/       # 路由（auth、main、bots、diagnostics）
│   │   ├── components/         # 通用组件
│   │   ├── hooks/              # React Hooks
│   │   └── lib/                # API 客户端、配置
│   │
│   └── api/                    # NestJS 11 后端
│       ├── src/modules/        # 功能模块
│       │   ├── bot-api/        # Bot CRUD、Provider Key、Docker、Workspace
│       │   ├── proxy/          # AI 请求代理、Keyring、Upstream
│       │   ├── sign-api/       # 登录注册
│       │   ├── sms-api/        # 短信
│       │   └── uploader/       # 文件上传
│       ├── libs/
│       │   ├── infra/          # 基础设施（prisma、redis、jwt、clients…）
│       │   └── domain/         # 领域（auth、db）
│       └── prisma/             # Schema、迁移
│
├── packages/                   # 共享包
│   ├── contracts/              # ts-rest 契约 + Zod Schema
│   ├── ui/                     # shadcn/ui 组件
│   ├── utils/                  # 工具函数
│   ├── validators/             # Zod 校验
│   ├── constants/              # 常量
│   ├── types/                  # 类型定义
│   └── config/                 # ESLint、Prettier、TS 配置
│
└── scripts/                    # 初始化与运维脚本
```

### 支持的 AI 提供商

| Vendor      | 说明                 |
| ----------- | -------------------- |
| `openai`    | OpenAI API           |
| `anthropic` | Anthropic Claude     |
| `google`    | Google Generative AI |
| `deepseek`  | DeepSeek API         |
| `groq`      | Groq API             |
| `venice`    | Venice AI            |

---

## ✨ 核心能力

- **Bot 生命周期**：创建、启动、停止、删除，Docker 容器 + 工作区（config.json、soul.md、features.json）
- **Provider Key 管理**：加密存储、标签路由、Round-robin、自定义 baseUrl
- **AI 请求代理**：`/v1/:vendor/*` 统一入口，Bot Token 鉴权，流式响应
- **诊断与运维**：容器统计、孤立资源检测与清理
- **多租户**：按用户隔离 Bot 与 Key，JWT 认证

---

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 18
- pnpm >= 9
- PostgreSQL、Redis、RabbitMQ
- Docker（用于 Bot 容器）

### 2. 安装依赖

```bash
pnpm install
```

### 3. 初始化密钥（首次必做）

```bash
./scripts/init-env-secrets.sh
```

会生成 `BOT_MASTER_KEY`、`PROXY_ADMIN_TOKEN`，写入 `secrets/` 与 `apps/api/.env`。

### 4. 配置环境变量

**后端** `apps/api/.env`：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/clawbotmanager?schema=public
READ_DATABASE_URL=postgresql://user:password@localhost:5432/clawbotmanager?schema=public
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
BOT_MASTER_KEY=<generated>
PROXY_ADMIN_TOKEN=<generated>
```

**前端** `apps/web/.env.local`：

```env
NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:3100
```

### 5. 数据库

```bash
pnpm db:generate
pnpm db:migrate:dev
# 在项目根目录用户将默认数据写入到数据库
pnpm db:seed:api
```

### 6. 启动

```bash
pnpm dev          # 全量
pnpm dev:web      # 仅前端
pnpm dev:api      # 仅后端
```

- 前端：<http://localhost:3000>
- 后端 API：<http://localhost:3100/api>

---

## 🐳 Docker 部署

```bash
./scripts/start-botmaker.sh
```

依赖 `docker-compose.yml`，启动 ClawBotManager 与 `keyring-proxy` 等服务，健康检查通过后访问 `http://localhost:7100`。

---

## 📡 API 概览

### Bot（需 JWT）

| 方法   | 路径                       | 说明             |
| ------ | -------------------------- | ---------------- |
| GET    | `/api/bot`                 | 列出当前用户 Bot |
| POST   | `/api/bot`                 | 创建 Bot         |
| GET    | `/api/bot/:hostname`       | 获取单个 Bot     |
| POST   | `/api/bot/:hostname/start` | 启动             |
| POST   | `/api/bot/:hostname/stop`  | 停止             |
| DELETE | `/api/bot/:hostname`       | 删除             |
| GET    | `/api/bot/stats`           | 容器统计         |
| GET    | `/api/bot/admin/orphans`   | 孤立资源         |
| POST   | `/api/bot/admin/cleanup`   | 清理孤立资源     |

### Provider Key（需 JWT）

| 方法   | 路径                       | 说明          |
| ------ | -------------------------- | ------------- |
| GET    | `/api/provider-key`        | 列出 API Keys |
| POST   | `/api/provider-key`        | 添加 Key      |
| DELETE | `/api/provider-key/:id`    | 删除 Key      |
| GET    | `/api/provider-key/health` | 健康检查      |

### AI 代理（Bearer Bot Token）

| 方法 | 路径                | 说明                                         |
| ---- | ------------------- | -------------------------------------------- |
| ALL  | `/api/v1/:vendor/*` | 转发至对应 AI 提供商（openai、anthropic 等） |

更多示例见 `https/rest-client.http`。

---

## 📝 常用命令

```bash
pnpm dev              # 开发
pnpm build            # 构建
pnpm db:generate      # 生成 Prisma Client
pnpm db:migrate:dev   # 开发迁移
pnpm db:migrate:deploy # 生产迁移
pnpm db:push          # 推送 schema
pnpm lint             # Lint
pnpm type-check       # 类型检查
pnpm test             # 测试
```

---

## 🙏 致谢与项目缘起

### 致谢

我们由衷感谢 [BotMaker](https://github.com/jgarzik/botmaker) 这一优秀的开源项目。BotMaker 提出的零信任 API 密钥架构、keyring-proxy 设计理念以及容器化 Bot 管理思路，为本项目的设计与实现带来了重要启发和借鉴。

### 为何仍有 ClawBotManager

在开源 ClawBotManager 之前，我们已在内部团队也实施了类似的多用户、多团队 Bot 管理与 API 密钥编排系统。彼时我们发现了 BotMaker 项目，从中借鉴了许多思路与实现细节。

尽管 BotMaker 已能很好地解决同类问题，我们仍决定将 ClawBotManager 开源，主要出于以下考量：

1. **补充能力**：我在服务 [psylos1.com](https://psylos1.com) AI-Native化的过程中中沉淀了多租户、团队协作、Provider Key 标签路由与 Round-robin、Prisma + PostgreSQL 等企业级能力，希望为社区提供另一种技术选型与实现路径。
2. **回馈社区**：BotMaker 启发了我们的设计，我们希望通过开源自己的实现，将我们在多人多团队管理场景下的实践经验分享出去，给有类似需求的团队更多参考与帮助。
3. **共同推进**：AI Bot 管理与密钥编排仍是一个快速演进的领域，我们期待与 BotMaker 及更多开源项目一起，为社区提供更多选择与更完善的解决方案。

---

## 📂 文档与规范

- **架构与规范**：`CLAUDE.md`、`.cursorrules`
- **API 契约**：`packages/contracts/src/api/`
- **后端规范**：`apps/api/docs/`（如存在）
- **前端规范**：`apps/web/docs/`（如存在）

---

## 📄 License

MIT License
