# @repo/types - TypeScript 类型定义

前端共享 TypeScript 类型定义。

## 安装

```json
{
  "dependencies": {
    "@repo/types": "workspace:*"
  }
}
```

## 使用

```typescript
import type { User, Task, ApiResponse } from '@repo/types';
```

## 类型模块

### AI 类型 (ai.ts)

AI 相关的类型定义：

```typescript
import type {
  ChatMessage,
  AIModel,
  CompletionOptions
} from '@repo/types';
```

### 认证类型 (auth.ts)

用户认证相关类型：

```typescript
import type {
  User,
  AuthToken,
  LoginCredentials,
  RegisterData
} from '@repo/types';
```

### 通用类型 (common.ts)

通用基础类型：

```typescript
import type {
  ApiResponse,
  PaginatedResponse,
  ErrorResponse
} from '@repo/types';

// API 响应类型
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// 分页响应
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 创意内容类型 (creative.ts)

创意内容相关类型：

```typescript
import type {
  Creative,
  MediaAsset,
  ContentTemplate
} from '@repo/types';
```

### 任务类型 (task.ts)

任务管理相关类型：

```typescript
import type {
  Task,
  TaskStatus,
  TaskPriority
} from '@repo/types';
```

## 添加新类型

1. 创建类型文件：

```typescript
// packages/types/project.ts
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
}
```

2. 在 `index.ts` 中导出：

```typescript
export * from './project';
```

## 使用规范

- 使用 `type` 导入以获得更好的类型擦除
- 接口命名使用 PascalCase
- 枚举使用 `const enum` 或字面量联合类型

```typescript
// 推荐：字面量联合类型
export type Status = 'pending' | 'active' | 'completed';

// 推荐：使用 type 导入
import type { User } from '@repo/types';
```

## 构建

```bash
pnpm --filter @repo/types build
```
