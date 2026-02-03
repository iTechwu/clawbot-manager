/**
 * App Version Service
 *
 * 提供应用版本管理服务，用于前后端版本一致性检查。
 *
 * 版本策略:
 * - API 版本: 后端 API 接口版本
 * - App 版本: 应用整体版本 (前后端协调)
 * - Build 版本: 构建时间戳/Git commit hash
 *
 * 前端检测机制:
 * 1. 响应头检查: x-app-version, x-build-version
 * 2. 专用接口: GET /api/version
 * 3. 版本不一致时提示用户刷新
 */

import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import enviroment from '@/utils/enviroment.util';

// ============================================================================
// Types
// ============================================================================

export interface AppVersionInfo {
  /** 应用版本 (package.json version) */
  appVersion: string;
  /** API 版本 */
  apiVersion: string;
  /** 构建版本 (时间戳或 Git hash) */
  buildVersion: string;
  /** 构建时间 */
  buildTime: string;
  /** 环境 */
  environment: string;
  /** 最低兼容前端版本 */
  minClientVersion?: string;
}

export interface VersionCheckResult {
  /** 是否需要刷新 */
  needsRefresh: boolean;
  /** 原因 */
  reason?: 'outdated' | 'incompatible' | 'major_update';
  /** 当前服务端版本 */
  serverVersion: string;
  /** 客户端版本 */
  clientVersion: string;
  /** 建议操作 */
  action?: 'refresh' | 'update' | 'none';
  /** 消息 */
  message?: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class AppVersionService implements OnModuleInit {
  private versionInfo: AppVersionInfo;
  private buildHash: string = '';

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    await this.loadVersionInfo();
  }

  /**
   * 加载版本信息
   */
  private async loadVersionInfo(): Promise<void> {
    try {
      // 读取 package.json
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

      // 生成构建版本
      this.buildHash = this.generateBuildHash();

      this.versionInfo = {
        appVersion: packageJson.version || '0.0.1',
        apiVersion: this.configService.get<string>('app.apiVersion', '1'),
        buildVersion: this.buildHash,
        buildTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'dev',
        minClientVersion: this.configService.get<string>(
          'app.minClientVersion',
        ),
      };

      if (enviroment.isProduction()) {
        this.logger.info('App version info module loaded', {
          versionInfo: this.versionInfo,
        });
      } else {
        this.logger.debug('App version info module loaded', {
          versionInfo: this.versionInfo,
        });
      }
    } catch (error) {
      this.logger.error('Failed to load version info', {
        error: error.message,
      });
      this.versionInfo = {
        appVersion: '0.0.1',
        apiVersion: '1',
        buildVersion: 'unknown',
        buildTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'dev',
      };
    }
  }

  /**
   * 生成构建哈希
   */
  private generateBuildHash(): string {
    // 优先使用 Git commit hash
    const gitHash =
      process.env.GIT_COMMIT_HASH || process.env.VERCEL_GIT_COMMIT_SHA;
    if (gitHash) {
      return gitHash.substring(0, 8);
    }

    // 使用时间戳
    return Date.now().toString(36);
  }

  /**
   * 获取版本信息
   */
  getVersionInfo(): AppVersionInfo {
    return { ...this.versionInfo };
  }

  /**
   * 获取版本响应头
   */
  getVersionHeaders(): Record<string, string> {
    return {
      'x-app-version': this.versionInfo.appVersion,
      'x-api-version': this.versionInfo.apiVersion,
      'x-build-version': this.versionInfo.buildVersion,
      'x-build-time': this.versionInfo.buildTime,
    };
  }

  /**
   * 检查客户端版本兼容性
   */
  checkClientVersion(clientVersion: string): VersionCheckResult {
    const serverVersion = this.versionInfo.appVersion;
    const minVersion = this.versionInfo.minClientVersion;

    // 如果客户端版本为空，建议刷新
    if (!clientVersion) {
      return {
        needsRefresh: true,
        reason: 'outdated',
        serverVersion,
        clientVersion: 'unknown',
        action: 'refresh',
        message: '检测到新版本，请刷新页面',
      };
    }

    // 比较版本
    const comparison = this.compareVersions(clientVersion, serverVersion);

    // 客户端版本低于服务端
    if (comparison < 0) {
      const isMajorUpdate = this.isMajorVersionDiff(
        clientVersion,
        serverVersion,
      );

      return {
        needsRefresh: true,
        reason: isMajorUpdate ? 'major_update' : 'outdated',
        serverVersion,
        clientVersion,
        action: 'refresh',
        message: isMajorUpdate
          ? '发现重要更新，请刷新页面以获得最佳体验'
          : '检测到新版本，建议刷新页面',
      };
    }

    // 检查最低兼容版本
    if (minVersion && this.compareVersions(clientVersion, minVersion) < 0) {
      return {
        needsRefresh: true,
        reason: 'incompatible',
        serverVersion,
        clientVersion,
        action: 'update',
        message: '当前版本过旧，请刷新页面更新',
      };
    }

    return {
      needsRefresh: false,
      serverVersion,
      clientVersion,
      action: 'none',
    };
  }

  /**
   * 检查构建版本是否匹配
   */
  checkBuildVersion(clientBuildVersion: string): boolean {
    return clientBuildVersion === this.versionInfo.buildVersion;
  }

  /**
   * 比较版本号
   * @returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 < num2) return -1;
      if (num1 > num2) return 1;
    }

    return 0;
  }

  /**
   * 检查是否为主版本更新
   */
  private isMajorVersionDiff(v1: string, v2: string): boolean {
    const major1 = parseInt(v1.split('.')[0] || '0', 10);
    const major2 = parseInt(v2.split('.')[0] || '0', 10);
    return major1 !== major2;
  }
}
