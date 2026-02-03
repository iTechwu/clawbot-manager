/**
 * Server-side ts-rest client
 * 用于 Next.js 服务端组件和中间件
 *
 * 注意：此客户端不使用浏览器特定的 API（localStorage, sessionStorage 等）
 * 所有请求都需要显式传递 token
 */

import { initClient, type ApiFetcherArgs } from '@ts-rest/core';
import { userContract, signContract } from '@repo/contracts';
import {
  API_VERSION_HEADER,
  APP_BUILD_HEADER,
  PLATFORM_HEADER,
  OS_HEADER,
  DEVICE_ID_HEADER,
  MPTRAIL_HEADER,
} from '@repo/constants';
import { API_CONFIG } from '../../config';
import { APP_VERSION } from '../../version';

const API_BASE_URL = API_CONFIG.baseUrl;

export interface ServerClientOptions {
  /** Access token for authentication */
  accessToken?: string | null;
  /** Platform header */
  platform?: string | null;
  /** OS header */
  os?: string | null;
  /** Device ID header */
  deviceId?: string | null;
  /** MPTrail header */
  mptrail?: string | null;
}

/**
 * 创建服务端 fetch 函数
 */
function createServerFetch(options: ServerClientOptions) {
  return async (args: ApiFetcherArgs) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // 使用统一的版本配置（与客户端保持一致）
      [API_VERSION_HEADER]: APP_VERSION.apiVersion,
      [APP_BUILD_HEADER]: APP_VERSION.appBuild,
    };

    // Add authentication header
    if (options.accessToken) {
      headers['Authorization'] = `Bearer ${options.accessToken}`;
    }

    // 使用标准的 x- 前缀 headers
    if (options.platform) {
      headers[PLATFORM_HEADER] = options.platform; // x-platform
    } else {
      headers[PLATFORM_HEADER] = 'web'; // 默认 web 平台
    }
    if (options.os) {
      headers[OS_HEADER] = options.os; // x-os
    }
    if (options.deviceId) {
      headers[DEVICE_ID_HEADER] = options.deviceId; // x-device-id
    }
    if (options.mptrail) {
      headers[MPTRAIL_HEADER] = options.mptrail; // x-mptrail
    }

    // Merge ts-rest headers
    const tsRestHeaders = args.headers as Record<string, string> | undefined;
    if (tsRestHeaders) {
      for (const [key, value] of Object.entries(tsRestHeaders)) {
        if (typeof value === 'string' && !value.includes(', ')) {
          headers[key] = value;
        }
      }
    }

    // Handle body serialization
    let requestBody: string | undefined;
    if (args.body !== undefined && args.body !== null) {
      requestBody =
        typeof args.body === 'string' ? args.body : JSON.stringify(args.body);
    }

    const response = await fetch(args.path, {
      method: args.method,
      headers,
      body: requestBody,
    });

    const contentType = response.headers.get('content-type');
    let body;
    if (contentType?.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    return {
      status: response.status,
      body,
      headers: response.headers,
    };
  };
}

/**
 * 创建服务端 User API 客户端
 *
 * @example
 * ```ts
 * const userClient = createServerUserClient({ accessToken: 'xxx' });
 * const response = await userClient.check();
 * ```
 */
export function createServerUserClient(options: ServerClientOptions = {}) {
  return initClient(userContract, {
    baseUrl: API_BASE_URL,
    baseHeaders: {},
    api: createServerFetch(options),
  });
}

/**
 * 创建服务端 Sign API 客户端
 *
 * @example
 * ```ts
 * const signClient = createServerSignClient();
 * const response = await signClient.refreshToken({ query: { refresh: 'xxx' } });
 * ```
 */
export function createServerSignClient(options: ServerClientOptions = {}) {
  return initClient(signContract, {
    baseUrl: API_BASE_URL,
    baseHeaders: {},
    api: createServerFetch(options),
  });
}

// Export types
export type ServerUserClient = ReturnType<typeof createServerUserClient>;
export type ServerSignClient = ReturnType<typeof createServerSignClient>;
