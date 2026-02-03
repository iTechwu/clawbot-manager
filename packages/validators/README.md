# @repo/validators - 共享验证

基于 Zod 的前后端共享验证 Schema。

## 安装

```json
{
  "dependencies": {
    "@repo/validators": "workspace:*"
  }
}
```

## 使用

### 前端表单验证

```typescript
import { userSchema, loginSchema } from '@repo/validators';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function LoginForm() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
  });

  // ...
}
```

### 后端请求验证

```typescript
import { createUserSchema } from '@repo/validators';
import { ZodValidationPipe } from '@nestjs/common';

@Post()
create(@Body(new ZodValidationPipe(createUserSchema)) data: CreateUserDto) {
  // data 已通过验证
}
```

## 验证 Schema

### 用户相关

```typescript
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(50),
  avatar: z.string().url().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱'),
  password: z.string().min(8, '密码至少8位'),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, '名称至少2个字符'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
});
```

### 类型推断

```typescript
import { z } from 'zod';
import { userSchema } from '@repo/validators';

// 自动推断类型
type User = z.infer<typeof userSchema>;
// => { id: string; email: string; name: string; avatar?: string }
```

## 添加新 Schema

1. 在 `src/index.ts` 中定义 Schema：

```typescript
// packages/validators/src/index.ts
import { z } from 'zod';

// 任务验证
export const taskSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().datetime().optional(),
});

export const createTaskSchema = taskSchema.omit({ id: true });
export const updateTaskSchema = taskSchema.partial();

// 导出类型
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

## 常用验证模式

### 分页参数

```typescript
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
```

### ID 参数

```typescript
export const idParamSchema = z.object({
  id: z.string().uuid('无效的 ID 格式'),
});
```

### 时间范围

```typescript
export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: '开始时间不能晚于结束时间',
});
```

## 最佳实践

1. **复用基础 Schema**：使用 `.extend()`, `.pick()`, `.omit()` 复用
2. **导出类型**：使用 `z.infer<>` 导出对应类型
3. **国际化消息**：错误消息支持多语言
4. **前后端一致**：确保前后端使用相同的验证逻辑

## 构建

```bash
pnpm --filter @repo/validators build
```
