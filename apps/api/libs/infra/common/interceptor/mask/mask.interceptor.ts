import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { maskUtil } from '@repo/utils';

/**
 * 脱敏配置元数据 Key
 */
export const MASK_CONFIG_KEY = 'mask:config';

/**
 * 脱敏字段配置
 */
export interface MaskFieldConfig {
  /** 字段路径（支持嵌套，如 'user.email'） */
  field: string;
  /** 脱敏类型 */
  type:
    | 'email'
    | 'mobile'
    | 'phone'
    | 'idCard'
    | 'bankCard'
    | 'name'
    | 'address'
    | 'ip'
    | 'token'
    | 'password'
    | 'custom';
  /** 自定义脱敏函数（当 type 为 'custom' 时使用） */
  maskFn?: (value: string) => string;
}

/**
 * 脱敏配置
 */
export interface MaskConfig {
  /** 是否启用自动脱敏（根据字段名自动识别敏感数据） */
  auto?: boolean;
  /** 指定字段脱敏配置 */
  fields?: MaskFieldConfig[];
  /** 额外需要脱敏的字段名列表 */
  additionalSensitiveFields?: string[];
}

/**
 * 脱敏装饰器
 * @param config 脱敏配置
 *
 * @example
 * ```typescript
 * // 自动脱敏
 * @Mask({ auto: true })
 * @Get('users')
 * async getUsers() { ... }
 *
 * // 指定字段脱敏
 * @Mask({
 *   fields: [
 *     { field: 'email', type: 'email' },
 *     { field: 'phone', type: 'phone' },
 *   ]
 * })
 * @Get('user/:id')
 * async getUser() { ... }
 * ```
 */
export const Mask = (config: MaskConfig = { auto: true }) =>
  SetMetadata(MASK_CONFIG_KEY, config);

/**
 * 跳过脱敏装饰器
 */
export const SkipMask = () => SetMetadata(MASK_CONFIG_KEY, { skip: true });

/**
 * 根据字段路径获取值
 */
function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * 根据字段路径设置值
 */
function setValueByPath(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  const last = parts.pop();
  if (!last) return;

  const target = parts.reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return acc[part];
    }
    return undefined;
  }, obj);

  if (target && typeof target === 'object') {
    target[last] = value;
  }
}

/**
 * 应用单个字段脱敏
 */
function applyFieldMask(data: any, config: MaskFieldConfig): void {
  const value = getValueByPath(data, config.field);
  if (typeof value !== 'string') return;

  let maskedValue: string;

  switch (config.type) {
    case 'email':
      maskedValue = maskUtil.email(value);
      break;
    case 'mobile':
    case 'phone':
      maskedValue = maskUtil.phone(value);
      break;
    case 'idCard':
      maskedValue = maskUtil.idCard(value);
      break;
    case 'bankCard':
      maskedValue = maskUtil.bankCard(value);
      break;
    case 'name':
      maskedValue = maskUtil.name(value);
      break;
    case 'address':
      maskedValue = maskUtil.address(value);
      break;
    case 'ip':
      maskedValue = maskUtil.ip(value);
      break;
    case 'token':
      maskedValue = maskUtil.token(value);
      break;
    case 'password':
      maskedValue = maskUtil.password(value);
      break;
    case 'custom':
      maskedValue = config.maskFn ? config.maskFn(value) : value;
      break;
    default:
      maskedValue = value;
  }

  setValueByPath(data, config.field, maskedValue);
}

/**
 * 递归处理数组和嵌套对象
 */
function processData(data: any, config: MaskConfig): any {
  if (!data) return data;

  // 处理数组
  if (Array.isArray(data)) {
    return data.map((item) => processData(item, config));
  }

  // 处理对象
  if (typeof data === 'object') {
    // 创建副本以避免修改原数据
    const result = { ...data };

    // 处理 data.data 嵌套结构（API 响应格式）
    if (result.data !== undefined) {
      result.data = processData(result.data, config);
      return result;
    }

    // 自动脱敏
    if (config.auto) {
      return maskUtil.object(result, config.additionalSensitiveFields);
    }

    // 指定字段脱敏
    if (config.fields && config.fields.length > 0) {
      for (const fieldConfig of config.fields) {
        applyFieldMask(result, fieldConfig);
      }
    }

    return result;
  }

  return data;
}

/**
 * 数据脱敏拦截器
 *
 * 用于在 API 响应中自动脱敏敏感数据。
 *
 * @example
 * ```typescript
 * // 在 Controller 中使用
 * @UseInterceptors(MaskInterceptor)
 * @Mask({ auto: true })
 * @Get('users')
 * async getUsers() { ... }
 *
 * // 全局使用
 * app.useGlobalInterceptors(new MaskInterceptor(reflector));
 * ```
 */
@Injectable()
export class MaskInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const config = this.reflector.get<MaskConfig & { skip?: boolean }>(
      MASK_CONFIG_KEY,
      context.getHandler(),
    );

    // 如果没有配置或跳过脱敏，直接返回
    if (!config || config.skip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        try {
          return processData(data, config);
        } catch (error) {
          // 脱敏失败时返回原数据，避免影响正常响应
          console.error('Data masking failed:', error);
          return data;
        }
      }),
    );
  }
}
