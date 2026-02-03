# OpenSpeech 语音识别服务

多云服务商语音识别能力的统一封装模块，支持阿里云和火山引擎。

## 功能特性

- **录音文件识别（AUC）**：异步提交音频文件，轮询或回调获取结果
- **流式语音识别（SAUC）**：实时音频流转写，WebSocket 双向通信
- **多云服务商支持**：阿里云 NLS、火山引擎大模型
- **统一 API 接口**：Facade 模式封装，简化调用

## 目录结构

```text
openspeech/
├── index.ts                           # 模块导出入口
├── types.ts                           # 类型定义
├── openspeech.module.ts               # NestJS 模块配置
├── openspeech.client.ts               # 统一客户端（Facade）
├── openspeech.factory.ts              # 提供商工厂
├── providers/                         # 云服务商实现
│   ├── index.ts                       # 提供商导出
│   ├── base.provider.ts               # 抽象基类
│   ├── aliyun.provider.ts             # 阿里云录音识别
│   ├── volcengine.provider.ts         # 火山引擎录音识别
│   └── volcengine-streaming.provider.ts # 火山引擎流式识别
└── README.md                          # 本文档
```

## 架构设计

采用 **Facade + Factory + Strategy** 模式：

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          OpenspeechClient                               │
│                         （Facade 门面）                                  │
│  - 提供统一的 API 接口（录音识别 + 流式识别）                              │
│  - 处理 FileKey 到音频 URL 的转换                                        │
│  - 选择云服务商                                                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     OpenspeechProviderFactory                           │
│                        （Factory 工厂）                                  │
│  - 根据 vendor 创建对应提供商                                            │
│  - 单例模式缓存实例                                                      │
│  - 管理提供商生命周期                                                    │
│  - 支持录音识别（AUC）和流式识别（SAUC）两种模式                           │
└───────────┬───────────────────────────────────────────┬─────────────────┘
            │                                           │
            ▼                                           ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────┐
│         录音文件识别提供商              │   │      流式识别提供商          │
│      IOpenspeechProvider              │   │   IStreamingAsrProvider     │
├───────────────────────────────────────┤   ├─────────────────────────────┤
│  AliyunOpenspeechProvider (oss)       │   │  VolcengineStreamingAsr-    │
│  VolcengineOpenspeechProvider (tos)   │   │  Provider (tos)             │
└───────────────────────────────────────┘   └─────────────────────────────┘
```

## 快速开始

### 1. 导入模块

```typescript
import { Module } from '@nestjs/common';
import { OpenspeechModule } from '@app/clients/internal/openspeech';

@Module({
  imports: [OpenspeechModule],
})
export class VideoModule {}
```

### 2. 注入使用

```typescript
import { Injectable } from '@nestjs/common';
import { OpenspeechClient } from '@app/clients/internal/openspeech';
import { FileKey, FileBucketVendor } from '@prisma/client';

@Injectable()
export class VideoService {
  constructor(private readonly openspeech: OpenspeechClient) {}

  // ... 使用示例见下文
}
```

## API 参考

### 录音文件识别

#### `submitTranscribeTask(fileKey): Promise<SubmitTaskResult>`

提交语音识别任务。

**参数：**

- `fileKey.vendor` - 存储服务商（`oss` | `tos`）
- `fileKey.bucket` - 存储桶名称
- `fileKey.key` - 文件路径（视频文件，会自动推导音频路径）
- `fileKey.preferVendor` - 可选，优先使用的云服务商

**返回：**

```typescript
{
  vendor: 'oss' | 'tos';      // 实际使用的云服务商
  vendorTaskId: string;        // 云服务商任务 ID
  audioUrl: string;            // 音频文件 URL
}
```

**示例：**

```typescript
const { vendor, vendorTaskId, audioUrl } =
  await this.openspeech.submitTranscribeTask(fileKey);

// 保存 vendorTaskId 到数据库，等待回调通知或定时轮询
```

#### `queryTranscribeTaskStatus(vendor, vendorTaskId): Promise<TaskStatusResult>`

查询任务状态。

**返回：**

```typescript
{
  status: 'processing' | 'success' | 'error';
  text?: string;   // 成功时的识别文本
  error?: string;  // 失败时的错误信息
}
```

**示例：**

```typescript
const result = await this.openspeech.queryTranscribeTaskStatus(vendor, taskId);

