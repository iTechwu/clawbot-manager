# Auth 模块使用指南

## 概述

Auth 模块提供了统一的认证和权限管理功能，集成了 JWT 认证和 RBAC（基于角色的访问控制）权限检查。

## 基础认证

### 启用 RBAC（默认）

```typescript
@Auth()  // 默认启用 RBAC 权限检查
@Get('profile')
async getProfile() { ... }
```

### 禁用 RBAC（仅做身份认证）

```typescript
@Auth('api', 'api', false)  // 第三个参数设为 false，禁用 RBAC
@Get('public-data')
async getPublicData() { ... }
```

### 管理员认证

```typescript
@Auth('admin')  // 管理员认证，默认启用 RBAC
@Get('admin/users')
async getUsers() { ... }
```

## RBAC 权限检查

### 权限检查装饰器

当使用 RBAC 装饰器时，会自动启用权限检查（即使 `enableRbac` 设为 `false`）：

```typescript
@Auth()
@RequirePermission('team', 'create')  // 自动启用 RBAC
@Post('teams')
async createTeam() { ... }
```

### 可用的 RBAC 装饰器

- `@RequirePermission(resource, action)` - 检查具体权限
- `@RequireRole(...roles)` - 检查角色
- `@RequireSuperAdmin()` - 检查超级管理员权限
- `@RequireTeamAdmin()` - 检查团队管理员权限
- `@RequireTeamMember()` - 检查团队成员权限
- `@RequirePermissions(...permissions)` - 检查多个权限（需全部满足）
- `@RequireTeamPermission(resource, action)` - 检查团队权限
- `@RequirePermissionOrRole(permission, ...roles)` - 权限或角色（满足任一即可）

## 细粒度模块权限（推荐）

新的细粒度权限系统支持 `module:resource:action` 格式的权限控制，适用于功能模块级别的权限管理。

### 装饰器

- `@RequireModulePermission(module, resource, action)` - 检查单个模块权限
- `@RequireAnyModulePermission(permissions)` - 满足任一权限即可
- `@RequireAllModulePermissions(permissions)` - 必须满足所有权限

### 使用示例

```typescript
// 示例1：知识库读取权限
@Auth()
@UseGuards(ModulePermissionGuard)
@RequireModulePermission('content', 'knowledge', 'read')
@Get('knowledge-base')
async getKnowledgeBase() { ... }

// 示例2：招聘模块 - 创建职位
@Auth()
@UseGuards(ModulePermissionGuard)
@RequireModulePermission('recruitment', 'job', 'create')
@Post('jobs')
async createJob() { ... }

// 示例3：满足任一权限
@Auth()
@UseGuards(ModulePermissionGuard)
@RequireAnyModulePermission([
    { module: 'content', resource: 'space', action: 'read' },
    { module: 'content', resource: 'knowledge', action: 'read' },
])
@Get('content')
async getContent() { ... }
```

### 权限格式

权限采用三元组格式：`module:resource:action`

| 字段 | 说明 | 示例 |
|------|------|------|
| module | 功能模块 | `content`, `recruitment`, `team`, `system` |
| resource | 资源类型 | `knowledge`, `space`, `job`, `candidate` |
| action | 操作类型 | `create`, `read`, `update`, `delete`, `*` |

### 权限检查流程

1. `ModulePermissionGuard` 从请求中提取 `teamId` 和 `userId`
2. 调用 `ModulePermissionService.checkModulePermission()` 验证权限
3. 权限数据来源：`TeamRole` + `TeamRoleModulePermission` 表

### 统一角色模型

系统采用统一角色模型，所有权限都通过 `TeamRole` 管理：

- **`TeamMember.customRoleId`** → **`TeamRole`** → **权限**
  - `baseRole`: 决定资源权限（Space/File）继承
  - `permissions`: 决定模块权限（功能访问）

⚠️ **重要**：`TeamMember.role` 字段已废弃，仅保留用于向后兼容。所有新代码应使用 `customRoleId` 获取角色信息。

### 相关服务

- `ModulePermissionService` - 权限检查服务（`@app/permission`）
- `ModulePermissionGuard` - 权限守卫（`@app/permission`）
- `PermissionTemplateService` - 权限模板服务（`@app/db`）

### 双层权限架构

系统采用双层权限架构：

1. **模块权限层**（Module Permission）
   - 功能级控制：用户能否访问某功能模块
   - 使用 `@RequireModulePermission` 装饰器
   - 数据存储：`TeamRole`, `TeamRoleModulePermission`

2. **资源权限层**（Space/File Permission）
   - 数据级控制：用户能否操作特定空间/文件
   - 使用 `PermissionService` 和 `Collaboration` 模型
   - 数据存储：`Space`, `Collaboration`, `SpaceRolePermission`

详细文档请参考：`docs/权限系统优化及管理方案.md`

## 传统 RBAC 权限检查

### 使用示例

```typescript
// 示例1：仅身份认证，不需要权限检查
@Auth('api', 'api', false)
@Get('my-profile')
async getMyProfile() { ... }

// 示例2：身份认证 + 权限检查
@Auth()
@RequirePermission('team', 'create')
@Post('teams')
async createTeam() { ... }

// 示例3：管理员 + 权限检查
@Auth('admin')
@RequireSuperAdmin()
@Get('admin/users')
async getAllUsers() { ... }

// 示例4：禁用 RBAC，但使用装饰器（会自动启用）
@Auth('api', 'api', false)
@RequireRole('owner', 'admin')  // 装饰器存在，自动启用 RBAC
@Get('teams')
async getTeams() { ... }
```

## 参数说明

### Auth 装饰器参数

```typescript
@Auth(authType?, guardType?, enableRbac?)
```

- `authType`: `'api' | 'admin'` - 认证类型，默认为 `'api'`
- `guardType`: `'sse' | 'api'` - Guard 类型，默认为 `'api'`
- `enableRbac`: `boolean` - 是否启用 RBAC 权限检查，默认为 `true`

## 注意事项

1. **默认行为**：`@Auth()` 默认启用 RBAC 权限检查
2. **装饰器优先级**：如果使用了 RBAC 装饰器（如 `@RequirePermission`），即使 `enableRbac` 设为 `false`，也会自动启用权限检查
3. **性能优化**：禁用 RBAC 可以避免不必要的数据库查询，适合不需要权限检查的公开接口
4. **向后兼容**：不传 `enableRbac` 参数时，行为与之前一致（默认启用）
