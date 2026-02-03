import { FastifyRequest } from 'fastify';

export default {
  extractIp(req: FastifyRequest): string {
    // 优先处理 'x-real-ip' 头部
    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }
    // 处理 'x-forwarded-for' 头部
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const xForwardedForStr = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor;
      const ips = xForwardedForStr.split(',').map((ip) => ip.trim());
      return ips[0];
    }
    // 如果没有 'x-real-ip' 和 'x-forwarded-for'，则尝试直接从 req.ip 获取
    return req.ip;
  },
};
