# Bot Token 使用量统计系统实施文档

## 1. 系统概述

本文档描述了 ClawBot Manager 中 Bot Token 使用量统计系统的完整实现方案。该系统能够：

- **与 botId 绑定**：每条使用记录都关联到特定的 Bot
- **多模型支持**：统计 Bot 使用各种不同类型 AI 模型的用量
- **成本计算**：基于模型定价自动计算预估成本
- **配额管理**：支持日/月配额限制和预警通知

## 2. 系统架构

### 2.1 数据流架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Bot Container (OpenClaw)                          │
│                                    │                                        │
│                                    ▼                                        │
│                          ┌─────────────────┐                                │
│                          │   Proxy Token   │                                │
│                          └────────┬────────┘                                │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Proxy Service                                  │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐    │
│  │ KeyringProxy    │───▶│ UpstreamService  │───▶│ TokenExtractor      │    │
│  │ Service         │    │                  │    │ Service             │    │
│  └─────────────────┘    └──────────────────┘    └──────────┬──────────┘    │
│                                                             │               │
│                                                             ▼               │
│                                                  ┌─────────────────────┐    │
│                                                  │ ProxyService        │    │
│                                                  │ (logUsage)          │    │
│                                                  └──────────┬──────────┘    │
└─────────────────────────────────────────────────────────────┼───────────────┘
                                                              │
                                    ┌─────────────────────────┼─────────────────────────┐
                                    │                         │                         │
                                    ▼                         ▼                         ▼
                         ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
                         │ BotUsageLog     │      │ QuotaService    │      │ BotUsageAnalytics│
                         │ (Database)      │      │ (配额检查)       │      │ Service (分析)   │
                         └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 2.2 核心组件

| 组件 | 路径 | 职责 |
|------|------|------|
| **TokenExtractorService** | `apps/api/src/modules/proxy/services/token-extractor.service.ts` | 从 AI 响应中提取 Token 使用量 |
| **UpstreamService** | `apps/api/src/modules/proxy/services/upstream.service.ts` | 转发请求到 AI 提供商并收集响应 |
| **ProxyService** | `apps/api/src/modules/proxy/services/proxy.service.ts` | 代理业务逻辑，记录使用日志 |
| **QuotaService** | `apps/api/src/modules/proxy/services/quota.service.ts` | 配额检查和通知 |
| **BotUsageAnalyticsService** | `apps/api/src/modules/bot-api/services/bot-usage-analytics.service.ts` | 用量分析和统计 |
| **ModelPricingService** | `apps/api/generated/db/modules/model-pricing/model-pricing.service.ts` | 模型定价管理 |

## 3. 数据模型

### 3.1 BotUsageLog（使用日志）

```prisma
model BotUsageLog {
  id             String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  botId          String   @map("bot_id") @db.Uuid           // 关联的 Bot ID
  vendor         String   @db.VarChar(50)                   // AI 提供商
  providerKeyId  String?  @map("provider_key_id") @db.Uuid  // 使用的 API Key
  statusCode     Int?     @map("status_code")               // HTTP 状态码
  requestTokens  Int?     @map("request_tokens")            // 输入 Token 数
  responseTokens Int?     @map("response_tokens")           // 输出 Token 数
  model          String?  @db.VarChar(100)                  // AI 模型名称
  endpoint       String?  @db.VarChar(255)                  // API 端点路径
  durationMs     Int?     @map("duration_ms")               // 请求耗时（毫秒）
  errorMessage   String?  @map("error_message") @db.Text    // 错误信息
  createdAt      DateTime @default(now())                   // 创建时间

  bot         Bot          @relation(fields: [botId], references: [id], onDelete: Cascade)
  providerKey ProviderKey? @relation(fields: [providerKeyId], references: [id], onDelete: SetNull)

  @@index([botId])
  @@index([createdAt])
  @@index([vendor])
  @@index([botId, createdAt])
  @@index([botId, vendor, createdAt])
  @@index([model])
  @@map("b_usage_log")
}
```

### 3.2 ModelPricing（模型定价）

