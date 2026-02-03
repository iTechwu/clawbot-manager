/**
 * @fileoverview OpenSpeech 服务提供商工厂
 *
 * 本文件实现了语音识别服务提供商的工厂模式，负责：
 * - 根据云服务商类型创建对应的提供商实例
 * - 管理提供商实例的生命周期（单例模式）
 * - 提供统一的提供商获取接口
 * - 支持录音文件识别（AUC）和流式识别（SAUC）两种模式
 *
 * @module openspeech/factory
 */

import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FileBucketVendor } from '@prisma/client';
import { OpenSpeechConfig } from '@/config/validation';
import { getKeysConfig } from '@/config/configuration';
import {
  IOpenspeechProvider,
  IStreamingAsrProvider,
  AliyunOpenspeechConfig,
  VolcengineAucConfig,
  VolcengineSaucConfig,
} from './types';
import { AliyunOpenspeechProvider } from './providers/aliyun.provider';
import { VolcengineOpenspeechProvider } from './providers/volcengine.provider';
import { VolcengineStreamingAsrProvider } from './providers/volcengine-streaming.provider';

/**
 * OpenSpeech 服务提供商工厂
 *
 * @description 使用工厂模式管理不同云服务商的语音识别服务提供商。
 * 主要职责：
 * - 根据 vendor 类型创建对应的提供商实例
 * - 使用单例模式缓存提供商实例，避免重复创建
 * - 提供统一的提供商获取接口
 * - 支持录音文件识别和流式识别两种模式
 *
 * 支持的云服务商：
 * - 'oss': 阿里云 NLS 语音识别
 * - 'tos': 火山引擎大模型语音识别（支持 AUC 录音识别和 SAUC 流式识别）
 *
 * @class OpenspeechProviderFactory
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly factory: OpenspeechProviderFactory) {}
 *
 *   // 录音文件识别
 *   async transcribe(vendor: FileBucketVendor, audioUrl: string) {
 *     const provider = this.factory.getProvider(vendor);
 *     const taskId = await provider.submitTask({ audioUrl });
 *     // ...
 *   }
 *
 *   // 流式语音识别
 *   async streamingTranscribe(sessionId: string) {
 *     const provider = this.factory.getStreamingProvider('tos');
 *     const connectionId = await provider.connect(
 *       { sessionId, audioFormat: 'pcm' },
 *       { onResult: (result) => console.log(result.text) }
 *     );
 *     // ...
 *   }
 * }
 * ```
 */
@Injectable()
export class OpenspeechProviderFactory {
  /**
   * 录音文件识别提供商实例缓存
   * @private
   */
  private readonly providers: Map<FileBucketVendor, IOpenspeechProvider> =
    new Map();

  /**
   * 流式识别提供商实例缓存
   * @private
   */
  private readonly streamingProviders: Map<
    FileBucketVendor,
    IStreamingAsrProvider
  > = new Map();

  /**
   * OpenSpeech 配置
   * @private
   */
  private readonly openspeechConfig: OpenSpeechConfig;

  /**
   * 构造函数
   *
   * @param {HttpService} httpService - NestJS HTTP 服务（用于火山引擎）
   * @param {Logger} logger - Winston 日志记录器
   */
  constructor(
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.openspeechConfig = getKeysConfig()?.openspeech as OpenSpeechConfig;
  }

  /**
   * 获取指定云服务商的录音文件识别提供商实例
   *
   * @description 根据 vendor 类型返回对应的提供商实例。
   * 使用单例模式，同一 vendor 只会创建一个实例。
   *
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @returns {IOpenspeechProvider} 提供商实例
   * @throws {Error} 不支持的 vendor 类型或配置缺失时抛出异常
   *
   * @example
   * ```typescript
   * // 获取阿里云提供商
   * const aliyunProvider = factory.getProvider('oss');
   *
   * // 获取火山引擎提供商
   * const volcengineProvider = factory.getProvider('tos');
   * ```
   */
  getProvider(vendor: FileBucketVendor): IOpenspeechProvider {
    // 检查缓存
    if (this.providers.has(vendor)) {
      return this.providers.get(vendor)!;
    }

    // 创建新实例
    const provider = this.createProvider(vendor);
    this.providers.set(vendor, provider);

    return provider;
  }

