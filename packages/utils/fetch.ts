import { getHeaders, VersionInfo } from './headers';

// Token 管理函数 - 需要在应用层提供
// 这些函数应该从应用层的 @/lib/api 导入
let tokenManager: {
  getToken: () => string | null;
  ensureValidToken: () => Promise<string>;
} | null = null;

export function setTokenManager(manager: typeof tokenManager) {
  tokenManager = manager;
}

// 版本信息 - 需要在应用层配置
// 用于端到端版本控制
let versionConfig: VersionInfo | null = null;

export function setVersionConfig(config: VersionInfo) {
  versionConfig = config;
}

export interface FetchOptions extends RequestInit {
  requireAuth?: boolean; // 是否需要认证（默认 true）
  mptrail?: string; // 可选的 mptrail 参数
}

/**
 * 封装的 fetch 函数，自动添加 header 和 token 管理
 */
export async function apiFetch(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const { requireAuth = true, mptrail, headers = {}, ...restOptions } = options;

  // 构建请求头（包含版本信息）
  const requestHeaders: Record<string, string> = {
    ...getHeaders(
      headers as Record<string, string>,
      mptrail,
      versionConfig || undefined,
    ),
  };

  // 如果需要认证，添加 token
  if (requireAuth && tokenManager) {
    try {
      const token = await tokenManager.ensureValidToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      // Token 获取失败，但不抛出错误，让调用方处理
      console.warn('获取 token 失败:', error);
    }
  }

  // 合并用户自定义的 headers（优先级更高）
  const finalHeaders = {
    ...requestHeaders,
    ...headers,
  };

  // 执行 fetch 请求
  const response = await fetch(url, {
    ...restOptions,
    headers: finalHeaders,
  });

  return response;
}

/**
 * GET 请求封装
 */
export async function apiGet<T = any>(
  url: string,
  options?: FetchOptions,
): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'GET',
  });

  const data = await response.json();
  return data as T;
}

/**
 * POST 请求封装
 */
export async function apiPost<T = any>(
  url: string,
  body?: any,
  options?: FetchOptions,
): Promise<T> {
  const isFormData = body instanceof FormData;
  const isURLSearchParams = body instanceof URLSearchParams;

  const headers: Record<string, string> = {};

  // 如果不是 FormData 或 URLSearchParams，默认使用 JSON
  if (!isFormData && !isURLSearchParams && body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await apiFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
    body:
      isFormData || isURLSearchParams
        ? body
        : body
          ? JSON.stringify(body)
          : undefined,
  });

  const data = await response.json();
  return data as T;
}

/**
 * PUT 请求封装
 */
export async function apiPut<T = any>(
  url: string,
  body?: any,
  options?: FetchOptions,
): Promise<T> {
  const isFormData = body instanceof FormData;

  const headers: Record<string, string> = {};

  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await apiFetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return data as T;
}

/**
 * DELETE 请求封装
 */
export async function apiDelete<T = any>(
  url: string,
  options?: FetchOptions,
): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: 'DELETE',
  });

  const data = await response.json();
  return data as T;
}
