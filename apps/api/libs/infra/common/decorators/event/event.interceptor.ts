/**
 * Event Interceptor
 *
 * 拦截器实现，处理 @EmitEvent, @EmitEvents 装饰器的事件触发逻辑。
 * 与 NestJS EventEmitter2 深度融合。
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import {
  EMIT_EVENT_METADATA_KEY,
  EMIT_EVENTS_METADATA_KEY,
  EmitEventOptions,
  defaultPayloadGenerator,
} from './event.decorator';

@Injectable()
export class EventInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    // 获取单个事件配置
    const singleEvent = this.reflector.get<EmitEventOptions>(
      EMIT_EVENT_METADATA_KEY,
      handler,
    );

    // 获取多个事件配置
    const multipleEvents = this.reflector.get<EmitEventOptions[]>(
      EMIT_EVENTS_METADATA_KEY,
      handler,
    );

    // 合并所有事件配置
    const eventConfigs: EmitEventOptions[] = [];
    if (singleEvent) {
      eventConfigs.push(singleEvent);
    }
    if (multipleEvents) {
      eventConfigs.push(...multipleEvents);
    }

    // 如果没有事件配置，直接执行
    if (eventConfigs.length === 0) {
      return next.handle();
    }

    // 获取方法参数
    const args = context.getArgs();

    // 处理 beforeInvocation 事件
    const beforeEvents = eventConfigs.filter((e) => e.beforeInvocation);
    for (const event of beforeEvents) {
      this.emitEvent(event, args, undefined, className, methodName);
    }

    // 处理 afterInvocation 事件
    const afterEvents = eventConfigs.filter((e) => !e.beforeInvocation);
    if (afterEvents.length === 0) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result) => {
        for (const event of afterEvents) {
          this.emitEvent(event, args, result, className, methodName);
        }
      }),
    );
  }

  /**
   * 触发事件
   */
  private emitEvent(
    options: EmitEventOptions,
    args: any[],
    result: any,
    className: string,
    methodName: string,
  ): void {
    try {
      // 检查条件
      if (options.condition && !options.condition(result, args)) {
        this.logger.debug('Event condition not met, skipping', {
          eventName: options.eventName,
          className,
          methodName,
        });
        return;
      }

      // 生成 payload
      const payloadGenerator =
        options.payloadGenerator || defaultPayloadGenerator;
      const payload = payloadGenerator(args, result);

      // 添加上下文信息
      const enrichedPayload = {
        ...payload,
        __meta: {
          eventName: options.eventName,
          source: `${className}.${methodName}`,
          emittedAt: new Date().toISOString(),
        },
      };

      // 触发事件
      if (options.async !== false) {
        // 异步触发 (不阻塞)
        setImmediate(() => {
          this.eventEmitter.emit(options.eventName, enrichedPayload);
          this.logger.debug('Event emitted (async)', {
            eventName: options.eventName,
            source: `${className}.${methodName}`,
          });
        });
      } else {
        // 同步触发
        this.eventEmitter.emit(options.eventName, enrichedPayload);
        this.logger.debug('Event emitted (sync)', {
          eventName: options.eventName,
          source: `${className}.${methodName}`,
        });
      }
    } catch (error) {
      this.logger.error('Event emission error', {
        eventName: options.eventName,
        className,
        methodName,
        error: error.message,
      });
    }
  }
}