  /**
   * 获取指定云服务商的流式识别提供商实例
   *
   * @description 根据 vendor 类型返回对应的流式识别提供商实例。
   * 目前仅支持火山引擎 (tos)。
   *
   * @param {FileBucketVendor} vendor - 云服务商类型（目前仅支持 'tos'）
   * @returns {IStreamingAsrProvider} 流式识别提供商实例
   * @throws {Error} 不支持的 vendor 类型或配置缺失时抛出异常
   *
   * @example
   * ```typescript
   * const streamingProvider = factory.getStreamingProvider('tos');
   * const connectionId = await streamingProvider.connect(
   *   { sessionId: 'session-123', audioFormat: 'pcm' },
   *   { onResult: (result) => console.log(result.text) }
   * );
   * ```
   */
  getStreamingProvider(vendor: FileBucketVendor): IStreamingAsrProvider {
    // 检查缓存
    if (this.streamingProviders.has(vendor)) {
      return this.streamingProviders.get(vendor)!;
    }

    // 创建新实例
    const provider = this.createStreamingProvider(vendor);
    this.streamingProviders.set(vendor, provider);

    return provider;
  }

  /**
   * 创建录音文件识别提供商实例
   *
   * @private
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @returns {IOpenspeechProvider} 新创建的提供商实例
   * @throws {Error} 不支持的 vendor 类型或配置缺失时抛出异常
   */
  private createProvider(vendor: FileBucketVendor): IOpenspeechProvider {
    switch (vendor) {
      case 'oss':
        return this.createAliyunProvider();
      case 'tos':
        return this.createVolcengineAucProvider();
      default:
        throw new Error(`Unsupported vendor for openspeech: ${vendor}`);
    }
  }

  /**
   * 创建流式识别提供商实例
   *
   * @private
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @returns {IStreamingAsrProvider} 新创建的流式识别提供商实例
   * @throws {Error} 不支持的 vendor 类型或配置缺失时抛出异常
   */
  private createStreamingProvider(
    vendor: FileBucketVendor,
  ): IStreamingAsrProvider {
    switch (vendor) {
      case 'tos':
        return this.createVolcengineSaucProvider();
      default:
        throw new Error(`Unsupported vendor for streaming ASR: ${vendor}`);
    }
  }

  /**
   * 将阿里云配置转换为 Provider 配置
   *
   * @private
   * @param {NonNullable<OpenSpeechConfig['oss']>} config - 阿里云原始配置
   * @returns {AliyunOpenspeechConfig} 阿里云 Provider 配置
   */
  private toAliyunConfig(
    config: NonNullable<OpenSpeechConfig['oss']>,
  ): AliyunOpenspeechConfig {
    return {
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      nslAppKey: config.nslAppKey,
      nslAppId: config.nslAppId,
      apiVersion: config.apiVersion,
      tokenEndpoint: config.tokenEndpoint,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    };
  }

  /**
   * 将火山引擎配置转换为录音文件识别（AUC）Provider 配置
   *
   * @private
   * @param {NonNullable<OpenSpeechConfig['tos']>} config - 火山引擎原始配置
   * @returns {VolcengineAucConfig} 火山引擎 AUC Provider 配置
   * @throws {Error} AUC 配置缺失时抛出异常
   */
  private toVolcengineAucConfig(
    config: NonNullable<OpenSpeechConfig['tos']>,
  ): VolcengineAucConfig {
    if (!config.auc) {
      throw new Error(
        'Volcengine OpenSpeech AUC config not found in configuration',
      );
    }

    return {
      appId: config.appId,
      appAccessToken: config.appAccessToken,
      uid: config.uid,
      endpoint: config.auc.endpoint,
      resourceId: config.auc.resourceId,
      appAccessSecret: config.appAccessSecret,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    };
  }

  /**
   * 将火山引擎配置转换为流式识别（SAUC）Provider 配置
   *
   * @private
   * @param {NonNullable<OpenSpeechConfig['tos']>} config - 火山引擎原始配置
   * @returns {VolcengineSaucConfig} 火山引擎 SAUC Provider 配置
   * @throws {Error} SAUC 配置缺失时抛出异常
   */
  private toVolcengineSaucConfig(
    config: NonNullable<OpenSpeechConfig['tos']>,
  ): VolcengineSaucConfig {
    if (!config.sauc) {
      throw new Error(
        'Volcengine OpenSpeech SAUC config not found in configuration',
      );
    }

    return {
      appId: config.appId,
      appAccessToken: config.appAccessToken,
      uid: config.uid,
      endpoint: config.sauc.endpoint,
      resourceId: config.sauc.resourceId,
      appAccessSecret: config.appAccessSecret,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    };
  }