```prisma
model ModelPricing {
  id             String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  model          String   @unique @db.VarChar(100)          // 模型名称
  vendor         String   @db.VarChar(50)                   // 服务商标识
  inputPrice     Decimal  @map("input_price") @db.Decimal(10, 6)   // 输入价格（$/M tokens）
  outputPrice    Decimal  @map("output_price") @db.Decimal(10, 6)  // 输出价格（$/M tokens）
  displayName    String?  @map("display_name") @db.VarChar(255)    // 显示名称
  isEnabled      Boolean  @default(true) @map("is_enabled")        // 是否启用
  priceUpdatedAt DateTime @default(now()) @map("price_updated_at") // 价格更新时间
  notes          String?  @db.Text                                  // 备注

  @@index([vendor])
  @@index([model])
  @@map("b_model_pricing")
}
```

## 4. Token 提取机制

### 4.1 支持的 AI 提供商格式

| 提供商 | 响应格式 | 提取字段 |
|--------|----------|----------|
| **OpenAI** | `{ usage: { prompt_tokens, completion_tokens } }` | requestTokens, responseTokens |
| **Anthropic** | `{ usage: { input_tokens, output_tokens } }` | requestTokens, responseTokens |
| **Google** | `{ usageMetadata: { promptTokenCount, candidatesTokenCount } }` | requestTokens, responseTokens |
| **国内提供商** | 兼容 OpenAI 格式 | requestTokens, responseTokens |

### 4.2 流式响应处理

对于 SSE 流式响应，系统会：
1. 收集所有响应 chunk
2. 解析最后一个包含 `usage` 信息的 chunk
3. 提取 Token 使用量

```typescript
// TokenExtractorService.extractFromStreamResponse()
extractFromStreamResponse(vendor: string, fullResponse: string): TokenUsage {
  const lines = fullResponse.split('\n');
  let lastUsage: TokenUsage = { requestTokens: null, responseTokens: null };

  for (const line of lines) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const usage = this.extractFromStreamChunk(vendor, line);
      if (usage && (usage.requestTokens !== null || usage.responseTokens !== null)) {
        lastUsage = usage;
      }
    }
  }

  return lastUsage;
}
```

## 5. 使用日志记录

### 5.1 记录流程

```typescript
// ProxyService.handleProxyRequest()
async handleProxyRequest(params, rawResponse): Promise<ProxyResult> {
  // 1. 验证 Token
  const validation = await this.keyringProxyService.validateToken(botToken);

  // 2. 记录请求开始时间
  const startTime = Date.now();

  // 3. 转发请求到上游
  const { statusCode, tokenUsage } = await this.upstreamService.forwardToUpstream(
    req, rawResponse, vendor
  );

  // 4. 计算请求耗时
  const durationMs = Date.now() - startTime;

  // 5. 记录使用日志（包含 botId、token 使用量和耗时）
  await this.logUsage(botId, vendor, keyId, statusCode, path, tokenUsage, undefined, durationMs);

  // 6. 异步检查配额
  this.quotaService.checkAndNotify(botId).catch(err => {
    this.logger.error('Failed to check quota:', err);
  });

  return { success: true, statusCode };
}

// 日志记录方法
private async logUsage(
  botId: string,
  vendor: string,
  providerKeyId: string,
  statusCode: number | null,
  endpoint?: string,
  tokenUsage?: TokenUsage | null,
  errorMessage?: string,
  durationMs?: number,
): Promise<void> {
  await this.botUsageLogService.create({
    bot: { connect: { id: botId } },
    vendor,
    providerKey: { connect: { id: providerKeyId } },
    statusCode,
    endpoint: endpoint || null,
    model: tokenUsage?.model || null,
    requestTokens: tokenUsage?.requestTokens ?? null,
    responseTokens: tokenUsage?.responseTokens ?? null,
    errorMessage: errorMessage || null,
    durationMs: durationMs ?? null,
  });
}
```

## 6. 配额管理

### 6.1 配额配置

```typescript
const DEFAULT_QUOTA_LIMITS: QuotaLimits = {
  dailyTokenLimit: 100000,      // 日配额：10万 tokens
  monthlyTokenLimit: 3000000,   // 月配额：300万 tokens
  warningThreshold: 0.8,        // 预警阈值：80%
};
```

### 6.2 配额检查流程

