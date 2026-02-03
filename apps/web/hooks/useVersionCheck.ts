'use client';

/**
 * Version Check Hook
 *
 * 检测前后端版本一致性，自动提示用户刷新页面。
 *
 * 工作原理:
 * 1. 从 API 响应头获取版本信息
 * 2. 定期轮询 /api/version/hash 检测更新
 * 3. 版本不一致时提示用户刷新
 *
 * @example
 * ```tsx
 * function App() {
 *     useVersionCheck({
 *         onVersionMismatch: () => {
 *             toast.info('检测到新版本，请刷新页面');
 *         },
 *     });
 *
 *     return <div>...</div>;
 * }
 * ```
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { API_CONFIG } from '@/config';

// ============================================================================
// Types
// ============================================================================

export interface VersionInfo {
  appVersion: string;
  apiVersion: string;
  buildVersion: string;
  buildTime: string;
  environment: string;
}

export interface VersionCheckResult {
  needsRefresh: boolean;
  reason?: 'outdated' | 'incompatible' | 'major_update';
  serverVersion: string;
  clientVersion: string;
  action?: 'refresh' | 'update' | 'none';
  message?: string;
}

export interface UseVersionCheckOptions {
  /**
   * 检查间隔 (毫秒)
   * 默认: 60000 (1分钟)
   */
  checkInterval?: number;

  /**
   * 是否自动刷新
   * 默认: false
   */
  autoRefresh?: boolean;

  /**
   * 版本不一致时的回调
   */
  onVersionMismatch?: (result: VersionCheckResult) => void;

  /**
   * 自定义 API 基础 URL
   */
  apiBaseUrl?: string;

  /**
   * 是否启用检查
   * 默认: true
   */
  enabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const VERSION_STORAGE_KEY = 'pardx:app:version';
const BUILD_STORAGE_KEY = 'pardx:app:build';

// ============================================================================
// Hook
// ============================================================================

export function useVersionCheck(options: UseVersionCheckOptions = {}) {
  const {
    checkInterval = 60000,
    autoRefresh = false,
    onVersionMismatch,
    apiBaseUrl = API_CONFIG.baseUrl,
    enabled = true,
    // apiHealthUrl = API_CONFIG.apiHealthUrl || '',
  } = options;

  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [checkResult, setCheckResult] = useState<VersionCheckResult | null>(
    null,
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialBuildRef = useRef<string | null>(null);

  /**
   * 获取服务端版本信息
   */
  const fetchVersionInfo =
    useCallback(async (): Promise<VersionInfo | null> => {
      try {
        const response = await fetch(`${apiBaseUrl}/version`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        return data.data || data;
      } catch (error) {
        console.warn('Failed to fetch version info:', error);
        return null;
      }
    }, [apiBaseUrl]);

  /**
   * 获取构建哈希 (轻量级)
   */
  const fetchBuildHash = useCallback(async (): Promise<{
    hash: string;
    time: string;
  } | null> => {
    try {
      const response = await fetch(`${apiBaseUrl}/version/hash`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.warn('Failed to fetch build hash:', error);
      return null;
    }
  }, [apiBaseUrl]);

  /**
   * 检查版本
   */
  const checkVersion = useCallback(async () => {
    const buildInfo = await fetchBuildHash();
    if (!buildInfo) {
      return;
    }

    // 首次加载，保存构建版本
    if (!initialBuildRef.current) {
      initialBuildRef.current = buildInfo.hash;
      localStorage.setItem(BUILD_STORAGE_KEY, buildInfo.hash);
      return;
    }

    // 比较构建版本
    if (buildInfo.hash !== initialBuildRef.current) {
      const result: VersionCheckResult = {
        needsRefresh: true,
        reason: 'outdated',
        serverVersion: buildInfo.hash,
        clientVersion: initialBuildRef.current,
        action: 'refresh',
        message: '检测到新版本，请刷新页面',
      };

      setCheckResult(result);
      setNeedsRefresh(true);

      if (onVersionMismatch) {
        onVersionMismatch(result);
      }

      if (autoRefresh) {
        window.location.reload();
      }
    }
  }, [fetchBuildHash, onVersionMismatch, autoRefresh]);

  /**
   * 手动刷新
   */
  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  /**
   * 跳过刷新 (用户选择稍后刷新)
   */
  const skipRefresh = useCallback(() => {
    setNeedsRefresh(false);
    // 更新本地存储的版本，避免重复提示
    if (checkResult?.serverVersion) {
      initialBuildRef.current = checkResult.serverVersion;
      localStorage.setItem(BUILD_STORAGE_KEY, checkResult.serverVersion);
    }
  }, [checkResult]);

  // 初始化
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 从存储恢复构建版本
    const storedBuild = localStorage.getItem(BUILD_STORAGE_KEY);
    if (storedBuild) {
      initialBuildRef.current = storedBuild;
    }

    // 获取版本信息
    fetchVersionInfo().then((info) => {
      if (info) {
        setVersionInfo(info);
        localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(info));
      }
    });

    // 首次检查
    checkVersion();

    // 设置定时检查
    intervalRef.current = setInterval(checkVersion, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkInterval, fetchVersionInfo, checkVersion]);

  // 监听页面可见性变化
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, checkVersion]);

  return {
    /** 服务端版本信息 */
    versionInfo,
    /** 是否需要刷新 */
    needsRefresh,
    /** 版本检查结果 */
    checkResult,
    /** 手动刷新 */
    refresh,
    /** 跳过刷新 */
    skipRefresh,
    /** 手动检查版本 */
    checkVersion,
  };
}

// ============================================================================
// Utility: 从响应头获取版本
// ============================================================================

/**
 * 从 fetch 响应头获取版本信息
 */
export function getVersionFromHeaders(
  response: Response,
): Partial<VersionInfo> {
  return {
    appVersion: response.headers.get('x-app-version') || undefined,
    apiVersion: response.headers.get('x-api-version') || undefined,
    buildVersion: response.headers.get('x-build-version') || undefined,
    buildTime: response.headers.get('x-build-time') || undefined,
  };
}

/**
 * 创建带版本检查的 fetch 包装器
 */
export function createVersionAwareFetch(
  onVersionMismatch?: (currentBuild: string, serverBuild: string) => void,
) {
  let currentBuild: string | null = null;

  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const response = await fetch(input, init);

    const serverBuild = response.headers.get('x-build-version');
    if (serverBuild) {
      if (currentBuild && currentBuild !== serverBuild) {
        onVersionMismatch?.(currentBuild, serverBuild);
      }
      currentBuild = serverBuild;
    }

    return response;
  };
}
