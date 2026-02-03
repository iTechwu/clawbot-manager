# Configuration Management

## AgentX Configuration Helper

`AgentXConfigHelper` 提供统一的 AgentX 配置访问和认证管理。

### 配置文件

配置在 `keys/config.json` 中：

```json
{
    "agentx": {
        "baseUrl": "http://127.0.0.1:8004",
        "user": "your-username", // 可选
        "password": "your-password" // 可选
    }
}
```

### 使用示例

#### 1. 基本使用 - 获取配置

```typescript
import { AgentXConfigHelper } from '@/libs/config/agentx.config';
// 或者从主配置文件导入
import { AgentXConfigHelper } from '@/config/configuration';

// 获取完整配置
const config = AgentXConfigHelper.getConfig();

// 获取 BaseURL
const baseUrl = AgentXConfigHelper.getBaseUrl();

// 检查是否配置了认证
const hasAuth = AgentXConfigHelper.hasAuth();
```

#### 2. 在 HTTP 请求中使用认证

```typescript
import { HttpService } from '@nestjs/axios';
import { AgentXConfigHelper } from '@/config/configuration';

class YourService {
    constructor(private readonly httpService: HttpService) {}

    async callAgentX() {
        const baseUrl = AgentXConfigHelper.getBaseUrl();
        const headers = AgentXConfigHelper.getAuthHeaders();

        const response = await firstValueFrom(
            this.httpService.post(
                `${baseUrl}/your-endpoint`,
                { data: 'your data' },
                { headers },
            ),
        );

        return response.data;
    }
}
```

#### 3. 完整服务示例

```typescript
import {
    Injectable,
    OnModuleInit,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AgentXConfigHelper } from '@/config/configuration';

@Injectable()
export class YourService implements OnModuleInit {
    private baseUrl: string;

    constructor(private readonly httpService: HttpService) {}

    onModuleInit() {
        try {
            this.baseUrl = AgentXConfigHelper.getBaseUrl();
            console.log('✅ AgentX service initialized:', {
                baseUrl: this.baseUrl,
                hasAuth: AgentXConfigHelper.hasAuth(),
            });
        } catch (error) {
            console.error('⚠️ AgentX service not configured');
        }
    }

    async yourMethod(data: any) {
        if (!this.baseUrl) {
            throw new HttpException(
                'AgentX service not configured',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.baseUrl}/your-endpoint`, data, {
                    headers: AgentXConfigHelper.getAuthHeaders(),
                    timeout: 60000,
                }),
            );

            return response.data;
        } catch (error) {
            throw new HttpException(
                'AgentX service request failed',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
```

### API Reference

#### `AgentXConfigHelper.getConfig(): AgentXConfig`

获取完整的 AgentX 配置对象。

- **返回值**: `AgentXConfig` 对象
- **抛出**: 如果配置不存在则抛出 Error

#### `AgentXConfigHelper.getBaseUrl(): string`

获取 AgentX 服务的 Base URL。

- **返回值**: Base URL 字符串
- **抛出**: 如果配置不存在则抛出 Error

#### `AgentXConfigHelper.getAuthToken(): string | undefined`

获取 Bearer Token（如果配置了用户名和密码）。

- **返回值**: Base64 编码的 Bearer token，如果未配置认证信息则返回 `undefined`

#### `AgentXConfigHelper.getAuthHeaders(): Record<string, string>`

获取包含 Authorization 头的对象。

- **返回值**:
    - 如果配置了认证：`{ Authorization: "Bearer <token>" }`
    - 如果未配置认证：`{}`

#### `AgentXConfigHelper.hasAuth(): boolean`

检查是否配置了认证信息。

- **返回值**: `true` 如果配置了 user 和 password，否则 `false`

#### `AgentXConfigHelper.reset(): void`

重置缓存（主要用于测试）。

### 认证机制

如果在 `keys/config.json` 中配置了 `user` 和 `password`：

```json
{
    "agentx": {
        "baseUrl": "http://127.0.0.1:8004",
        "user": "admin",
        "password": "secret123"
    }
}
```

所有通过 `getAuthHeaders()` 的请求会自动包含：

```
Authorization: Bearer YWRtaW46c2VjcmV0MTIz
```

其中 token 是 `user:password` 的 Base64 编码。

### 迁移指南

#### 从旧的配置方式迁移

**旧代码：**

```typescript
import { getKeysConfig } from '@/config/configuration';
import type { AgentXConfig } from '@/config/validation';

class OldService {
    private baseUrl: string;
    private agentxConfig: AgentXConfig | undefined;

    constructor() {
        const keysConfig = getKeysConfig();
        this.agentxConfig = keysConfig?.agentx;
        this.baseUrl = this.agentxConfig?.baseUrl || '';
    }

    async request() {
        const response = await this.httpService.post(
            `${this.baseUrl}/endpoint`,
            data,
        );
        return response.data;
    }
}
```

**新代码：**

```typescript
import { AgentXConfigHelper } from '@/config/configuration';

class NewService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = AgentXConfigHelper.getBaseUrl();
    }

    async request() {
        const response = await this.httpService.post(
            `${this.baseUrl}/endpoint`,
            data,
            {
                headers: AgentXConfigHelper.getAuthHeaders(), // 自动添加认证
            },
        );
        return response.data;
    }
}
```

### 注意事项

1. **配置加载时机**: `AgentXConfigHelper` 依赖 `getKeysConfig()`，确保在应用启动时已调用 `initKeysConfig()`
2. **缓存机制**: 配置和 token 会被缓存，首次调用后不会重复读取文件
3. **错误处理**: 如果配置不存在，会抛出明确的错误信息
4. **可选认证**: 如果不配置 `user` 和 `password`，`getAuthHeaders()` 返回空对象，不影响请求
5. **测试**: 使用 `AgentXConfigHelper.reset()` 可以重置缓存，方便单元测试

### 相关文件

- [agentx.config.ts](./agentx.config.ts) - AgentXConfigHelper 实现
- [configuration.ts](./configuration.ts) - 配置管理主文件
- [validation/keys.validation.ts](./validation/keys.validation.ts) - Keys 配置的 Zod Schema
- [keys/config.json](../../keys/config.json) - 实际配置文件
