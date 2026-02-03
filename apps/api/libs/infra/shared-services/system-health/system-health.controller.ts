import { Get } from '@nestjs/common';
import { SystemHealthService } from './system-health.service';
import { TsRestController } from '@/decorators/ts-rest-controller.decorator';

/**
 * Health Check Controller
 * 健康检查控制器
 *
 * Exposes /health endpoint for monitoring and load balancer health checks.
 * This endpoint is excluded from the global '/api' prefix.
 *
 * 暴露 /health 端点用于监控和负载均衡器健康检查。
 * 此端点已从全局 '/api' 前缀中排除。
 */
@TsRestController({ path: 'health' })
export class SystemHealthController {
  constructor(private readonly healthService: SystemHealthService) {}

  /**
   * Basic health check
   * 基础健康检查
   *
   * Returns 200 if the service is running.
   * Used by load balancers and Kubernetes liveness probes.
   */
  @Get()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed health check
   * 详细健康检查
   *
   * Checks all dependencies (database, Redis, RabbitMQ).
   * Used by Kubernetes readiness probes.
   */
  @Get('ready')
  async ready() {
    const [database, redis, rabbitmq] = await Promise.all([
      this.healthService.checkDatabaseConnection(),
      this.healthService.checkRedisConnection(),
      this.healthService.checkRabbitMQConnection(),
    ]);

    const isHealthy = database && redis && rabbitmq;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: database ? 'ok' : 'fail',
        redis: redis ? 'ok' : 'fail',
        rabbitmq: rabbitmq ? 'ok' : 'fail',
      },
    };
  }
}
