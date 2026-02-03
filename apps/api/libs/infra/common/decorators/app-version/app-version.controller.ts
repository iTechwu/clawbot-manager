/**
 * App Version Controller
 *
 * 提供版本检查 API 端点。
 *
 * **重要**: 此控制器使用 VERSION_NEUTRAL，不需要版本 header。
 * 前端应在启动时调用此 API 获取当前 API 版本，然后在后续请求中携带版本 header。
 */

import { Get, Query, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import {
  AppVersionService,
  AppVersionInfo,
  VersionCheckResult,
} from './app-version.service';
import { TsRestController } from '../ts-rest-controller.decorator';

@ApiTags('Version')
@TsRestController('version')
export class AppVersionController {
  constructor(private readonly appVersionService: AppVersionService) {}

  /**
   * 获取服务端版本信息
   */
  @Get()
  @ApiOperation({ summary: '获取服务端版本信息' })
  @ApiResponse({
    status: 200,
    description: '版本信息',
    schema: {
      type: 'object',
      properties: {
        appVersion: { type: 'string', example: '1.0.0' },
        apiVersion: { type: 'string', example: '1' },
        buildVersion: { type: 'string', example: 'a1b2c3d4' },
        buildTime: {
          type: 'string',
          example: '2025-01-15T10:00:00.000Z',
        },
        environment: { type: 'string', example: 'production' },
      },
    },
  })
  getVersion(): AppVersionInfo {
    return this.appVersionService.getVersionInfo();
  }

  /**
   * 检查客户端版本兼容性
   */
  @Get('check')
  @ApiOperation({ summary: '检查客户端版本兼容性' })
  @ApiQuery({
    name: 'clientVersion',
    description: '客户端版本号',
    required: false,
    example: '1.0.0',
  })
  @ApiQuery({
    name: 'buildVersion',
    description: '客户端构建版本',
    required: false,
    example: 'a1b2c3d4',
  })
  @ApiResponse({
    status: 200,
    description: '版本检查结果',
    schema: {
      type: 'object',
      properties: {
        needsRefresh: { type: 'boolean', example: false },
        reason: {
          type: 'string',
          enum: ['outdated', 'incompatible', 'major_update'],
        },
        serverVersion: { type: 'string', example: '1.0.0' },
        clientVersion: { type: 'string', example: '1.0.0' },
        action: { type: 'string', enum: ['refresh', 'update', 'none'] },
        message: { type: 'string' },
      },
    },
  })
  checkVersion(
    @Query('clientVersion') clientVersion?: string,
    @Query('buildVersion') buildVersion?: string,
  ): VersionCheckResult {
    const result = this.appVersionService.checkClientVersion(
      clientVersion || '',
    );

    // 如果版本匹配，额外检查构建版本
    if (!result.needsRefresh && buildVersion) {
      const buildMatch = this.appVersionService.checkBuildVersion(buildVersion);
      if (!buildMatch) {
        return {
          ...result,
          needsRefresh: true,
          reason: 'outdated',
          action: 'refresh',
          message: '检测到代码更新，建议刷新页面',
        };
      }
    }

    return result;
  }

  /**
   * 简单的版本哈希检查 (轻量级)
   * 用于前端轮询检测
   */
  @Get('hash')
  @ApiOperation({ summary: '获取构建哈希 (轻量级检查)' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @ApiResponse({
    status: 200,
    description: '构建哈希',
    schema: {
      type: 'object',
      properties: {
        hash: { type: 'string', example: 'a1b2c3d4' },
        time: { type: 'string', example: '2025-01-15T10:00:00.000Z' },
      },
    },
  })
  getBuildHash(): { hash: string; time: string } {
    const info = this.appVersionService.getVersionInfo();
    return {
      hash: info.buildVersion,
      time: info.buildTime,
    };
  }
}