```typescript
// QuotaService.checkAndNotify()
async checkAndNotify(botId: string): Promise<void> {
  const bot = await this.botService.getById(botId);
  const userId = bot.createdById;
  const botName = bot.name;

  // 获取日/月使用量
  const dailyUsage = await this.getDailyUsage(botId);
  const monthlyUsage = await this.getMonthlyUsage(botId);

  // 检查日配额
  if (dailyUsage >= dailyTokenLimit) {
    await this.sendQuotaExceededMessage(userId, botId, botName, 'daily', dailyUsage, dailyTokenLimit);
  } else if (dailyUsage >= dailyTokenLimit * warningThreshold) {
    await this.sendQuotaWarningMessage(userId, botId, botName, 'daily', dailyUsage, dailyTokenLimit);
  }

  // 检查月配额（类似逻辑）
  // ...
}
```

## 7. 用量分析 API

### 7.1 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/bot/:hostname/usage/stats` | GET | 获取用量统计 |
| `/bot/:hostname/usage/trend` | GET | 获取用量趋势 |
| `/bot/:hostname/usage/breakdown` | GET | 获取分组统计 |
| `/bot/:hostname/usage/logs` | GET | 获取用量日志列表 |

### 7.2 统计响应示例

```json
// GET /bot/my-bot/usage/stats?period=month
{
  "code": 0,
  "msg": "success",
  "data": {
    "totalTokens": 1250000,
    "requestTokens": 500000,
    "responseTokens": 750000,
    "requestCount": 5000,
    "successCount": 4950,
    "errorCount": 50,
    "errorRate": 1.0,
    "avgDurationMs": 1500,
    "estimatedCost": 12.50
  }
}
```

### 7.3 分组统计示例

```json
// GET /bot/my-bot/usage/breakdown?groupBy=model
{
  "code": 0,
  "msg": "success",
  "data": {
    "groups": [
      {
        "key": "gpt-4o",
        "requestTokens": 300000,
        "responseTokens": 450000,
        "requestCount": 3000,
        "percentage": 60.0,
        "estimatedCost": 7.50
      },
      {
        "key": "gpt-4o-mini",
        "requestTokens": 200000,
        "responseTokens": 300000,
        "requestCount": 2000,
        "percentage": 40.0,
        "estimatedCost": 0.21
      }
    ]
  }
}
```

## 8. 成本计算

### 8.1 定价数据来源

系统支持两种定价数据来源：

1. **数据库定价**（优先）：从 `ModelPricing` 表读取
2. **后备定价**：硬编码在 `BotUsageAnalyticsService` 中

### 8.2 成本计算公式

```typescript
// 成本 = (输入 tokens / 1M) × 输入价格 + (输出 tokens / 1M) × 输出价格
const inputCost = (requestTokens / 1_000_000) * pricing.input;
const outputCost = (responseTokens / 1_000_000) * pricing.output;
const totalCost = inputCost + outputCost;
```

### 8.3 定价缓存机制

```typescript
// BotUsageAnalyticsService
private pricingCache: Map<string, { input: number; output: number }> = new Map();
private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟缓存

async onModuleInit() {
  await this.refreshPricingCache();
}

async refreshPricingCache(): Promise<void> {
  const pricings = await this.modelPricingService.listAll();
  this.pricingCache.clear();

  for (const pricing of pricings) {
    this.pricingCache.set(pricing.model, {
      input: Number(pricing.inputPrice),
      output: Number(pricing.outputPrice),
    });
  }
}
```

## 9. 支持的 AI 模型定价

系统预置了 80+ 种 AI 模型的定价数据，包括：

| 提供商 | 模型示例 | 输入价格 ($/M) | 输出价格 ($/M) |
|--------|----------|----------------|----------------|
| OpenAI | gpt-4o | 2.5 | 10 |
| OpenAI | gpt-4o-mini | 0.15 | 0.6 |
| OpenAI | o1 | 15 | 60 |
| Anthropic | claude-3-5-sonnet | 3 | 15 |
| Anthropic | claude-3-haiku | 0.25 | 1.25 |
| DeepSeek | deepseek-chat | 0.14 | 0.28 |
| Google | gemini-1.5-pro | 1.25 | 5 |
| Groq | llama-3.3-70b | 0.59 | 0.79 |
| 智谱 AI | glm-4-plus | 0.7 | 0.7 |
| 月之暗面 | moonshot-v1-8k | 0.17 | 0.17 |
| 阿里云 | qwen-max | 2.8 | 8.4 |

