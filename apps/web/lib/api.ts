import { signClient } from './api/contracts/client';
import type { LoginSuccess, UserInfo } from '@repo/contracts';
import {
  setLoginData,
  getAccessToken,
  getRefreshToken as getRefresh,
  isTokenExpired as checkExpired,
  clearAll,
} from './storage';

// ============================================================================
// Type Definitions (re-export from contracts for backward compatibility)
// ============================================================================

export interface LoginRequest {
  mobile: string;
  password: string;
}

// Re-export types from contracts
export type User = UserInfo;
export type LoginData = LoginSuccess;

export interface LoginResponse {
  code: number;
  msg: string;
  data: LoginData;
}

export interface RefreshTokenResponse {
  code: number;
  msg: string;
  data: LoginData;
}

export interface TokenData {
  access: string;
  refresh: string;
  accessExpire: number;
  expire: number;
}

// ============================================================================
// Token Management
// ============================================================================

// Token 刷新队列：防止并发请求时多次刷新 token
let refreshPromise: Promise<LoginData> | null = null;

// 获取存储的 token（使用新的存储模块）
export function getToken(): string | null {
  return getAccessToken();
}

// 获取 refresh token（使用新的存储模块）
export function getRefreshToken(): string | null {
  return getRefresh();
}

// 检查 access token 是否过期（使用新的存储模块）
export function isTokenExpired(): boolean {
  return checkExpired();
}

// 设置 token 数据（使用新的存储模块）
export function setTokenData(data: LoginData): void {
  if (typeof window !== 'undefined') {
    setLoginData(data);
  }
}

// 设置 token（兼容旧代码）
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

// 清除 token（使用新的存储模块）
export function clearToken(): void {
  clearAll();
}

// ============================================================================
// API Functions (using ts-rest client)
// ============================================================================

/**
 * 登录 API (ts-rest)
 * 使用 signClient.loginByMobilePassword
 */
export async function login(credentials: LoginRequest): Promise<LoginData> {
  const response = await signClient.loginByMobilePassword({
    body: {
      mobile: credentials.mobile,
      password: credentials.password,
    },
  });

  // 检查 HTTP 状态码
  if (response.status !== 200) {
    const errorBody = response.body as { msg?: string; code?: number };
    throw new Error(errorBody?.msg || '登录失败，请检查手机号和密码');
  }

  // 检查业务层状态码
  const body = response.body as { code: number; msg: string; data: LoginData };
  if (body.code !== 200) {
    throw new Error(body.msg || '手机号或密码错误');
  }

  const data = body.data;

  if (!data) {
    throw new Error('登录失败，服务器未返回有效数据');
  }

  // 保存 token 数据
  setTokenData(data);

  return data;
}

/**
 * 刷新 Token API (ts-rest)
 * 使用 signClient.refreshToken
 *
 * 注意：此函数内部使用，外部应使用 ensureValidToken
 */
async function doRefreshToken(): Promise<LoginData> {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error('没有可用的 refresh token');
  }

  const response = await signClient.refreshToken({
    query: { refresh },
  });

  if (response.status !== 200) {
    // 刷新失败，清除 token
    clearToken();
    const errorBody = response.body as { msg?: string };
    throw new Error(errorBody?.msg || 'Token 刷新失败，请重新登录');
  }

  const data = response.body.data;

  // 更新 token 数据
  if (data) {
    setTokenData(data);
  }

  return data;
}

/**
 * 刷新 Token（带队列机制）
 * 防止并发请求时多次刷新 token
 */
export async function refreshToken(): Promise<LoginData> {
  // 如果已有刷新请求在进行中，等待它完成
  if (refreshPromise) {
    return refreshPromise;
  }

  // 创建刷新 Promise 并共享
  refreshPromise = doRefreshToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * 确保 token 有效（如果过期则自动刷新）
 */
export async function ensureValidToken(): Promise<string> {
  const token = getToken();
  if (!token) {
    throw new Error('请先登录');
  }

  // 检查 token 是否过期
  if (isTokenExpired()) {
    try {
      await refreshToken();
      const newToken = getToken();
      if (!newToken) {
        throw new Error('Token 刷新失败');
      }
      return newToken;
    } catch {
      throw new Error('Token 已过期，请重新登录');
    }
  }

  return token;
}

// 注意：文件上传功能已移至 lib/upload/uploader.ts
// 请使用 uploadFile 函数从 lib/upload/uploader 导入
