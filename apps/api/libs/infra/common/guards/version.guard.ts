import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  APP_BUILD_HEADER,
  MIN_APP_BUILD_HEADER,
  MIN_CLIENT_GENERATION,
  PLATFORM_HEADER,
  API_CONTRACT_HEADER,
  PLATFORMS,
  CONTRACTS,
  MIN_SUPPORTED_CONTRACT,
  CURRENT_CONTRACT,
  type ApiContract,
  type Platform,
} from '@repo/constants';

/**
 * 跳过版本检查的装饰器 key
 */
export const SKIP_VERSION_CHECK = 'skipVersionCheck';

/**
 * 跳过版本检查装饰器
 * @example
 * ```typescript
 * @SkipVersionCheck()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 * ```
 */
export const SkipVersionCheck = () => SetMetadata(SKIP_VERSION_CHECK, true);

/**
 * 版本上下文接口
 * 注入到 request 中供 Service 使用
 */
export interface VersionContext {
  /** 平台类型 */
  platform: Platform;
  /** API 合约版本 (APP 专用) */
  contract?: ApiContract;
  /** 支持的能力列表 */
  features: readonly string[];
  /** APP 构建号 */
  appBuild?: string;
}

// 扩展 FastifyRequest 类型
declare module 'fastify' {
  interface FastifyRequest {
    versionContext?: VersionContext;
  }
}

/**
 * Version Guard
 * 统一版本校验 Guard，支持 Web 和 APP 双轨校验
 *
 * 校验策略:
 * - Web 客户端: 使用 Generation (代际号) 校验，不兼容时返回 426 强制刷新
 * - APP 客户端: 使用 Contract (合约版本) 校验，通过 Adapter 兼容旧版本
 *
 * @example
 * ```typescript
 * // 全局注册
 * app.useGlobalGuards(new VersionGuard(new Reflector()));
 *
 * // 跳过特定路由
 * @SkipVersionCheck()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 *
 * // 在 Service 中使用版本上下文
 * @Injectable()
 * class MyService {
 *   getUser(req: FastifyRequest) {
 *     const ctx = req.versionContext;
 *     if (ctx?.features.includes('user-v2')) {
 *       return this.getUserV2();
 *     }
 *     return this.getUserV1();
 *   }
 * }
 * ```
 */