if (result.status === 'success') {
  console.log('识别结果:', result.text);
} else if (result.status === 'error') {
  throw new Error(result.error);
}
```

#### `transcribeFromFileKey(fileKey): Promise<string>`

同步识别（会阻塞直到完成）。

> 不推荐在生产环境使用，建议使用异步模式。

### 流式语音识别

#### `connectStreaming(vendor, params, callbacks): Promise<string>`

建立流式识别 WebSocket 连接。

**参数：**

- `vendor` - 云服务商类型（目前仅支持 `'tos'`）
- `params.sessionId` - 会话 ID
- `params.audioFormat` - 音频格式（默认 `'pcm'`）
- `params.sampleRate` - 采样率（默认 `16000`）
- `params.channels` - 声道数（默认 `1`）
- `params.enableSpeakerInfo` - 是否启用说话人分离（默认 `true`）
- `callbacks.onResult` - 收到识别结果回调
- `callbacks.onConnected` - 连接建立回调
- `callbacks.onDisconnected` - 连接关闭回调
- `callbacks.onError` - 错误回调

**返回：** 连接 ID

**示例：**

```typescript
const connectionId = await this.openspeech.connectStreaming(
  'tos',
  {
    sessionId: 'session-123',
    audioFormat: 'pcm',
    sampleRate: 16000,
    enableSpeakerInfo: true,
  },
  {
    onResult: (result) => {
      console.log('识别结果:', result.text);
      if (result.isFinal) {
        console.log('最终结果');
      }
      if (result.utterances) {
        // 说话人分离数据
        result.utterances.forEach(u => {
          console.log(`${u.speakerId}: ${u.text}`);
        });
      }
    },
    onConnected: () => console.log('WebSocket 已连接'),
    onDisconnected: () => console.log('WebSocket 已断开'),
    onError: (error) => console.error('错误:', error),
  }
);
```

#### `sendStreamingAudio(vendor, connectionId, audioData, isLast?): Promise<void>`

发送音频数据到流式识别连接。

**参数：**

- `vendor` - 云服务商类型
- `connectionId` - 连接 ID
- `audioData` - 音频数据（Buffer）
- `isLast` - 是否为最后一帧（默认 `false`）

**示例：**

```typescript
// 持续发送音频数据
await this.openspeech.sendStreamingAudio('tos', connectionId, audioChunk);

// 发送最后一帧
await this.openspeech.sendStreamingAudio('tos', connectionId, lastChunk, true);
```

#### `disconnectStreaming(vendor, connectionId): Promise<void>`

关闭流式识别连接。

```typescript
await this.openspeech.disconnectStreaming('tos', connectionId);
```

#### `getStreamingStatus(vendor, connectionId): StreamingAsrStatus`

获取流式识别连接状态。

**返回值：**

- `'connecting'` - 正在连接
- `'connected'` - 已连接
- `'streaming'` - 正在识别
- `'completed'` - 识别完成
- `'error'` - 发生错误
- `'disconnected'` - 已断开

#### `isStreamingAvailable(vendor): boolean`

检查指定云服务商是否支持流式识别。

#### `getStreamingAvailableVendors(): FileBucketVendor[]`

获取所有支持流式识别的云服务商列表。

### 高级用法

直接操作提供商实例：

```typescript
import { OpenspeechProviderFactory } from '@app/clients/internal/openspeech';

// 获取录音识别提供商
const provider = factory.getProvider('oss');

// 获取流式识别提供商
const streamingProvider = factory.getStreamingProvider('tos');

// 检查可用性
const isAvailable = factory.isVendorAvailable('tos');
const isStreamingAvailable = factory.isStreamingAvailable('tos');

// 获取所有可用云服务商
const vendors = factory.getAvailableVendors();
const streamingVendors = factory.getStreamingAvailableVendors();

// 流式提供商高级方法
const transcript = streamingProvider.getTranscript(connectionId);
const activeCount = streamingProvider.getActiveConnectionCount();
await streamingProvider.cleanupAllConnections();
```

## 完整使用示例

### 录音文件识别（异步模式）

```typescript
@Injectable()
export class TranscriptionService {
  constructor(private readonly openspeech: OpenspeechClient) {}

  async startTranscription(fileKey: FileKey) {
    const { vendor, vendorTaskId, audioUrl } =
      await this.openspeech.submitTranscribeTask(fileKey);

    // 保存任务信息到数据库
    await this.saveTask({ vendor, vendorTaskId, audioUrl });

    return { vendor, vendorTaskId };
  }

  async checkStatus(vendor: FileBucketVendor, taskId: string) {
    const result = await this.openspeech.queryTranscribeTaskStatus(vendor, taskId);

    if (result.status === 'success') {
      return { completed: true, text: result.text };
    } else if (result.status === 'error') {
      throw new Error(result.error);
    }

    return { completed: false };
  }
}
```

### 流式语音识别示例

```typescript
@Injectable()
export class RealtimeTranscriptionService {
  private connectionId?: string;

  constructor(private readonly openspeech: OpenspeechClient) {}

  async startStreaming(sessionId: string, onText: (text: string) => void) {
    // 检查流式识别是否可用
    if (!this.openspeech.isStreamingAvailable('tos')) {
      throw new Error('Streaming ASR not available');
    }

    this.connectionId = await this.openspeech.connectStreaming(
      'tos',
      { sessionId, audioFormat: 'pcm', enableSpeakerInfo: true },
      {
        onResult: (result) => {
          onText(result.text);
          if (result.isFinal) {
            console.log('识别完成');
          }
        },
        onError: (error) => {
          console.error('流式识别错误:', error);
        },
      }
    );

    return this.connectionId;
  }