  /**
   * 创建阿里云提供商实例
   *
   * @private
   * @returns {AliyunOpenspeechProvider} 阿里云提供商实例
   * @throws {Error} 配置缺失时抛出异常
   */
  private createAliyunProvider(): AliyunOpenspeechProvider {
    const rawConfig = this.openspeechConfig?.oss;
    if (!rawConfig) {
      throw new Error(
        'Aliyun OpenSpeech config (oss) not found in configuration',
      );
    }

    const config = this.toAliyunConfig(rawConfig);
    this.logger.info('Creating Aliyun OpenSpeech provider');
    return new AliyunOpenspeechProvider(this.logger, config);
  }

  /**
   * 创建火山引擎录音文件识别提供商实例
   *
   * @private
   * @returns {VolcengineOpenspeechProvider} 火山引擎 AUC 提供商实例
   * @throws {Error} 配置缺失时抛出异常
   */
  private createVolcengineAucProvider(): VolcengineOpenspeechProvider {
    const rawConfig = this.openspeechConfig?.tos;
    if (!rawConfig) {
      throw new Error(
        'Volcengine OpenSpeech config (tos) not found in configuration',
      );
    }

    const config = this.toVolcengineAucConfig(rawConfig);
    this.logger.info('Creating Volcengine OpenSpeech AUC provider');
    return new VolcengineOpenspeechProvider(
      this.logger,
      this.httpService,
      config,
    );
  }

  /**
   * 创建火山引擎流式识别提供商实例
   *
   * @private
   * @returns {VolcengineStreamingAsrProvider} 火山引擎 SAUC 提供商实例
   * @throws {Error} 配置缺失时抛出异常
   */
  private createVolcengineSaucProvider(): VolcengineStreamingAsrProvider {
    const rawConfig = this.openspeechConfig?.tos;
    if (!rawConfig) {
      throw new Error(
        'Volcengine OpenSpeech config (tos) not found in configuration',
      );
    }

    const config = this.toVolcengineSaucConfig(rawConfig);
    this.logger.info('Creating Volcengine OpenSpeech SAUC provider');
    return new VolcengineStreamingAsrProvider(this.logger, config);
  }

  /**
   * 检查指定云服务商的录音文件识别是否可用
   *
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @returns {boolean} 是否可用（配置存在）
   *
   * @example
   * ```typescript
   * if (factory.isVendorAvailable('oss')) {
   *   const provider = factory.getProvider('oss');
   *   // ...
   * }
   * ```
   */
  isVendorAvailable(vendor: FileBucketVendor): boolean {
    switch (vendor) {
      case 'oss':
        return !!this.openspeechConfig?.oss;
      case 'tos':
        return !!this.openspeechConfig?.tos?.auc;
      default:
        return false;
    }
  }

  /**
   * 检查指定云服务商的流式识别是否可用
   *
   * @param {FileBucketVendor} vendor - 云服务商类型
   * @returns {boolean} 是否可用（配置存在）
   *
   * @example
   * ```typescript
   * if (factory.isStreamingAvailable('tos')) {
   *   const provider = factory.getStreamingProvider('tos');
   *   // ...
   * }
   * ```
   */
  isStreamingAvailable(vendor: FileBucketVendor): boolean {
    switch (vendor) {
      case 'tos':
        return !!this.openspeechConfig?.tos?.sauc;
      default:
        return false;
    }
  }

  /**
   * 获取所有可用的云服务商列表（录音文件识别）
   *
   * @returns {FileBucketVendor[]} 可用的云服务商列表
   *
   * @example
   * ```typescript
   * const vendors = factory.getAvailableVendors();
   * console.log('Available vendors:', vendors);
   * // 输出: ['oss', 'tos']
   * ```
   */
  getAvailableVendors(): FileBucketVendor[] {
    const vendors: FileBucketVendor[] = [];

    if (this.openspeechConfig?.oss) {
      vendors.push('oss');
    }
    if (this.openspeechConfig?.tos?.auc) {
      vendors.push('tos');
    }

    return vendors;
  }

  /**
   * 获取所有支持流式识别的云服务商列表
   *
   * @returns {FileBucketVendor[]} 支持流式识别的云服务商列表
   *
   * @example
   * ```typescript
   * const vendors = factory.getStreamingAvailableVendors();
   * console.log('Streaming available vendors:', vendors);
   * // 输出: ['tos']
   * ```
   */
  getStreamingAvailableVendors(): FileBucketVendor[] {
    const vendors: FileBucketVendor[] = [];

    if (this.openspeechConfig?.tos?.sauc) {
      vendors.push('tos');
    }

    return vendors;
  }
}
