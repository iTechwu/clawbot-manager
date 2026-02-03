/**
 * Configuration DTOs and Types
 *
 * 设计原则: 一次配置，多次使用
 * - 配置相关类型从 Zod validation schema 推断 (单一真相来源)
 * - 非配置相关的 DTO 类型在此定义
 * - 保持向后兼容的类型别名
 */
import type {
  SystemTaskQueue,
  FileEnvType,
  FileBucketVendor,
} from '@prisma/client';
import { ExtendedPaginatedResponse, PaginatedResponse } from '@repo/contracts';

// ============================================================================
// Re-export Zod-inferred Configuration Types (单一真相来源)
// ============================================================================

// YAML Configuration Types
export type {
  YamlConfig,
  MicroServiceConfig,
  AppConfig,
  ZoneConfig,
  UploadConfig,
  IpInfoConfig,
  JwtConfig,
  CryptoConfig,
  CdnZoneConfig,
  CdnConfig,
  RedisCacheKeyConfig,
  WechatConfig,
  PathConfig,
  RolePermissionConfig,
  BucketConfig,
  VideoQuality,
  // Database Metrics Types
  SlowQueryThresholdsConfig,
  DbMetricsConfig,
  // Transaction Types
  TransactionRetryConfig,
  TransactionConfig,
} from '../validation';

// Keys Configuration Types
export type {
  KeysConfig,
  GoogleServiceAccountConfig,
  JinaAiConfig,
  OAuthProviderConfig,
  EmailTemplateConfig,
  SendCloudConfig,
  SmsTemplateBaseConfig,
  SmsProviderConfig,
  SmsConfig,
  StorageCredentialsConfig,
  StorageConfig,
  OpenSpeechProviderConfig,
  OpenSpeechConfig,
  TranscodeProviderConfig,
  TranscodeConfig,
  TtsProviderConfig,
  TtsConfig,
  RiskProviderConfig,
  RiskConfig,
  ImageProviderConfig,
  ImageConfig,
  VectorProviderConfig,
  VectorConfig,
  MiniprogramConfig,
} from '../validation';

// Environment Configuration Types
export type { EnvConfig } from '../validation';

// ============================================================================
// Backward-Compatible Type Aliases (保持向后兼容)
// ============================================================================

import type {
  YamlConfig as YamlConfigType,
  MicroServiceConfig as MicroServiceConfigType,
  AppConfig as AppConfigType,
  ZoneConfig as ZoneConfigType,
  UploadConfig as UploadConfigType,
  IpInfoConfig as IpInfoConfigType,
  JwtConfig as JwtConfigType,
  CryptoConfig as CryptoConfigType,
  RedisCacheKeyConfig as RedisCacheKeyConfigType,
  PathConfig as PathConfigType,
  KeysConfig as KeysConfigType,
  GoogleServiceAccountConfig as GoogleServiceAccountConfigType,
  OAuthProviderConfig as OAuthProviderConfigType,
  StorageCredentialsConfig as StorageCredentialsConfigType,
  OpenSpeechConfig as OpenSpeechConfigType,
  TranscodeConfig as TranscodeConfigType,
  TtsConfig as TtsConfigType,
  RiskConfig as RiskConfigType,
  ImageConfig as ImageConfigType,
  VectorConfig as VectorConfigType,
  MiniprogramConfig as MiniprogramConfigType,
} from '../validation';

// ============================================================================
// PardxApp Namespace (保持向后兼容)
// ============================================================================

export namespace PardxApp {
  // ========================================================================
  // API Response DTOs (非配置相关)
  // ========================================================================

  /**
   * 分页响应数据类型（zod-first）
   *
   * 继承自 @repo/contracts 的 ExtendedPaginatedResponse
   * 支持以下字段：
   * - list: T[] - 数据列表
   * - total: number - 总数
   * - page?: number - 当前页码
   * - limit?: number - 每页数量
   * - totalSize?: number - 总大小（字节）
   *
   * @template T - 列表项类型
   * @example
   * ```typescript
   * async getUsers(): Promise<PardxApp.PageResponseData<User>> {
   *   return { list: users, total: 100, page: 1, limit: 20 };
   * }
   * ```
   */
  export type PageResponseData<T> = ExtendedPaginatedResponse<T>;

