/**
 * Client Injection Decorators
 *
 * 用于简化客户端注入的装饰器
 */
import { Inject } from '@nestjs/common';

/**
 * 客户端注入令牌前缀
 */
export const CLIENT_TOKEN_PREFIX = 'CLIENT_';

/**
 * 创建客户端注入令牌
 * @param clientName 客户端名称
 */
export function getClientToken(clientName: string): string {
  return `${CLIENT_TOKEN_PREFIX}${clientName.toUpperCase()}`;
}

/**
 * 注入客户端装饰器
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *     constructor(
 *         @InjectClient('sms') private readonly smsClient: SmsClient,
 *     ) {}
 * }
 * ```
 */
export function InjectClient(clientName: string): ParameterDecorator {
  return Inject(getClientToken(clientName));
}

/**
 * 标记为客户端类的装饰器
 *
 * @example
 * ```typescript
 * @Client('sms-aliyun')
 * export class SmsAliyunClient {
 *     // ...
 * }
 * ```
 */
export function Client(name: string): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata('client:name', name, target);
  };
}

/**
 * 获取客户端名称
 */
export function getClientName(target: Function): string | undefined {
  return Reflect.getMetadata('client:name', target);
}
