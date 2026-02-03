/**
 * @fileoverview SMS Service Type Definitions
 * @module @app/shared-services/sms/types
 *
 * 定义 SMS 服务的所有类型接口，包括：
 * - 短信客户端接口
 * - 配置类型
 * - 发送选项和结果
 * - 模板管理类型
 */

import { Logger } from 'winston';
import { HttpService } from '@nestjs/axios';
import { RedisService } from '@app/redis';
import {
  SmsProviderConfig,
  SmsDefaultTemplate,
  SmsHttpTemplate,
  SmsZxjcTemplate,
  SmsVolcengineTemplate,
  VerifyCodeResult,
} from '@app/clients/internal/sms';
import { MobileAuth } from '@prisma/client';
import { PardxApp } from '@/config/dto/config.dto';

// ============================================================================
// SMS 供应商类型
// ============================================================================

/**
 * 支持的 SMS 供应商
 */
export type SmsVendor =
  | 'aliyun'
  | 'tencent'
  | 'http'
  | 'zxjcsms'
  | 'volcengine';

/**
 * SMS 供应商显示名称映射
 */
export const SMS_VENDOR_NAMES: Record<SmsVendor, string> = {
  aliyun: '阿里云',
  tencent: '腾讯云',
  http: 'HTTP接口',
  zxjcsms: '中讯金昌',
  volcengine: '火山引擎',
};

// ============================================================================
// SMS 模板类型
// ============================================================================

/**
 * 统一的 SMS 模板类型
 */
export type SmsTemplate =
  | SmsDefaultTemplate
  | SmsZxjcTemplate
  | SmsHttpTemplate
  | SmsVolcengineTemplate;

/**
 * 模板元数据接口（所有模板的公共字段）
 */
export interface SmsTemplateMeta {
  /** 模板名称/ID */
  name?: string;
  /** 发送频率限制（秒） */
  frequency?: number;
  /** 验证码过期时间（秒） */
  codeExpire?: number;
}

/**
 * 模板存储映射
 */
export type SmsTemplateMap = Record<string, SmsTemplate>;

// ============================================================================
// SMS 客户端接口
// ============================================================================

/**
 * SMS 客户端基础接口
 *
 * 所有 SMS 供应商客户端必须实现此接口
 */
export interface ISmsClient {
  /**
   * 发送短信验证码
   *
   * @param phone - 手机号码
   * @param code - 验证码
   * @param template - 短信模板
   * @returns 发送结果（不同供应商返回类型可能不同）
   */
  sendSmsCode(phone: string, code: string, template: SmsTemplate): Promise<any>;
}

/**
 * 火山引擎专用客户端接口（支持验证码自动生成和校验）
 */
export interface IVolcengineSmsClient extends ISmsClient {
  /**
   * 发送验证码（火山引擎自动生成）
   *
   * @param phoneNumber - 手机号码
   * @param template - 火山引擎模板配置
   */
  sendVerifyCode(
    phoneNumber: string,
    template: SmsVolcengineTemplate,
  ): Promise<any>;

  /**
   * 校验验证码
   *
   * @param phoneNumber - 手机号码
   * @param code - 验证码
   * @param template - 火山引擎模板配置
   */
  checkVerifyCode(
    phoneNumber: string,
    code: string,
    template: SmsVolcengineTemplate,
  ): Promise<VerifyCodeCheckResult>;
}

// ============================================================================
// SMS 发送结果类型
// ============================================================================

/**
 * 统一的短信发送结果
 */
export interface SmsSendResult {
  /** HTTP 状态码 */
  statusCode?: number;
  /** 错误码（'0' 表示成功） */
  error?: string;
  /** 错误信息 */
  message?: string;
  /** 响应数据 */
  data?: {
    code?: string;
    [key: string]: any;
  };
  /** 请求 ID */
  requestId?: string;
}

/**
 * 验证码校验结果
 */
export interface VerifyCodeCheckResult {
  /** 校验是否成功 */
  success: boolean;
  /** 校验结果状态 */
  result: VerifyCodeResult;
  /** 结果消息 */
  message: string;
  /** 附加数据 */
  data?: {
    /** 手机号码 */
    phoneNumber?: string;
    /** 验证通过时间 */
    verifiedAt?: string;
    /** 手机票据（用于后续验证） */
    mobileTicket?: string;
    [key: string]: any;
  };
}

/**
 * 发送状态（与 Prisma QueueStatus 保持一致）
 */
export type SmsSendStatus = 'processing' | 'completed' | 'failed';

// ============================================================================
// SMS 发送选项
// ============================================================================

/**
 * 发送验证码选项
 */
export interface SendSmsCodeOptions {
  /** 手机号码 */
  mobile: string;
  /** 验证码 */
  code: string;
  /** 模板 ID */
  templateId: string;
  /** 队列任务 ID */
  queueSmsId: string;
}

/**
 * 处理发送验证码选项
 */
export interface ProcessSendSmsOptions {
  /** 手机账户信息 */
  mobileAccount: Partial<MobileAuth>;
  /** 设备信息 */
  deviceInfo: PardxApp.HeaderData;
  /** 模板 ID */
  templateId?: string;
}

/**
 * 火山引擎验证码发送选项
 */
export interface VolcengineSendOptions {
  /** 手机号码 */
  phoneNumber: string;
  /** 模板 ID */
  templateId?: string;
}

/**
 * 火山引擎验证码校验选项
 */
export interface VolcengineCheckOptions {
  /** 手机号码 */
  phoneNumber: string;
  /** 验证码 */
  code: string;
  /** 模板 ID */
  templateId?: string;
}

// ============================================================================
// SMS 客户端工厂类型
// ============================================================================

/**
 * SMS 客户端创建依赖
 */
export interface SmsClientDependencies {
  /** Winston 日志器 */
  logger: Logger;
  /** HTTP 服务（HTTP/ZXJC 客户端需要） */
  httpService?: HttpService;
  /** Redis 服务（火山引擎客户端需要） */
  redis?: RedisService;
}

/**
 * SMS 客户端创建函数类型
 */
export type SmsClientCreator = (
  config: SmsProviderConfig,
  dependencies: SmsClientDependencies,
) => ISmsClient;

/**
 * SMS 客户端工厂配置
 */
export interface SmsFactoryConfig {
  /** 默认供应商 */
  defaultVendor: SmsVendor;
  /** 供应商配置列表 */
  providers: SmsProviderConfig[];
}

// ============================================================================
// 设备发送日志类型
// ============================================================================

/**
 * 设备发送日志 Redis Key 前缀
 */
export const DEVICE_SEND_LOGGER_KEY = 'mobileCodeDevice';

/**
 * 默认发送频率限制（秒）
 */
export const DEFAULT_SEND_FREQUENCY = 30;

/**
 * 默认验证码过期时间（秒）
 */
export const DEFAULT_CODE_EXPIRE = 300;

// ============================================================================
// Re-exports
// ============================================================================

export {
  SmsProviderConfig,
  SmsDefaultTemplate,
  SmsHttpTemplate,
  SmsZxjcTemplate,
  SmsVolcengineTemplate,
  VerifyCodeResult,
} from '@app/clients/internal/sms';
