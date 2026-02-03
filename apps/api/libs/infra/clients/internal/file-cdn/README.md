# File CDN 客户端

CDN URL 生成服务模块，支持多种 CDN 供应商和 URL 类型。

## 目录结构

```
file-cdn/
├── index.ts                    # 模块导出入口
├── file-cdn.module.ts          # NestJS 模块配置
├── file-cdn.client.ts          # CDN 客户端实现
├── dto/
│   └── file-cdn.dto.ts         # 类型定义
└── README.md                   # 本文档
```

## 支持的 CDN 类型

| 类型 | 方法 | 说明 |
|------|------|------|
| 图片 CDN (火山引擎) | `getImageVolcengineCdn` | 支持图片处理模板 |
| 图片 CDN (CloudFlare) | `getImageCloudFlareCdnUrl` | 支持图片优化 |
| 视频 CDN | `getVodUrl` | 视频点播 URL |
| 下载 CDN | `getDownloaderUrl` | 文件下载 URL |

## 快速开始

### 1. 导入模块

```typescript
import { Module } from '@nestjs/common';
import { FileCdnModule } from '@app/clients/internal/file-cdn';

@Module({
  imports: [FileCdnModule],
})
export class ImageModule {}
```

### 2. 注入使用

```typescript
import { Injectable } from '@nestjs/common';
import { FileCdnClient } from '@app/clients/internal/file-cdn';
import { FileBucketVendor } from '@prisma/client';

@Injectable()
export class ImageService {
  constructor(private readonly cdnClient: FileCdnClient) {}

  /**
   * 获取图片缩略图 URL
   */
  async getThumbnailUrl(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
  ) {
    return await this.cdnClient.getImageVolcengineCdn(
      vendor,
      bucket,
      key,
      'mini',
    );
  }

  /**
   * 获取视频播放 URL
   */
  async getVideoUrl(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
  ) {
    return await this.cdnClient.getVodUrl(vendor, bucket, key);
  }
}
```

## API 参考

### FileCdnClient

#### `getDownloaderUrl(vendor, bucket, key)`

生成文件下载 CDN URL。

```typescript
const url = await cdnClient.getDownloaderUrl('oss', 'my-bucket', 'files/doc.pdf');
```

#### `getVodUrl(vendor, bucket, key)`

生成视频点播 CDN URL。

```typescript
const url = await cdnClient.getVodUrl('tos', 'video-bucket', 'videos/movie.mp4');
```

#### `getImageVolcengineCdn(vendor, bucket, key, templateId?)`

生成火山引擎图片 CDN URL。

**参数：**
- `vendor` - 存储供应商
- `bucket` - 存储桶名称
- `key` - 图片文件键
- `templateId` - 图片模板（可选）

**支持的模板：**
| 模板 ID | 说明 |
|---------|------|
| `origin` | 原图预览 |
| `preview` | 预览图 |
| `mini` | 缩略图 |
| `183:103:360:360` | 自定义尺寸（默认） |

```typescript
// 获取缩略图
const miniUrl = await cdnClient.getImageVolcengineCdn(
  'tos',
  'image-bucket',
  'images/photo.jpg',
  'mini',
);

// 获取自定义尺寸
const customUrl = await cdnClient.getImageVolcengineCdn(
  'tos',
  'image-bucket',
  'images/photo.jpg',
  '640:480:640:480',
);
```

#### `getImageCloudFlareCdnUrl(vendor, bucket, key, templateId?)`

生成 CloudFlare 图片 CDN URL。

**支持的模板：**
| 模板 ID | 转换后 |
|---------|--------|
| `360:360:360:360` | `width=360,height=360,fit=crop` |
| `183:103:360:360` | `width=320,height=180,fit=crop` |
| `origin` | `fit=contain` |
| `mini` | `width=360,height=360,fit=contain` |

```typescript
const url = await cdnClient.getImageCloudFlareCdnUrl(
  'oss',
  'image-bucket',
  'images/photo.jpg',
  'mini',
);
```

#### `getCdnOriginImages(...)`

获取原始 CDN 图片（带签名验证），用于 CDN 回源。

```typescript
const response = await cdnClient.getCdnOriginImages(
  vendor,
  bucket,
  key,
  auth,
  expireIn,
  signature,
  signedHeaders,
  signedId,
  templateId,
);

if (response.code === 200) {
  console.log('Origin URL:', response.url);
} else {
  console.error('Access denied:', response.message);
}
```

## 配置

### CDN 配置

在 `config.yaml` 中配置 CDN：

```yaml
cdn:
  cn:
    url: https://cdn.example.com
    downloaderUrl: https://download.example.com
    vodUrl: https://vod.example.com
    thumbTemplate: default
  us:
    url: https://cdn-us.example.com
    downloaderUrl: https://download-us.example.com
    vodUrl: https://vod-us.example.com
    thumbTemplate: default
```

## 类型定义

```typescript
// CDN URL 响应
interface CdnUrlResponse {
  code: number;      // 200 = 成功, 403 = 禁止
  message: string;   // 响应消息
  url: string;       // CDN URL
}

// 图片模板类型
type ImageTemplateId = 'origin' | 'preview' | 'mini' | string;

// CloudFlare 模板类型
type CloudFlareTemplate = '360:360:360:360' | '183:103:360:360' | 'origin' | 'mini' | string;

// 签名 URL 参数
interface SignedUrlParams {
  auth?: string;
  expireIn?: string | number;
  signature?: string;
  signedHeaders?: string;
  signedId?: string;
  templateId?: string;
}
```

## 安全特性

### URL 签名

所有私有文件的 CDN URL 都会自动添加 AWS 签名 V4 认证：

- `X-Amz-Algorithm`: 签名算法
- `X-Amz-Credential`: 加密凭证
- `X-Amz-Expires`: 过期时间（默认 30 天）
- `X-Amz-Signature`: 签名哈希
- `X-Amz-SignedHeaders`: 签名头

### 签名验证

`getCdnOriginImages` 方法会验证传入的签名参数，确保：
1. 签名哈希正确
2. 加密的 key 匹配
3. 模板 ID 匹配

## 更新日志

### v2.0.0 (重构版本)

- 提取常量到模块顶部
- 添加完整的 TypeScript 类型定义
- 添加详细的 JSDoc 文档注释
- 重构辅助方法，减少代码重复
- 添加 README 文档
