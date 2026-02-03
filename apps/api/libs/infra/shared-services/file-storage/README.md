# File Storage 文件存储服务

多云存储供应商文件存储能力的统一封装模块。

## 目录结构

```
file-storage/
├── index.ts                    # 模块导出入口
├── types.ts                    # 类型定义
├── file-storage.module.ts      # NestJS 模块配置
├── file-storage.service.ts     # 统一服务入口（Facade）
├── file-storage.factory.ts     # 客户端工厂
├── bucket-resolver.ts          # 存储桶解析器
└── README.md                   # 本文档
```

## 架构设计

采用 **Facade + Factory** 模式：

```
┌─────────────────────────────────────────────────────────────┐
│                    FileStorageService                       │
│                     （Facade 门面）                          │
│  - 提供统一的文件操作 API                                    │
│  - 处理业务逻辑和参数验证                                    │
└─────────────────────────────┬───────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  BucketResolver │  │ ClientFactory   │  │ Storage Clients │
│  （存储桶解析）   │  │ （客户端工厂）   │  │ （具体客户端）   │
│                 │  │                 │  │                 │
│  - IP 区域感知   │  │  - 单例缓存     │  │  - S3Client     │
│  - 存储桶验证    │  │  - 按需创建     │  │  - TosClient    │
│  - 默认桶选择    │  │  - 配置管理     │  │  - GcsClient    │
└─────────────────┘  └─────────────────┘  │  - QiniuClient  │
                                          │  - Us3Client    │
                                          └─────────────────┘
```

## 支持的存储供应商

| 供应商 | Vendor 标识 | 客户端类 |
|--------|-------------|----------|
| AWS S3 兼容 | `s3` | `FileS3Client` |
| 阿里云 OSS | `oss` | `FileS3Client` |
| 火山引擎 TOS | `tos` | `FileTosClient` |
| UCloud US3 | `us3` | `FileUs3Client` |
| Google Cloud Storage | `gcs` | `FileGcsClient` |
| 七牛云存储 | `qiniu` | `FileQiniuClient` |

## 快速开始

### 1. 导入模块

```typescript
import { Module } from '@nestjs/common';
import { FileStorageServiceModule } from '@app/shared-services/file-storage';

@Module({
  imports: [FileStorageServiceModule],
})
export class VideoModule {}
```

### 2. 注入使用

```typescript
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@app/shared-services/file-storage';
import { FileBucketVendor } from '@prisma/client';

@Injectable()
export class VideoService {
  constructor(private readonly fileStorage: FileStorageService) {}

  /**
   * 上传文件
   */
  async uploadFile(filePath: string, key: string) {
    await this.fileStorage.uploadFile('oss', 'my-bucket', key, filePath);
  }

  /**
   * 获取私有下载链接
   */
  async getDownloadUrl(fileKey: string) {
    return await this.fileStorage.getPrivateDownloadUrl(
      'oss',
      'my-bucket',
      fileKey,
      { expire: 3600 },
    );
  }

  /**
   * 分片上传
   */
  async multipartUpload(key: string, parts: Buffer[]) {
    // 1. 获取上传 ID
    const uploadId = await this.fileStorage.getMultipartUploadId(
      'oss',
      'my-bucket',
      key,
    );

    // 2. 上传分片（需要直接使用客户端）
    const client = await this.fileStorage.getFileClient('oss', 'my-bucket');
    const uploadedParts = [];
    for (let i = 0; i < parts.length; i++) {
      const presignedUrl = await this.fileStorage.getPresignedUrl(
        'oss',
        'my-bucket',
        { uploadId, key, partNumber: i + 1 },
      );
      // 上传到预签名 URL...
      uploadedParts.push({ ETag: 'etag', PartNumber: i + 1 });
    }

    // 3. 完成上传
    await this.fileStorage.completeMultipartUpload(
      'oss',
      'my-bucket',
      key,
      uploadId,
      uploadedParts,
    );
  }
}
```

## API 参考

### FileStorageService

#### 客户端获取

```typescript
// 获取存储客户端
const client = await fileStorage.getFileClient('oss', 'my-bucket');

// 根据 IP 自动选择最优存储桶
const client = await fileStorage.getFileClient(undefined, undefined, '8.8.8.8');

// 获取存储桶配置
const config = await fileStorage.getFileServiceConfig('oss', 'my-bucket');
```

#### 文件操作

```typescript
// 上传文件
await fileStorage.uploadFile('oss', 'bucket', 'key', '/path/to/file');

// 上传 Base64 数据
await fileStorage.fileDataUploader('oss', 'bucket', 'key', base64Data);

// 删除文件
await fileStorage.deleteFile('oss', 'bucket', 'key');

// 批量删除
await fileStorage.batchDeleteFiles('oss', 'bucket', ['key1', 'key2']);

// 复制文件
await fileStorage.copyFile(
  { vendor: 'oss', bucket: 'src-bucket', key: 'src-key' },
  { vendor: 'tos', bucket: 'dst-bucket', key: 'dst-key' },
);

// 从 URL 抓取文件
await fileStorage.fetchToBucket('oss', 'bucket', 'key', 'https://example.com/file.jpg');

// 列出文件
const files = await fileStorage.listFilesPrefix('oss', 'bucket', 'prefix/');
```

