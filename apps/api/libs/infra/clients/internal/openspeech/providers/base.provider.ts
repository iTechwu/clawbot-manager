/**
 * @fileoverview OpenSpeech 服务提供商基类
 *
 * 本文件定义了语音识别服务提供商的抽象基类，提供了通用的日志记录功能，
 * 并定义了子类必须实现的抽象方法。
 *
 * @module openspeech/providers/base
 */

import { Logger } from 'winston';
import { FileBucketVendor } from '@prisma/client';
import {
  IOpenspeechProvider,
  SubmitTaskParams,
  TaskStatusResult,
} from '../types';

/**
 * 语音识别服务提供商抽象基类
 *
 * @description 提供了所有云服务商实现类的公共基础设施：
 * - 统一的日志记录器注入
 * - 定义子类必须实现的抽象方法
 * - 提供便捷的日志记录方法
 *
 * @abstract
 * @class BaseOpenspeechProvider
 * @implements {IOpenspeechProvider}
 *
 * @example
 * ```typescript
 * class MyProvider extends BaseOpenspeechProvider {
 *   readonly vendor = 'oss';
 *
 *   constructor(logger: Logger) {
 *     super(logger);
 *   }
 *
 *   async submitTask(params: SubmitTaskParams): Promise<string> {
 *     this.logInfo('Submitting task', { audioUrl: params.audioUrl });
 *     // 实现提交逻辑
 *   }
 *
 *   async queryTaskStatus(vendorTaskId: string): Promise<TaskStatusResult> {
 *     // 实现查询逻辑
 *   }
 * }
 * ```
 */
export abstract class BaseOpenspeechProvider implements IOpenspeechProvider {
  /**
   * 云服务商标识，子类必须定义
   */
  abstract readonly vendor: FileBucketVendor;

  /**
   * 构造函数
   *
   * @param {Logger} logger - Winston 日志记录器实例
   * @protected
   */
  constructor(protected readonly logger: Logger) {}

  /**
   * 提交语音识别任务
   *
   * @abstract
   * @param {SubmitTaskParams} params - 任务提交参数
   * @returns {Promise<string>} 云服务商返回的任务 ID
   */
  abstract submitTask(params: SubmitTaskParams): Promise<string>;

  /**
   * 查询语音识别任务状态
   *
   * @abstract
   * @param {string} vendorTaskId - 云服务商的任务 ID
   * @returns {Promise<TaskStatusResult>} 任务状态和结果
   */
  abstract queryTaskStatus(vendorTaskId: string): Promise<TaskStatusResult>;

  /**
   * 记录信息日志
   *
   * @protected
   * @param {string} message - 日志消息
   * @param {Record<string, unknown>} [meta] - 附加元数据
   */
  protected logInfo(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(`[${this.vendor}] ${message}`, meta);
  }

  /**
   * 记录错误日志
   *
   * @protected
   * @param {string} message - 日志消息
   * @param {Record<string, unknown>} [meta] - 附加元数据
   */
  protected logError(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(`[${this.vendor}] ${message}`, meta);
  }

  /**
   * 记录警告日志
   *
   * @protected
   * @param {string} message - 日志消息
   * @param {Record<string, unknown>} [meta] - 附加元数据
   */
  protected logWarn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(`[${this.vendor}] ${message}`, meta);
  }
}