  /**
   * 基础分页响应类型（仅包含 list, total, page, limit）
   * 用于简单的分页场景
   *
   * @template T - 列表项类型
   */
  export type SimplePaginatedResponse<T> = PaginatedResponse<T>;

  export class Task {
    task:
      | Partial<SystemTaskQueue>
      | {
          id: string;
          ready: boolean;
          state: string;
          progress?: number;
          processing?: boolean;
          current_step?: string;
          estimated_remaining_time?: string;
          processing_timestamp?: string;
          date?: string;
          result?: any;
          error?: string;
        };
  }

  // ========================================================================
  // Configuration Type Aliases (从 Zod 推断，保持向后兼容)
  // ========================================================================

  /** @deprecated 使用 CryptoConfig from '../validation' */
  export type Crypto = CryptoConfigType;

  /** @deprecated 使用 JwtConfig from '../validation' */
  export type JwtConfig = JwtConfigType;

  /** @deprecated 使用 RedisCacheKeyConfig from '../validation' */
  export type RedisConfig = RedisCacheKeyConfigType;

  /** 完整 YAML 配置类型 - 从 Zod schema 推断 */
  export type Config = YamlConfigType;

  /** @deprecated 使用 MicroServiceConfig from '../validation' */
  export type MicroService = MicroServiceConfigType;

  /** @deprecated 使用 AppConfig from '../validation' */
  export type LocalConfig = AppConfigType;

  /** @deprecated 使用 MiniprogramConfig from '../validation' */
  export type Miniprogram = MiniprogramConfigType;

  /** @deprecated 使用 OAuthProviderConfig from '../validation' */
  export type OauthConfig = OAuthProviderConfigType;

  /** @deprecated 使用 StorageCredentialsConfig from '../validation' */
  export type StorageSecret = StorageCredentialsConfigType;

  /** @deprecated 使用 PathConfig from '../validation' */
  export type OutOfUserPath = PathConfigType;

  /** @deprecated 使用 ZoneConfig from '../validation' */
  export type Zone = ZoneConfigType;

  /** @deprecated 使用 UploadConfig from '../validation' */
  export type Upload = UploadConfigType;

  /** @deprecated 使用 TranscodeConfig from '../validation' */
  export type Transcode = TranscodeConfigType;

  /** @deprecated 使用 OpenSpeechConfig from '../validation' */
  export type OpenSpeechConfig = OpenSpeechConfigType;

  /** @deprecated 使用 TtsConfig from '../validation' */
  export type TtsConfig = TtsConfigType;

  /** @deprecated 使用 RiskConfig from '../validation' */
  export type RiskConfig = RiskConfigType;

  /** @deprecated 使用 ImageConfig from '../validation' */
  export type ImageConfig = ImageConfigType;

  /** @deprecated 使用 VectorConfig from '../validation' */
  export type VectorConfig = VectorConfigType;

  /** 完整 Keys 配置类型 - 从 Zod schema 推断 */
  export type Keys = KeysConfigType;

  /** @deprecated 使用 GoogleServiceAccountConfig from '../validation' */
  export type GoogleKeys = GoogleServiceAccountConfigType;

  /** @deprecated 使用 IpInfoConfig from '../validation' */
  export type IpInfoConfig = IpInfoConfigType;

  // ========================================================================
  // Non-Config Types (保留原有定义)
  // ========================================================================

  export interface FileBase {
    bucket: string;
    key: string;
    ext?: string;
    env?: FileEnvType;
    vendor?: FileBucketVendor;
  }

  export interface HeaderData {
    platform: string;
    os: string;
    deviceid: string;
    mptrail?: string;
  }

  export interface IPInfo {
    ip: string;
    country: string;
    region?: string;
    city?: string;
    loc?: string;
    org?: string;
    postal?: string;
    timezone?: string;
  }

  export interface CountryReation {
    us: string[];
    eu: string[];
    ap: string[];
    cn: string[];
  }
}

// ============================================================================
// Enums (非配置相关)
// ============================================================================

export enum Locale {
  English = 'en',
  ChineseSimplified = 'zh-CN',
}

export type LocaleString = Locale.English | Locale.ChineseSimplified;

export enum VideoResolutionDto {
  HD = '1080p',
  SD = '720p',
  SSD = '360p',
  UHD = '4k',
}