#### 访问控制

```typescript
// 获取上传令牌
const token = await fileStorage.uploadToken('oss', 'bucket');

// 获取带回调的上传令牌
const token = await fileStorage.uploadTokenWithCallback(
  'oss',
  'bucket',
  'callback-auth-key',
);

// 获取预签名 URL
const url = await fileStorage.getPresignedUrl('oss', 'bucket', {
  key: 'path/to/file',
  uploadId: 'upload-id',
  partNumber: 1,
});

// 获取私有下载链接
const url = await fileStorage.getPrivateDownloadUrl('oss', 'bucket', 'key', {
  expire: 3600,
  internal: false,
});
```

#### 分片上传

```typescript
// 初始化分片上传
const uploadId = await fileStorage.getMultipartUploadId('oss', 'bucket', 'key');

// 完成分片上传
await fileStorage.completeMultipartUpload('oss', 'bucket', 'key', uploadId, [
  { ETag: 'etag1', PartNumber: 1 },
  { ETag: 'etag2', PartNumber: 2 },
]);
```

#### 媒体处理

```typescript
// 视频截图
const snapshotKey = await fileStorage.getSnapshot('oss', 'bucket', 'video.mp4', {
  time: 5,
  width: 640,
  height: 360,
  format: 'jpg',
});

// 获取视频信息
const videoInfo = await fileStorage.getVideoInfo('oss', 'bucket', 'video.mp4');

// 获取图片信息
const imageInfo = await fileStorage.getImageInfo('oss', 'bucket', 'image.jpg');

// 获取音频信息
const audioInfo = await fileStorage.getAudioInfo('oss', 'bucket', 'audio.mp3');
```

### FileStorageClientFactory

用于高级场景，直接操作存储客户端。

```typescript
import { FileStorageClientFactory } from '@app/shared-services/file-storage';

// 获取客户端
const client = factory.getClient('oss', 'my-bucket');

// 获取客户端（必须存在）
const client = factory.getClientOrThrow('oss', 'my-bucket');

// 检查客户端是否存在
const exists = factory.hasClient('oss', 'my-bucket');

// 获取存储桶配置
const config = factory.getBucketConfig('oss', 'my-bucket');

// 获取所有配置
const configs = factory.getAllBucketConfigs();
```

### BucketResolver

用于存储桶解析的高级场景。

```typescript
import { BucketResolver } from '@app/shared-services/file-storage';

// 解析存储桶
const result = await resolver.resolve({
  ip: '8.8.8.8',
  isPublic: false,
});

// 验证存储桶
const isValid = resolver.validateBucket('oss', 'my-bucket');

// 获取供应商
const vendor = resolver.getVendorForBucket('my-bucket');

// 生成文件键
const key = resolver.generateFileKey('uploads', 'jpg', 'my-bucket');
```

## 配置

### 存储桶配置

在 `config.yaml` 中配置存储桶：

```yaml
buckets:
  - vendor: oss
    bucket: my-bucket
    region: cn-hangzhou
    endpoint: https://oss-cn-hangzhou.aliyuncs.com
    domain: https://cdn.example.com
    isPublic: true
    isDefault: true
    locale: cn
```

### 存储凭证

在 `keys/config.json` 中配置凭证：

```json
{
  "storage": {
    "oss": {
      "accessKey": "your-access-key",
      "secretKey": "your-secret-key"
    },
    "tos": {
      "accessKey": "your-access-key",
      "secretKey": "your-secret-key"
    }
  }
}
```

## 类型定义

```typescript
// 文件位置
interface FileLocation {
  vendor: FileBucketVendor;
  bucket: string;
  key: string;
}

// 存储桶查询选项
interface BucketLookupOptions {
  bucket?: string;
  ip?: string;
  isPublic?: boolean;
  locale?: string;
  vendor?: FileBucketVendor;
}

// 分片信息
interface MultipartPart {
  ETag: string;
  PartNumber: number;
}

// 截图选项
interface SnapshotOptions {
  time?: number;
  width?: number;
  height?: number;
  format?: 'jpg' | 'png' | 'webp';
  internal?: boolean;
}

// 私有下载选项
interface PrivateDownloadOptions {
  expire?: number;
  internal?: boolean;
}
```

## 更新日志

### v2.0.0 (重构版本)

- 采用 Facade + Factory 模式重构
- 分离存储桶解析逻辑到 `BucketResolver`
- 分离客户端管理逻辑到 `FileStorageClientFactory`
- 添加完整的 TypeScript 类型定义
- 添加详细的 JSDoc 文档注释
- 客户端单例缓存，避免重复创建
- 向后兼容原有 API 接口