@Injectable()
export class VersionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 检查是否跳过版本检查
    const skipVersionCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_VERSION_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipVersionCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    const platform =
      (request.headers[PLATFORM_HEADER] as string) || PLATFORMS.WEB;
    const appBuild = request.headers[APP_BUILD_HEADER] as string;
    const contract = request.headers[API_CONTRACT_HEADER] as ApiContract;

    // Web 客户端: Generation 校验
    if (platform === PLATFORMS.WEB || !platform) {
      return this.validateWebClient(request, appBuild, response);
    }

    // APP 客户端: Contract 校验
    return this.validateAppClient(
      request,
      platform as Platform,
      appBuild,
      contract,
      response,
    );
  }

  /**
   * Web 客户端校验
   * 使用 Generation (代际号) 进行校验
   */
  private validateWebClient(
    request: FastifyRequest,
    appBuild: string,
    response: FastifyReply,
  ): boolean {
    // 开发环境或未提供版本时跳过检查
    if (!appBuild || appBuild === 'dev' || appBuild === 'server') {
      // 设置默认版本上下文
      request.versionContext = {
        platform: PLATFORMS.WEB,
        features: CONTRACTS[CURRENT_CONTRACT].features,
        appBuild,
      };
      return true;
    }

    // 提取代际号
    const clientGeneration = this.extractGeneration(appBuild);

    // 检查兼容性
    if (clientGeneration < MIN_CLIENT_GENERATION) {
      // 设置最低版本 header
      const minAppBuild = this.getMinAppBuild();
      response.header(MIN_APP_BUILD_HEADER, minAppBuild);

      throw new HttpException(
        {
          code: 426,
          msg: '客户端版本过旧，请刷新页面',
          data: {
            clientBuild: appBuild,
            clientGeneration,
            minGeneration: MIN_CLIENT_GENERATION,
            minBuild: minAppBuild,
          },
        },
        426, // HTTP 426 Upgrade Required
      );
    }

    // 设置版本上下文
    request.versionContext = {
      platform: PLATFORMS.WEB,
      features: CONTRACTS[CURRENT_CONTRACT].features,
      appBuild,
    };

    return true;
  }

  /**
   * APP 客户端校验
   * 使用 Contract (合约版本) 进行校验
   */
  private validateAppClient(
    request: FastifyRequest,
    platform: Platform,
    appBuild: string,
    contract: ApiContract,
    response: FastifyReply,
  ): boolean {
    // 检查 Contract 是否提供
    if (!contract) {
      // 如果没有提供 contract，使用默认最新版本
      request.versionContext = {
        platform,
        contract: CURRENT_CONTRACT,
        features: CONTRACTS[CURRENT_CONTRACT].features,
        appBuild,
      };
      return true;
    }

    // 检查 Contract 是否支持
    if (!CONTRACTS[contract]) {
      throw new HttpException(
        {
          code: 400,
          msg: '不支持的 API 版本，请升级 APP',
          data: {
            providedContract: contract,
            supportedContracts: Object.keys(CONTRACTS),
            minContract: MIN_SUPPORTED_CONTRACT,
          },
        },
        400,
      );
    }

    const contractConfig = CONTRACTS[contract];

    // 检查 Contract 是否已过期 (sunset)
    if (contractConfig.sunset && new Date() > new Date(contractConfig.sunset)) {
      throw new HttpException(
        {
          code: 426,
          msg: '当前版本已停止支持，请升级 APP',
          data: {
            expiredContract: contract,
            minContract: MIN_SUPPORTED_CONTRACT,
            sunsetDate: contractConfig.sunset,
          },
        },
        426,
      );
    }

    // 检查 APP Build 是否满足最低要求
    if (appBuild && platform !== PLATFORMS.WEB) {
      const minBuild = contractConfig.minBuild[platform as 'ios' | 'android'];
      const buildNumber = this.extractBuildNumber(appBuild);

      if (minBuild && buildNumber > 0 && buildNumber < minBuild) {
        throw new HttpException(
          {
            code: 426,
            msg: '请升级 APP 以继续使用',
            data: {
              currentBuild: buildNumber,
              minBuild,
              platform,
            },
          },
          426,
        );
      }
    }

    // 设置版本上下文
    request.versionContext = {
      platform,
      contract,
      features: contractConfig.features,
      appBuild,
    };

    // 如果 Contract 已废弃，添加警告 header
    if (contractConfig.deprecated) {
      response.header('X-Api-Deprecated', 'true');
      response.header('X-Api-Upgrade-To', CURRENT_CONTRACT);
    }

    return true;
  }

  /**
   * 从构建版本中提取代际号
   * @param buildVersion 构建版本字符串 (格式: YYYY.MM.DD-hash-gNN)
   * @returns 代际号，无法解析时返回 0
   */
  private extractGeneration(buildVersion: string): number {
    const match = buildVersion.match(/-g(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 从 APP Build 中提取构建号
   * @param appBuild APP 构建版本字符串 (格式: 数字或版本号)
   * @returns 构建号，无法解析时返回 0
   */
  private extractBuildNumber(appBuild: string): number {
    // 如果是纯数字，直接返回
    const numericBuild = parseInt(appBuild, 10);
    if (!isNaN(numericBuild)) {
      return numericBuild;
    }
    // 否则尝试从版本号中提取
    const match = appBuild.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 获取最低兼容的构建版本
   */
  private getMinAppBuild(): string {
    return `0000.00.00-000000-g${MIN_CLIENT_GENERATION}`;
  }
}
