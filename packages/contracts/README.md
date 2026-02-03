# @repo/contracts - API 契约

使用 ts-rest 实现的前后端类型安全 API 契约。

## 安装

```json
{
  "dependencies": {
    "@repo/contracts": "workspace:*"
  }
}
```

## 使用

### 前端使用

```typescript
import { teamContract } from '@repo/contracts/api';
import { initClient } from '@ts-rest/core';

const client = initClient(teamContract, {
  baseUrl: '/api',
});

const { data } = await client.getInfo({ params: { teamId: '123' } });
```

### 后端使用

```typescript
import { teamContract } from '@repo/contracts/api';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { success } from '@/common/ts-rest';

@Controller()
export class TeamController {
  @TsRestHandler(teamContract.getInfo)
  async getInfo() {
    return tsRestHandler(teamContract.getInfo, async ({ params }) => {
      const team = await this.teamService.getInfo(params.teamId);
      return success(team);
    });
  }
}
```

## 错误码系统

错误码按业务域组织，从 `@repo/contracts/errors` 导出。

### 错误码域

| 域      | 前缀    | 导入               |
| ------- | ------- | ------------------ |
| Team    | 1xx     | `TeamErrorCode`    |
| User    | 2xx     | `UserErrorCode`    |
| Space   | 3xx     | `SpaceErrorCode`   |
| Folder  | 4xx     | `FolderErrorCode`  |
| File    | 5xx     | `FileErrorCode`    |
| Comment | 56x-57x | `CommentErrorCode` |
| Payment | 7xx     | `PaymentErrorCode` |
| Common  | 9xx     | `CommonErrorCode`  |

### 后端错误处理

```typescript
import { TeamErrorCode, apiError } from '@repo/contracts/errors';
import { ApiExceptionV2 } from '@/filter/exception/api-exception-v2';

// 简单错误
throw apiError(TeamErrorCode.TeamNotFound);

// 带数据的错误
throw apiError(TeamErrorCode.TeamNotFound, { teamId: '123' });

// 直接使用 ApiExceptionV2
throw ApiExceptionV2.fromCode(TeamErrorCode.TeamNotFound);
```

### 前端错误处理

```typescript
import {
  TeamErrorCode,
  handleApiError,
  createErrorHandler,
} from '@repo/contracts/errors';

// 创建类型安全的错误处理器
const teamErrorHandler = createErrorHandler({
  [TeamErrorCode.TeamNotFound]: {
    message: '团队不存在',
    action: () => router.push('/teams'),
  },
  [TeamErrorCode.TeamOpNoPermission]: {
    message: '您没有权限执行此操作',
  },
});

// 处理 API 响应
const handleTeamError = (errorCode: number) => {
  const result = teamErrorHandler(errorCode);
  if (result) {
    toast.error(result.message);
    result.action?.();
  }
};
```

### 契约中的类型化错误响应

```typescript
import { TeamErrorCode } from '../errors/domains/team.errors';
import { createTypedErrorResponse } from '../errors/error-response';

export const teamContract = c.router({
  getInfo: {
    method: 'GET',
    path: '/:teamId',
    responses: {
      200: createApiResponse(TeamInfoSchema),
      400: createTypedErrorResponse([
        TeamErrorCode.TeamNotFound,
        TeamErrorCode.TeamMemberViewNoPermission,
      ] as const),
    },
  },
});
```

### 验证 Schema

```typescript
import { TeamNameSchema, PaginationQuerySchema } from '@repo/contracts/schemas';

// 在表单中使用
const teamForm = useForm({
  resolver: zodResolver(
    z.object({
      name: TeamNameSchema,
    }),
  ),
});

// 在 API 查询中使用
const query = PaginationQuerySchema.parse(searchParams);
```

## 目录结构

```
src/
├── api/                    # API 契约
│   ├── team.contract.ts
│   ├── user.contract.ts
│   ├── space.contract.ts
│   └── index.ts
├── errors/                 # 错误码系统
│   ├── domains/            # 域错误定义
│   │   ├── team.errors.ts
│   │   ├── user.errors.ts
│   │   └── ...
│   ├── codes.ts            # 统一错误码
│   ├── error-response.ts   # 类型化错误响应辅助函数
│   └── index.ts
├── schemas/                # Zod Schema
│   ├── team.schema.ts
│   ├── user.schema.ts
│   └── ...
├── base.ts                 # 基础 Schema (createApiResponse 等)
└── index.ts                # 主导出
```

## 构建

```bash
pnpm --filter @repo/contracts build
```

## 迁移

从旧错误系统迁移请参阅：

- [错误系统迁移指南](./ERROR-MIGRATION.md) - 从旧系统迁移到新系统的指南
- [错误码管理优化方案](./错误码管理方案.md) - 错误码枚举字符串化优化方案及实施情况

### 错误码系统状态

✅ **已完成**：

- 所有错误码已迁移到 `@packages/contracts/src/errors`
- 错误码枚举已改为字符串格式（避免打包类型问题）
- i18n 错误消息已迁移到 `errors.json`
- 过期文件已清理

✅ **已完成**：

- 所有文件已迁移到新系统或桥接文件
- `code.enum.ts` 已无任何直接引用（可安全删除）

📊 **实施进度**：**100%** ✅