完整定价数据见：`apps/api/scripts/model-pricing.data.ts`

## 10. 数据库索引优化

为了支持高效的用量查询，系统在 `BotUsageLog` 表上创建了以下索引：

```sql
-- 单字段索引
CREATE INDEX idx_usage_log_bot_id ON b_usage_log(bot_id);
CREATE INDEX idx_usage_log_created_at ON b_usage_log(created_at);
CREATE INDEX idx_usage_log_vendor ON b_usage_log(vendor);
CREATE INDEX idx_usage_log_model ON b_usage_log(model);

-- 复合索引（优化常见查询）
CREATE INDEX idx_usage_log_bot_created ON b_usage_log(bot_id, created_at);
CREATE INDEX idx_usage_log_bot_vendor_created ON b_usage_log(bot_id, vendor, created_at);
```

## 11. 使用示例

### 11.1 前端调用示例

```typescript
// 使用 ts-rest React Query hooks
import { tsRestClient } from '@repo/contracts';

// 获取用量统计
const { data: stats } = tsRestClient.botUsage.getStats.useQuery({
  queryKey: ['bot-usage-stats', hostname, period],
  queryData: {
    params: { hostname },
    query: { period: 'month' },
  },
});

// 获取用量趋势
const { data: trend } = tsRestClient.botUsage.getTrend.useQuery({
  queryKey: ['bot-usage-trend', hostname, startDate, endDate],
  queryData: {
    params: { hostname },
    query: {
      granularity: 'day',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    },
  },
});

// 获取模型分组统计
const { data: breakdown } = tsRestClient.botUsage.getBreakdown.useQuery({
  queryKey: ['bot-usage-breakdown', hostname],
  queryData: {
    params: { hostname },
    query: { groupBy: 'model' },
  },
});
```

### 11.2 显示用量统计

```tsx
function BotUsageStats({ hostname }: { hostname: string }) {
  const { data } = useBotUsageStats(hostname, 'month');

  if (!data) return <Loading />;

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        title="Total Tokens"
        value={data.totalTokens.toLocaleString()}
      />
      <StatCard
        title="Request Count"
        value={data.requestCount.toLocaleString()}
      />
      <StatCard
        title="Error Rate"
        value={`${data.errorRate}%`}
      />
      <StatCard
        title="Estimated Cost"
        value={`$${data.estimatedCost.toFixed(2)}`}
      />
    </div>
  );
}
```

## 12. 扩展建议

### 12.1 未来增强

1. **实时用量监控**：通过 WebSocket 推送实时用量数据
2. **用量预警规则**：支持自定义预警规则和通知渠道
3. **成本预算管理**：设置成本预算上限和自动暂停
4. **用量报表导出**：支持 CSV/Excel 格式导出
5. **多维度分析**：支持按时间、模型、渠道等多维度交叉分析

### 12.2 性能优化

1. **数据归档**：定期归档历史数据到冷存储
2. **预聚合**：使用物化视图预聚合常用统计
3. **分区表**：按时间分区 `BotUsageLog` 表
4. **缓存层**：使用 Redis 缓存热点统计数据

## 13. 总结

当前系统已经实现了完整的 Bot Token 使用量统计功能：

| 功能 | 状态 | 说明 |
|------|------|------|
| Token 提取 | ✅ 已实现 | 支持 OpenAI、Anthropic、Google 等多种格式 |
| 使用日志记录 | ✅ 已实现 | 每次 API 调用自动记录，关联 botId |
| 配额管理 | ✅ 已实现 | 支持日/月配额限制和预警通知 |
| 用量分析 API | ✅ 已实现 | 统计、趋势、分组、日志列表 |
| 成本计算 | ✅ 已实现 | 基于模型定价自动计算 |
| 模型定价管理 | ✅ 已实现 | 数据库存储，支持动态更新 |

所有功能都与 `botId` 绑定，能够完整统计每个 Bot 使用各种不同类型模型的用量和价格。
