import { Inject, Injectable } from '@nestjs/common';
import * as https from 'https';
import type { IncomingMessage, ServerResponse } from 'http';
import type { VendorConfig } from '../config/vendor.config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * 上游请求参数
 */
export interface UpstreamRequest {
  vendorConfig: VendorConfig;
  path: string;
  method: string;
  headers: Record<string, string>;
  body: Buffer | null;
  apiKey: string;
}

/**
 * 上游响应结果
 */
export interface UpstreamResult {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body?: Buffer;
}

/**
 * UpstreamService - 上游转发服务
 *
 * 负责将请求转发到 AI 提供商的 API：
 * - 处理 HTTP/HTTPS 请求
 * - 支持 SSE 流式响应
 * - 处理认证头替换
 */
@Injectable()
export class UpstreamService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 转发请求到上游服务（流式响应）
   *
   * @param req 上游请求参数
   * @param rawResponse 原始响应对象（用于流式传输）
   * @returns 响应状态码
   */
  async forwardToUpstream(
    req: UpstreamRequest,
    rawResponse: ServerResponse,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const { vendorConfig, path, method, headers, body, apiKey } = req;

      // 构建上游路径
      const upstreamPath = vendorConfig.basePath + path;

      // 克隆并修改请求头
      const upstreamHeaders: Record<string, string> = { ...headers };

      // 移除 hop-by-hop 头
      delete upstreamHeaders['host'];
      delete upstreamHeaders['connection'];
      delete upstreamHeaders['authorization'];
      delete upstreamHeaders['content-length'];

      // 设置正确的 host
      upstreamHeaders['host'] = vendorConfig.host;

      // 设置认证头（使用真实 API key）
      upstreamHeaders[vendorConfig.authHeader.toLowerCase()] =
        vendorConfig.authFormat(apiKey);

      // 如果有 body，设置 content-length
      if (body) {
        upstreamHeaders['content-length'] = String(body.length);
      }

      const options = {
        hostname: vendorConfig.host,
        port: 443,
        path: upstreamPath,
        method,
        headers: upstreamHeaders,
      };

      this.logger.debug(`Forwarding to upstream: ${method} ${vendorConfig.host}${upstreamPath}`);

      const proxyReq = https.request(options, (proxyRes: IncomingMessage) => {
        const statusCode = proxyRes.statusCode ?? 500;

        // 构建转发的响应头（排除 hop-by-hop 头）
        const forwardHeaders: Record<string, string | string[]> = {};
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          const lowerKey = key.toLowerCase();
          if (
            value &&
            !['connection', 'transfer-encoding', 'content-length'].includes(lowerKey)
          ) {
            forwardHeaders[key] = value;
          }
        }

        // 对于 SSE 响应，确保正确的流式头
        const contentType = proxyRes.headers['content-type'];
        if (contentType?.includes('text/event-stream')) {
          forwardHeaders['cache-control'] = 'no-cache';
          forwardHeaders['connection'] = 'keep-alive';
        }

        // 使用原始响应绕过 Fastify/NestJS 缓冲
        // 这对于 SSE 流式传输正常工作至关重要
        rawResponse.writeHead(statusCode, forwardHeaders);

        proxyRes.on('data', (chunk) => {
          rawResponse.write(chunk);
          // 强制刷新 SSE - 确保事件立即发送
          if (typeof (rawResponse as any).flush === 'function') {
            (rawResponse as any).flush();
          }
        });

        proxyRes.on('end', () => {
          rawResponse.end();
          resolve(statusCode);
        });

        proxyRes.on('error', (err) => {
          this.logger.error('Upstream response error:', err);
          rawResponse.end();
          reject(err);
        });
      });

      proxyReq.on('error', (err) => {
        this.logger.error('Upstream request error:', err);
        reject(err);
      });

      // 设置超时
      proxyReq.setTimeout(120000, () => {
        proxyReq.destroy(new Error('Upstream request timeout'));
      });

      if (body) {
        proxyReq.write(body);
      }
      proxyReq.end();
    });
  }

  /**
   * 转发请求到上游服务（缓冲响应）
   *
   * 用于非流式请求，返回完整响应
   */
  async forwardToUpstreamBuffered(req: UpstreamRequest): Promise<UpstreamResult> {
    return new Promise((resolve, reject) => {
      const { vendorConfig, path, method, headers, body, apiKey } = req;

      const upstreamPath = vendorConfig.basePath + path;

      const upstreamHeaders: Record<string, string> = { ...headers };
      delete upstreamHeaders['host'];
      delete upstreamHeaders['connection'];
      delete upstreamHeaders['authorization'];
      delete upstreamHeaders['content-length'];

      upstreamHeaders['host'] = vendorConfig.host;
      upstreamHeaders[vendorConfig.authHeader.toLowerCase()] =
        vendorConfig.authFormat(apiKey);

      if (body) {
        upstreamHeaders['content-length'] = String(body.length);
      }

      const options = {
        hostname: vendorConfig.host,
        port: 443,
        path: upstreamPath,
        method,
        headers: upstreamHeaders,
      };

      const proxyReq = https.request(options, (proxyRes: IncomingMessage) => {
        const statusCode = proxyRes.statusCode ?? 500;
        const chunks: Buffer[] = [];

        const responseHeaders: Record<string, string | string[]> = {};
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (value) {
            responseHeaders[key] = value;
          }
        }

        proxyRes.on('data', (chunk) => {
          chunks.push(chunk);
        });

        proxyRes.on('end', () => {
          resolve({
            statusCode,
            headers: responseHeaders,
            body: Buffer.concat(chunks),
          });
        });

        proxyRes.on('error', (err) => {
          reject(err);
        });
      });

      proxyReq.on('error', (err) => {
        reject(err);
      });

      proxyReq.setTimeout(120000, () => {
        proxyReq.destroy(new Error('Upstream request timeout'));
      });

      if (body) {
        proxyReq.write(body);
      }
      proxyReq.end();
    });
  }
}
