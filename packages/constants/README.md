# @repo/constants - 共享常量

前后端共享的常量定义。

## 安装

```json
{
  "dependencies": {
    "@repo/constants": "workspace:*"
  }
}
```

## 使用

### 前端

```typescript
import { HTTP_STATUS, ERROR_CODES, LIMITS } from '@repo/constants';
```

### 后端

```typescript
import { HTTP_STATUS, ERROR_CODES, LIMITS } from '@repo/constants';
```

## 常量类型

### HTTP 状态

```typescript
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;
```

### 错误码

```typescript
export const ERROR_CODES = {
  // 认证错误
  AUTH_INVALID_TOKEN: 'AUTH_001',
  AUTH_EXPIRED_TOKEN: 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_003',

  // 业务错误
  RESOURCE_NOT_FOUND: 'BIZ_001',
  RESOURCE_ALREADY_EXISTS: 'BIZ_002',
  INVALID_OPERATION: 'BIZ_003',
} as const;
```

### 限制常量

```typescript
export const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_UPLOAD_FILES: 10,
} as const;
```

## 添加新常量

1. 在 `src/index.ts` 中定义常量：

```typescript
// packages/constants/src/index.ts

// 任务状态
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];
```

## 使用规范

- 使用 `as const` 确保类型推断为字面量类型
- 常量名使用 UPPER_SNAKE_CASE
- 导出对应的 TypeScript 类型

```typescript
// 推荐：导出类型
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type Status = typeof STATUS[keyof typeof STATUS];
// => 'active' | 'inactive'
```

## 构建

```bash
pnpm --filter @repo/constants build
```
