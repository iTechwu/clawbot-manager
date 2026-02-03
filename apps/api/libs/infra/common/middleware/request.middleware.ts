import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IncomingMessage, ServerResponse } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { createNamespace } from 'cls-hooked';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { getReqMainInfo } from '@/utils/logger.util';
import * as parser from 'accept-language-parser';
import ipUtil from '@/utils/ip.util';
import enviroment from '@/utils/enviroment.util';

// Trace ID 请求头名称
export const TRACE_ID_HEADER = 'x-trace-id';

// 扩展 FastifyRequest 类型
declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
    locale: string;
    realIp: string;
  }
}

export const clsNamespace = createNamespace('app');

/**
 * 获取或生成 Trace ID
 * 优先从请求头获取 (支持分布式追踪)，否则生成新的 UUID
 */
function getOrCreateTraceId(req: IncomingMessage | FastifyRequest): string {
  const headerTraceId = req.headers[TRACE_ID_HEADER];
  if (headerTraceId && typeof headerTraceId === 'string') {
    return headerTraceId;
  }
  return uuidv4();
}

/**
 * RequestMiddleware
 *
 * 重要说明：在 Fastify 适配器下，NestMiddleware 的 use 方法接收的参数类型
 * 实际上是原生的 Node.js 对象（IncomingMessage 和 ServerResponse），
 * 而不是 Fastify 的封装对象（FastifyRequest 和 FastifyReply）。
 *
 * 这是因为：
 * 1. NestJS 中间件接口设计为接收原生对象，以保持与不同 HTTP 框架的兼容性
 * 2. Fastify 适配器通过 middie 包处理中间件，传递的是原生对象
 * 3. 虽然类型声明可以使用 FastifyRequest/FastifyReply，但运行时实际是原生对象
 *
 * 解决方案：
 * - 使用泛型参数明确指定类型：NestMiddleware<IncomingMessage, ServerResponse>
 * - 或者保持 any 类型，在运行时通过类型断言访问 Fastify 特有的属性
 */
@Injectable()
export default class RequestMiddleware implements NestMiddleware<
  IncomingMessage,
  ServerResponse
> {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async use(req: IncomingMessage, res: ServerResponse, next: () => void) {
    clsNamespace.bind(req);
    clsNamespace.bind(res);

    // 获取或生成 Trace ID (支持分布式追踪)
    const traceId = getOrCreateTraceId(req);

    // 添加到请求对象 (便于 Controller/Service 访问)
    // 注意：在中间件中，req 是原生 IncomingMessage
    // 但在 Controller 中，可以通过 context.switchToHttp().getRequest<FastifyRequest>() 获取 FastifyRequest
    (req as any).traceId = traceId;

    // 添加到响应头 (使用原生 Node.js API)
    res.setHeader(TRACE_ID_HEADER, traceId);

    // 解析语言
    const acceptLanguage = req.headers['accept-language'] || '';
    const languages = parser.parse(acceptLanguage);
    let primaryLanguage = languages[0]?.code || 'en';
    if (!['zh-CN', 'en'].includes(primaryLanguage)) {
      primaryLanguage = 'en';
    }
    (req as any).locale = primaryLanguage;

    // 提取 IP 地址
    // 注意：ipUtil.extractIp 期望 FastifyRequest，但中间件中接收的是 IncomingMessage
    // 这里使用类型断言，因为 IncomingMessage 和 FastifyRequest 在 headers 属性上兼容
    const realIp = ipUtil.extractIp(req as any);
    (req as any).realIp = realIp;

    clsNamespace.run(() => {
      clsNamespace.set('traceID', traceId);
      next();
      // 记录日志 (包含 traceId)
      // 注意：getReqMainInfo 期望 FastifyRequest/FastifyReply，但中间件中是原生对象
      // 使用类型断言以兼容现有函数
      if (enviroment.isProduction()) {
        this.logger.info('RequestMiddleware', {
          traceId,
          ...getReqMainInfo(req as any, res as any),
        });
      }
    });
  }
}
