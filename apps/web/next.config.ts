import type { NextConfig } from 'next';
import { execSync } from 'child_process';
import { API_GENERATION } from '@repo/constants';
import createNextIntlPlugin from 'next-intl/plugin';

// ============================================================================
// Build-time Version Generation
// ============================================================================

/**
 * 生成构建版本号
 * 格式: YYYY.MM.DD-<hash>-g<generation>
 * 示例: 2025.03.18-abcdef-g1
 */
function generateAppBuild(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  let hash = '000000';
  try {
    hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    // Git not available or not a git repo
  }

  return `${date}-${hash}-g${API_GENERATION}`;
}

// Generate build version at build time
const APP_BUILD = process.env.NEXT_PUBLIC_APP_BUILD || generateAppBuild();

const nextConfig: NextConfig = {
  // Inject build-time environment variables
  env: {
    NEXT_PUBLIC_APP_BUILD: APP_BUILD,
  },
  output: 'standalone',
  /* config options here */
  experimental: {
    mcpServer: true,
  },
  images: {
    // 响应式图片尺寸配置
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 启用现代图片格式（WebP 和 AVIF）以减少图片体积
    formats: ['image/avif', 'image/webp'],
    // 远程图片域名白名单
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.volces.com',
      },
      {
        protocol: 'https',
        hostname: '*.aliyuncs.com',
      },
      {
        protocol: 'https',
        hostname: '*.pardx.cn',
      },
      {
        protocol: 'https',
        hostname: '*.alicdn.com',
      },
    ],
  },
  // HTML 禁止缓存 - 确保用户始终获取最新版本
  async headers() {
    return [
      {
        // 匹配所有 HTML 页面（排除静态资源）
        source: '/:path((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  // 配置 transpilePackages 以支持 monorepo 包
  transpilePackages: ['@repo/ui', '@repo/utils', '@repo/types', '@repo/config'],
  // 配置 serverExternalPackages 以解决依赖打包问题
  // - shiki: 版本冲突
  // - pino/thread-stream: Turbopack 错误打包测试文件
  serverExternalPackages: ['shiki', 'pino', 'thread-stream'],
  typescript: {
    // TODO 构建时忽略 TypeScript 错误
    ignoreBuildErrors: true,
  },
};

// 创建 next-intl 插件，指定 i18n 请求配置文件路径
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
