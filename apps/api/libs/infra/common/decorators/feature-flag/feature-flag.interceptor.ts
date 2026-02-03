/**
 * Feature Flag Interceptor
 *
 * 拦截器实现，处理 @FeatureEnabled 装饰器逻辑。
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  NotImplementedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import {
  FEATURE_FLAG_METADATA_KEY,
  FEATURE_FLAGS_METADATA_KEY,
  FeatureFlagOptions,
  FeatureFlagContext,
} from './feature-flag.decorator';
import { FeatureFlagService } from './feature-flag.service';

@Injectable()
export class FeatureFlagInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();

    // 获取单个功能开关
    const flagOptions = this.reflector.get<FeatureFlagOptions>(
      FEATURE_FLAG_METADATA_KEY,
      handler,
    );

    // 获取多个功能开关
    const flagsOptions = this.reflector.get<FeatureFlagOptions[]>(
      FEATURE_FLAGS_METADATA_KEY,
      handler,
    );

    // 无功能开关配置，直接执行
    if (!flagOptions && !flagsOptions) {
      return next.handle();
    }

    // 构建评估上下文
    const request = context.switchToHttp().getRequest();
    const flagContext: FeatureFlagContext = {
      userId: request.user?.id || request.userId,
      environment: process.env.NODE_ENV,
      request: {
        ip: request.ip,
        sessionId: request.session?.id,
        headers: request.headers,
      },
      properties: {},
    };

    // 处理单个功能开关
    if (flagOptions) {
      return from(this.evaluateFlag(flagOptions, flagContext)).pipe(
        switchMap((isEnabled) => {
          if (isEnabled) {
            return next.handle();
          }
          return this.handleDisabled(flagOptions);
        }),
      );
    }

    // 处理多个功能开关
    if (flagsOptions) {
      return from(this.evaluateMultipleFlags(flagsOptions, flagContext)).pipe(
        switchMap((allEnabled) => {
          if (allEnabled) {
            return next.handle();
          }
          // 找到第一个未启用的开关
          const disabledFlag = flagsOptions.find((f) => f.throwIfDisabled);
          return this.handleDisabled(disabledFlag || flagsOptions[0]);
        }),
      );
    }

    return next.handle();
  }

  /**
   * 评估单个功能开关
   */
  private async evaluateFlag(
    options: FeatureFlagOptions,
    context: FeatureFlagContext,
  ): Promise<boolean> {
    const isEnabled = await this.featureFlagService.evaluate(options, context);

    this.logger.debug('Feature flag evaluated', {
      flagName: options.flagName,
      isEnabled,
      strategy: options.strategy,
      userId: context.userId,
    });

    return isEnabled;
  }

  /**
   * 评估多个功能开关
   */
  private async evaluateMultipleFlags(
    optionsList: FeatureFlagOptions[],
    context: FeatureFlagContext,
  ): Promise<boolean> {
    for (const options of optionsList) {
      const isEnabled = await this.featureFlagService.evaluate(
        options,
        context,
      );
      if (!isEnabled) {
        return false;
      }
    }
    return true;
  }

  /**
   * 处理功能未启用
   */
  private handleDisabled(options: FeatureFlagOptions): Observable<any> {
    if (options.throwIfDisabled) {
      const message =
        options.errorMessage || `功能 ${options.flagName} 暂未开放`;
      throw new NotImplementedException(message);
    }

    // 返回空响应
    return of(null);
  }
}
