import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { CommonErrorCode } from '@repo/contracts/errors';
import { apiError } from '@/filter/exception/api.exception';
import { ConfigService } from '@nestjs/config';
import { JwtConfig } from '@/config/validation';
import stringUtil from '@/utils/string.util';
import { UserInfoService } from '@app/db';
import { RedisService } from '@app/redis';
import { FastifyRequest, FastifyReply } from 'fastify';
import enviromentUtil from '@/utils/enviroment.util';
import { Reflector } from '@nestjs/core';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MPTRAIL_HEADER } from '@repo/constants';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly outOfAnonymityPathConfig;
  private readonly outOfUserPathConfig;

  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly user: UserInfoService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    // 这两个配置在早期版本的 YAML 中存在，但当前模板中是可选的
    // 为了在本地/开发环境下更好地降级，这里给出空对象默认值
    this.outOfAnonymityPathConfig =
      (this.config.get('outOfAnonymityPath') as
        | Record<string, string[]>
        | undefined) ?? {};
    this.outOfUserPathConfig =
      (this.config.get('outOfUserPath') as
        | Record<string, string[]>
        | undefined) ?? {};
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const requestMethod = request.method.toLowerCase();
    const requestPath = stringUtil.trimSlashes(
      stringUtil.splitString(request.url, '?')[0],
    );

    // 检查是否在白名单路径中
    if (
      this.outOfUserPathConfig[requestMethod]?.some((path) =>
        new RegExp(`^${path.replace(/:\w+/g, '[^/]+')}$`).test(
          requestPath.replace('api/', ''),
        ),
      )
    ) {
      return true;
    }

    // 从方法处理器获取元数据
    let authTypes = this.reflector.get<string[]>('auths', context.getHandler());
    if (!authTypes) {
      authTypes = this.reflector.get<string[]>('auths', context.getClass());
    }

    const [authType = 'api', guardType = 'api'] = authTypes || ['api', 'api'];
    const isMpTest = request.headers[MPTRAIL_HEADER] === 'true';
    let userId,
      isAdmin = false,
      isAnonymity = false;

    if (!process.env.MODE_USER_ID) {
      let access;
      if (guardType === 'sse') {
        access = decodeURIComponent(request.query['access_token'] as string);
      } else {
        access = this.auth.extractTokenFromHeader(request);
        if (!access) {
          throw apiError(CommonErrorCode.UnAuthorized);
        }
      }
      if (!access) {
        throw apiError(CommonErrorCode.UnAuthorized);
      }

      let payload;
      try {
        const jwtConfig = this.config.getOrThrow<JwtConfig>('jwt');
        payload = await this.jwt.verifyAsync(access, {
          secret: jwtConfig.secret,
        });
      } catch (error) {
        throw apiError(CommonErrorCode.UnAuthorized);
      }

      userId = payload?.sub;
      isAnonymity = payload?.isAnonymity;
      isAdmin = payload?.isAdmin;

      if (isAnonymity) {
        throw apiError(CommonErrorCode.UnAuthorized);
      }

      // 将 JWT payload 中的用户信息设置到 request 中
      (request as any).userInfo = {
        id: userId,
        nickname: payload?.nickname,
        code: payload?.code,
        headerImg: payload?.headerImg,
        sex: payload?.sex,
        isAdmin: isAdmin,
        isAnonymity: isAnonymity,
      };
    } else {
      if (process.env.NODE_ENV === 'prod') {
        console.error(
          '!!! CRITICAL SECURITY ERROR: MODE_USER_ID is set in prod environment! !!!',
        );
        throw apiError(CommonErrorCode.UnAuthorized);
      }

      console.warn(
        '!!! WARNING: Auth Guard is running in insecure bypass mode. DO NOT USE IN PROD. !!!',
      );
      console.warn(
        `!!! Bypass mode activated with userId: ${process.env.MODE_USER_ID} !!!`,
      );

      userId = process.env.MODE_USER_ID;
      isAdmin = true;
      isAnonymity = false;
    }

    if (!userId) {
      throw apiError(CommonErrorCode.UnAuthorized);
    }

    if (
      request.method.toLowerCase() === 'post' &&
      process.env?.PREVIEW_MODE === 'true' &&
      enviromentUtil.isWeChatMiniProgram(request) &&
      isMpTest &&
      process.env?.PREVIEW_USER_ID
    ) {
      throw apiError(CommonErrorCode.UnAuthorized);
    }

    if (authType === 'admin' && !isAdmin) {
      throw apiError(CommonErrorCode.UnAuthorized);
    }

    // 检查匿名用户访问限制
    if (
      this.outOfAnonymityPathConfig[requestMethod]?.some((path) =>
        new RegExp(`^${path.replace(/:\w+/g, '[^/]+')}$`).test(
          requestPath.replace('api/', ''),
        ),
      ) &&
      (request as any).isAnonymity
    ) {
      throw apiError(CommonErrorCode.UnAuthorized);
    }

    // 将用户信息设置到request对象中
    (request as any).userId = userId;
    (request as any).isAnonymity = isAnonymity;
    (request as any).isAdmin = isAdmin;

    return true;
  }
}