  async sendAudio(audioData: Buffer, isLast = false) {
    if (!this.connectionId) {
      throw new Error('No active connection');
    }
    await this.openspeech.sendStreamingAudio('tos', this.connectionId, audioData, isLast);
  }

  async stopStreaming() {
    if (this.connectionId) {
      await this.openspeech.disconnectStreaming('tos', this.connectionId);
      this.connectionId = undefined;
    }
  }
}
```

## 云服务商配置

### 阿里云 (oss)

配置路径：`config.openspeech.oss`

```typescript
{
  accessKeyId: string;      // AccessKey ID
  accessKeySecret: string;  // AccessKey Secret
  endpoint: string;         // API 端点
  nslAppKey: string;        // NLS 应用 AppKey
}
```

参考文档：[阿里云录音文件识别](https://help.aliyun.com/document_detail/90727.html)

### 火山引擎 (tos)

配置路径：`config.openspeech.tos`

```typescript
{
  appId: string;            // 应用 ID
  appAccessToken: string;   // 应用访问令牌
  uid: string;              // 用户 ID
  appAccessSecret?: string; // 应用访问密钥（可选）
  accessKey?: string;       // Access Key（用于签名，可选）
  secretKey?: string;       // Secret Key（用于签名，可选）

  // 录音文件识别配置
  auc: {
    endpoint: string;       // API 端点
    resourceId: string;     // 资源 ID
  };

  // 流式语音识别配置
  sauc: {
    endpoint: string;       // WebSocket 端点
    resourceId: string;     // 资源 ID
  };
}
```

参考文档：

- [火山引擎大模型录音文件识别](https://www.volcengine.com/docs/6561/1354868)
- [火山引擎大模型流式语音识别](https://www.volcengine.com/docs/6561/1354869)

## 回调处理

两个云服务商都支持回调通知，回调 URL 格式：

- 阿里云：`{API_BASE_URL}/webhook/audio-transcribe/oss`
- 火山引擎：`{API_BASE_URL}/webhook/audio-transcribe/tos`

## 流式识别特性

火山引擎流式识别 Provider 提供以下高级特性：

- **心跳机制**：自动发送心跳包保持连接活跃
- **自动重连**：连接异常断开时自动尝试重连（指数退避策略）
- **音频缓冲**：重连期间自动缓冲音频数据，重连成功后发送
- **说话人分离**：支持多说话人场景，返回每个说话人的识别结果
- **连接池管理**：支持多个并发连接，统一管理

## 扩展新的云服务商

### 添加录音识别提供商

1. 创建新的提供商类，继承 `BaseOpenspeechProvider`
2. 实现 `submitTask` 和 `queryTaskStatus` 方法
3. 在 `OpenspeechProviderFactory` 中添加创建逻辑

```typescript
// providers/new-vendor.provider.ts
export class NewVendorProvider extends BaseOpenspeechProvider {
  readonly vendor: FileBucketVendor = 'new-vendor';

  async submitTask(params: SubmitTaskParams): Promise<string> {
    // 实现提交逻辑
  }

  async queryTaskStatus(vendorTaskId: string): Promise<TaskStatusResult> {
    // 实现查询逻辑
  }
}
```

### 添加流式识别提供商

1. 创建新的提供商类，实现 `IStreamingAsrProvider` 接口
2. 实现 `connect`、`sendAudio`、`disconnect`、`getConnectionStatus` 方法
3. 在 `OpenspeechProviderFactory.createStreamingProvider` 中添加创建逻辑

```typescript
// providers/new-vendor-streaming.provider.ts
export class NewVendorStreamingProvider implements IStreamingAsrProvider {
  readonly vendor = 'new-vendor-streaming';

  async connect(params: StreamingConnectParams, callbacks: StreamingAsrCallbacks): Promise<string> {
    // 实现连接逻辑
  }

  async sendAudio(connectionId: string, audioData: Buffer, isLast?: boolean): Promise<void> {
    // 实现发送逻辑
  }

  async disconnect(connectionId: string): Promise<void> {
    // 实现断开逻辑
  }

  getConnectionStatus(connectionId: string): StreamingAsrStatus {
    // 实现状态查询
  }
}
```

## 更新日志

### v2.1.0

- 添加流式语音识别支持（火山引擎 SAUC）
- `OpenspeechClient` 新增流式识别方法
- `OpenspeechProviderFactory` 支持流式提供商管理
- 新增 `VolcengineStreamingAsrProvider`，支持：
  - WebSocket 双向流式通信
  - 心跳机制和自动重连
  - 说话人分离
  - 音频缓冲

### v2.0.0

- 采用 Facade + Factory + Strategy 模式重构
- 分离阿里云和火山引擎实现到独立文件
- 添加完整的 TypeScript 类型定义
- 添加详细的 JSDoc 文档注释
- 支持提供商工厂的单例缓存
- 向后兼容原有 API 接口
